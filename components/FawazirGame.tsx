import React, { useState, useEffect, useRef } from 'react';
import { Timer, Trophy, ChevronLeft, Star, Settings, User, CheckCircle2, XCircle, BarChart3, Image as ImageIcon, Lock, Clock, RotateCcw, Home, Volume2, VolumeX, Zap, Skull, PlayCircle, ArrowRight, Swords, Target } from 'lucide-react';
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
  totalTime: number; // in ms
  bestTime: number; // in ms
  avgTime: number; // in ms
  roundsWon: number[];
}

interface RoundPlayerResult {
  user: string;
  avatar: string;
  responseTime: number; // in ms
}

export const FawazirGame: React.FC<FawazirGameProps> = ({ category, onFinish, onHome, isOBS }) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timer, setTimer] = useState(20);
  const [gameState, setGameState] = useState<'PRE_START' | 'PLAYING' | 'REVEAL_ANSWER' | 'ROUND_STATS' | 'SUMMARY'>('PRE_START');

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
  }, [category]);

  const startGame = () => {
    const freshPool = QUESTIONS_DB.filter(q => q.category === category).sort(() => 0.5 - Math.random());
    const totalRounds = Math.min(settings.roundsCount, freshPool.length);
    const gameQuestions = freshPool.slice(0, totalRounds);

    setCurrentIndex(0);
    setPlayerStats({});
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
      setGameState('REVEAL_ANSWER');
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
        const result: RoundPlayerResult = {
          user: username,
          avatar: msg.user.avatar || '',
          responseTime: solveTime
        };

        setRoundWinners(prev => [...prev, result]);
        userAttemptsRef.current.add(username);

        setPlayerStats(prev => {
          const current = prev[username] || {
            user: username,
            avatar: msg.user.avatar || '',
            totalCorrect: 0,
            totalTime: 0,
            bestTime: 999999,
            avgTime: 0,
            roundsWon: []
          };

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
          setGameState('REVEAL_ANSWER');
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

  const renderPodium = (finalists: PlayerStats[]) => {
    const places = [1, 0, 2]; // order: 2nd, 1st, 3rd
    return (
      <div className="flex items-end justify-center gap-4 md:gap-8 mb-12 h-80">
        {places.map(idx => {
          const p = finalists[idx];
          if (!p) return null;
          const isFirst = idx === 0;
          const isSecond = idx === 1;
          const height = isFirst ? 'h-64' : isSecond ? 'h-48' : 'h-40';
          const color = isFirst ? 'border-yellow-500 shadow-yellow-500/20' : isSecond ? 'border-zinc-300 shadow-zinc-300/20' : 'border-amber-700 shadow-amber-700/20';

          return (
            <div key={idx} className="flex flex-col items-center animate-in slide-in-from-bottom duration-1000" style={{ animationDelay: `${idx * 200}ms` }}>
              <div className="relative mb-4 group">
                <div className="absolute -inset-4 bg-white/5 blur-xl rounded-full scale-150 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className={`w-20 h-20 md:w-28 md:h-28 rounded-[2.5rem] border-4 overflow-hidden shadow-2xl relative z-10 ${color}`}>
                  {p.avatar ? <img src={p.avatar} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-zinc-900 flex items-center justify-center text-white/20 text-4xl">{p.user.charAt(0)}</div>}
                  <div className={`absolute bottom-0 inset-x-0 py-1 text-center font-black text-[10px] ${isFirst ? 'bg-yellow-500 text-black' : 'bg-black/80 text-white'}`}>
                    {idx + 1}# PLACE
                  </div>
                </div>
              </div>
              <div className={`w-32 md:w-44 ${height} bg-white/5 backdrop-blur-md border-t-4 ${color} rounded-t-3xl flex flex-col items-center pt-6 gap-2`}>
                <span className="text-white font-black text-lg md:text-xl italic truncate w-full px-4 text-center">{p.user}</span>
                <span className="text-kick-green font-mono font-black text-2xl">{p.totalCorrect}</span>
                <div className="text-[10px] text-white/40 font-bold uppercase tracking-widest">{p.avgTime > 0 ? (p.avgTime / 1000).toFixed(2) : '0'}s AVG</div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  if (gameState === 'SUMMARY') {
    const finalists = Object.values(playerStats).sort((a, b) => {
      if (b.totalCorrect !== a.totalCorrect) return b.totalCorrect - a.totalCorrect;
      return a.avgTime - b.avgTime;
    });

    return (
      <div className="flex-1 w-full flex flex-col items-center justify-center p-8 bg-black/95 animate-in fade-in duration-500 overflow-y-auto custom-scrollbar">
        <div className="w-full max-w-6xl relative">
          <div className="text-center mb-16">
            <h1 className="text-7xl md:text-9xl font-black italic red-neon-text tracking-tighter mb-4">أبطال الفوازير</h1>
            <div className="flex items-center justify-center gap-4 text-white/20 uppercase tracking-[1em] text-xs font-bold">
              <div className="h-px w-20 bg-white/10" /> SUPREME VICTORY <div className="h-px w-20 bg-white/10" />
            </div>
          </div>

          {renderPodium(finalists)}

          <div className="glass-card rounded-[3rem] border border-white/5 overflow-hidden shadow-2xl bg-white/5 backdrop-blur-xl mb-12">
            <table className="w-full text-right">
              <thead className="bg-white/5 border-b border-white/5">
                <tr className="text-gray-500 font-black uppercase text-[10px] tracking-widest">
                  <th className="p-8 text-center w-24">المركز</th>
                  <th className="p-8">اللاعب</th>
                  <th className="p-8 text-center text-blue-400">الإحصائيات</th>
                  <th className="p-8 text-center">أسرع وقت</th>
                  <th className="p-8 text-left">متوسط السرعة</th>
                </tr>
              </thead>
              <tbody>
                {finalists.slice(3, 10).map((p, i) => (
                  <tr key={i} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                    <td className="p-6 text-center text-white/40 font-black italic">{i + 4}</td>
                    <td className="p-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl overflow-hidden border border-white/10">
                          {p.avatar ? <img src={p.avatar} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-zinc-800 flex items-center justify-center text-white/20">{p.user.charAt(0)}</div>}
                        </div>
                        <span className="font-black text-xl text-white group-hover:text-red-500 transition-colors uppercase italic">{p.user}</span>
                      </div>
                    </td>
                    <td className="p-6 text-center">
                      <div className="font-black text-2xl text-blue-400 font-mono italic">{p.totalCorrect} <span className="text-[10px] text-blue-400/40">ROUND</span></div>
                    </td>
                    <td className="p-6 text-center font-mono text-yellow-500 font-black italic">{(p.bestTime / 1000).toFixed(2)}s</td>
                    <td className="p-6 text-left font-mono text-kick-green font-black italic text-3xl">{(p.avgTime / 1000).toFixed(2)}s</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex gap-6 justify-center">
            <button onClick={startGame} className="px-16 py-6 bg-red-600 hover:bg-red-500 rounded-full text-white font-black text-2xl italic tracking-tighter transition-all flex items-center gap-4 shadow-2xl">
              <RotateCcw size={28} /> إعادة التحدي
            </button>
            <button onClick={onHome} className="px-16 py-6 bg-white/5 border border-white/10 hover:bg-white/10 rounded-full text-white font-black text-2xl italic transition-all">
              <Home size={28} /> الرئيسية
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 flex items-center justify-center overflow-hidden bg-[#050505]">
      <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: `url('${MAIN_BACKGROUND_URL}')`, backgroundSize: 'cover' }}></div>
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black to-transparent"></div>

      {gameState === 'PRE_START' ? (
        <div className="relative z-10 w-full max-w-4xl p-8 animate-in zoom-in duration-700">
          <div className="glass-card rounded-[4rem] border border-red-600/20 bg-black/80 backdrop-blur-2xl p-12 text-center shadow-[0_0_100px_rgba(220,38,38,0.1)]">
            <div className="mb-12">
              <div className="w-24 h-24 bg-red-600/10 rounded-[2rem] border-2 border-red-600/30 flex items-center justify-center mx-auto mb-6 shadow-red-600/20 shadow-inner">
                <Swords size={48} className="text-red-600" />
              </div>
              <h1 className="text-7xl font-black text-white italic tracking-tighter red-neon-text mb-2 animate-pulse">ميدان الفوازير</h1>
              <p className="text-white/20 font-black tracking-[0.6em] text-[10px] uppercase">Elite Battle Interface</p>
            </div>

            <div className="grid grid-cols-2 gap-8 mb-12 text-right">
              <div className="space-y-4">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block px-2 italic">عدد الجولات</label>
                <div className="grid grid-cols-3 gap-2">
                  {[5, 10, 20].map(n => (
                    <button key={n} onClick={() => setSettings({ ...settings, roundsCount: n })} className={`h-12 rounded-xl font-black transition-all ${settings.roundsCount === n ? 'bg-red-600 text-white shadow-xl' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}>{n}</button>
                  ))}
                </div>
              </div>
              <div className="space-y-4">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block px-2 italic">مؤقت الإجابة</label>
                <div className="grid grid-cols-3 gap-2">
                  {[15, 30, 45].map(n => (
                    <button key={n} onClick={() => setSettings({ ...settings, timerDuration: n })} className={`h-12 rounded-xl font-black transition-all ${settings.timerDuration === n ? 'bg-red-600 text-white shadow-xl' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}>{n}s</button>
                  ))}
                </div>
              </div>
            </div>

            <button onClick={startGame} className="w-full bg-red-600 hover:bg-red-500 text-white py-8 rounded-[2.5rem] text-4xl font-black italic tracking-tighter transition-all flex items-center justify-center gap-6 shadow-[0_20px_50px_rgba(220,38,38,0.4)] group overflow-hidden relative">
              <div className="absolute inset-0 bg-white/20 translate-x-[-150%] group-hover:translate-x-[150%] transition-transform duration-1000 skew-x-[-35deg]"></div>
              <PlayCircle size={48} fill="currentColor" className="text-red-600 bg-white rounded-full p-1" /> ابدأ المعركة
            </button>
          </div>
        </div>
      ) : (
        <div className="relative z-10 w-full h-full flex flex-col items-center p-8 max-w-7xl">
          <div className="w-full flex justify-between items-center mb-12 px-6">
            <div className="flex gap-4">
              <div className="bg-white/5 border border-white/10 backdrop-blur-md px-8 py-3 rounded-2xl flex items-center gap-6 shadow-2xl">
                <div className="flex flex-col">
                  <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest italic leading-none">الجولة</span>
                  <span className="text-3xl font-black text-white italic font-mono">{currentIndex + 1}/{questions.length}</span>
                </div>
                <div className="w-px h-8 bg-white/10"></div>
                <div className={`flex flex-col ${timer < 5 ? 'text-red-500 animate-pulse' : 'text-white'}`}>
                  <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest italic leading-none">متبقي كحد أقصى</span>
                  <span className="text-3xl font-black font-mono italic">{timer}s</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-center">
              <div className="w-20 h-20 bg-black rounded-[2rem] border-2 border-red-600 shadow-[0_0_40px_rgba(220,38,38,0.6)] flex items-center justify-center relative group">
                <img src={logoImage} className="w-14 h-14 object-contain" />
              </div>
            </div>

            <button onClick={onHome} className="w-14 h-14 bg-white/5 hover:bg-red-600 border border-white/10 rounded-2xl flex items-center justify-center transition-all group shadow-xl">
              <Home size={24} className="text-white group-hover:scale-110 transition-transform" />
            </button>
          </div>

          <div className={`flex-1 w-full flex flex-col items-center justify-center transition-all duration-700 ${gameState !== 'PLAYING' ? 'blur-2xl scale-95 opacity-20' : 'scale-100 opacity-100'}`}>
            <div className="text-center mb-16 max-w-5xl px-8">
              <h2 className="text-6xl md:text-8xl font-black text-white leading-tight italic tracking-tighter drop-shadow-[0_10px_40px_rgba(0,0,0,1)] selection:bg-red-500">
                {questions[currentIndex]?.text}
              </h2>
            </div>

            <div className="grid grid-cols-2 gap-6 w-full max-w-5xl px-6">
              {questions[currentIndex]?.options.map((opt, idx) => (
                <div key={idx} className="relative p-10 md:p-14 rounded-[3rem] border border-white/5 bg-white/5 backdrop-blur-md flex items-center justify-center transition-all group overflow-hidden">
                  <div className="absolute inset-0 bg-red-600 opacity-0 group-hover:opacity-10 transition-opacity"></div>
                  <span className="text-3xl md:text-4xl font-black text-white group-hover:scale-110 transition-transform italic text-center drop-shadow-lg">{opt}</span>
                </div>
              ))}
            </div>
          </div>

          {(gameState === 'REVEAL_ANSWER' || gameState === 'ROUND_STATS') && (
            <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/90 backdrop-blur-3xl animate-in zoom-in duration-500 p-8">
              {gameState === 'REVEAL_ANSWER' ? (
                <div className="text-center w-full max-w-4xl">
                  <div className="text-red-500 font-black tracking-[0.8em] text-xs uppercase mb-12 italic">Target Identified • Ready to Reveal</div>
                  <h3 className="text-4xl md:text-6xl font-black text-white/40 mb-12 italic">{questions[currentIndex]?.text}</h3>
                  <div className="flex flex-col items-center gap-10">
                    <div className="w-40 h-40 bg-zinc-900 rounded-[3rem] border-4 border-white/10 flex items-center justify-center animate-pulse">
                      <Lock size={60} className="text-white/20" />
                    </div>
                    <button
                      onClick={() => setGameState('ROUND_STATS')}
                      className="px-24 py-10 bg-white text-black font-black text-5xl rounded-[3rem] italic scale-110 hover:scale-[1.15] active:scale-95 transition-all shadow-[0_30px_80px_rgba(255,255,255,0.2)]"
                    >
                      كـشـف الإجـابـة
                    </button>
                  </div>
                </div>
              ) : (
                <div className="w-full max-w-6xl flex flex-col items-center">
                  <div className="text-center mb-16">
                    <div className="inline-block bg-green-500 text-black px-12 py-3 rounded-full font-black text-2xl italic shadow-2xl mb-8 animate-bounce">الإجابة: {questions[currentIndex]?.options[questions[currentIndex]?.correctIndex]}</div>
                    <h3 className="text-7xl md:text-9xl font-black text-white italic tracking-tighter green-neon-text">نتائج الجولة</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-12 w-full mb-16">
                    <div className="bg-white/5 border border-white/10 rounded-[4rem] p-10 backdrop-blur-2xl">
                      <h4 className="text-gray-500 font-black text-xs uppercase tracking-[0.5em] mb-8 border-b border-white/10 pb-4 italic">Round Veterans</h4>
                      <div className="space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar pr-4">
                        {roundWinners.length > 0 ? roundWinners.sort((a, b) => a.responseTime - b.responseTime).map((w, i) => (
                          <div key={i} className="flex items-center justify-between p-6 bg-white/5 rounded-3xl border border-white/5 hover:border-green-500/50 transition-all group">
                            <div className="flex items-center gap-6">
                              <div className={`text-2xl font-black italic ${i === 0 ? 'text-yellow-500' : 'text-white/20'}`}>#{i + 1}</div>
                              <div className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-white/10 group-hover:border-green-500 transition-colors">
                                {w.avatar ? <img src={w.avatar} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-zinc-900 flex items-center justify-center text-white/20">{w.user.charAt(0)}</div>}
                              </div>
                              <span className="text-2xl font-black text-white group-hover:text-green-500 transition-colors italic uppercase">{w.user}</span>
                            </div>
                            <div className="text-3xl font-black text-kick-green font-mono">{(w.responseTime / 1000).toFixed(2)}s</div>
                          </div>
                        )) : (
                          <div className="text-center py-20 opacity-20"><Skull size={60} className="mx-auto mb-4" /><span className="text-2xl font-black">NO ONE SURVIVED</span></div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-8">
                      {roundWinners[0] && (
                        <div className="bg-gradient-to-br from-yellow-500/20 to-transparent border-t-4 border-yellow-500 rounded-[4rem] p-12 text-center animate-in slide-in-from-right duration-1000 relative overflow-hidden group">
                          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform"><Trophy size={100} /></div>
                          <div className="text-[10px] font-black text-yellow-500/60 uppercase tracking-[0.8em] mb-4 italic">Alpha Performer</div>
                          <h5 className="text-6xl font-black text-white italic mb-6 break-words">{roundWinners[0].user}</h5>
                          <div className="flex items-center justify-center gap-10">
                            <div className="flex flex-col">
                              <span className="text-[10px] text-gray-400 font-bold uppercase italic tracking-widest">رد الفعل</span>
                              <span className="text-5xl font-black text-white font-mono italic">{(roundWinners[0].responseTime / 1000).toFixed(2)}s</span>
                            </div>
                            <div className="w-px h-12 bg-white/10"></div>
                            <div className="flex flex-col">
                              <span className="text-[10px] text-gray-400 font-bold uppercase italic tracking-widest">إجمالي الفوز</span>
                              <span className="text-5xl font-black text-yellow-500 font-mono italic">{playerStats[roundWinners[0].user]?.totalCorrect}</span>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="bg-white/5 border border-white/10 rounded-[4rem] p-12 flex flex-col items-center justify-center gap-2">
                        <span className="text-white/40 font-black text-xs uppercase tracking-widest italic">الجولة التالية</span>
                        <div className="text-5xl font-black text-white italic font-mono">{currentIndex + 2 > questions.length ? 'Final' : `${currentIndex + 2}/${questions.length}`}</div>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={nextRound}
                    className="group w-full max-w-lg bg-green-600 hover:bg-green-500 text-white py-10 rounded-[3.5rem] text-5xl font-black italic tracking-tighter transition-all flex items-center justify-center gap-6 shadow-[0_30px_100px_rgba(34,197,94,0.4)]"
                  >
                    الجـولة التـالية <ArrowRight size={48} className="group-hover:translate-x-4 transition-transform" />
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="mt-12 flex justify-center opacity-40">
            <div className="flex items-center gap-3 text-red-400 font-bold bg-black/60 px-6 py-2 rounded-full border border-red-500/30 shadow-lg">
              <span className="animate-pulse italic uppercase text-[10px] tracking-widest">Surveillance Active • Monitoring Speed</span>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .red-neon-text { text-shadow: 0 0 20px rgba(239,68,68,0.5), 0 0 40px rgba(239,68,68,0.3); }
        .green-neon-text { text-shadow: 0 0 20px rgba(34,197,94,0.5), 0 0 40px rgba(34,197,94,0.3); }
        .gold-glow-text { text-shadow: 0 0 15px rgba(234,179,8,0.8); }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
      `}</style>
    </div>
  );
};