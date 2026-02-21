
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { chatService } from '../services/chatService';
import { leaderboardService } from '../services/supabase';
import { FLAGS_DATA } from '../constants';
import { Flag, Play, RotateCcw, Award, CheckCircle2, LogOut, Home, Star, Globe, Zap, Settings2, User } from 'lucide-react';
import { ProAvatar } from './ProAvatar';

interface FlagQuizProps {
   channelConnected: boolean;
   onHome: () => void;
}

const SidebarPortal = ({ children }: { children?: React.ReactNode }) => {
   const [mounted, setMounted] = useState(false);
   useEffect(() => { setMounted(true); return () => setMounted(false); }, []);
   const el = document.getElementById('game-sidebar-portal');
   if (!mounted || !el) return null;
   return createPortal(children, el);
};

// ==========================================
// 🏴 FLAG DATASETS & LEVELS
// ==========================================

// Level 1: Easy (Arab Countries & Very Famous Global)
const LEVEL_EASY = FLAGS_DATA.filter(f =>
   ['sa', 'eg', 'ae', 'kw', 'qa', 'om', 'bh', 'jo', 'lb', 'ps', 'iq', 'ye', 'sy', 'sd', 'ly', 'tn', 'dz', 'ma', 'us', 'gb', 'fr', 'de', 'jp', 'cn', 'kr', 'tr'].includes(f.code)
);

// Level 2: Medium (Mix of Arab, European, Asian, Americas - Default)
const LEVEL_MEDIUM = FLAGS_DATA.filter(f =>
   !['nu', 'tv', 'nr', 'ki', 'fm', 'pw', 'mh', 'sb', 'vu', 'ws', 'to', 'fj', 'st', 'cv', 'km', 'sc', 'mu', 'dm', 'lc', 'vc', 'gd', 'bb', 'ag', 'kn'].includes(f.code)
);

// Level 3: Hard (Everything including obscure islands)
const LEVEL_HARD = FLAGS_DATA;

const LEVELS = [
   { id: 'easy', label: 'سـهـل', data: LEVEL_EASY, icon: Star, color: 'text-green-500', desc: 'دول عربية ومشهورة' },
   { id: 'medium', label: 'مـتوسـط', data: LEVEL_MEDIUM, icon: Zap, color: 'text-yellow-500', desc: 'تحدي متوازن (الافتراضي)' },
   { id: 'hard', label: 'صـعـب', data: LEVEL_HARD, icon: Globe, color: 'text-red-600', desc: 'كل دول العالم!' },
] as const;


export const FlagQuiz: React.FC<FlagQuizProps> = ({ channelConnected, onHome }) => {
   const [isActive, setIsActive] = useState(false);
   const [currentFlag, setCurrentFlag] = useState<typeof FLAGS_DATA[0] | null>(null);
   const [scores, setScores] = useState<Record<string, number>>({});
   const [lastWinner, setLastWinner] = useState<{ name: string, answer: string, avatar?: string } | null>(null);

   // ⚙️ Unified Game Settings
   const [selectedLevel, setSelectedLevel] = useState<'easy' | 'medium' | 'hard'>('medium');
   const [showOptions, setShowOptions] = useState(false); // Can be used for extra features later
   const [autoNext, setAutoNext] = useState(true);
   const [blurEffect, setBlurEffect] = useState(false); // Feature: Blur flag initially
   const [timerEnabled, setTimerEnabled] = useState(false);
   const [timer, setTimer] = useState(30);

   const currentFlagRef = useRef(currentFlag);
   const isActiveRef = useRef(isActive);
   const selectedLevelRef = useRef(selectedLevel);
   const timerRef = useRef<number | null>(null);

   useEffect(() => { currentFlagRef.current = currentFlag; }, [currentFlag]);
   useEffect(() => { isActiveRef.current = isActive; }, [isActive]);
   useEffect(() => { selectedLevelRef.current = selectedLevel; }, [selectedLevel]);

   // Timer Logic
   useEffect(() => {
      if (isActive && timerEnabled && timer > 0) {
         const t = setTimeout(() => setTimer(prev => prev - 1), 1000);
         return () => clearTimeout(t);
      } else if (timer === 0 && isActive && timerEnabled) {
         // Time's up! Reveal answer
         handleRoundWin('Time Up!', currentFlag?.names[0] || 'Unknown', '');
      }
   }, [isActive, timer, timerEnabled]);

   useEffect(() => {
      if (!channelConnected) return;
      const cleanup = chatService.onMessage(async (msg) => {
         if (!isActiveRef.current || !currentFlagRef.current) return;
         const content = msg.content.toLowerCase().trim();

         // Smart fuzzy matching could be added here, but exact substring match is good for now
         // Using .some to check all valid names for the flag
         const isCorrect = currentFlagRef.current.names.some(name => content.includes(name.toLowerCase()));

         if (isCorrect) {
            const username = msg.user.username;
            const currentAvatar = msg.user.avatar;
            const correctName = currentFlagRef.current.names[0];

            await handleRoundWin(username, correctName, currentAvatar);

            // Fetch high-res avatar in background
            chatService.fetchKickAvatar(username).then(realPic => {
               if (realPic) {
                  setLastWinner(prev => (prev && prev.name === username) ? { ...prev, avatar: realPic } : prev);
               }
            });
         }
      });
      return cleanup;
   }, [channelConnected]);

   const nextRound = () => {
      setLastWinner(null);
      setTimer(30); // Reset timer

      // Choose dataset based on level
      const dataset = LEVELS.find(l => l.id === selectedLevelRef.current)?.data || LEVEL_MEDIUM;
      const randomFlag = dataset[Math.floor(Math.random() * dataset.length)];

      setCurrentFlag(randomFlag);
      setIsActive(true);
   };

   const handleRoundWin = async (username: string, answer: string, avatar?: string) => {
      setIsActive(false);
      setLastWinner({ name: username, answer, avatar });
      if (username !== 'Time Up!') {
         setScores(prev => ({ ...prev, [username]: (prev[username] || 0) + 1 }));
         // Points Calculation: Harder level = more points? Kept standard 25 for now.
         await leaderboardService.recordWin(username, avatar || '', 25);
      }

      if (autoNext) {
         setTimeout(() => { nextRound(); }, 4000);
      }
   };

   const startGame = () => { setScores({}); nextRound(); };
   const stopGame = () => { setIsActive(false); setCurrentFlag(null); setLastWinner(null); };

   const sortedScores = Object.entries(scores).sort((a, b) => (b[1] as number) - (a[1] as number));
   const currentLevelObj = LEVELS.find(l => l.id === selectedLevel);

   return (
      <>
         <SidebarPortal>
            <div className="bg-black/80 backdrop-blur-2xl p-6 rounded-[2.5rem] border-2 border-white/5 space-y-6 animate-in slide-in-from-right duration-500 shadow-2xl relative overflow-hidden">
               {/* Decorative Shimmer */}
               <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-600 via-white to-red-600 opacity-50"></div>

               <div className="flex items-center justify-between">
                  <h4 className="text-[14px] font-black text-white uppercase tracking-widest flex items-center gap-3">
                     <Flag size={18} className="text-red-500" /> إعدادات التحدي
                  </h4>
                  <button onClick={onHome} className="p-2.5 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-2xl transition-all border border-white/5"><LogOut size={16} /></button>
               </div>

               {/* 6 DISTINCTIVE SETTINGS / CONTROLS */}
               <div className="space-y-4">

                  {/* 1. Game State Control */}
                  <div className="flex gap-3">
                     {!currentFlag ? (
                        <button onClick={startGame} className="flex-1 bg-gradient-to-r from-red-600 to-red-800 text-white font-black py-4 rounded-[1.5rem] text-[12px] shadow-[0_10px_30px_rgba(220,38,38,0.4)] hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3 border-t border-white/20 uppercase tracking-widest group">
                           <Play size={16} fill="currentColor" className="group-hover:animate-pulse" /> ابـدأ الـلـعـب
                        </button>
                     ) : (
                        <button onClick={stopGame} className="flex-1 bg-zinc-800 text-red-500 font-bold py-4 rounded-[1.5rem] text-[12px] hover:bg-zinc-700 transition-all border border-white/5 uppercase tracking-widest shadow-lg">
                           إنـهـاء الـجـولـة
                        </button>
                     )}
                  </div>

                  {/* 2. Skip & Reset Controls */}
                  <div className="grid grid-cols-2 gap-3">
                     <button onClick={() => nextRound()} disabled={!isActive} className="bg-white/5 text-white/70 py-3 rounded-2xl text-[10px] font-black hover:bg-white/10 hover:text-white border border-white/5 transition-all flex items-center justify-center gap-2 uppercase tracking-tight"><RotateCcw size={14} /> تـخـطـي الـعـلـم</button>
                     <button onClick={() => setScores({})} className="bg-white/5 text-red-400 py-3 rounded-2xl text-[10px] font-black hover:bg-red-600/20 border border-white/5 transition-all flex items-center justify-center gap-2 uppercase tracking-tight"><Settings2 size={14} /> تـصـفـيـر</button>
                  </div>

                  {/* 3. Level Selection (The Core Request) */}
                  <div className="space-y-2 pt-2">
                     <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">مستوى الصعوبة</label>
                     <div className="grid grid-cols-3 gap-2 bg-black/40 p-1.5 rounded-[1.5rem] border border-white/5">
                        {LEVELS.map((lvl) => {
                           const Icon = lvl.icon;
                           const isSel = selectedLevel === lvl.id;
                           return (
                              <button
                                 key={lvl.id}
                                 onClick={() => setSelectedLevel(lvl.id)}
                                 className={`relative flex flex-col items-center justify-center gap-1 py-3 rounded-[1.2rem] transition-all duration-300 ${isSel ? 'bg-white/10 shadow-lg scale-100' : 'hover:bg-white/5 scale-90 opacity-60'}`}
                              >
                                 <Icon size={16} className={`${lvl.color} ${isSel ? 'animate-bounce' : ''}`} />
                                 <span className={`text-[9px] font-black ${isSel ? 'text-white' : 'text-gray-500'}`}>{lvl.label}</span>
                                 {isSel && <div className={`absolute -bottom-1 w-8 h-1 rounded-full ${lvl.color.replace('text', 'bg')}`}></div>}
                              </button>
                           )
                        })}
                     </div>
                     <p className="text-[9px] text-gray-500 text-center font-bold px-2">{currentLevelObj?.desc}</p>
                  </div>

                  {/* 4. Auto Next Toggle */}
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/5">
                     <span className="text-[10px] font-black text-gray-300">التالي تلقائياً</span>
                     <button onClick={() => setAutoNext(!autoNext)} className={`w-10 h-5 rounded-full transition-colors relative ${autoNext ? 'bg-green-500' : 'bg-gray-700'}`}>
                        <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${autoNext ? 'translate-x-5' : ''}`}></div>
                     </button>
                  </div>

                  {/* 5. Blur Effect Toggle (Hard Mode Feature) */}
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/5">
                     <span className="text-[10px] font-black text-gray-300">تشويش الصورة</span>
                     <button onClick={() => setBlurEffect(!blurEffect)} className={`w-10 h-5 rounded-full transition-colors relative ${blurEffect ? 'bg-red-500' : 'bg-gray-700'}`}>
                        <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${blurEffect ? 'translate-x-5' : ''}`}></div>
                     </button>
                  </div>

                  {/* 6. Timer Toggle */}
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/5">
                     <span className="text-[10px] font-black text-gray-300">مؤقت (30ث)</span>
                     <button onClick={() => setTimerEnabled(!timerEnabled)} className={`w-10 h-5 rounded-full transition-colors relative ${timerEnabled ? 'bg-blue-500' : 'bg-gray-700'}`}>
                        <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${timerEnabled ? 'translate-x-5' : ''}`}></div>
                     </button>
                  </div>

               </div>
            </div>

            {/* Leaderboard */}
            <div className="bg-black/80 backdrop-blur-2xl rounded-[2.5rem] border-2 border-white/5 flex flex-col overflow-hidden h-[350px] mt-4 shadow-2xl">
               <div className="p-5 border-b border-white/5 bg-white/5 flex justify-between items-center">
                  <span className="text-[11px] font-black text-white uppercase tracking-widest flex items-center gap-2"><Award size={16} className="text-yellow-500" /> لوحة الأبطال</span>
                  <span className="bg-red-600 text-white px-3 py-1 rounded-[0.8rem] text-[11px] font-black shadow-lg">{sortedScores.length}</span>
               </div>
               <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
                  {sortedScores.map(([name, score], i) => (
                     <div key={name} className="flex items-center justify-between p-3 rounded-[1.5rem] bg-white/5 border border-white/5 hover:bg-white/10 transition-colors group">
                        <div className="flex items-center gap-3">
                           <span className={`w-6 h-6 flex items-center justify-center text-[10px] font-black rounded-full ${i === 0 ? 'bg-yellow-500 text-black shadow-[0_0_10px_yellow]' : 'bg-white/10 text-gray-400'}`}>#{i + 1}</span>
                           <span className="text-[11px] font-bold text-gray-200 truncate max-w-[100px] group-hover:text-white transition-colors">{name}</span>
                        </div>
                        <span className="text-red-500 font-black italic text-lg px-2">{score}</span>
                     </div>
                  ))}
                  {sortedScores.length === 0 && (
                     <div className="h-full flex flex-col items-center justify-center opacity-20">
                        <Award size={40} className="mb-2" />
                        <span className="text-[10px] font-black">لا يوجد فائزين</span>
                     </div>
                  )}
               </div>
            </div>
         </SidebarPortal>

         <div className="w-full h-full flex flex-col items-center justify-center p-12 bg-transparent relative overflow-hidden select-none" dir="ltr">

            {/* Background Ambient */}
            <div className="absolute inset-0 z-0 pointer-events-none">
               <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-[radial-gradient(circle,rgba(220,38,38,0.05)_0%,transparent_60%)]"></div>
               <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>
            </div>

            {!currentFlag ? (
               <div className="text-center animate-in zoom-in duration-1000 z-10 relative">
                  <div className="absolute inset-[-50px] bg-red-600/20 blur-[100px] rounded-full animate-pulse"></div>
                  <div className="relative transform hover:scale-105 transition-transform duration-500">
                     <Flag size={140} className="mx-auto mb-8 text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.3)]" />
                     <h2 className="text-[7rem] font-black text-white italic tracking-tighter uppercase leading-none drop-shadow-2xl">تحدي <span className="text-red-600">الأعلام</span></h2>
                  </div>
                  <div className="flex items-center justify-center gap-4 mt-8">
                     <div className="h-1 w-20 bg-gradient-to-l from-transparent to-red-600"></div>
                     <p className="text-3xl text-gray-300 font-black uppercase tracking-[0.5em] italic">iABS World Quiz</p>
                     <div className="h-1 w-20 bg-gradient-to-r from-transparent to-red-600"></div>
                  </div>
               </div>
            ) : (
               <div className="flex flex-col items-center animate-in zoom-in duration-500 w-full max-w-4xl z-10">

                  {/* HUD Header */}
                  <div className="flex items-center gap-6 mb-10">
                     <div className="bg-black/60 backdrop-blur-xl border border-white/10 px-8 py-3 rounded-full flex items-center gap-4 shadow-2xl">
                        <Globe size={20} className={currentLevelObj?.color} />
                        <span className="text-white font-black uppercase tracking-widest text-sm">{currentLevelObj?.label}</span>
                     </div>
                     {timerEnabled && (
                        <div className={`bg-black/60 backdrop-blur-xl border border-white/10 px-6 py-3 rounded-full font-mono text-2xl font-black shadow-2xl ${timer < 10 ? 'text-red-500 animate-pulse' : 'text-white'}`}>
                           {timer}s
                        </div>
                     )}
                  </div>

                  {/* THE FLAG CARD */}
                  <div className="relative group perspective-1000">
                     <div className="absolute inset-[-20px] bg-gradient-to-br from-red-600/30 to-blue-600/30 blur-[60px] rounded-[3rem] animate-pulse"></div>

                     <div className={`relative p-8 bg-[#0a0a0a] border-[8px] border-white/10 rounded-[3.5rem] shadow-[0_30px_100px_rgba(0,0,0,0.8)] transform-gpu transition-all duration-700 group-hover:scale-[1.02] group-hover:rotate-1`}>
                        <div className="rounded-[2.5rem] overflow-hidden relative w-[640px] h-[400px] flex items-center justify-center bg-zinc-900 border border-white/5">
                           <img
                              src={`https://flagcdn.com/w640/${currentFlag.code}.png`}
                              alt="Flag"
                              className={`w-full h-full object-cover shadow-inner transition-all duration-1000 ${isActive && blurEffect ? 'blur-md scale-110' : 'blur-0 scale-100'}`}
                           />
                           {/* Shine Effect */}
                           <div className="absolute inset-0 bg-gradient-to-tr from-white/10 via-transparent to-transparent opacity-50 pointer-events-none"></div>
                        </div>
                     </div>
                  </div>

                  {/* Game Status / Winner Reveal */}
                  {lastWinner ? (
                     <div className="mt-12 text-center animate-in slide-in-from-bottom-10 fade-in duration-500 z-20">
                        <div className="relative bg-black/80 backdrop-blur-3xl px-16 py-10 rounded-[4rem] border-[3px] border-green-500 shadow-[0_0_100px_rgba(34,197,94,0.3)] min-w-[500px]">
                           <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-green-500 text-black px-8 py-2 rounded-full font-black uppercase tracking-widest text-sm shadow-xl flex items-center gap-2">
                              <CheckCircle2 size={18} /> Round Winner
                           </div>

                           <div className="w-24 h-24 rounded-full border-4 border-green-500 mx-auto mb-4 overflow-hidden shadow-2xl flex items-center justify-center bg-black/40">
                              <ProAvatar
                                 url={lastWinner.avatar || ''}
                                 username={lastWinner.name}
                                 size="w-24 h-24"
                              />
                           </div>

                           <div className="text-6xl font-black text-white italic tracking-tighter uppercase drop-shadow-lg mb-2">{lastWinner.name}</div>
                           <div className="flex items-center justify-center gap-3 text-lg font-bold text-gray-400 uppercase tracking-widest bg-white/5 px-6 py-2 rounded-full mx-auto w-fit">
                              Answer: <span className="text-green-400 font-black text-2xl">{lastWinner.answer}</span>
                           </div>
                        </div>
                     </div>
                  ) : (
                     <div className="mt-16 text-center animate-pulse z-20">
                        <div className="bg-white/5 backdrop-blur-md px-10 py-4 rounded-full border border-white/10 shadow-xl">
                           <p className="text-2xl font-black text-white italic tracking-[0.2em] uppercase flex items-center gap-3">
                              <span className="w-3 h-3 bg-red-600 rounded-full animate-ping"></span>
                              اكتب اسم الدولة في الشات
                              <span className="w-3 h-3 bg-red-600 rounded-full animate-ping"></span>
                           </p>
                        </div>
                     </div>
                  )}
               </div>
            )}
         </div>

         <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 10px; }
        .perspective-1000 { perspective: 1000px; }
      `}</style>
      </>
   );
};
