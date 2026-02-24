import React, { useState, useEffect, useRef } from 'react';
import { Timer, Trophy, ChevronLeft, Star, Settings, User, CheckCircle2, XCircle, BarChart3, Image as ImageIcon, Lock, Clock, RotateCcw, Home, Volume2, VolumeX, Zap, Skull, PlayCircle, ArrowRight, Swords, Eye } from 'lucide-react';
import { Question, ChatUser, GameSettings } from '../types';
import { QUESTIONS_DB, CATEGORIES } from '../constants';
import { chatService } from '../services/chatService';
import { leaderboardService } from '../services/supabase';
import { ProAvatar } from './ProAvatar';
import fawazirTxt from '../fawazir.txt?raw';

const parseFawazir = (txt: string): Question[] => {
  const lines = txt.split('\n');
  const questions: Question[] = [];
  let currentQuestion: any = null;
  const optionLetterToIndex: Record<string, number> = { 'A': 0, 'B': 1, 'C': 2, 'D': 3 };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    if (/^\d+[\.-]/.test(line)) {
      if (currentQuestion && currentQuestion.options && currentQuestion.options.length >= 2 && currentQuestion.correctIndex !== undefined) {
        questions.push(currentQuestion as Question);
      }
      currentQuestion = {
        id: questions.length + 1,
        day: Math.floor(questions.length / 33) + 1,
        category: 'ramadan',
        text: line.replace(/^\d+[\.-]\s*(?:فزورة:)?\s*/i, '').trim(),
        options: [],
        correctIndex: undefined
      };
      if (currentQuestion.day > 30) currentQuestion.day = 30;
    } else if (currentQuestion && line.includes('A)') && line.includes('B)')) {
      const optsArgs = line.split('|').map(o => o.trim());
      optsArgs.forEach(o => {
        const match = o.match(/^([A-D])\)\s*(.*)/);
        if (match) {
          currentQuestion.options.push(match[2].trim());
        } else {
          currentQuestion.options.push(o.replace(/^[A-D]\)\s*/, '').trim());
        }
      });
    } else if (currentQuestion && line.includes('الإجابة:')) {
      const ansMatch = line.match(/الإجابة:\s*([A-D])/i);
      if (ansMatch) {
        currentQuestion.correctIndex = optionLetterToIndex[ansMatch[1].toUpperCase()];
      }
    }
  }
  if (currentQuestion && currentQuestion.options && currentQuestion.options.length >= 2 && currentQuestion.correctIndex !== undefined) {
    questions.push(currentQuestion as Question);
  }
  return questions;
};

const RAMADAN_QUESTIONS_DYNAMIC = parseFawazir(fawazirTxt);

const logoImage = "https://i.ibb.co/pvCN1NQP/95505180312.png";

const MAIN_BACKGROUND_URL = "/photo/image%20copy.png";
const CONTENT_BACKGROUND_URL = "https://i.ibb.co/k6mHccgc/content.png";

const AVAILABLE_BACKGROUNDS = [
  { id: 'main', url: MAIN_BACKGROUND_URL, label: 'الرئيسية' },
  { id: 'content', url: CONTENT_BACKGROUND_URL, label: 'الميدان' },
  { id: 'classic', url: 'https://i.ibb.co/pjDLM8Hq/1000126047.png', label: 'الكلاسيكية' },
  { id: 'custom2', url: '/photo/image%20copy%202.png', label: 'اللعب 2' },
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
  const [gameState, setGameState] = useState<'PRE_START' | 'RULES' | 'PLAYING' | 'ROUND_WIN' | 'SUMMARY'>('PRE_START');
  const [roundWinner, setRoundWinner] = useState<RoundWinnerInfo | null>(null);
  const [roundWinners, setRoundWinners] = useState<RoundWinnerInfo[]>([]);
  const [winnersList, setWinnersList] = useState<PlayerStats[]>([]);
  const [backgroundImage, setBackgroundImage] = useState<string>('');
  const [avatarCache, setAvatarCache] = useState<Record<string, string>>({});
  const [roundStartTime, setRoundStartTime] = useState<number>(0);
  const [usedQuestionIds, setUsedQuestionIds] = useState<Set<number>>(new Set());

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
  const roundWinnersRef = useRef<RoundWinnerInfo[]>([]);

  useEffect(() => {
    questionsRef.current = questions;
    currentIndexRef.current = currentIndex;
    gameStateRef.current = gameState;
    settingsRef.current = settings;
    roundStartTimeRef.current = roundStartTime;
    winnersListRef.current = winnersList;
    roundWinnersRef.current = roundWinners;
  }, [questions, currentIndex, gameState, settings, roundStartTime, winnersList, roundWinners]);

  // Keep track of used questions across sessions
  const usedIdsRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    // Determine which database to use: dynamic fawazir for ramadan, constants.ts for others
    const dbSource = category === 'ramadan' ? RAMADAN_QUESTIONS_DYNAMIC : QUESTIONS_DB;

    // Filter out used questions if possible, otherwise reset
    let available = dbSource.filter(q => q.category === category && !usedIdsRef.current.has(q.id));

    // If we ran out of new questions, reset the tracker for this category
    if (available.length < settings.roundsCount) {
      usedIdsRef.current.clear();
      available = dbSource.filter(q => q.category === category);
    }

    const shuffled = [...available].sort(() => Math.random() - 0.5);
    setQuestions(shuffled);
  }, [category, settings.roundsCount]);

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
    // Re-filter to ensure we don't pick already used questions from the current set
    const available = questions.filter(q => !usedIdsRef.current.has(q.id));
    const gameQuestions = available.slice(0, settings.roundsCount);

    if (gameQuestions.length === 0) {
      // If none available (shouldn't happen with the reset logic), just take what we have
      const fallback = QUESTIONS_DB.filter(q => q.category === category).slice(0, settings.roundsCount);
      setQuestions(fallback);
      gameQuestions.push(...fallback);
    }

    // Mark these as used immediately
    gameQuestions.forEach(q => usedIdsRef.current.add(q.id));

    setWinnersList([]);
    setCurrentIndex(0);
    setRoundWinners([]);
    userAttemptsRef.current.clear();
    setQuestions(gameQuestions);
    setGameState('RULES');
  };

  const startActualGame = () => {
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
      .replace(/[ؤئ]/g, 'ء')
      .replace(/[\u064B-\u0652]/g, '') // Remove Harakat
      .replace(/\s+/g, ' ') // Normalize spaces
      .trim();
  };

  useEffect(() => {
    const unsubscribe = chatService.onMessage((msg) => {
      if (gameStateRef.current !== 'PLAYING') return;
      const currentQ = questionsRef.current[currentIndexRef.current];
      if (!currentQ) return;

      const username = msg.user.username;
      if (userAttemptsRef.current.has(username)) return;

      const normalizedUser = normalizeArabic(msg.content);
      if (normalizedUser.length < 2) return;

      const checkMatch = (option: string) => {
        const normOpt = normalizeArabic(option);
        const normUser = normalizedUser;

        // 1. Exact match is always winner
        if (normOpt === normUser) return true;

        // 2. Starts with logic (Requested by user)
        // If the answer starts with the input, it's a candidate.
        // If multiple answers start with this, the ambiguity check (Line 220) will ignore it.
        if (normOpt.startsWith(normUser)) return true;

        // 3. Ends with logic (E.g., "الخطاب" for "عمر بن الخطاب")
        if (normOpt.endsWith(' ' + normUser)) return true;

        // 4. Multi-word inclusion (e.g., "بن الخطاب")
        const userWordsCount = normUser.split(' ').filter(w => w.length > 0).length;
        if (userWordsCount >= 2 && normOpt.includes(normUser)) return true;

        return false;
      };


      const matchingIndices = currentQ.options.reduce((acc, opt, idx) => {
        if (checkMatch(opt)) acc.push(idx);
        return acc;
      }, [] as number[]);

      // Ambiguity Check: If the input matches multiple options (e.g., just saying "سورة" when multiple answers exist),
      // we ignore it and don't count it as an attempt to let the player be more specific.
      if (matchingIndices.length > 1) return;

      // If no matches found at all, count it as a failed attempt and the user is out for this round.
      if (matchingIndices.length === 0) {
        userAttemptsRef.current.add(username);
        return;
      }

      // Exactly one match found - now we record the attempt
      userAttemptsRef.current.add(username);

      // Check if the single match found is the correct one
      if (matchingIndices[0] === currentQ.correctIndex) {
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
              setAvatarCache(prev => ({ ...prev, [uLower]: av }));
              // Update current winners if they are on screen
              setRoundWinners(prev => prev.map(w => w.user.toLowerCase() === uLower ? { ...w, avatar: av } : w));
              setRoundWinner(prev => (prev && prev.user.toLowerCase() === uLower) ? { ...prev, avatar: av } : prev);
              setWinnersList(prev => prev.map(w => w.user.toLowerCase() === uLower ? { ...w, avatar: av } : w));
            }
          });
        }

        // Always collect winners in the round winners list
        setRoundWinners(prev => {
          const next = [...prev, winnerObj];
          // Sort by speed immediately for precise round rankings
          return next.sort((a, b) => a.responseTime - b.responseTime);
        });
      }
    });
    return () => unsubscribe();
  }, []);

  const handleRoundEnd = async (singleWinner: RoundWinnerInfo | null) => {
    if (gameStateRef.current !== 'PLAYING') return;

    // Use the collected winners from the round
    const winners = [...roundWinnersRef.current].sort((a, b) => a.responseTime - b.responseTime);

    setGameState('ROUND_WIN');
    setRoundWinners(winners);
    setRoundWinner(winners.length > 0 ? winners[0] : null);

    if (winners.length > 0) {
      // Awarding points based on rank in the round for fairness
      winners.forEach(async (w, index) => {
        const points = index === 0 ? 100 : index === 1 ? 50 : 25; // First gets more
        await leaderboardService.recordWin(w.user, w.avatar, points);
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

        // GLOBAL RANKING: Rounds Won (Primary), Avg Speed (Secondary)
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
        {(!isOBS || gameState === 'PLAYING') && gameState !== 'PRE_START' && gameState !== 'RULES' && gameState !== 'SUMMARY' && (
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
        ) : gameState === 'RULES' ? (
          <div className="flex-1 w-full flex items-center justify-center animate-in zoom-in p-4 overflow-y-auto custom-scrollbar">
            <div className="glass-card p-8 md:p-12 rounded-[3.5rem] border-2 border-red-600/30 w-full max-w-4xl text-center shadow-[0_0_100px_rgba(255,0,0,0.3)] backdrop-blur-3xl bg-black/95 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-96 h-96 bg-red-600/10 blur-[120px] rounded-full pointer-events-none"></div>
              <div className="absolute bottom-0 left-0 w-96 h-96 bg-yellow-600/10 blur-[120px] rounded-full pointer-events-none"></div>

              <div className="mb-12 relative z-10">
                <div className="w-24 h-24 bg-red-600/20 rounded-full flex items-center justify-center mx-auto mb-6 border-2 border-red-500/50 animate-pulse">
                  <Swords size={48} className="text-red-500" />
                </div>
                <h2 className="text-5xl md:text-7xl font-black text-white italic mb-4 tracking-tighter uppercase red-neon-text">قوانين الميدان 📜</h2>
                <div className="h-2 w-40 bg-gradient-to-r from-transparent via-red-600 to-transparent mx-auto rounded-full"></div>
              </div>

              <div className="space-y-6 text-right mb-16 relative z-10">
                <div className="bg-white/[0.03] p-6 md:p-8 rounded-[2rem] border border-white/10 flex flex-col md:flex-row items-center md:items-start gap-6 hover:bg-red-600/10 hover:border-red-500/50 transition-all duration-300 group shadow-lg">
                  <div className="p-4 bg-red-600/20 rounded-2xl group-hover:bg-red-600 transition-colors shadow-xl shrink-0">
                    <User size={32} className="text-red-500 group-hover:text-white" />
                  </div>
                  <div className="text-center md:text-right">
                    <h3 className="text-2xl md:text-3xl font-black text-white mb-3 italic">محاولة واحدة فقط! ⚠️</h3>
                    <p className="text-gray-400 font-bold leading-relaxed text-sm md:text-lg">كل لاعب له فرصة واحدة فقط للإجابة في كل جولة. أي رسالة تنكتب في الشات (حتى لو مو الإجابة) راح تُحتسب كمحاولة وتروح عليك فرصتك.</p>
                  </div>
                </div>

                <div className="bg-white/[0.03] p-6 md:p-8 rounded-[2rem] border border-white/10 flex flex-col md:flex-row items-center md:items-start gap-6 hover:bg-green-500/10 hover:border-green-500/50 transition-all duration-300 group shadow-lg">
                  <div className="p-4 bg-green-500/20 rounded-2xl group-hover:bg-green-500 transition-colors shadow-xl shrink-0">
                    <CheckCircle2 size={32} className="text-green-500 group-hover:text-white" />
                  </div>
                  <div className="text-center md:text-right">
                    <h3 className="text-2xl md:text-3xl font-black text-white mb-3 italic">طابق الإجابة 🎯</h3>
                    <p className="text-gray-400 font-bold leading-relaxed text-sm md:text-lg">لازم تنكتب الإجابة في الشات <span className="text-green-400">نفس المكتوب بالضبط</span> في خيارات الشاشة حرفياً. التدقيق الإملائي مهم جداً!</p>
                  </div>
                </div>

                <div className="bg-white/[0.03] p-6 md:p-8 rounded-[2rem] border border-white/10 flex flex-col md:flex-row items-center md:items-start gap-6 hover:bg-yellow-500/10 hover:border-yellow-500/50 transition-all duration-300 group shadow-lg">
                  <div className="p-4 bg-yellow-500/20 rounded-2xl group-hover:bg-yellow-500 transition-colors shadow-xl shrink-0">
                    <Clock size={32} className="text-yellow-500 group-hover:text-white" />
                  </div>
                  <div className="text-center md:text-right">
                    <h3 className="text-2xl md:text-3xl font-black text-white mb-3 italic">السرعة تحسم! ⚡</h3>
                    <p className="text-gray-400 font-bold leading-relaxed text-sm md:text-lg">الوقت من ذهب! كلما كنت أسرع في لقط الإجابة وكتابتها بالوقت، زادت نقاطك وفرصتك تتصدر قائمة الأساطير.</p>
                  </div>
                </div>
              </div>

              <div className="relative z-10 w-full flex flex-col md:flex-row justify-center gap-6">
                <button onClick={startActualGame} className="flex-1 max-w-sm bg-white text-black hover:bg-gray-200 font-black py-6 px-10 rounded-[2.5rem] text-3xl shadow-[0_15px_50px_rgba(255,255,255,0.2)] hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-4 group italic border-4 border-transparent hover:border-white/50">
                  فهمت، لنبدأ! <PlayCircle size={32} className="group-hover:text-red-600 transition-colors group-hover:scale-110" />
                </button>
              </div>
            </div>
          </div>
        ) : gameState === 'SUMMARY' ? (
          <div className="flex-1 w-full flex flex-col items-center animate-in fade-in duration-1000 overflow-y-auto custom-scrollbar p-6 md:p-12 relative">
            {/* Background Atmosphere */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
              <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-red-600/10 blur-[200px] rounded-full animate-pulse"></div>
              <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-yellow-600/10 blur-[200px] rounded-full animate-pulse delay-700"></div>
            </div>

            <div className="w-full max-w-7xl relative z-10">
              {/* Top Victory Banner - More Compact */}
              <div className="text-center mb-16 relative">
                <div className="inline-block relative">
                  <h2 className="text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-yellow-600 mb-2 animate-bounce drop-shadow-[0_5px_20px_rgba(234,179,8,0.4)]">
                    مبروكككككك 🎉🎉🎊
                  </h2>
                </div>
                <h1 className="text-6xl md:text-8xl font-black text-white italic tracking-tighter uppercase red-neon-text leading-none mb-6">
                  أساطير الميدان
                </h1>
                <div className="flex items-center justify-center gap-6 opacity-30">
                  <div className="h-px w-32 bg-gradient-to-r from-transparent to-white"></div>
                  <div className="w-3 h-3 rotate-45 border border-white"></div>
                  <div className="h-px w-32 bg-gradient-to-l from-transparent to-white"></div>
                </div>
              </div>

              {(() => {
                const top3 = winnersList.slice(0, 3);
                const restPlayers = winnersList.slice(3, 23);

                if (!winnersList.length) {
                  return (
                    <div className="text-center py-40 bg-black/40 rounded-[5rem] border-2 border-dashed border-white/10 backdrop-blur-3xl">
                      <Skull size={140} className="text-gray-800 mx-auto mb-10 opacity-30" />
                      <h2 className="text-6xl font-black text-white/20 italic">الميدان بانتظار أبطاله...</h2>
                    </div>
                  );
                }

                return (
                  <div className="flex flex-col lg:flex-row gap-12 items-stretch">
                    {/* LEFT SIDE: The Grand Champion & Buttons */}
                    <div className="lg:w-[42%] flex flex-col items-center">
                      <div className="w-full bg-gradient-to-b from-yellow-500/20 via-black/40 to-black/90 backdrop-blur-3xl rounded-[4rem] border-l-8 border-t-8 border-yellow-500 p-10 shadow-[0_40px_100px_rgba(0,0,0,0.6)] relative overflow-hidden group mb-10">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-500/5 blur-[100px] group-hover:bg-yellow-500/10 transition-all"></div>

                        {/* Winner Avatar */}
                        <div className="relative mb-10 flex justify-center">
                          <div className="relative">
                            <div className="absolute -inset-8 bg-yellow-500/20 blur-[60px] rounded-full animate-pulse"></div>
                            <div className="w-48 h-48 rounded-[3.5rem] border-8 border-yellow-500 shadow-[0_0_50px_rgba(234,179,8,0.5)] overflow-hidden bg-zinc-900 relative z-10 transition-transform group-hover:scale-110">
                              {top3[0]?.avatar ? <img src={top3[0].avatar} className="w-full h-full object-cover" /> : <User size={80} className="text-yellow-500 mt-14 mx-auto" />}
                            </div>
                            <div className="absolute -top-10 -right-10 animate-float z-20">
                              <Trophy size={80} className="text-yellow-400 fill-yellow-400 filter drop-shadow-[0_0_20px_rgba(255,215,0,0.8)]" />
                            </div>
                          </div>
                        </div>

                        <div className="text-center relative z-10">
                          <div className="bg-yellow-500 text-black px-8 py-2 rounded-full font-black text-sm mb-6 shadow-xl italic inline-block tracking-widest uppercase">🥇 ULTIMATE CHAMPION</div>
                          <h3 className="text-5xl md:text-6xl font-black text-white mb-10 gold-glow-text truncate tracking-tighter leading-none">{top3[0]?.user}</h3>

                          <div className="grid grid-cols-2 gap-6 w-full">
                            <div className="bg-white/5 p-6 rounded-[2.5rem] border border-white/10 text-center shadow-inner group-hover:bg-white/10 transition-all">
                              <span className="text-[10px] text-yellow-500 font-black block mb-2 uppercase tracking-widest">VICTORIES</span>
                              <span className="text-4xl font-black text-white italic font-mono">{top3[0]?.winCount}</span>
                            </div>
                            <div className="bg-white/5 p-6 rounded-[2.5rem] border border-white/10 text-center shadow-inner group-hover:bg-white/10 transition-all">
                              <span className="text-[10px] text-yellow-500 font-black block mb-2 uppercase tracking-widest">AVG SPEED</span>
                              <span className="text-4xl font-black text-white italic font-mono">{top3[0]?.averageTime.toFixed(3)}s</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons - Stacked under Winner */}
                      <div className="flex flex-col gap-4 w-full px-4">
                        <button onClick={startGame} className="group w-full py-8 bg-white text-black font-black rounded-[2.5rem] text-3xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-6 italic shadow-[0_20px_60px_rgba(255,255,255,0.2)]">
                          إعادة المعركة <RotateCcw size={40} className="group-hover:rotate-180 transition-transform duration-1000" />
                        </button>
                        <button onClick={onHome} className="group w-full py-8 bg-red-600 text-white font-black rounded-[2.5rem] text-3xl hover:bg-red-500 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-6 italic shadow-[0_20px_60px_rgba(220,38,38,0.3)]">
                          <Home size={40} /> الرئيسية
                        </button>
                      </div>
                    </div>

                    {/* RIGHT SIDE: Hall of Legends (Ranking 2-23) */}
                    <div className="lg:w-[58%] bg-black/40 backdrop-blur-3xl rounded-[4.5rem] border-2 border-white/5 p-10 flex flex-col shadow-2xl relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-96 h-96 bg-red-600/5 blur-[150px] -z-10 animate-pulse"></div>

                      <div className="flex items-center justify-between mb-10 border-b border-white/10 pb-6">
                        <h3 className="text-4xl font-black text-white italic red-neon-text">قـائمة الأسـاطـير</h3>
                        <div className="flex items-center gap-4">
                          <div className="w-3 h-3 bg-red-600 rounded-full animate-ping"></div>
                          <span className="text-white/40 font-black text-sm uppercase tracking-[0.2em]">Live Rankings</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto max-h-[850px] pr-4 custom-scrollbar">
                        {Array.from({ length: 22 }).map((_, i) => {
                          const player = winnersList[i + 1];
                          const rank = i + 2;

                          if (!player) return (
                            <div key={i} className="bg-white/5 rounded-[2.2rem] p-6 border-2 border-dashed border-white/5 opacity-10 flex items-center gap-4 grayscale">
                              <span className="text-3xl font-black text-white italic w-12 text-center">#{rank}</span>
                              <div className="w-14 h-14 rounded-2xl bg-zinc-800"></div>
                              <div className="flex-1 h-3 bg-zinc-800 rounded-full"></div>
                            </div>
                          );

                          const isTop3 = rank <= 3;
                          const rankColor = rank === 2 ? 'text-slate-400' : rank === 3 ? 'text-orange-500' : 'text-white/20';

                          return (
                            <div key={i} className="group bg-white/[0.03] hover:bg-white/10 rounded-[2.2rem] p-6 flex items-center gap-6 border border-white/5 hover:border-red-600/30 transition-all hover:-translate-y-1 relative overflow-hidden shadow-lg">
                              <div className="absolute top-[-20%] right-[-10%] w-24 h-24 bg-red-600/5 blur-2xl group-hover:bg-red-600/10 transition-all"></div>
                              <span className={`text-4xl font-black italic absolute right-6 transition-all ${rankColor} group-hover:scale-110`}>#{rank}</span>

                              <div className="relative">
                                <div className={`w-16 h-16 rounded-[1.2rem] overflow-hidden border-2 ${isTop3 ? 'border-yellow-500' : 'border-white/10'} group-hover:border-red-500 transition-all shadow-xl`}>
                                  {player.avatar ? <img src={player.avatar} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-zinc-800 flex items-center justify-center text-xl text-white/20">{player.user.charAt(0)}</div>}
                                </div>
                                {isTop3 && (
                                  <div className={`absolute -bottom-2 -right-2 w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-black border-2 border-black ${rank === 2 ? 'bg-slate-400' : 'bg-orange-600'} text-black`}>
                                    {rank === 2 ? '🥈' : '🥉'}
                                  </div>
                                )}
                              </div>

                              <div className="relative z-10 min-w-0 flex-1">
                                <div className="text-xl font-black text-white truncate mb-1 group-hover:text-red-500 transition-colors uppercase italic">{player.user}</div>
                                <div className="flex gap-4">
                                  <div className="flex flex-col">
                                    <span className="text-[6px] text-white/40 font-black uppercase tracking-widest">Wins</span>
                                    <span className="text-lg font-black text-white italic">{player.winCount}</span>
                                  </div>
                                  <div className="w-px h-6 bg-white/10 mt-auto"></div>
                                  <div className="flex flex-col">
                                    <span className="text-[6px] text-white/40 font-black uppercase tracking-widest">Speed</span>
                                    <span className="text-lg font-black text-blue-400 italic">{player.averageTime.toFixed(2)}s</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        ) : (
          <div className="flex-1 w-full flex flex-col items-center justify-center relative">
            {gameState === 'ROUND_WIN' && (
              <div className="absolute inset-0 z-[100] flex items-center justify-center animate-in fade-in zoom-in duration-1000">
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-green-500/20 blur-[150px] animate-pulse"></div>
                <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/20 blur-[150px] animate-pulse delay-700"></div>
                <div className="text-center relative max-w-4xl w-full mx-6 p-1 bg-gradient-to-b from-white/10 to-transparent rounded-[5rem] shadow-[0_50px_100px_rgba(0,0,0,0.8)] overflow-visible">
                  <div className="bg-[#050505] rounded-[4.9rem] p-10 relative overflow-hidden ring-1 ring-white/10">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-600 to-transparent animate-shimmer"></div>

                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-red-600 px-10 py-3 rounded-full flex items-center justify-center shadow-[0_15px_40px_rgba(220,38,38,0.5)] z-[110] border-t-4 border-white/20 animate-bounce">
                      <span className="text-white font-black text-3xl italic tracking-[0.2em] uppercase drop-shadow-lg">ROUND OVER</span>
                    </div>

                    {/* Correct Answer Display - NEW */}
                    <div className="mt-12 mb-8 animate-in slide-in-from-top duration-700">
                      <p className="text-gray-500 font-bold text-xs tracking-widest uppercase mb-2">الإجابة الصحيحة هي:</p>
                      <div className="inline-block bg-white/10 px-12 py-4 rounded-[2rem] border-2 border-green-500/50 shadow-[0_0_30px_rgba(34,197,94,0.2)]">
                        <span className="text-4xl md:text-5xl font-black text-green-500 italic drop-shadow-sm">
                          {questions[currentIndex]?.options[questions[currentIndex]?.correctIndex]}
                        </span>
                      </div>
                    </div>

                    {roundWinners.length > 0 ? (
                      <div className="flex flex-col items-center">
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
                            <div className="flex flex-wrap justify-center gap-8 max-h-[400px] overflow-y-auto custom-scrollbar p-6 bg-white/[0.02] rounded-[3rem] border border-white/5 w-full">
                              {roundWinners.map((w, idx) => (
                                <div key={idx} className="flex flex-col items-center gap-3 group animate-in zoom-in duration-500" style={{ animationDelay: `${idx * 50}ms` }}>
                                  <div className="relative">
                                    <div className="w-24 h-24 rounded-[2rem] border-4 border-red-600 overflow-hidden shadow-[0_0_30px_rgba(220,38,38,0.3)] bg-black">
                                      {w.avatar ? <img src={w.avatar} className="w-full h-full object-cover group-hover:scale-125 transition-transform duration-700" /> : <div className="w-full h-full flex items-center justify-center text-white/5 font-black text-4xl">{w.user.charAt(0)}</div>}
                                    </div>
                                    <div className="absolute -bottom-2 -right-2 bg-red-600 text-white w-7 h-7 rounded-lg flex items-center justify-center font-black border-2 border-black text-[10px] shadow-xl">#{idx + 1}</div>
                                  </div>
                                  <span className="text-white font-black text-sm block truncate max-w-[100px] drop-shadow-md">{w.user}</span>
                                  <div className="bg-red-600/20 px-2 py-0.5 rounded-lg border border-red-500/20 mt-1">
                                    <span className="text-red-500 font-black text-[10px] font-mono italic">{w.responseTime.toFixed(3)}s</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="w-full bg-white/[0.03] rounded-[3rem] p-8 border border-white/10 backdrop-blur-xl relative overflow-hidden mb-10">
                          <div className="absolute top-0 right-0 w-32 h-32 bg-red-600/5 blur-3xl rounded-full"></div>
                          <div className="flex flex-col md:flex-row items-center justify-between mb-8 px-4 gap-4">
                            <h4 className="text-white/40 font-black text-sm uppercase tracking-[0.5em] italic">ROUND PERFORMANCE</h4>
                            <div className="flex gap-4">
                              <div className="bg-red-600/20 px-4 py-2 rounded-xl border border-red-500/30 flex items-center gap-3 shadow-[0_0_20px_rgba(220,38,38,0.2)]">
                                <span className="text-[10px] text-red-500 font-black uppercase">ROUND AVG:</span>
                                <span className="text-2xl font-black text-white italic font-mono">{(roundWinners.reduce((acc, curr) => acc + curr.responseTime, 0) / (roundWinners.length || 1)).toFixed(3)}s</span>
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                            {roundWinners.slice(0, 3).map((player, idx) => (
                              <div key={idx} className={`p-4 rounded-3xl flex items-center gap-4 border transition-all bg-black/40 relative overflow-hidden group hover:scale-[1.02] shadow-2xl ${idx === 0 ? 'border-yellow-500/50 shadow-yellow-500/10' : 'border-white/5'}`}>
                                <div className="absolute top-0 right-0 w-12 h-12 bg-gradient-to-bl from-white/10 to-transparent rounded-bl-2xl opacity-10"></div>
                                <span className={`text-3xl font-black italic ${idx === 0 ? 'text-yellow-500' : 'text-white/20'}`}>#{idx + 1}</span>
                                <ProAvatar
                                  url={player.avatar}
                                  username={player.user}
                                  size="w-14 h-14"
                                  className={idx === 0 ? 'animate-pulse' : ''}
                                />
                                <div className="min-w-0">
                                  <div className="text-lg font-black text-white truncate">{player.user}</div>
                                  <div className="flex gap-2">
                                    <div className="text-[10px] font-bold text-blue-400">TIME: {player.responseTime.toFixed(3)}s</div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>

                          <div className="max-h-64 overflow-y-auto custom-scrollbar pr-4 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                            {roundWinners.slice(3, 33).map((player, i) => (
                              <div key={i} className="bg-black/40 rounded-2xl p-3 flex items-center gap-3 border border-white/5 hover:bg-white/10 transition-all group relative overflow-hidden">
                                <span className="text-white/10 font-black text-[10px] italic">#{i + 4}</span>
                                <ProAvatar
                                  url={player.avatar}
                                  username={player.user}
                                  size="w-10 h-10"
                                />
                                <div className="min-w-0">
                                  <div className="text-xs font-black text-white truncate">{player.user}</div>
                                  <div className="text-[8px] font-bold text-blue-400">{player.responseTime.toFixed(2)}s</div>
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

                {gameState === 'PLAYING' && (
                  <div className="mb-8 flex flex-col items-center gap-4">
                    <p className="text-red-500 font-black text-xl italic tracking-[0.2em] uppercase animate-pulse">
                      اكتب الإجابة في الشات للفوز! ⌨️
                    </p>
                    {roundWinners.length > 0 && (
                      <div className="bg-green-500/10 border border-green-500/30 px-6 py-2 rounded-full flex items-center gap-3 animate-bounce">
                        <Trophy size={16} className="text-yellow-500" />
                        <span className="text-green-500 font-black text-sm italic uppercase">
                          تم العثور على {roundWinners.length} إجابة صحيحة!
                        </span>
                      </div>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full relative z-10 animate-in slide-in-from-bottom-10 duration-700">
                  {questions[currentIndex]?.options.map((opt, idx) => {
                    const isCorrect = idx === questions[currentIndex]?.correctIndex;
                    const isRoundWin = gameState === 'ROUND_WIN';

                    let cardStyles = "border-white/10 bg-black/60 hover:border-red-600/50 hover:bg-red-600/[0.02]";
                    let textStyles = "text-white";

                    if (isRoundWin) {
                      if (isCorrect) {
                        cardStyles = "border-green-500 bg-green-500/20 scale-105 shadow-[0_0_50px_rgba(34,197,94,0.4)]";
                        textStyles = "text-green-500";
                      } else {
                        cardStyles = "border-white/5 bg-black/40 opacity-30 grayscale";
                        textStyles = "text-white/20";
                      }
                    }

                    return (
                      <div key={idx} className={`group relative p-8 md:p-12 rounded-[3.5rem] border-4 flex items-center justify-center transition-all shadow-2xl overflow-hidden ${cardStyles}`}>
                        <div className="absolute top-0 left-0 w-2 h-full bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <span className={`text-3xl md:text-5xl font-black italic text-center relative z-10 px-8 transition-all ${textStyles} drop-shadow-md`}>{opt}</span>
                        {!isRoundWin && (
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-red-600/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                        )}
                        {isRoundWin && isCorrect && (
                          <div className="absolute top-4 right-8 text-green-500 animate-bounce">
                            <CheckCircle2 size={32} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {!isOBS && (
                  <div className="mt-12 flex flex-col items-center gap-6 relative z-50">
                    {gameState === 'PLAYING' && (timer === 0 || roundWinners.length > 0) && (
                      <button onClick={() => handleRoundEnd(null)} className="group px-16 py-6 bg-green-600 hover:bg-green-500 text-white font-black rounded-full text-3xl shadow-[0_0_50px_rgba(34,197,94,0.5)] animate-in zoom-in duration-500 transition-all flex items-center gap-4">
                        <Eye size={32} /> اعـلان الـفـائزيـن ({roundWinners.length})
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