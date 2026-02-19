import React, { useState, useEffect, useRef } from 'react';
import { Timer, Trophy, ChevronLeft, Star, Settings, User, CheckCircle2, XCircle, BarChart3, Image as ImageIcon, Lock, Clock, RotateCcw, Home, Volume2, VolumeX, Zap, Skull, PlayCircle, ArrowRight, Swords, Eye } from 'lucide-react';
import { Question, ChatUser, GameSettings } from '../types';
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

interface PlayerStats {
  user: string;
  avatar: string;
  winCount: number;
  totalTime: number; // in seconds
  averageTime: number;
}

interface RoundWinnerInfo {
  user: string;
  avatar: string;
  responseTime: number;
  winCountBefore: number;
}

export const FawazirGame: React.FC<FawazirGameProps> = ({ category, onFinish, onHome, isOBS }) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timer, setTimer] = useState(20);
  const [gameState, setGameState] = useState<'PRE_START' | 'PLAYING' | 'ROUND_WIN' | 'SUMMARY'>('PRE_START');
  const [roundWinner, setRoundWinner] = useState<RoundWinnerInfo | null>(null);
  const [roundWinners, setRoundWinners] = useState<RoundWinnerInfo[]>([]);
  const [winnersList, setWinnersList] = useState<PlayerStats[]>([]);
  const [backgroundImage, setBackgroundImage] = useState<string>('');
  const [avatarCache, setAvatarCache] = useState<Record<string, string>>({});
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
  const settingsRef = useRef(settings);
  const userAttemptsRef = useRef<Set<string>>(new Set());
  const roundStartTimeRef = useRef<number>(0);
  const winnersListRef = useRef<PlayerStats[]>([]);

  useEffect(() => {
    questionsRef.current = questions;
    currentIndexRef.current = currentIndex;
    gameStateRef.current = gameState;
    settingsRef.current = settings;
    roundStartTimeRef.current = roundStartTime;
    winnersListRef.current = winnersList;
  }, [questions, currentIndex, gameState, settings, roundStartTime, winnersList]);

  useEffect(() => {
    const filtered = QUESTIONS_DB.filter(q => q.category === category);
    const shuffled = [...filtered].sort(() => Math.random() - 0.5);
    setQuestions(shuffled);
  }, [category]);

  useEffect(() => {
    const bg = AVAILABLE_BACKGROUNDS.find(b => b.id === settings.backgroundId);
    if (bg) setBackgroundImage(`url(${bg.url})`);
  }, [settings.backgroundId]);

  useEffect(() => {
    if (roundWinner && !roundWinner.avatar) {
      chatService.fetchKickAvatar(roundWinner.user).then(url => {
        if (url) {
          setRoundWinner(prev => prev ? { ...prev, avatar: url } : null);
          setAvatarCache(prev => ({ ...prev, [roundWinner.user.toLowerCase()]: url }));
        }
      });
    }
  }, [roundWinner]);

  const startGame = () => {
    const gameQuestions = questions.slice(0, settings.roundsCount);
    if (gameQuestions.length === 0) return;
    setWinnersList([]);
    setCurrentIndex(0);
    setRoundWinners([]);
    userAttemptsRef.current.clear();
    setQuestions(gameQuestions);
    setTimer(settings.timerDuration);
    setRoundStartTime(Date.now());
    setGameState('PLAYING');
  };

  useEffect(() => {
    let interval: number;
    if (gameState === 'PLAYING' && timer > 0) {
      interval = window.setInterval(() => setTimer(prev => prev - 1), 1000);
    } else if (timer === 0 && gameState === 'PLAYING') {
      if (settings.autoNext) {
        handleRoundEnd(null);
      }
    }
    return () => clearInterval(interval);
  }, [gameState, timer]);

  const playSound = (type: 'correct' | 'wrong' | 'timer' | 'win') => {
    if (!settings.soundEnabled) return;
  };

  const normalizeArabic = (text: string) => {
    if (!text) return "";
    return text.trim().toLowerCase()
      .replace(/[أإآ]/g, 'ا')
      .replace(/ة/g, 'ه')
      .replace(/ى/g, 'ي')
      .replace(/[\u064B-\u0652]/g, '');
  };

  useEffect(() => {
    const unsubscribe = chatService.onMessage((msg) => {
      if (gameStateRef.current !== 'PLAYING') return;
      const currentQ = questionsRef.current[currentIndexRef.current];
      if (!currentQ) return;

      const username = msg.user.username;
      if (userAttemptsRef.current.has(username)) return;
      userAttemptsRef.current.add(username);

      const correctIndex = currentQ.correctIndex;
      const rawCorrectText = currentQ.options[correctIndex];
      const normalizedUser = normalizeArabic(msg.content);
      const normalizedCorrect = normalizeArabic(rawCorrectText);

      const isExactMatch = normalizedUser === normalizedCorrect;
      const isPartialMatch = (normalizedUser.length >= 3) && (normalizedUser.includes(normalizedCorrect) || normalizedCorrect.includes(normalizedUser));
      const isTextMatch = isExactMatch || isPartialMatch;

      if (isTextMatch) {
        const responseTime = (Date.now() - roundStartTimeRef.current) / 1000;
        const previousStats = winnersListRef.current.find(w => w.user === username);
        const winCountBefore = previousStats ? previousStats.winCount : 0;

        let avatarUrl = msg.user.avatar || avatarCache[username.toLowerCase()] || '';
        const winnerObj: RoundWinnerInfo = {
          user: username,
          avatar: avatarUrl,
          responseTime,
          winCountBefore
        };

        if (!avatarUrl) {
          chatService.fetchKickAvatar(username).then(av => {
            if (av) {
              const uLower = username.toLowerCase();
              setRoundWinner(prev => (prev && prev.user.toLowerCase() === uLower) ? { ...prev, avatar: av } : prev);
              setWinnersList(prev => prev.map(w => w.user.toLowerCase() === uLower ? { ...w, avatar: av } : w));
            }
          });
        }

        if (settingsRef.current.winMode === 'SPEED') {
          handleRoundEnd(winnerObj);
        } else {
          setRoundWinners(prev => [...prev, winnerObj]);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  const handleRoundEnd = async (singleWinner: RoundWinnerInfo | null) => {
    if (gameStateRef.current !== 'PLAYING') return;
    const winners = settingsRef.current.winMode === 'SPEED' ? (singleWinner ? [singleWinner] : []) : roundWinners;

    setGameState('ROUND_WIN');
    setRoundWinners(winners);
    setRoundWinner(winners.length > 0 ? winners[0] : null);

    if (winners.length > 0) {
      winners.forEach(async (w) => {
        await leaderboardService.recordWin(w.user, w.avatar, 50);
      });

      setWinnersList(prev => {
        let newList = [...prev];
        winners.forEach(w => {
          const idx = newList.findIndex(u => u.user === w.user);
          if (idx !== -1) {
            const newCount = newList[idx].winCount + 1;
            const newTotalTime = newList[idx].totalTime + w.responseTime;
            newList[idx] = {
              ...newList[idx],
              winCount: newCount,
              totalTime: newTotalTime,
              averageTime: newTotalTime / newCount
            };
          } else {
            newList.push({
              user: w.user,
              avatar: w.avatar,
              winCount: 1,
              totalTime: w.responseTime,
              averageTime: w.responseTime
            });
          }
        });
        return newList.sort((a, b) => {
          if (b.winCount !== a.winCount) return b.winCount - a.winCount;
          return a.averageTime - b.averageTime;
        });
      });
    }

    if (settingsRef.current.autoNext) {
      setTimeout(nextRound, settingsRef.current.winnerDuration * 1000);
    }
  };

  const nextRound = () => {
    userAttemptsRef.current.clear();
    setRoundWinners([]);
    setRoundWinner(null);

    const winners = settingsRef.current.winMode === 'SPEED' ? (roundWinner ? [roundWinner] : []) : roundWinners;
    if (settingsRef.current.gameOverOnMiss && winners.length === 0) {
      setGameState('SUMMARY');
      return;
    }

    setCurrentIndex(prev => {
      const nextIdx = prev + 1;
      if (nextIdx < questionsRef.current.length) {
        setTimer(settingsRef.current.timerDuration);
        setRoundStartTime(Date.now());
        setGameState('PLAYING');
        return nextIdx;
      } else {
        setGameState('SUMMARY');
        return prev;
      }
    });
  };

  return (
    <div className={`absolute inset-0 flex items-center justify-center overflow-hidden transition-all duration-1000 bg-cover bg-center ${isOBS ? 'bg-none' : ''}`} style={{ backgroundImage: isOBS ? 'none' : backgroundImage }}>
      {!isOBS && <div className="absolute inset-0 bg-black/40"></div>}

      <div className="relative z-10 w-full h-full flex flex-col items-center p-8 max-w-7xl">
        {(!isOBS || gameState === 'PLAYING') && gameState !== 'PRE_START' && gameState !== 'SUMMARY' && (
          <div className="w-full flex justify-between items-center mb-8">
            <div className="w-10"></div>
            <div className="w-10"></div>
          </div>
        )}

        {gameState === 'PRE_START' ? (
          <div className="flex-1 w-full flex items-center justify-center animate-in zoom-in overflow-y-auto custom-scrollbar p-4">
            <div className="glass-card p-10 rounded-[3rem] border border-red-600/20 w-full max-w-5xl text-center shadow-[0_0_100px_rgba(0,0,0,0.5)] relative overflow-hidden backdrop-blur-xl bg-black/80">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-600 to-transparent"></div>

              <div className="mb-10">
                <h2 className="text-6xl font-black text-white italic mb-2 tracking-tighter uppercase red-neon-text">إعدادات الميدان</h2>
                <p className="text-gray-500 font-bold tracking-[0.5em] text-xs">ADVANCED BATTLE CONFIGURATION</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10 text-right">
                <div className="space-y-6">
                  <div className="bg-white/5 p-6 rounded-[2rem] border border-white/5 hover:border-white/10 transition-colors">
                    <label className="text-xs font-black text-iabs-red uppercase tracking-wider block mb-4 flex items-center gap-2"><Settings size={14} /> نظام اللعب</label>
                    <div className="grid grid-cols-2 gap-3">
                      {[5, 10, 15, 20].map(n => (
                        <button key={n} onClick={() => setSettings({ ...settings, roundsCount: n })} className={`h-14 rounded-2xl font-black text-lg transition-all ${settings.roundsCount === n ? 'bg-red-600 text-white shadow-lg scale-105' : 'bg-black/40 text-gray-500 hover:bg-white/10'}`}>{n} جولة</button>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white/5 p-6 rounded-[2rem] border border-white/5 hover:border-white/10 transition-colors">
                    <label className="text-xs font-black text-iabs-red uppercase tracking-wider block mb-4 flex items-center gap-2"><Clock size={14} /> مؤقت الإجابة</label>
                    <input
                      type="range" min="5" max="60" step="5"
                      value={settings.timerDuration}
                      onChange={(e) => setSettings({ ...settings, timerDuration: parseInt(e.target.value) })}
                      className="w-full accent-red-600 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer mb-2"
                    />
                    <div className="flex justify-between text-gray-400 font-mono text-sm">
                      <span>5s</span>
                      <span className="text-white font-black text-xl">{settings.timerDuration}s</span>
                      <span>60s</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="bg-white/5 p-6 rounded-[2rem] border border-white/5 hover:border-white/10 transition-colors">
                    <label className="text-xs font-black text-iabs-red uppercase tracking-wider block mb-4 flex items-center gap-2"><ImageIcon size={14} /> خلفية اللعب</label>
                    <div className="grid grid-cols-2 gap-3">
                      {AVAILABLE_BACKGROUNDS.map(bg => (
                        <button key={bg.id} onClick={() => setSettings({ ...settings, backgroundId: bg.id })} className={`aspect-video rounded-xl border-2 transition-all relative overflow-hidden group ${settings.backgroundId === bg.id ? 'border-red-600 scale-105' : 'border-transparent opacity-50 hover:opacity-100'}`}>
                          <img src={bg.url} className="w-full h-full object-cover" />
                          <span className="absolute inset-0 flex items-center justify-center font-black text-[10px] text-white z-10 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">{bg.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <button onClick={() => setSettings({ ...settings, soundEnabled: !settings.soundEnabled })} className={`p-4 rounded-[2rem] border transition-all flex flex-col items-center justify-center gap-2 ${settings.soundEnabled ? 'bg-white/10 border-green-500/50 text-green-400' : 'bg-black/40 border-white/5 text-gray-600'}`}>
                      {settings.soundEnabled ? <Volume2 size={24} /> : <VolumeX size={24} />}
                      <span className="text-xs font-black">المؤثرات</span>
                    </button>
                    <button onClick={() => setSettings({ ...settings, autoNext: !settings.autoNext })} className={`p-4 rounded-[2rem] border transition-all flex flex-col items-center justify-center gap-2 ${settings.autoNext ? 'bg-white/10 border-blue-500/50 text-blue-400' : 'bg-black/40 border-white/5 text-gray-600'}`}>
                      <Zap size={24} />
                      <span className="text-xs font-black">التالي تلقائي</span>
                    </button>
                    <button onClick={() => setSettings({ ...settings, gameOverOnMiss: !settings.gameOverOnMiss })} className={`p-4 rounded-[2rem] border transition-all flex flex-col items-center justify-center gap-2 ${settings.gameOverOnMiss ? 'bg-red-900/20 border-red-500 text-red-500' : 'bg-black/40 border-white/5 text-gray-600'}`}>
                      <Skull size={24} />
                      <span className="text-xs font-black">الموت المفاجئ</span>
                    </button>
                    <button onClick={() => setSettings({ ...settings, winMode: settings.winMode === 'SPEED' ? 'POINTS' : 'SPEED' })} className={`p-4 rounded-[2rem] border transition-all flex flex-col items-center justify-center gap-2 ${settings.winMode === 'SPEED' ? 'bg-white/10 border-yellow-500/50 text-yellow-500' : 'bg-white/10 border-purple-500/50 text-purple-500'}`}>
                      <Trophy size={24} />
                      <span className="text-xs font-black">{settings.winMode === 'SPEED' ? 'الأسرع' : 'تجميع نقاط'}</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <button onClick={startGame} className="flex-1 bg-red-600 hover:bg-red-500 text-white font-black py-6 rounded-[2.5rem] text-3xl shadow-[0_10px_40px_rgba(220,38,38,0.4)] hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-4 group">
                  <PlayCircle size={32} className="fill-white text-red-600" />
                  ابدأ التحدي
                </button>
                <button onClick={onHome} className="px-8 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-[2.5rem] flex items-center justify-center transition-all">
                  <Home size={24} />
                </button>
              </div>
            </div>
          </div>
        ) : gameState === 'SUMMARY' ? (
          <div className="flex-1 w-full flex flex-col items-center justify-center animate-in fade-in zoom-in duration-1000 p-4 md:p-8 overflow-y-auto custom-scrollbar">
            <div className="w-full max-w-6xl relative py-20">
              {/* Legendary Header */}
              <div className="text-center mb-24 relative">
                <div className="absolute -top-40 left-1/2 -translate-x-1/2 opacity-30 blur-[120px] w-[600px] h-[600px] bg-red-600 rounded-full animate-pulse"></div>
                <div className="relative inline-block">
                  <Trophy size={140} className="text-[#FFD700] mx-auto mb-8 drop-shadow-[0_0_80px_rgba(255,215,0,0.8)] animate-bounce" fill="currentColor" />
                  <div className="absolute -top-6 -right-6 animate-spin-slow">
                    <Star size={48} className="text-yellow-400 fill-yellow-400" />
                  </div>
                </div>
                <h1 className="text-8xl md:text-9xl font-black text-white italic tracking-tighter uppercase mb-4 red-neon-text filter drop-shadow-2xl">أساطير الميدان</h1>
                <div className="flex items-center justify-center gap-4">
                  <div className="h-px w-24 bg-gradient-to-r from-transparent to-red-600"></div>
                  <p className="text-red-500 font-black tracking-[1.5em] text-lg uppercase italic">HALL OF LEGENDS</p>
                  <div className="h-px w-24 bg-gradient-to-l from-transparent to-red-600"></div>
                </div>
              </div>

              {(() => {
                const top3 = winnersList.slice(0, 3);
                return !top3.length ? (
                  <div className="text-center py-32 bg-white/5 rounded-[5rem] border-2 border-dashed border-white/10 backdrop-blur-3xl">
                    <Skull size={120} className="text-gray-600 mx-auto mb-10 opacity-30" />
                    <h2 className="text-5xl font-black text-white/30 italic">الميدان بانتظار أبطاله...</h2>
                  </div>
                ) : (
                  <div className="flex flex-col md:flex-row items-end justify-center gap-4 md:gap-0 mb-24 perspective-1000">
                    {/* 2nd Place */}
                    {top3[1] && (
                      <div className="w-full md:w-1/3 animate-in slide-in-from-left-20 duration-1000 delay-300">
                        <div className="bg-gradient-to-b from-slate-400/20 to-black/80 backdrop-blur-3xl rounded-t-[4rem] border-x-4 border-t-4 border-slate-400/30 p-10 relative shadow-2xl h-[450px] flex flex-col items-center justify-end">
                          <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-40 h-40 rounded-[3rem] border-4 border-slate-400 overflow-hidden shadow-[0_0_50px_rgba(148,163,184,0.4)] bg-zinc-900 group">
                            {top3[1].avatar ? <img src={top3[1].avatar} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" /> : <User size={60} className="text-slate-400 mt-10 mx-auto" />}
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-400/40 to-transparent"></div>
                          </div>
                          <div className="bg-slate-400 text-black px-8 py-2 rounded-full font-black text-sm mb-6 shadow-xl tracking-widest">🥈 2ND PLACE</div>
                          <h3 className="text-4xl font-black text-white truncate w-full text-center mb-8 drop-shadow-lg leading-tight">{top3[1].user}</h3>
                          <div className="grid grid-cols-2 gap-4 w-full">
                            <div className="bg-white/5 p-4 rounded-3xl border border-white/10 text-center">
                              <span className="text-[10px] text-slate-400 font-black block mb-1">GAMES</span>
                              <span className="text-2xl font-black text-white italic">{top3[1].winCount}</span>
                            </div>
                            <div className="bg-white/5 p-4 rounded-3xl border border-white/10 text-center">
                              <span className="text-[10px] text-slate-400 font-black block mb-1">SPEED</span>
                              <span className="text-2xl font-black text-white italic">{top3[1].averageTime.toFixed(2)}s</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 1st Place - The Champion */}
                    {top3[0] && (
                      <div className="w-full md:w-2/5 z-20 animate-in slide-in-from-bottom-20 duration-1000">
                        <div className="bg-gradient-to-b from-yellow-500/20 to-black/90 backdrop-blur-3xl rounded-t-[5rem] border-x-8 border-t-8 border-[#FFD700] p-12 relative shadow-[0_0_150px_rgba(255,215,0,0.3)] h-[600px] flex flex-col items-center justify-end ring-4 ring-yellow-500/20">
                          {/* Champion Crown Container */}
                          <div className="absolute -top-52 left-1/2 -translate-x-1/2 flex flex-col items-center">
                            <div className="animate-float mb-4">
                              <div className="relative">
                                <Trophy size={100} className="text-yellow-400 fill-yellow-400 filter drop-shadow-[0_0_30px_rgba(255,215,0,0.8)]" />
                                <div className="absolute top-0 right-0 animate-ping">
                                  <Star size={32} className="text-yellow-400" />
                                </div>
                              </div>
                            </div>
                            <div className="w-56 h-56 rounded-[4rem] border-8 border-[#FFD700] overflow-hidden shadow-[0_0_100px_rgba(255,215,0,0.6)] bg-zinc-900 group ring-8 ring-yellow-500/10">
                              {top3[0].avatar ? <img src={top3[0].avatar} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" /> : <User size={80} className="text-[#FFD700] mt-12 mx-auto" />}
                              <div className="absolute inset-0 bg-gradient-to-t from-yellow-500/40 to-transparent"></div>
                            </div>
                          </div>

                          <div className="bg-gradient-to-r from-yellow-600 via-yellow-400 to-yellow-600 text-black px-12 py-3 rounded-full font-black text-xl mb-10 shadow-[0_10px_40px_rgba(255,215,0,0.5)] tracking-widest flex items-center gap-3 italic">
                            THE CHAMPION
                          </div>
                          <h3 className="text-6xl font-black text-white truncate w-full text-center mb-10 gold-glow-text filter drop-shadow-2xl leading-none">{top3[0].user}</h3>
                          <div className="grid grid-cols-2 gap-6 w-full">
                            <div className="bg-yellow-500/10 p-6 rounded-[2.5rem] border-2 border-yellow-500/30 text-center shadow-inner">
                              <span className="text-xs text-yellow-500 font-black block mb-2 uppercase tracking-tighter">VICTORIES</span>
                              <span className="text-4xl font-black text-white italic drop-shadow-md">{top3[0].winCount}</span>
                            </div>
                            <div className="bg-yellow-500/10 p-6 rounded-[2.5rem] border-2 border-yellow-500/30 text-center shadow-inner">
                              <span className="text-xs text-yellow-500 font-black block mb-2 uppercase tracking-tighter">AVG SPEED</span>
                              <span className="text-4xl font-black text-white italic drop-shadow-md">{top3[0].averageTime.toFixed(3)}s</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 3rd Place */}
                    {top3[2] && (
                      <div className="w-full md:w-1/3 animate-in slide-in-from-right-20 duration-1000 delay-500">
                        <div className="bg-gradient-to-b from-orange-800/20 to-black/80 backdrop-blur-3xl rounded-t-[4rem] border-x-4 border-t-4 border-orange-800/40 p-10 relative shadow-2xl h-[380px] flex flex-col items-center justify-end">
                          <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-36 h-36 rounded-[2.5rem] border-4 border-orange-800 overflow-hidden shadow-[0_0_40px_rgba(154,52,18,0.4)] bg-zinc-900 group">
                            {top3[2].avatar ? <img src={top3[2].avatar} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" /> : <User size={50} className="text-orange-800 mt-10 mx-auto" />}
                            <div className="absolute inset-0 bg-gradient-to-t from-orange-800/40 to-transparent"></div>
                          </div>
                          <div className="bg-orange-800 text-white px-8 py-2 rounded-full font-black text-sm mb-6 shadow-xl tracking-widest">🥉 3RD PLACE</div>
                          <h3 className="text-3xl font-black text-white truncate w-full text-center mb-8">{top3[2].user}</h3>
                          <div className="grid grid-cols-2 gap-4 w-full">
                            <div className="bg-white/5 p-4 rounded-3xl border border-white/10 text-center">
                              <span className="text-[10px] text-orange-800 font-black block mb-1">GAMES</span>
                              <span className="text-xl font-black text-white italic">{top3[2].winCount}</span>
                            </div>
                            <div className="bg-white/5 p-4 rounded-3xl border border-white/10 text-center">
                              <span className="text-[10px] text-orange-800 font-black block mb-1">SPEED</span>
                              <span className="text-xl font-black text-white italic">{top3[2].averageTime.toFixed(2)}s</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              <div className="mt-8 flex flex-col md:flex-row gap-8 w-full items-center justify-center">
                <button onClick={startGame} className="group min-w-[300px] px-16 bg-white text-black font-black py-8 rounded-[3rem] text-3xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-6 italic shadow-[0_30px_100px_rgba(255,255,255,0.3)] ring-4 ring-white/10">
                  إعادة المعركة <RotateCcw size={40} className="group-hover:rotate-180 transition-transform duration-1000" />
                </button>
                <button onClick={onHome} className="min-w-[300px] px-16 bg-red-600 text-white font-black py-8 rounded-[3rem] text-3xl hover:bg-red-500 hover:scale-105 transition-all flex items-center justify-center gap-6 italic shadow-[0_30px_100px_rgba(220,38,38,0.3)] border-b-8 border-red-800">
                  <Home size={40} /> الرئيسية
                </button>
              </div>

              {/* Hall of Legends Ranking (4-23) */}
              <div className="mt-40 w-full max-w-6xl mx-auto">
                <div className="text-center mb-16 relative">
                  <div className="absolute top-1/2 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
                  <h3 className="bg-black/40 backdrop-blur-md px-12 py-3 rounded-full border border-white/10 inline-block text-white/60 font-black text-2xl uppercase tracking-[0.4em] italic relative z-10">
                    قـائمة الأسـاطـير العشـرين
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {Array.from({ length: 20 }).map((_, i) => {
                    const player = winnersList[i + 3];
                    if (!player) return (
                      <div key={i} className="bg-black/40 rounded-3xl p-6 border-2 border-dashed border-white/5 opacity-20 flex items-center gap-4 grayscale">
                        <span className="text-4xl font-black text-white italic">#{i + 4}</span>
                        <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-white/5"></div>
                        <div className="flex-1 h-4 bg-zinc-800 rounded"></div>
                      </div>
                    );
                    return (
                      <div key={i} className="group bg-white/[0.03] backdrop-blur-xl rounded-[2.5rem] p-6 flex items-center gap-6 border border-white/10 hover:border-red-600/50 hover:bg-red-600/[0.05] transition-all hover:-translate-y-2 hover:shadow-[0_20px_50px_rgba(220,38,38,0.2)] relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-red-600/5 blur-[50px] group-hover:bg-red-600/20 transition-all"></div>
                        <span className="text-4xl font-black text-white/10 italic absolute right-6 group-hover:text-red-500/20 transition-all">#{i + 4}</span>
                        <div className="relative">
                          <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-white/10 group-hover:border-red-500 transition-all shadow-xl">
                            {player.avatar ? <img src={player.avatar} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-zinc-800 flex items-center justify-center text-xl text-white/20">{player.user.charAt(0)}</div>}
                          </div>
                          <div className="absolute -bottom-1 -right-1 bg-red-600 text-white w-6 h-6 rounded-lg text-[10px] flex items-center justify-center font-black border-2 border-black">✓</div>
                        </div>
                        <div className="relative z-10 min-w-0">
                          <div className="text-xl font-black text-white truncate mb-1">{player.user}</div>
                          <div className="flex gap-4">
                            <div className="flex items-center gap-1">
                              <span className="text-xs font-bold text-red-500">{player.winCount}</span>
                              <span className="text-[10px] text-white/40 uppercase font-bold tracking-tighter">WINS</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-xs font-bold text-blue-400">{player.averageTime.toFixed(2)}s</span>
                              <span className="text-[10px] text-white/40 uppercase font-bold tracking-tighter">SPD</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className={`flex-1 w-full flex flex-col items-center justify-center mb-24 relative ${gameState === 'ROUND_WIN' ? '' : ''}`}>
            {gameState === 'ROUND_WIN' && (
              <div className="absolute inset-0 z-[100] flex items-center justify-center animate-in fade-in zoom-in duration-1000">
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-green-500/20 blur-[150px] animate-pulse"></div>
                <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/20 blur-[150px] animate-pulse delay-700"></div>
                <div className="text-center relative max-w-3xl w-full mx-6 p-1 bg-gradient-to-b from-white/10 to-transparent rounded-[5rem] shadow-[0_50px_100px_rgba(0,0,0,0.8)] overflow-visible">
                  <div className="bg-[#050505] rounded-[4.9rem] p-10 relative overflow-hidden ring-1 ring-white/10">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-600 to-transparent animate-shimmer"></div>

                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-red-600 px-10 py-3 rounded-full flex items-center justify-center shadow-[0_15px_40px_rgba(220,38,38,0.5)] z-[110] border-t-4 border-white/20 animate-bounce">
                      <span className="text-white font-black text-3xl italic tracking-[0.2em] uppercase drop-shadow-lg">ROUND OVER</span>
                    </div>

                    {roundWinners.length > 0 ? (
                      <div className="flex flex-col items-center mt-12">
                        {settings.winMode === 'SPEED' ? (
                          <div className="w-full flex flex-col items-center">
                            <div className="relative mb-8">
                              <div className="absolute inset-0 bg-red-600/20 blur-[100px] rounded-full animate-pulse scale-150"></div>
                              <div className="relative z-10 w-44 h-44 rounded-[3.5rem] border-8 border-red-600 overflow-hidden shadow-[0_0_80px_rgba(220,38,38,0.4)] bg-zinc-900 ring-8 ring-red-600/10">
                                {roundWinners[0].avatar ? <img src={roundWinners[0].avatar} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-white/10 font-black text-8xl">{roundWinners[0].user.charAt(0)}</div>}
                              </div>
                              <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-red-600 text-white px-6 py-1 rounded-xl font-black text-sm shadow-xl italic whitespace-nowrap">WINNER</div>
                            </div>
                            <h2 className="text-6xl font-black text-white italic tracking-tighter mb-6 red-neon-text filter drop-shadow-xl">{roundWinners[0].user}</h2>
                            <div className="flex gap-4 mb-12">
                              <div className="bg-white/5 px-8 py-3 rounded-2xl border border-white/10 flex items-center gap-3">
                                <Clock size={24} className="text-red-500" />
                                <span className="text-3xl font-black text-white italic font-mono">{roundWinners[0].responseTime.toFixed(3)}s</span>
                              </div>
                              <div className="bg-red-600/10 px-8 py-3 rounded-2xl border border-red-500/30 flex items-center gap-3">
                                <Trophy size={24} className="text-yellow-500" />
                                <span className="text-3xl font-black text-white italic font-mono">{roundWinners[0].winCountBefore + 1}</span>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="w-full flex flex-col items-center mb-12">
                            <h3 className="text-red-500 font-black tracking-[0.5em] text-2xl uppercase mb-10 italic">ROUND WINNERS</h3>
                            <div className="flex flex-wrap justify-center gap-6 max-h-48 overflow-y-auto custom-scrollbar p-4">
                              {roundWinners.map((w, idx) => (
                                <div key={idx} className="flex flex-col items-center gap-2 group">
                                  <div className="w-20 h-20 rounded-[1.5rem] border-2 border-red-600 overflow-hidden shadow-xl bg-black relative">
                                    {w.avatar ? <img src={w.avatar} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-white/5 font-black text-2xl">{w.user.charAt(0)}</div>}
                                    <div className="absolute inset-0 bg-red-600/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                  </div>
                                  <span className="text-white font-black text-xs truncate max-w-[80px]">{w.user}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="w-full bg-white/[0.03] rounded-[3rem] p-8 border border-white/10 backdrop-blur-xl relative overflow-hidden mb-10">
                          <div className="absolute top-0 right-0 w-32 h-32 bg-red-600/5 blur-3xl rounded-full"></div>
                          <div className="flex flex-col md:flex-row items-center justify-between mb-8 px-4 gap-4">
                            <h4 className="text-white/40 font-black text-sm uppercase tracking-[0.5em] italic">TOP PERFORMANCE RANKING</h4>
                            <div className="flex gap-4">
                              <div className="bg-red-600/20 px-4 py-2 rounded-xl border border-red-500/30 flex items-center gap-3 shadow-lg">
                                <span className="text-[10px] text-red-500 font-black uppercase">AVG SPEED:</span>
                                <span className="text-xl font-black text-white italic">{(roundWinners.reduce((acc, curr) => acc + curr.responseTime, 0) / (roundWinners.length || 1)).toFixed(3)}s</span>
                              </div>
                              <div className="bg-white/5 px-4 py-2 rounded-xl border border-white/10 flex items-center gap-3 shadow-lg">
                                <span className="text-[10px] text-white/40 font-black uppercase">PARTICIPANTS:</span>
                                <span className="text-xl font-black text-white italic">{roundWinners.length}</span>
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                            {winnersList.slice(0, 3).map((player, idx) => (
                              <div key={idx} className={`p-4 rounded-3xl flex items-center gap-4 border transition-all bg-black/40 relative overflow-hidden group hover:scale-[1.02] shadow-2xl ${idx === 0 ? 'border-yellow-500/50 shadow-yellow-500/10' : 'border-white/5'}`}>
                                <div className="absolute top-0 right-0 w-12 h-12 bg-gradient-to-bl from-white/10 to-transparent rounded-bl-2xl opacity-10"></div>
                                <span className={`text-3xl font-black italic ${idx === 0 ? 'text-yellow-500' : 'text-white/20'}`}>#{idx + 1}</span>
                                <div className={`w-14 h-14 rounded-2xl overflow-hidden border-2 flex-shrink-0 shadow-xl ${idx === 0 ? 'border-yellow-500 animate-pulse' : 'border-white/10'}`}>
                                  {player.avatar ? <img src={player.avatar} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-zinc-800 flex items-center justify-center text-[10px]">{player.user.charAt(0)}</div>}
                                </div>
                                <div className="min-w-0">
                                  <div className="text-lg font-black text-white truncate">{player.user}</div>
                                  <div className="flex gap-2">
                                    <div className="text-[10px] font-bold text-red-500">{player.winCount} WINS</div>
                                    <div className="text-white/20 text-[10px]">|</div>
                                    <div className="text-[10px] font-bold text-blue-400">{player.averageTime.toFixed(3)}s</div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>

                          <div className="max-h-64 overflow-y-auto custom-scrollbar pr-4 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                            {winnersList.slice(3, 33).map((player, i) => (
                              <div key={i} className="bg-black/40 rounded-2xl p-3 flex items-center gap-3 border border-white/5 hover:bg-white/10 transition-all group relative overflow-hidden">
                                <span className="text-white/10 font-black text-[10px] italic">#{i + 4}</span>
                                <div className="w-10 h-10 rounded-xl overflow-hidden border border-white/10 flex-shrink-0">
                                  {player.avatar ? <img src={player.avatar} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-zinc-800 flex items-center justify-center text-[8px]">{player.user.charAt(0)}</div>}
                                </div>
                                <div className="min-w-0">
                                  <div className="text-xs font-black text-white truncate">{player.user}</div>
                                  <div className="text-[8px] font-bold text-red-500">{player.winCount} WINS</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <button onClick={nextRound} className="group relative px-20 py-6 bg-white text-black font-black rounded-[2.5rem] text-3xl shadow-[0_20px_60px_rgba(255,255,255,0.2)] hover:scale-105 active:scale-95 transition-all flex items-center gap-6 italic overflow-hidden mb-4">
                          الجولة التالية <ArrowRight size={32} className="group-hover:translate-x-3 transition-transform duration-500" />
                          <div className="absolute inset-x-0 bottom-0 h-1 bg-red-600 transform scale-x-0 group-hover:scale-x-100 transition-transform"></div>
                        </button>
                      </div>
                    ) : (
                      <div className="py-20 flex flex-col items-center">
                        <div className="w-40 h-40 rounded-full border-4 border-dashed border-red-600 flex items-center justify-center mb-10 bg-red-600/5 animate-pulse">
                          <Skull size={80} className="text-red-500 opacity-50" />
                        </div>
                        <h2 className="text-7xl font-black text-red-500 italic uppercase tracking-tighter mb-10 red-neon-text">NO WINNERS</h2>
                        <button onClick={nextRound} className="px-12 py-5 bg-white/5 border border-white/10 hover:bg-white/10 text-white font-black rounded-2xl text-2xl transition-all flex items-center gap-4">
                          المتابعة <ArrowRight />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className={`w-full max-w-5xl transition-all duration-1000 ${gameState === 'ROUND_WIN' ? 'blur-3xl opacity-30 scale-110 grayscale pointer-events-none' : 'scale-100 opacity-100'}`}>
              <div className="relative overflow-visible p-10 md:p-16">
                <div className="absolute -top-6 inset-x-12 flex items-center justify-between z-20">
                  <div className="flex gap-4">
                    <div className="bg-[#0A0A0A] border-2 border-white/10 px-6 py-2 rounded-2xl flex items-center gap-4 shadow-2xl">
                      <span className="text-[10px] font-black text-red-600 uppercase tracking-widest italic">الجولة</span>
                      <span className="text-2xl font-black text-white italic font-mono">{currentIndex + 1}/{questions.length}</span>
                    </div>
                    <div className={`bg-[#0A0A0A] border-2 px-6 py-2 rounded-2xl flex items-center gap-4 shadow-2xl transition-all ${timer < 10 ? 'border-red-600 text-red-600 animate-pulse' : 'border-white/10 text-white'}`}>
                      <Clock size={16} />
                      <span className="text-2xl font-black font-mono italic">{timer}s</span>
                    </div>
                  </div>
                  <div className="absolute left-1/2 -translate-x-1/2 -top-6">
                    <div className="w-24 h-24 bg-black rounded-full border-4 border-red-600 shadow-[0_0_40px_rgba(220,38,38,0.8)] flex items-center justify-center relative overflow-hidden group">
                      <img src={logoImage} className="w-16 h-16 object-contain relative z-10 drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]" />
                    </div>
                  </div>
                  <button onClick={() => setGameState('PRE_START')} className="w-14 h-14 bg-red-600 rounded-full border-2 border-white/20 shadow-xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all text-white">
                    <ChevronLeft size={28} />
                  </button>
                </div>

                <div className="text-center mb-12 mt-4 px-6 relative z-10">
                  <h2 className="text-5xl md:text-7xl font-black text-white leading-tight italic tracking-tighter drop-shadow-[0_10px_30px_rgba(0,0,0,1)]">
                    {questions[currentIndex]?.text}
                  </h2>
                </div>

                {gameState === 'ROUND_WIN' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full relative z-10 animate-in slide-in-from-bottom-10 duration-700">
                    {questions[currentIndex]?.options.map((opt, idx) => {
                      const isCorrect = idx === questions[currentIndex]?.correctIndex;
                      return (
                        <div key={idx} className={`group relative p-8 rounded-[3rem] border-2 flex items-center justify-center transition-all shadow-xl overflow-hidden ${isCorrect ? 'border-green-500 bg-green-500/20 scale-105 shadow-[0_0_30px_rgba(34,197,94,0.3)]' : 'border-white/5 bg-black/40 opacity-50 grayscale'}`}>
                          <span className={`text-2xl md:text-4xl font-black italic text-center relative z-10 px-8 transition-colors ${isCorrect ? 'text-green-500' : 'text-white'}`}>{opt}</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 animate-pulse">
                    <div className="bg-red-600/10 border-2 border-dashed border-red-600/30 rounded-[3rem] px-20 py-12 backdrop-blur-md">
                      <p className="text-4xl md:text-5xl font-black text-white italic text-center drop-shadow-lg">
                        اكتب الإجابة في الشات للفوز! ⌨️
                      </p>
                    </div>
                  </div>
                )}

                {!isOBS && (
                  <div className="mt-12 flex flex-col items-center gap-6 relative z-50">
                    {gameState === 'PLAYING' && timer === 0 && (
                      <button onClick={() => handleRoundEnd(null)} className="group px-16 py-6 bg-red-600 hover:bg-red-500 text-white font-black rounded-full text-3xl shadow-[0_0_50px_rgba(220,38,38,0.5)] animate-pulse transition-all flex items-center gap-4">
                        <Eye size={32} /> اعـلان الـفـائزيـن
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};