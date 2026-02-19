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
          <div className="flex-1 w-full flex flex-col items-center justify-center animate-in zoom-in duration-700 p-4 md:p-8 overflow-y-auto custom-scrollbar">
            <div className="w-full max-w-6xl relative">
              <div className="text-center mb-16 relative">
                <div className="absolute -top-20 left-1/2 -translate-x-1/2 opacity-20 blur-3xl w-96 h-96 bg-red-600 rounded-full"></div>
                <Trophy size={100} className="text-[#FFD700] mx-auto mb-6 drop-shadow-[0_0_50px_rgba(255,215,0,0.6)] animate-pulse" fill="currentColor" />
                <h1 className="text-7xl md:text-8xl font-black text-white italic tracking-tighter uppercase mb-2 red-neon-text">أساطير الميدان</h1>
                <p className="text-red-500 font-black tracking-[1em] text-sm md:text-base uppercase">Final Hall of Fame</p>
              </div>

              {(() => {
                const top3 = winnersList.slice(0, 3);
                return !top3.length ? (
                  <div className="text-center py-20 bg-white/5 rounded-[4rem] border border-white/10 backdrop-blur-md">
                    <Skull size={100} className="text-gray-600 mx-auto mb-8 opacity-50" />
                    <h2 className="text-4xl font-black text-white/40 italic">لا يوجد أبطال في هذه المعركة</h2>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16 items-end">
                    {top3[1] && (
                      <div className="order-2 md:order-1 group cursor-default">
                        <div className="bg-[#1A1A1A]/80 backdrop-blur-xl rounded-[3rem] border-2 border-slate-400/30 p-8 pt-16 relative shadow-2xl hover:scale-[1.02] transition-all duration-500">
                          <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-28 h-28 rounded-full border-4 border-slate-400 overflow-hidden shadow-2xl bg-black">
                            {top3[1].avatar ? <img src={top3[1].avatar} className="w-full h-full object-cover" /> : <User size={40} className="text-slate-400 mt-6 mx-auto" />}
                          </div>
                          <div className="absolute top-10 left-1/2 -translate-x-1/2 bg-slate-400 text-black px-4 py-1 rounded-full font-black text-xs">2ND PLACE</div>
                          <div className="text-center">
                            <h3 className="text-3xl font-black text-white truncate mb-4">{top3[1].user}</h3>
                            <div className="flex flex-col gap-3">
                              <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                                <span className="block text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">الجولات الفائزة</span>
                                <span className="text-2xl font-black text-white italic">{top3[1].winCount}</span>
                              </div>
                              <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                                <span className="block text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">متوسط السرعة</span>
                                <span className="text-2xl font-black text-white italic">{top3[1].averageTime.toFixed(3)}s</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    {top3[0] && (
                      <div className="order-1 md:order-2 group z-10 scale-110 md:scale-125 md:-translate-y-8">
                        <div className="bg-gradient-to-b from-yellow-500/10 to-[#0A0A0A] backdrop-blur-3xl rounded-[4rem] border-4 border-[#FFD700] p-10 pt-20 relative shadow-[0_0_100px_rgba(255,215,0,0.2)]">
                          <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-36 h-36 rounded-full border-[6px] border-[#FFD700] overflow-hidden shadow-[0_0_50px_rgba(255,215,0,0.4)] bg-black">
                            {top3[0].avatar ? <img src={top3[0].avatar} className="w-full h-full object-cover animate-pulse" /> : <User size={50} className="text-[#FFD700] mt-8 mx-auto" />}
                          </div>
                          <div className="absolute top-14 left-1/2 -translate-x-1/2 bg-[#FFD700] text-black px-6 py-1.5 rounded-full font-black text-sm shadow-xl flex items-center gap-2">
                            <Star size={16} fill="black" /> CHAMPION
                          </div>
                          <div className="text-center">
                            <h3 className="text-4xl font-black text-white truncate mb-6 gold-glow-text">{top3[0].user}</h3>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="bg-[#FFD700]/10 p-4 rounded-3xl border border-[#FFD700]/20">
                                <span className="block text-[10px] text-[#FFD700] font-black uppercase tracking-widest mb-1">الجولات</span>
                                <span className="text-3xl font-black text-white italic">{top3[0].winCount}</span>
                              </div>
                              <div className="bg-[#FFD700]/10 p-4 rounded-3xl border border-[#FFD700]/20">
                                <span className="block text-[10px] text-[#FFD700] font-black uppercase tracking-widest mb-1">السرعة</span>
                                <span className="text-2xl font-black text-white italic">{top3[0].averageTime.toFixed(3)}s</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    {top3[2] && (
                      <div className="order-3 group cursor-default">
                        <div className="bg-[#1A1A1A]/80 backdrop-blur-xl rounded-[3rem] border-2 border-orange-700/30 p-8 pt-16 relative shadow-2xl hover:scale-[1.02] transition-all duration-500">
                          <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-28 h-28 rounded-full border-4 border-orange-700 overflow-hidden shadow-2xl bg-black">
                            {top3[2].avatar ? <img src={top3[2].avatar} className="w-full h-full object-cover" /> : <User size={40} className="text-orange-700 mt-6 mx-auto" />}
                          </div>
                          <div className="absolute top-10 left-1/2 -translate-x-1/2 bg-orange-700 text-black px-4 py-1 rounded-full font-black text-xs">3RD PLACE</div>
                          <div className="text-center">
                            <h3 className="text-3xl font-black text-white truncate mb-4">{top3[2].user}</h3>
                            <div className="flex flex-col gap-3">
                              <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                                <span className="block text-[10px] text-orange-700 font-black uppercase tracking-widest mb-1">الجولات الفائزة</span>
                                <span className="text-2xl font-black text-white italic">{top3[2].winCount}</span>
                              </div>
                              <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                                <span className="block text-[10px] text-orange-700 font-black uppercase tracking-widest mb-1">متوسط السرعة</span>
                                <span className="text-2xl font-black text-white italic">{top3[2].averageTime.toFixed(3)}s</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              <div className="flex flex-col md:flex-row gap-6 w-full max-w-4xl mx-auto items-center justify-center">
                <button onClick={startGame} className="group w-full md:w-auto px-16 bg-white text-black font-black py-6 rounded-[2.5rem] text-2xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-4 italic shadow-[0_20px_60px_rgba(255,255,255,0.2)]">
                  إعادة المعركة <RotateCcw size={28} className="group-hover:rotate-180 transition-transform duration-700" />
                </button>
                <button onClick={onHome} className="w-full md:w-auto px-16 bg-white/5 border-2 border-white/10 text-white font-black py-6 rounded-[2.5rem] text-2xl hover:bg-white/10 transition-all flex items-center justify-center gap-4 italic">
                  <Home size={28} /> العودة للرئيسية
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className={`flex-1 w-full flex flex-col items-center justify-center mb-24 relative ${gameState === 'ROUND_WIN' ? '' : 'backdrop-blur-2xl'}`}>
            {gameState === 'ROUND_WIN' && (
              <div className="absolute inset-0 z-[100] flex items-center justify-center animate-in fade-in zoom-in duration-1000">
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-green-500/20 blur-[150px] animate-pulse"></div>
                <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/20 blur-[150px] animate-pulse delay-700"></div>
                <div className="text-center relative max-w-7xl w-full mx-6 p-1 bg-gradient-to-b from-white/10 to-transparent rounded-[5rem] shadow-[0_0_100px_rgba(0,0,0,1)] overflow-visible">
                  <div className="bg-[#050505] rounded-[4.9rem] p-12 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-green-500 to-transparent animate-shimmer"></div>
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-full max-w-md px-12 py-4 bg-green-600 rounded-full flex items-center justify-center shadow-[0_15px_50px_rgba(22,163,74,0.5)] z-[110] border-t-4 border-white/20 animate-bounce">
                      <span className="text-white font-black text-4xl italic tracking-[0.2em] uppercase drop-shadow-lg">VICTORY ACHIEVED!</span>
                    </div>

                    {roundWinners.length > 0 ? (
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 mt-12">
                        <div className="lg:col-span-12 flex flex-col items-center mb-4">
                          {settings.winMode === 'SPEED' ? (
                            <>
                              <div className="relative">
                                <div className="absolute inset-0 bg-yellow-500/30 blur-[100px] rounded-full animate-pulse scale-150"></div>
                                <div className="relative z-10 flex flex-col items-center">
                                  <Trophy size={140} className="text-yellow-500 mb-6 animate-float drop-shadow-[0_0_60px_rgba(234,179,8,1)]" fill="currentColor" />
                                  <div className="bg-gradient-to-r from-yellow-500 to-amber-700 text-black px-10 py-2 rounded-2xl font-black text-xl italic shadow-2xl skew-x-[-12deg] mb-8">
                                    MVP OF THE ROUND
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-10 animate-in slide-in-from-bottom-20 duration-1000">
                                <div className="w-56 h-56 rounded-[4rem] border-8 border-green-500 shadow-[0_0_60px_rgba(34,197,94,0.5)] overflow-hidden bg-zinc-900 group">
                                  {roundWinners[0].avatar ? (
                                    <img src={roundWinners[0].avatar} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-green-500 font-black text-8xl">{roundWinners[0].user.charAt(0)}</div>
                                  )}
                                </div>
                                <div className="text-right">
                                  <h2 className="text-8xl font-black text-white italic tracking-tighter green-neon-text mb-4">{roundWinners[0].user}</h2>
                                  <div className="flex gap-4">
                                    <div className="bg-green-500 text-black px-6 py-3 rounded-2xl font-black text-2xl italic flex items-center gap-3">
                                      <Clock size={24} /> {roundWinners[0].responseTime.toFixed(3)}s
                                    </div>
                                    <div className="bg-white/10 text-white px-6 py-3 rounded-2xl font-black text-2xl italic border border-white/20">
                                      Total Wins: {roundWinners[0].winCountBefore + 1}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </>
                          ) : (
                            <div className="w-full flex flex-col items-center">
                              <h3 className="text-green-500 font-black tracking-[0.6em] text-3xl uppercase mb-12 italic drop-shadow-[0_0_20px_rgba(34,197,94,0.5)]">قائمة الرابحين في هذه الجولة</h3>
                              <div className="flex flex-wrap justify-center gap-10 mb-12">
                                {roundWinners.slice(0, 15).map((w, idx) => (
                                  <div key={idx} className="flex flex-col items-center gap-4 animate-in fade-in zoom-in duration-500" style={{ animationDelay: `${idx * 100}ms` }}>
                                    <div className="w-32 h-32 rounded-[2.5rem] border-4 border-green-500 overflow-hidden shadow-[0_0_40px_rgba(34,197,94,0.4)] bg-black relative">
                                      {w.avatar ? <img src={w.avatar} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-white/20 font-black text-5xl">{w.user.charAt(0)}</div>}
                                      <div className="absolute -bottom-2 -right-2 bg-green-500 text-black w-10 h-10 rounded-full flex items-center justify-center font-black border-2 border-black text-xl shadow-lg">✓</div>
                                    </div>
                                    <div className="text-center">
                                      <span className="text-white font-black text-2xl italic drop-shadow-md block">{w.user}</span>
                                      <span className="text-green-500 font-mono text-sm font-bold italic">{w.responseTime.toFixed(3)}s</span>
                                    </div>
                                  </div>
                                ))}
                                {roundWinners.length > 15 && (
                                  <div className="w-32 h-32 rounded-[2.5rem] bg-green-500/20 border-4 border-green-500/40 flex items-center justify-center text-green-400 font-black text-4xl backdrop-blur-md">
                                    +{roundWinners.length - 15}
                                  </div>
                                )}
                              </div>
                              <div className="text-4xl font-black text-white italic drop-shadow-lg"><span className="text-green-500">{roundWinners.length}</span> لاعب حـصدوا النقاط بنجاح</div>
                            </div>
                          )}
                        </div>

                        <div className="lg:col-span-12 bg-white/5 rounded-[3rem] p-8 border border-white/10 backdrop-blur-3xl relative overflow-hidden">
                          <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/5 blur-3xl rounded-full"></div>
                          <h3 className="text-white/40 font-black text-xl uppercase tracking-[0.5em] mb-8 italic flex items-center justify-center gap-4">
                            <Star size={20} className="text-yellow-500" />
                            ترتيب المتصدرين حالياً (TOP 30)
                            <Star size={20} className="text-yellow-500" />
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                            {[0, 1, 2].map(rank => {
                              const player = winnersList[rank];
                              const colors = ['#FFD700', '#C0C0C0', '#CD7F32'];
                              if (!player) return <div key={rank} className="bg-black/40 border border-white/5 rounded-3xl p-6 opacity-30 flex items-center justify-center italic text-white/50 border-dashed">{rank + 1} - بانتظار البطل</div>;
                              return (
                                <div key={rank} className="bg-white/5 border-2 rounded-3xl p-6 flex items-center gap-6 relative overflow-hidden group hover:scale-[1.03] transition-all shadow-xl" style={{ borderColor: `${colors[rank]}40` }}>
                                  <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-white/10 to-transparent rounded-bl-[2rem]"></div>
                                  <div className="text-6xl font-black italic opacity-10 absolute left-4 select-none pointer-events-none" style={{ color: colors[rank] }}>#{rank + 1}</div>
                                  <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 z-10 shadow-lg" style={{ borderColor: colors[rank] }}>
                                    {player.avatar ? <img src={player.avatar} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-zinc-800 flex items-center justify-center text-white/20">{player.user.charAt(0)}</div>}
                                  </div>
                                  <div className="z-10">
                                    <div className="text-2xl font-black text-white truncate max-w-[150px]">{player.user}</div>
                                    <div className="text-sm font-bold opacity-80 flex gap-3 uppercase font-mono"><span className="text-kick-green">{player.winCount} Wins</span><span className="text-white/40">|</span><span className="text-blue-400">{player.averageTime.toFixed(2)}s</span></div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                          <div className="max-h-72 overflow-y-auto custom-scrollbar pr-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                            {Array.from({ length: 27 }).map((_, i) => {
                              const rank = i + 3;
                              const player = winnersList[rank];
                              if (!player) return null;
                              return (
                                <div key={rank} className="bg-white/5 rounded-2xl p-4 flex items-center gap-4 border border-white/5 hover:bg-white/10 transition-all group relative overflow-hidden">
                                  <span className="text-white/20 font-black text-sm w-6">#{rank + 1}</span>
                                  <div className="w-10 h-10 rounded-xl overflow-hidden border border-white/20 flex-shrink-0">
                                    {player.avatar ? <img src={player.avatar} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-zinc-800 flex items-center justify-center text-xs">{player.user.charAt(0)}</div>}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="text-sm font-black text-white truncate">{player.user}</div>
                                    <div className="text-[10px] font-bold text-kick-green uppercase">{player.winCount} Wins</div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        <div className="lg:col-span-12 flex justify-center mt-10">
                          <button onClick={nextRound} className="group relative px-24 py-8 bg-white text-black font-black rounded-[3rem] text-4xl shadow-[0_20px_80px_rgba(255,255,255,0.2)] hover:scale-105 active:scale-95 transition-all flex items-center gap-6 italic overflow-hidden">
                            الجولة التالية <ArrowRight size={40} className="group-hover:translate-x-3 transition-transform" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="py-24 flex flex-col items-center">
                        <div className="w-48 h-48 rounded-full border-8 border-red-600 flex items-center justify-center mb-12 bg-red-600/10 animate-pulse shadow-[0_0_100px_rgba(220,38,38,0.5)]">
                          <Skull size={100} className="text-red-600" />
                        </div>
                        <h2 className="text-8xl font-black text-red-500 italic uppercase tracking-tighter mb-6 red-neon-text">TIME OVER</h2>
                        <button onClick={nextRound} className="group px-16 py-6 bg-white/5 border-2 border-white/10 hover:bg-white/20 text-white font-black rounded-3xl text-3xl transition-all flex items-center gap-6">
                          المتابعة للجولة القادمة <ArrowRight className="group-hover:translate-x-2 transition-transform" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className={`w-full max-w-5xl transition-all duration-700 ${gameState === 'ROUND_WIN' ? 'blur-2xl opacity-20 scale-95' : 'scale-100 opacity-100'}`}>
              <div className="relative overflow-visible p-10 md:p-16">
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full relative z-10">
                  {questions[currentIndex]?.options.map((opt, idx) => {
                    const isCorrect = idx === questions[currentIndex]?.correctIndex;
                    const showResult = gameState === 'ROUND_WIN';
                    return (
                      <div key={idx} className={`group relative p-8 rounded-[3rem] border-2 flex items-center justify-center transition-all shadow-xl overflow-hidden ${showResult && isCorrect ? 'border-green-500 bg-green-500/20 scale-105 shadow-[0_0_30px_rgba(34,197,94,0.3)]' : showResult && !isCorrect ? 'border-white/5 bg-black/40 opacity-50 grayscale' : 'border-white/5 bg-black/40 backdrop-blur-md hover:border-red-600 hover:bg-red-600/10 hover:scale-[1.02]'}`}>
                        <div className={`absolute left-6 w-10 h-10 rounded-full flex items-center justify-center font-black text-lg transition-all ${showResult && isCorrect ? 'bg-green-500 text-black' : 'bg-white/5 text-white/30 group-hover:bg-red-600 group-hover:text-white'}`}>
                          {String.fromCharCode(65 + idx)}
                        </div>
                        <span className={`text-2xl md:text-4xl font-black italic text-center relative z-10 px-8 transition-colors ${showResult && isCorrect ? 'text-green-500' : 'text-white group-hover:text-red-500'}`}>{opt}</span>
                      </div>
                    );
                  })}
                </div>

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