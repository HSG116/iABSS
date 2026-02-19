import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { chatService } from '../services/chatService';
import { leaderboardService } from '../services/supabase';
import {
   Grid, RotateCcw, Gem, Skull, Target, LogOut, Radar,
   Map as MapIcon, Crosshair, Settings, Users, Play,
   Shield, Zap, Radio, Timer, Trophy, Star, ChevronLeft,
   Search, ShieldCheck, Activity
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface GridHuntProps {
   channelConnected: boolean;
   onHome: () => void;
   isOBS?: boolean;
}

type CellType = 'EMPTY' | 'TREASURE' | 'BOMB' | 'SHIELD' | 'RADAR';
type GamePhase = 'SETTINGS' | 'WAITING' | 'PLAYING' | 'GAME_OVER';

interface GridCell {
   type: CellType;
   revealed: boolean;
   finder?: string;
   avatar?: string;
}

interface GameSettings {
   rows: number;
   cols: number;
   treasureCount: number;
   bombCount: number;
   winnersNeeded: number;
   maxAttempts: number;
   entryMode: 'WAITING' | 'OPEN';
   requiredPlayers: number;
}

const SidebarPortal = ({ children }: { children?: React.ReactNode }) => {
   const [mounted, setMounted] = useState(false);
   useEffect(() => { setMounted(true); return () => setMounted(false); }, []);
   const el = document.getElementById('game-sidebar-portal');
   if (!mounted || !el) return null;
   return createPortal(children, el);
};

export const GridHunt: React.FC<GridHuntProps> = ({ channelConnected, onHome, isOBS }) => {
   const [phase, setPhase] = useState<GamePhase>('SETTINGS');
   const [settings, setSettings] = useState<GameSettings>({
      rows: 10,
      cols: 10,
      treasureCount: 15,
      bombCount: 10,
      winnersNeeded: 1,
      maxAttempts: 2,
      entryMode: 'OPEN',
      requiredPlayers: 5
   });

   const [grid, setGrid] = useState<GridCell[]>([]);
   const [joinedPlayers, setJoinedPlayers] = useState<{ name: string, avatar?: string }[]>([]);
   const [winners, setWinners] = useState<{ name: string, avatar?: string, type: string }[]>([]);
   const [scoreBoard, setScoreBoard] = useState<{ name: string, score: number, avatar?: string, attempts: number, hasShield?: boolean }[]>([]);
   const [lastAction, setLastAction] = useState<{ text: string, type: 'good' | 'bad' | 'neutral' | 'special' } | null>(null);
   const [scannerRow, setScannerRow] = useState<number | null>(null);
   const [scannerCol, setScannerCol] = useState<number | null>(null);

   const phaseRef = useRef(phase);
   const gridRef = useRef(grid);
   const settingsRef = useRef(settings);
   const scoreBoardRef = useRef(scoreBoard);

   useEffect(() => { phaseRef.current = phase; }, [phase]);
   useEffect(() => { gridRef.current = grid; }, [grid]);
   useEffect(() => { settingsRef.current = settings; }, [settings]);
   useEffect(() => { scoreBoardRef.current = scoreBoard; }, [scoreBoard]);

   const initializeGame = () => {
      const totalCells = settings.rows * settings.cols;
      let newGrid: GridCell[] = Array(totalCells).fill(null).map(() => ({ type: 'EMPTY', revealed: false }));

      const placeItems = (type: CellType, count: number) => {
         let placed = 0;
         while (placed < count) {
            const idx = Math.floor(Math.random() * totalCells);
            if (newGrid[idx].type === 'EMPTY') {
               newGrid[idx] = { ...newGrid[idx], type };
               placed++;
            }
         }
      };

      placeItems('TREASURE', settings.treasureCount);
      placeItems('BOMB', settings.bombCount);
      placeItems('SHIELD', 3);
      placeItems('RADAR', 2);

      setGrid(newGrid);
      setWinners([]);
      setScoreBoard([]);
      setJoinedPlayers([]);
      setLastAction(null);
      setPhase(settings.entryMode === 'WAITING' ? 'WAITING' : 'PLAYING');
   };

   useEffect(() => {
      if (!channelConnected) return;

      const cleanup = chatService.onMessage(async (msg) => {
         const content = msg.content.trim().toUpperCase();
         const currentPhase = phaseRef.current;
         const currentSettings = settingsRef.current;
         const currentScores = scoreBoardRef.current;

         if (currentPhase === 'WAITING' && content === 'انضمام') {
            setJoinedPlayers(prev => {
               if (prev.find(p => p.name === msg.user.username)) return prev;
               const newList = [...prev, { name: msg.user.username, avatar: msg.user.avatar }];
               if (newList.length >= currentSettings.requiredPlayers) {
                  setTimeout(() => setPhase('PLAYING'), 2000);
               }
               return newList;
            });
            return;
         }

         if (currentPhase !== 'PLAYING') return;

         const match = content.match(/^([A-J])(10|[1-9])$/);
         if (match) {
            const userStats = currentScores.find(p => p.name === msg.user.username);
            if (currentSettings.maxAttempts > 0 && userStats && userStats.attempts >= currentSettings.maxAttempts) {
               return;
            }

            const colChar = match[1];
            const rowNum = parseInt(match[2]);
            const colIndex = colChar.charCodeAt(0) - 65;
            const rowIndex = rowNum - 1;
            const flatIndex = rowIndex * currentSettings.cols + colIndex;

            const currentGrid = [...gridRef.current];
            if (!currentGrid[flatIndex].revealed) {
               currentGrid[flatIndex] = {
                  ...currentGrid[flatIndex],
                  revealed: true,
                  finder: msg.user.username,
                  avatar: msg.user.avatar
               };

               setGrid(currentGrid);
               updateUserStats(msg.user.username, msg.user.avatar, 1);

               const rect = document.getElementById(`cell-${flatIndex}`)?.getBoundingClientRect();
               const px = rect ? rect.x + rect.width / 2 : window.innerWidth / 2;
               const py = rect ? rect.y + rect.height / 2 : window.innerHeight / 2;

               const cellType = currentGrid[flatIndex].type;

               if (cellType === 'TREASURE') {
                  const foundCount = winners.length + 1;
                  setLastAction({ text: `🎉 ${msg.user.username} عثر على ماوس باد! (#${foundCount})`, type: 'good' });
                  triggerConfetti(px, py, ['#3b82f6', '#fbbf24', '#ffffff']);

                  setWinners(prev => {
                     const newList = [...prev, { name: msg.user.username, avatar: msg.user.avatar, type: 'MOUSEPAD' }];
                     if (newList.length >= currentSettings.winnersNeeded) {
                        setPhase('GAME_OVER');
                        triggerConfetti(window.innerWidth / 2, window.innerHeight / 2, ['#ff0000', '#ffd700'], 150);
                     }
                     return newList;
                  });
                  await leaderboardService.recordWin(msg.user.username, msg.user.avatar || '', 100);
               }
               else if (cellType === 'BOMB') {
                  const hasShield = userStats?.hasShield;
                  if (hasShield) {
                     setLastAction({ text: `🛡️ ${msg.user.username} حمى نفسه من اللغم!`, type: 'special' });
                     removeShield(msg.user.username);
                  } else {
                     setLastAction({ text: `💥 ${msg.user.username} داس على لغم!`, type: 'bad' });
                     triggerConfetti(px, py, ['#ef4444', '#000000'], 20);
                  }
               }
               else if (cellType === 'SHIELD') {
                  setLastAction({ text: `🛡️ ${msg.user.username} حصل على درع حماية!`, type: 'special' });
                  addShield(msg.user.username);
                  triggerConfetti(px, py, ['#10b981', '#ffffff'], 15);
               }
               else if (cellType === 'RADAR') {
                  setLastAction({ text: `📡 ${msg.user.username} فعل الرادار!`, type: 'special' });
                  triggerRadar(rowIndex, colIndex);
               }
               else {
                  setLastAction({ text: `${msg.user.username} حفر في مكان فارغ`, type: 'neutral' });
               }
            }
         }
      });
      return cleanup;
   }, [channelConnected, winners]);

   const triggerConfetti = (x: number, y: number, colors: string[], count: number = 40) => {
      confetti({
         particleCount: count,
         spread: 60,
         origin: { x: x / window.innerWidth, y: y / window.innerHeight },
         colors
      });
   };

   const updateUserStats = (name: string, avatar: string | undefined, attempts: number) => {
      setScoreBoard(prev => {
         const exists = prev.find(p => p.name === name);
         if (exists) {
            return prev.map(p => p.name === name ? { ...p, attempts: p.attempts + attempts } : p);
         }
         return [...prev, { name, score: 0, avatar, attempts, hasShield: false }];
      });
   };

   const addShield = (name: string) => {
      setScoreBoard(prev => prev.map(p => p.name === name ? { ...p, hasShield: true } : p));
   };

   const removeShield = (name: string) => {
      setScoreBoard(prev => prev.map(p => p.name === name ? { ...p, hasShield: false } : p));
   };

   const triggerRadar = (row: number, col: number) => {
      setScannerRow(row);
      setScannerCol(col);
      setTimeout(() => {
         setScannerRow(null);
         setScannerCol(null);
      }, 4000);
   };

   const COL_LABELS = Array.from({ length: settings.cols }, (_, i) => String.fromCharCode(65 + i));
   const ROW_LABELS = Array.from({ length: settings.rows }, (_, i) => i + 1);

   // --- RENDERING LOGIC ---

   if (phase === 'SETTINGS') {
      return (
         <div className="w-full h-full flex items-center justify-center p-6 bg-transparent">
            <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 gap-12 items-center animate-in zoom-in duration-700">
               <div className="space-y-8 text-right md:text-left">
                  <div className="w-24 h-24 bg-iabs-red rounded-[2rem] flex items-center justify-center shadow-[0_20px_50px_rgba(239,68,68,0.4)] rotate-12 mb-6">
                     <Gem size={48} color="white" />
                  </div>
                  <h2 className="text-6xl md:text-7xl font-black italic text-white red-neon-text tracking-tighter leading-tight">صائد<br />الماوس باد</h2>
                  <p className="text-white/40 font-bold uppercase tracking-[0.4em] text-xs">Tactical Intelligence Hub • V2.0</p>

                  <div className="flex flex-wrap gap-4 mt-8">
                     <div className="bg-white/5 border border-white/10 px-6 py-3 rounded-2xl flex items-center gap-3">
                        <Users className="text-blue-500" size={20} />
                        <span className="text-white font-bold text-sm">متعدد اللاعبين</span>
                     </div>
                     <div className="bg-white/5 border border-white/10 px-6 py-3 rounded-2xl flex items-center gap-3">
                        <ShieldCheck className="text-emerald-500" size={20} />
                        <span className="text-white font-bold text-sm">نظام الأمان</span>
                     </div>
                     <div className="bg-white/5 border border-white/10 px-6 py-3 rounded-2xl flex items-center gap-3">
                        <Activity className="text-red-500" size={20} />
                        <span className="text-white font-bold text-sm">تتبع اللحظي</span>
                     </div>
                  </div>
               </div>

               <div className="bg-zinc-900/60 backdrop-blur-3xl p-8 rounded-[3rem] border-2 border-white/10 shadow-2xl space-y-6">
                  <div className="flex items-center gap-3 border-b border-white/10 pb-4 mb-2">
                     <Settings className="text-red-500" />
                     <h3 className="text-white font-black italic text-xl">تجهيز الميدان</h3>
                  </div>

                  <div className="space-y-5">
                     <div className="space-y-2">
                        <label className="text-[10px] text-gray-400 font-bold uppercase tracking-widest pl-2">مود دخول اللاعبين</label>
                        <div className="grid grid-cols-2 gap-3">
                           <button
                              onClick={() => setSettings({ ...settings, entryMode: 'OPEN' })}
                              className={`p-4 rounded-2xl border-2 transition-all font-black text-xs italic ${settings.entryMode === 'OPEN' ? 'bg-red-600 border-red-400 text-white' : 'bg-black/40 border-white/5 text-gray-500'}`}
                           >دخول مفتوح</button>
                           <button
                              onClick={() => setSettings({ ...settings, entryMode: 'WAITING' })}
                              className={`p-4 rounded-2xl border-2 transition-all font-black text-xs italic ${settings.entryMode === 'WAITING' ? 'bg-red-600 border-red-400 text-white' : 'bg-black/40 border-white/5 text-gray-500'}`}
                           >شاشة انتظار</button>
                        </div>
                     </div>

                     <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                           <label className="text-[10px] text-gray-400 font-bold uppercase tracking-widest pl-2">عدد الفائزين</label>
                           <input type="number" value={settings.winnersNeeded} onChange={e => setSettings({ ...settings, winnersNeeded: Number(e.target.value) })} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white font-black text-center" />
                        </div>
                        <div className="space-y-2">
                           <label className="text-[10px] text-gray-400 font-bold uppercase tracking-widest pl-2">المحاولات للفوز</label>
                           <input type="number" value={settings.maxAttempts} onChange={e => setSettings({ ...settings, maxAttempts: Number(e.target.value) })} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white font-black text-center" />
                        </div>
                     </div>

                     <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                           <label className="text-[10px] text-gray-400 font-bold uppercase tracking-widest pl-2">عدد الماوسات</label>
                           <input type="number" value={settings.treasureCount} onChange={e => setSettings({ ...settings, treasureCount: Number(e.target.value) })} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white font-black text-center" />
                        </div>
                        <div className="space-y-2">
                           <label className="text-[10px] text-gray-400 font-bold uppercase tracking-widest pl-2">الألغام</label>
                           <input type="number" value={settings.bombCount} onChange={e => setSettings({ ...settings, bombCount: Number(e.target.value) })} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white font-black text-center" />
                        </div>
                     </div>
                  </div>

                  <div className="flex gap-4 pt-4">
                     <button onClick={onHome} className="p-4 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/10 text-white transition-all"><ChevronLeft /></button>
                     <button onClick={initializeGame} className="flex-1 bg-iabs-red hover:bg-red-500 py-4 rounded-2xl font-black text-white italic tracking-tighter text-lg shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3">
                        <Play size={24} fill="currentColor" /> إطلاق العملية
                     </button>
                  </div>
               </div>
            </div>
         </div>
      );
   }

   if (phase === 'WAITING') {
      return (
         <div className="w-full h-full flex flex-col items-center justify-center p-6 bg-transparent animate-in zoom-in duration-1000">
            <div className="text-center space-y-12 max-w-4xl w-full">
               <div className="relative inline-block">
                  <div className="absolute -inset-10 bg-red-600/20 blur-[60px] animate-pulse rounded-full"></div>
                  <Users size={120} className="text-white relative z-10 animate-bounce" />
                  <div className="absolute -bottom-4 -right-4 bg-red-600 px-6 py-2 rounded-full border-4 border-black text-white font-black text-2xl shadow-xl">
                     {joinedPlayers.length}/{settings.requiredPlayers}
                  </div>
               </div>

               <div className="space-y-4">
                  <h2 className="text-7xl font-black italic text-white red-neon-text tracking-tighter">في انتظار الفريق</h2>
                  <p className="text-2xl text-white/40 font-bold">أكتب <span className="text-white px-4 py-1 bg-red-600 rounded-lg italic">انضمام</span> في الدردشة الآن للدخول</p>
               </div>

               <div className="grid grid-cols-4 md:grid-cols-8 gap-6 justify-center">
                  {joinedPlayers.map((p, i) => (
                     <div key={i} className="space-y-3 animate-in zoom-in" style={{ animationDelay: `${i * 100}ms` }}>
                        <div className="w-20 h-20 rounded-[2rem] overflow-hidden border-4 border-red-600/50 shadow-lg transform hover:rotate-6 transition-transform">
                           <img src={p.avatar} className="w-full h-full object-cover" />
                        </div>
                        <div className="text-xs font-black text-white/50 truncate max-w-[80px] mx-auto italic">{p.name}</div>
                     </div>
                  ))}
                  {Array.from({ length: Math.max(0, settings.requiredPlayers - joinedPlayers.length) }).map((_, i) => (
                     <div key={i} className="w-20 h-20 rounded-[2rem] bg-white/5 border-2 border-white/5 border-dashed flex items-center justify-center text-white/10 font-black text-4xl">?</div>
                  ))}
               </div>

               <button onClick={() => setPhase('SETTINGS')} className="text-white/20 hover:text-white/50 transition-all font-black uppercase tracking-widest text-sm flex items-center gap-2 mx-auto pt-10">
                  <ChevronLeft size={16} /> العودة للإعدادات
               </button>
            </div>
         </div>
      );
   }

   return (
      <>
         <SidebarPortal>
            <div className="bg-zinc-900/90 p-6 rounded-[2.5rem] border border-white/10 space-y-6 animate-in slide-in-from-right duration-500 shadow-2xl backdrop-blur-xl h-full flex flex-col">
               <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <h4 className="text-[14px] font-black text-iabs-red uppercase tracking-widest flex items-center gap-3 italic">
                     <Radar size={18} className="animate-spin-slow" /> الميدان التكتيكي
                  </h4>
                  <button onClick={() => setPhase('SETTINGS')} className="p-2.5 bg-white/5 hover:bg-red-600/20 text-white/50 hover:text-red-500 rounded-xl transition-all border border-white/10">
                     <LogOut size={16} />
                  </button>
               </div>

               <div className="flex-1 space-y-4 overflow-y-auto custom-scrollbar pr-2">
                  <div className="space-y-4">
                     {/* Last Action Box */}
                     {lastAction && (
                        <div className={`p-4 rounded-2xl text-[12px] font-bold text-center border shadow-lg transition-all animate-in slide-in-from-top-4 duration-300 ${lastAction.type === 'good' ? 'bg-blue-600/20 border-blue-500/50 text-blue-300' :
                              lastAction.type === 'bad' ? 'bg-red-600/20 border-red-500/50 text-red-300' :
                                 lastAction.type === 'special' ? 'bg-emerald-600/20 border-emerald-500/50 text-emerald-300' :
                                    'bg-zinc-800/50 border-white/10 text-gray-400'
                           }`}>
                           {lastAction.text}
                        </div>
                     )}

                     {/* Winners Display */}
                     <div className="space-y-2">
                        {winners.map((w, i) => (
                           <div key={i} className="flex items-center justify-between p-3 rounded-2xl bg-gradient-to-r from-yellow-500/20 to-transparent border border-yellow-500/30 animate-in slide-in-from-left duration-500">
                              <div className="flex items-center gap-3">
                                 <Trophy size={20} className="text-yellow-500" />
                                 <div className="w-8 h-8 rounded-full overflow-hidden border border-yellow-500/50">
                                    <img src={w.avatar} className="w-full h-full object-cover" />
                                 </div>
                                 <span className="text-xs font-black text-white italic">{w.name}</span>
                              </div>
                              <span className="text-[10px] font-black text-yellow-500 italic">WINNER</span>
                           </div>
                        ))}
                     </div>

                     {/* Stats Summary */}
                     <div className="grid grid-cols-2 gap-2">
                        <div className="bg-black/40 p-3 rounded-2xl border border-white/5 text-center">
                           <span className="block text-[8px] text-gray-500 font-bold uppercase tracking-widest">متبقي مـاوس</span>
                           <span className="text-xl font-black text-blue-500 italic">{settings.treasureCount - winners.length}</span>
                        </div>
                        <div className="bg-black/40 p-3 rounded-2xl border border-white/5 text-center">
                           <span className="block text-[8px] text-gray-500 font-bold uppercase tracking-widest">عدد الألـغام</span>
                           <span className="text-xl font-black text-red-500 italic">{settings.bombCount}</span>
                        </div>
                     </div>

                     {/* Live Score/Attempts Board */}
                     <div className="bg-black/40 rounded-3xl border border-white/10 p-4 space-y-3">
                        <div className="flex items-center justify-between text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">
                           <span>تحركات المتسابقين</span>
                           <Zap size={14} className="text-yellow-500" />
                        </div>
                        <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                           {scoreBoard.sort((a, b) => b.attempts - a.attempts).map((p, i) => (
                              <div key={i} className="flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all">
                                 <div className="flex items-center gap-3">
                                    <div className="w-6 h-6 rounded-lg overflow-hidden border border-white/10 relative">
                                       <img src={p.avatar} className="w-full h-full object-cover" />
                                       {p.hasShield && <div className="absolute inset-0 bg-emerald-500/40 flex items-center justify-center"><Shield size={10} className="text-white" /></div>}
                                    </div>
                                    <span className="text-[10px] font-bold text-gray-300 truncate max-w-[80px]">{p.name}</span>
                                 </div>
                                 <div className="text-[10px] font-mono font-black text-red-500 bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/20">
                                    {p.attempts}/{settings.maxAttempts || '∞'}
                                 </div>
                              </div>
                           ))}
                        </div>
                     </div>
                  </div>
               </div>

               <button
                  onClick={() => setPhase('SETTINGS')}
                  className="w-full bg-white/5 hover:bg-white/10 py-3 rounded-2xl font-black text-white text-[10px] transition-all border border-white/10 italic flex items-center justify-center gap-2"
               >
                  <RotateCcw size={14} /> إعادة ضبط العملية
               </button>
            </div>
         </SidebarPortal>

         <div className="w-full h-full flex flex-col items-center justify-center p-6 bg-transparent relative overflow-hidden select-none animate-in fade-in duration-500">

            {/* Radar Map Elements */}
            <div className="absolute inset-0 pointer-events-none">
               <div className="w-full h-full opacity-[0.05]" style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '60px 60px' }}></div>
               <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150vh] h-[150vh] rounded-full border border-red-500/5 animate-ping-slow"></div>
            </div>

            <div className="relative z-10 flex flex-col items-center">

               {/* Header Dashboard Overlay */}
               <div className="flex gap-8 mb-8 bg-zinc-900/60 backdrop-blur-2xl px-12 py-5 rounded-[2.5rem] border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
                  <div className="flex items-center gap-4">
                     <div className="w-12 h-12 bg-blue-600/20 rounded-2xl flex items-center justify-center"><Gem size={28} className="text-blue-400" /></div>
                     <div className="text-right">
                        <div className="text-xs text-gray-500 font-black uppercase tracking-widest leading-none mb-1">الماوسات</div>
                        <div className="text-3xl font-black text-white italic leading-none">{winners.length}/{settings.winnersNeeded}</div>
                     </div>
                  </div>
                  <div className="w-[1px] h-12 bg-white/10"></div>
                  <div className="flex items-center gap-4">
                     <div className="w-12 h-12 bg-emerald-600/20 rounded-2xl flex items-center justify-center"><Shield size={28} className="text-emerald-400" /></div>
                     <div className="text-right">
                        <div className="text-xs text-gray-500 font-black uppercase tracking-widest leading-none mb-1">الـدروع</div>
                        <div className="text-3xl font-black text-white italic leading-none">{scoreBoard.filter(p => p.hasShield).length}</div>
                     </div>
                  </div>
                  <div className="w-[1px] h-12 bg-white/10"></div>
                  <div className="flex items-center gap-4 text-center">
                     <div className="text-right">
                        <div className="text-xs text-gray-500 font-black uppercase tracking-widest leading-none mb-1">المهمة</div>
                        <div className="text-3xl font-black text-red-500 italic leading-none animate-pulse">ACTIVE</div>
                     </div>
                  </div>
               </div>

               <div className="flex flex-col items-center">
                  {/* Top Coordinates */}
                  <div className="flex gap-1.5 mb-3 ml-[60px]">
                     {COL_LABELS.map((c, i) => (
                        <div key={c} className={`w-[40px] h-[40px] md:w-[60px] md:h-[60px] flex items-center justify-center font-black text-sm md:text-2xl transition-all ${scannerCol === i ? 'text-white scale-125 drop-shadow-[0_0_15px_white]' : 'text-zinc-600'}`}>
                           {c}
                        </div>
                     ))}
                  </div>

                  <div className="flex gap-3">
                     {/* Left Coordinates */}
                     <div className="flex flex-col gap-1.5">
                        {ROW_LABELS.map((r, i) => (
                           <div key={r} className={`w-[40px] h-[40px] md:w-[60px] md:h-[60px] flex items-center justify-center font-black text-sm md:text-2xl transition-all ${scannerRow === i ? 'text-white scale-125 drop-shadow-[0_0_15px_white]' : 'text-zinc-600'}`}>
                              {r}
                           </div>
                        ))}
                     </div>

                     {/* GRID */}
                     <div className="grid grid-cols-10 gap-1.5 p-4 bg-zinc-950/90 backdrop-blur-3xl rounded-[3rem] border-4 border-white/5 shadow-2xl relative">

                        {/* Scanner Animations */}
                        <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden rounded-[2.5rem]">
                           {scannerRow !== null && (
                              <div className="absolute left-0 w-full h-[60px] bg-red-600/10 border-y-2 border-red-500 shadow-[0_0_50px_rgba(239,68,68,0.3)] animate-pulse" style={{ top: scannerRow * 67.5 + 16 }} />
                           )}
                           {scannerCol !== null && (
                              <div className="absolute top-0 w-[60px] h-full bg-red-600/10 border-x-2 border-red-500 shadow-[0_0_50px_rgba(239,68,68,0.3)] animate-pulse" style={{ left: scannerCol * 67.5 + 16 }} />
                           )}
                        </div>

                        {grid.map((cell, idx) => {
                           const row = Math.floor(idx / settings.cols);
                           const col = idx % settings.cols;
                           const coord = `${String.fromCharCode(65 + col)}${row + 1}`;
                           const isRevealed = cell.revealed;
                           const isBeingScanned = scannerRow === row || scannerCol === col;

                           return (
                              <div
                                 id={`cell-${idx}`}
                                 key={idx}
                                 className={`
                        w-[40px] h-[40px] md:w-[60px] md:h-[60px] rounded-[1rem] border-2 flex items-center justify-center transition-all duration-500 relative overflow-hidden group
                        ${!isRevealed
                                       ? `bg-[#0a0f14] ${isBeingScanned ? 'border-red-500 scale-95 shadow-[0_0_15px_rgba(239,68,68,0.4)]' : 'border-white/5'} hover:border-white/40 hover:bg-zinc-900 cursor-crosshair`
                                       : 'border-transparent rotate-0 scale-100'}
                        ${isRevealed && cell.type === 'TREASURE' ? 'bg-gradient-to-br from-blue-500 to-blue-800 shadow-[0_0_40px_rgba(59,130,246,0.6)] animate-in zoom-in' : ''}
                        ${isRevealed && cell.type === 'BOMB' ? 'bg-gradient-to-br from-red-600 to-red-950 shadow-[0_0_40px_rgba(239,68,68,0.8)] animate-in zoom-in' : ''}
                        ${isRevealed && cell.type === 'SHIELD' ? 'bg-gradient-to-br from-emerald-500 to-emerald-800 shadow-[0_0_40px_rgba(16,185,129,0.8)] animate-in zoom-in' : ''}
                        ${isRevealed && cell.type === 'RADAR' ? 'bg-gradient-to-br from-purple-500 to-purple-800 shadow-[0_0_40px_rgba(168,85,247,0.8)] animate-in zoom-in' : ''}
                        ${isRevealed && cell.type === 'EMPTY' ? 'bg-white/5 scale-90 opacity-40' : ''}
                      `}
                              >
                                 {!isRevealed && (
                                    <span className={`text-[12px] md:text-lg font-black transition-colors ${isBeingScanned ? 'text-white' : 'text-white/10'} group-hover:text-white/40`}>{coord}</span>
                                 )}

                                 {isRevealed && (
                                    <div className="animate-in zoom-in spin-in-180 duration-700 flex items-center justify-center w-full h-full p-2">
                                       {cell.type === 'TREASURE' && <Gem className="w-8 h-8 md:w-12 md:h-12 text-white drop-shadow-[0_0_15px_white]" />}
                                       {cell.type === 'BOMB' && <Skull className="w-8 h-8 md:w-12 md:h-12 text-white animate-bounce" />}
                                       {cell.type === 'SHIELD' && <Shield className="w-8 h-8 md:w-12 md:h-12 text-white drop-shadow-[0_0_15px_white]" />}
                                       {cell.type === 'RADAR' && <Radio className="w-8 h-8 md:w-12 md:h-12 text-white animate-pulse" />}
                                       {cell.type === 'EMPTY' && <div className="w-3 h-3 rounded-full bg-white/20"></div>}
                                    </div>
                                 )}

                                 {isRevealed && cell.finder && cell.type !== 'EMPTY' && (
                                    <div className="absolute bottom-0 w-full bg-black/70 backdrop-blur-sm py-1 border-t border-white/10">
                                       <div className="text-[7px] md:text-[9px] text-white font-black text-center truncate italic px-1 uppercase tracking-tighter">
                                          {cell.finder}
                                       </div>
                                    </div>
                                 )}
                              </div>
                           );
                        })}
                     </div>
                  </div>
               </div>
            </div>

            {/* Floating Legend */}
            <div className="fixed bottom-10 left-1/2 -translate-x-1/2 flex gap-8 items-center bg-black/60 backdrop-blur-3xl px-12 py-5 rounded-[2.5rem] border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
               <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-lg bg-blue-600 shadow-[0_0_15px_rgba(59,130,246,0.6)]"></div>
                  <span className="text-[10px] font-black text-white/50 uppercase tracking-widest italic">Mouse Pad</span>
               </div>
               <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-lg bg-red-600 shadow-[0_0_15px_rgba(239,68,68,0.6)]"></div>
                  <span className="text-[10px] font-black text-white/50 uppercase tracking-widest italic">Bomb</span>
               </div>
               <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-lg bg-emerald-600 shadow-[0_0_15px_rgba(16,185,129,0.6)]"></div>
                  <span className="text-[10px] font-black text-white/50 uppercase tracking-widest italic">Shield</span>
               </div>
               <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-lg bg-purple-600 shadow-[0_0_15px_rgba(168,85,247,0.6)]"></div>
                  <span className="text-[10px] font-black text-white/50 uppercase tracking-widest italic">Radar</span>
               </div>
            </div>

            {/* GAME OVER OVERLAY */}
            {phase === 'GAME_OVER' && (
               <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/80 backdrop-blur-2xl animate-in fade-in duration-1000">
                  <div className="relative mb-8 animate-in zoom-in duration-700">
                     <div className="absolute -inset-40 bg-red-600/20 blur-[150px] animate-pulse rounded-full"></div>
                     <Trophy size={200} className="text-yellow-500 relative z-10 drop-shadow-[0_0_60px_rgba(234,179,8,0.6)]" />
                  </div>
                  <h3 className="text-9xl font-black italic text-white red-neon-text mb-12">اكتملت المهمة!</h3>

                  <div className="flex flex-wrap justify-center gap-8">
                     {winners.map((w, i) => (
                        <div key={i} className="flex flex-col items-center gap-6 bg-white/5 p-10 rounded-[4rem] border-2 border-yellow-500/40 shadow-2xl animate-in slide-in-from-bottom duration-1000" style={{ animationDelay: `${i * 200}ms` }}>
                           <div className="relative">
                              <div className="absolute -inset-4 bg-yellow-500/30 blur-2xl rounded-full animate-pulse"></div>
                              <div className="w-28 h-28 rounded-[2.5rem] overflow-hidden border-4 border-yellow-500 relative z-10">
                                 <img src={w.avatar} className="w-full h-full object-cover" />
                              </div>
                           </div>
                           <div className="text-4xl font-black text-white italic drop-shadow-xl">{w.name}</div>
                           <div className="px-10 py-3 bg-yellow-500 text-black text-lg font-black rounded-full uppercase italic shadow-[0_10px_30px_rgba(234,179,8,0.4)]">MISSION WINNER</div>
                        </div>
                     ))}
                  </div>

                  <button onClick={() => setPhase('SETTINGS')} className="mt-20 text-white/30 hover:text-white font-black text-2xl italic tracking-[0.5em] transition-all hover:scale-110 flex items-center gap-6 group">
                     <RotateCcw className="group-hover:rotate-180 transition-transform duration-700" size={32} /> العودة للقـيادة
                  </button>
               </div>
            )}
         </div>

         <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 10px; }
        .red-neon-text {
          text-shadow: 0 0 20px rgba(255,0,0,0.6), 0 0 40px rgba(255,0,0,0.3);
        }
        @keyframes ping-slow {
          75%, 100% { transform: scale(1.8); opacity: 0; }
        }
        .animate-ping-slow { animation: ping-slow 5s cubic-bezier(0, 0, 0.2, 1) infinite; }
        .animate-spin-slow { animation: spin 15s linear infinite; }
      `}</style>
      </>
   );
};
