import React, { useState, useEffect, useRef } from 'react';
import { Timer, Trophy, ChevronLeft, Star, Settings, User, CheckCircle2, XCircle, BarChart3, Image as ImageIcon, Lock, Clock, RotateCcw, Home, Volume2, VolumeX, Zap, Skull, PlayCircle, ArrowRight, Swords } from 'lucide-react';
import { Question, ChatUser } from '../types';
import { QUESTIONS_DB, CATEGORIES } from '../constants';
import { chatService } from '../services/chatService';
import { leaderboardService } from '../services/supabase';

const logoImage = "https://i.ibb.co/pvCN1NQP/95505180312.png";
const MAIN_BACKGROUND_URL = "https://i.ibb.co/pjDLM8Hq/1000126047.png";
const CONTENT_BACKGROUND_URL = "https://i.ibb.co/k6mHccgc/content.png";

const AVAILABLE_BACKGROUNDS = [
  { id: 'main', url: MAIN_BACKGROUND_URL, label: 'الرئيسية' },
  { id: 'content', url: CONTENT_BACKGROUND_URL, label: 'الميدان' },
];

interface FawazirGameProps {
  category: string;
  onFinish: () => void;
  onHome: () => void;
  isOBS?: boolean;
}

interface GameSettings {
  winMode: 'SPEED' | 'POINTS';
  roundsCount: number;
  timerDuration: number;
  gameOverOnMiss: boolean;
  backgroundId: string;
  soundEnabled: boolean;
  autoNext: boolean;
  winnerDuration: number;
}

interface PlayerStats {
  user: string;
  avatar: string;
  totalCorrect: number;
  totalTime: number;
  bestTime: number;
  avgTime: number;
  roundsWon: number[];
}

interface RoundPlayerResult {
  user: string;
  avatar: string;
  responseTime: number;
}

export const FawazirGame: React.FC<FawazirGameProps> = ({ category, onFinish, onHome, isOBS }) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timer, setTimer] = useState(20);
  const [gameState, setGameState] = useState<'PRE_START' | 'PLAYING' | 'ROUND_WIN' | 'REVEAL_CONTROL' | 'SUMMARY'>('PRE_START');
  const [backgroundImage, setBackgroundImage] = useState<string>('');

  // Logic States
  const [roundWinners, setRoundWinners] = useState<RoundPlayerResult[]>([]);
  const [playerStats, setPlayerStats] = useState<Record<string, PlayerStats>>({});
  const [roundStartTime, setRoundStartTime] = useState<number>(0);

  const [settings, setSettings] = useState<GameSettings>({
    winMode: 'SPEED',
    roundsCount: 10,
    timerDuration: 20,
    gameOverOnMiss: false,
    backgroundId: 'main',
    soundEnabled: true,
    autoNext: false,
    winnerDuration: 5,
  });

  const questionsRef = useRef<Question[]>([]);
  const currentIndexRef = useRef(0);
  const gameStateRef = useRef(gameState);
  const roundStartTimeRef = useRef(0);
  const userAttemptsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    questionsRef.current = questions;
    currentIndexRef.current = currentIndex;
    gameStateRef.current = gameState;
    roundStartTimeRef.current = roundStartTime;
  }, [questions, currentIndex, gameState, roundStartTime]);

  useEffect(() => {
    const filtered = QUESTIONS_DB.filter(q => q.category === category);
    setQuestions(filtered.sort(() => 0.5 - Math.random()));
    setGameState('PRE_START');
    updateBackground('auto');
  }, [category]);

  const updateBackground = (bgId: string) => {
    if (bgId === 'auto') {
      const cat = CATEGORIES.find(c => c.id === category);
      const url = Array.isArray(cat?.image) ? cat.image[0] : cat?.image;
      if (url) {
        setBackgroundImage(`url('${url}')`);
        return;
      }
      setBackgroundImage(`url('${CONTENT_BACKGROUND_URL}')`);
    } else if (bgId === 'main') {
      setBackgroundImage(`url('${MAIN_BACKGROUND_URL}')`);
    } else if (bgId === 'content') {
      setBackgroundImage(`url('${CONTENT_BACKGROUND_URL}')`);
    } else {
      const selected = AVAILABLE_BACKGROUNDS.find(b => b.id === bgId);
      if (selected) setBackgroundImage(`url('${selected.url}')`);
    }
  };

  useEffect(() => {
    updateBackground(settings.backgroundId);
  }, [settings.backgroundId]);

  const startGame = () => {
    const freshPool = QUESTIONS_DB.filter(q => q.category === category).sort(() => 0.5 - Math.random());
    const totalRounds = Math.min(settings.roundsCount, freshPool.length);
    const gameQuestions = freshPool.slice(0, totalRounds);

    setPlayerStats({});
    setCurrentIndex(0);
    setRoundWinners([]);
    userAttemptsRef.current.clear();
    setQuestions(gameQuestions);
    setTimer(settings.timerDuration);
    setGameState('PLAYING');
    setRoundStartTime(Date.now());
  };

  useEffect(() => {
    let interval: number;
    if (gameState === 'PLAYING' && timer > 0) {
      interval = window.setInterval(() => setTimer(prev => prev - 1), 1000);
    } else if (timer === 0 && gameState === 'PLAYING') {
      setGameState('REVEAL_CONTROL');
    }
    return () => clearInterval(interval);
  }, [gameState, timer]);

  const normalizeArabic = (text: string) => {
    if (!text) return "";
    return text.trim().toLowerCase()
      .replace(/[أإآٱ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي')
      .replace(/[ًٌٍَُِّْ]/g, '').replace(/\s+/g, ' ');
  };

  useEffect(() => {
    const unsubscribe = chatService.onMessage((msg) => {
      if (gameStateRef.current !== 'PLAYING') return;
      const currentQ = questionsRef.current[currentIndexRef.current];
      if (!currentQ) return;

      const username = msg.user.username;
      if (userAttemptsRef.current.has(username)) return;

      const normalizedUser = normalizeArabic(msg.content);
      const normalizedCorrect = normalizeArabic(currentQ.options[currentQ.correctIndex]);

      if (normalizedUser === normalizedCorrect || (normalizedUser.length >= 3 && normalizedCorrect.includes(normalizedUser))) {
        const solveTime = Date.now() - roundStartTimeRef.current;
        const winnerObj = { user: username, avatar: msg.user.avatar || '', responseTime: solveTime };

        setRoundWinners(prev => [...prev, winnerObj]);
        userAttemptsRef.current.add(username);

        setPlayerStats(prev => {
          const current = prev[username] || { user: username, avatar: msg.user.avatar || '', totalCorrect: 0, totalTime: 0, bestTime: 999999, avgTime: 0, roundsWon: [] };
          const updated = {
            ...current,
            totalCorrect: current.totalCorrect + 1,
            totalTime: current.totalTime + solveTime,
            bestTime: Math.min(current.bestTime, solveTime),
            avgTime: (current.totalTime + solveTime) / (current.totalCorrect + 1)
          };
          return { ...prev, [username]: updated };
        });

        if (settings.winMode === 'SPEED' && !isOBS) {
          setGameState('REVEAL_CONTROL');
        }
      }
    });
    return () => unsubscribe();
  }, [isOBS]);

  const nextRound = () => {
    userAttemptsRef.current.clear();
    setRoundWinners([]);
    const nextIdx = currentIndex + 1;
    if (nextIdx < questions.length) {
      setCurrentIndex(nextIdx);
      setTimer(settings.timerDuration);
      setGameState('PLAYING');
      setRoundStartTime(Date.now());
    } else {
      setGameState('SUMMARY');
    }
  };

  if (gameState === 'SUMMARY') {
    const finalists = Object.values(playerStats).sort((a, b) => b.totalCorrect - a.totalCorrect || a.avgTime - b.avgTime).slice(0, 10);
    const topWinner = finalists[0];

    return (
      <div className="flex-1 w-full flex flex-col items-center justify-center animate-in zoom-in duration-500 p-6 text-center bg-black/80 backdrop-blur-md">
        <div className="glass-card w-full max-w-4xl rounded-[4rem] border-2 border-red-600/30 p-12 relative overflow-hidden shadow-[0_0_150px_rgba(255,0,0,0.2)]">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-transparent via-red-600 to-transparent"></div>
          <Trophy size={100} className="text-[#FFD700] mx-auto mb-8 animate-bounce" fill="currentColor" />
          <h1 className="text-6xl font-black text-white italic tracking-tighter uppercase mb-2">أبطال الفوازير</h1>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 my-12">
            {topWinner && (
              <div className="bg-white/5 p-8 rounded-[3rem] border-2 border-yellow-500/30">
                <div className="w-32 h-32 rounded-full border-4 border-[#FFD700] mx-auto mb-6 overflow-hidden shadow-2xl relative">
                  {topWinner.avatar ? <img src={topWinner.avatar} className="w-full h-full object-cover" /> : <User size={48} className="text-white/20 mt-8 mx-auto" />}
                  <div className="absolute bottom-0 w-full bg-[#FFD700] text-black font-black text-[10px] py-1">FIRST PLACE</div>
                </div>
                <h2 className="text-4xl font-black text-white italic mb-2">{topWinner.user}</h2>
                <div className="flex flex-col gap-1">
                  <span className="text-xl font-bold text-kick-green">{topWinner.totalCorrect} إجابة صحيحة</span>
                  <span className="text-xs text-white/40 font-mono italic">متوسط السرعة: {(topWinner.avgTime / 1000).toFixed(2)}s</span>
                </div>
              </div>
            )}

            <div className="bg-white/5 p-8 rounded-[3rem] border border-white/10 text-right overflow-y-auto max-h-[350px] custom-scrollbar">
              <h3 className="text-red-500 font-black text-sm uppercase mb-6 border-b border-white/5 pb-2">قائمة الأبطال</h3>
              <div className="space-y-4">
                {finalists.slice(1).map((p, i) => (
                  <div key={i} className="flex items-center justify-between border-b border-white/5 pb-2">
                    <div className="flex flex-col">
                      <span className="text-white font-black italic">{p.user}</span>
                      <span className="text-[10px] text-white/20">متوسط الوقت: {(p.avgTime / 1000).toFixed(2)}s</span>
                    </div>
                    <span className="text-xl font-bold text-white/60">#{i + 2}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-4 w-full">
            <button onClick={startGame} className="flex-1 bg-white text-black font-black py-6 rounded-[2rem] text-2xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-4 italic">
              إعادة اللعبة <RotateCcw size={28} />
            </button>
            <button onClick={onHome} className="flex-1 bg-white/5 border border-white/10 text-white font-black py-6 rounded-[2rem] text-2xl hover:bg-white/10 transition-all flex items-center justify-center gap-4 italic">
              <Home size={28} /> القائمة
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`absolute inset-0 flex items-center justify-center overflow-hidden transition-all duration-1000 bg-cover bg-center ${isOBS ? 'bg-none' : ''}`} style={{ backgroundImage: isOBS ? 'none' : backgroundImage }}>
      {!isOBS && <div className="absolute inset-0 bg-black/40"></div>}

      <div className="relative z-10 w-full h-full flex flex-col items-center p-8 max-w-7xl">
        {gameState === 'PRE_START' ? (
          <div className="flex-1 w-full flex items-center justify-center animate-in zoom-in overflow-y-auto custom-scrollbar p-4">
            <div className="glass-card p-10 rounded-[3rem] border border-red-600/20 w-full max-w-4xl text-center shadow-[0_0_100px_rgba(0,0,0,0.5)] relative overflow-hidden backdrop-blur-xl bg-black/80">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-600 to-transparent"></div>
              <h2 className="text-6xl font-black text-white italic mb-10 tracking-tighter uppercase red-neon-text">إعدات الميدان</h2>

              <div className="grid grid-cols-2 gap-8 mb-10 text-right">
                <div className="bg-white/5 p-6 rounded-[2rem] border border-white/5 h-fit">
                  <label className="text-[10px] font-black text-red-600 uppercase tracking-widest block mb-4">عدد الجولات</label>
                  <div className="grid grid-cols-2 gap-3">
                    {[5, 10, 20].map(n => (
                      <button key={n} onClick={() => setSettings({ ...settings, roundsCount: n })} className={`h-12 rounded-xl font-black ${settings.roundsCount === n ? 'bg-red-600 text-white shadow-lg' : 'bg-black/40 text-gray-500 hover:bg-white/10'}`}>{n}</button>
                    ))}
                  </div>
                </div>

                <div className="bg-white/5 p-6 rounded-[2rem] border border-white/5 h-fit">
                  <label className="text-[10px] font-black text-red-600 uppercase tracking-widest block mb-4">وقت الإجابة</label>
                  <div className="grid grid-cols-2 gap-3">
                    {[15, 30, 45].map(n => (
                      <button key={n} onClick={() => setSettings({ ...settings, timerDuration: n })} className={`h-12 rounded-xl font-black ${settings.timerDuration === n ? 'bg-red-600 text-white shadow-lg' : 'bg-black/40 text-gray-500 hover:bg-white/10'}`}>{n}s</button>
                    ))}
                  </div>
                </div>
              </div>

              <button onClick={startGame} className="w-full bg-red-600 hover:bg-red-500 text-white font-black py-8 rounded-[2.5rem] text-4xl shadow-2xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-4 italic uppercase">
                ابدأ التحدي <PlayCircle size={40} />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 w-full flex flex-col items-center justify-center mb-24 relative">
            {gameState === 'REVEAL_CONTROL' && (
              <div className="absolute inset-0 z-[100] flex items-center justify-center animate-in zoom-in duration-500 bg-black/60 backdrop-blur-xl rounded-[4rem]">
                <div className="text-center p-12 bg-zinc-950 border border-white/10 rounded-[4rem] shadow-2xl max-w-2xl w-full">
                  <div className="mb-8">
                    <CheckCircle2 size={100} className="text-green-500 mx-auto mb-4 animate-bounce" />
                    <h3 className="text-4xl font-black text-white italic mb-2">انتهت الجولات!</h3>
                    <p className="text-white/40 font-bold mb-8 italic uppercase tracking-widest">تحقق من النتائج قبل الانتقال</p>
                  </div>

                  <div className="bg-white/5 p-6 rounded-3xl mb-12 text-right">
                    <h4 className="text-xs font-black text-gray-500 uppercase mb-4 italic">أفضل النتائج في هذه الجولة:</h4>
                    <div className="space-y-3 max-h-[200px] overflow-y-auto custom-scrollbar">
                      {roundWinners.slice(0, 5).map((w, i) => (
                        <div key={i} className="flex items-center justify-between border-b border-white/5 pb-2">
                          <span className="text-white font-black text-xl italic">{w.user}</span>
                          <span className="text-kick-green font-mono font-bold">{(w.responseTime / 1000).toFixed(2)}s</span>
                        </div>
                      ))}
                      {roundWinners.length === 0 && <div className="text-center py-4 text-white/20 font-black">لا توجد إجابات صحيحة</div>}
                    </div>
                  </div>

                  <button
                    onClick={nextRound}
                    className="w-full bg-green-600 hover:bg-green-500 text-white font-black py-6 rounded-[2.5rem] text-3xl transition-all shadow-2xl flex items-center justify-center gap-4 italic"
                  >
                    الجولة التالية <ArrowRight size={32} />
                  </button>
                </div>
              </div>
            )}

            <div className={`w-full max-w-5xl transition-all duration-700 ${gameState === 'REVEAL_CONTROL' ? 'blur-2xl opacity-20 scale-95' : 'scale-100 opacity-100'}`}>
              <div className="relative overflow-visible p-10 md:p-16">
                {/* Integrated Status Bar */}
                <div className="absolute -top-6 inset-x-12 flex items-center justify-between z-20">
                  <div className="flex gap-4">
                    <div className="bg-[#0A0A0A] border-2 border-white/10 px-6 py-2 rounded-2xl flex items-center gap-4 shadow-2xl">
                      <span className="text-[10px] font-black text-red-600 uppercase tracking-widest italic">الجولة</span>
                      <span className="text-2xl font-black text-white italic font-mono">{currentIndex + 1}/{questions.length}</span>
                    </div>
                    <div className={`bg-[#0A0A0A] border-2 px-6 py-2 rounded-2xl flex items-center gap-4 shadow-2xl transition-all ${timer < 5 ? 'border-red-600 text-red-600 animate-pulse' : 'border-white/10 text-white'}`}>
                      <Clock size={16} />
                      <span className="text-2xl font-black font-mono italic">{timer}s</span>
                    </div>
                  </div>

                  {/* Central Logo Circle */}
                  <div className="absolute left-1/2 -translate-x-1/2 -top-6">
                    <div className="w-24 h-24 bg-black rounded-full border-4 border-red-600 shadow-[0_0_40px_rgba(220,38,38,0.8)] flex items-center justify-center relative overflow-hidden group">
                      <div className="absolute inset-0 bg-red-600/10 rounded-full animate-pulse"></div>
                      <img src={logoImage} className="w-16 h-16 object-contain relative z-10" />
                    </div>
                  </div>

                  <button onClick={onHome} className="px-6 py-2 bg-white/5 border border-white/10 rounded-2xl font-black text-white italic hover:bg-white/10">الخروج</button>
                </div>

                {/* Question Section */}
                <div className="text-center mb-12 mt-12 px-6 relative z-10">
                  <h2 className="text-5xl md:text-7xl font-black text-white leading-tight italic tracking-tighter drop-shadow-[0_10px_30px_rgba(0,0,0,1)]">
                    {questions[currentIndex]?.text}
                  </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full relative z-10 px-6">
                  {questions[currentIndex]?.options.map((opt, idx) => (
                    <div key={idx} className="group relative p-8 md:p-10 rounded-[2.5rem] border-2 border-white/5 bg-black/40 backdrop-blur-sm flex items-center justify-center transition-all hover:border-red-600/50 hover:bg-black/60">
                      <span className="text-2xl md:text-4xl font-black text-white italic text-center drop-shadow-lg">{opt}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .red-neon-text { text-shadow: 0 0 20px rgba(239,68,68,0.5), 0 0 40px rgba(239,68,68,0.3); }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
      `}</style>
    </div>
  );
};