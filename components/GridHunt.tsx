import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { chatService } from '../services/chatService';
import { leaderboardService } from '../services/supabase';
import {
   Grid, RotateCcw, Gem, Skull, Target, LogOut, Radar,
   Map as MapIcon, Crosshair, Settings, Users, Play,
   Shield, Zap, Radio, Timer, Trophy, Star, ChevronLeft,
   Search, ShieldCheck, Activity, BarChart3
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
         <div className="w-full h-full flex items-center justify-center p-4 bg-transparent overflow-y-auto">
            <div className="max-w-4xl w-full flex flex-col md:flex-row gap-8 items-stretch animate-in zoom-in duration-700">
               {/* Info Section */}
               <div className="flex-1 space-y-6 text-right md:text-left flex flex-col justify-center bg-zinc-900/40 p-10 rounded-[3rem] border border-white/5">
                  <div className="w-20 h-20 bg-iabs-red rounded-[1.8rem] flex items-center justify-center shadow-[0_15px_40px_rgba(239,68,68,0.3)] rotate-12 mb-2">
                     <Gem size={40} color="white" />
                  </div>
                  <h2 className="text-5xl md:text-6xl font-black italic text-white red-neon-text tracking-tighter leading-tight">صائد<br />الماوس باد</h2>
                  <p className="text-white/30 font-bold uppercase tracking-[0.3em] text-[10px]">Tactical Intelligence • Ver 2.0</p>

                  <div className="space-y-3 pt-6 border-t border-white/5">
                     <div className="flex items-center gap-3 text-white/60">
                        <ShieldCheck className="text-emerald-500" size={18} />
                        <span className="font-bold text-xs italic uppercase">نظام الدروع والوقاية</span>
                     </div>
                     <div className="flex items-center gap-3 text-white/60">
                        <Target className="text-blue-500" size={18} />
                        <span className="font-bold text-xs italic uppercase">رادار المسح التكتيكي</span>
                     </div>
                  </div>
               </div>

               {/* Settings Card */}
               <div className="flex-1 bg-zinc-900/80 backdrop-blur-3xl p-8 rounded-[3rem] border-2 border-white/10 shadow-2xl flex flex-col">
                  <div className="flex items-center gap-3 border-b border-white/10 pb-4 mb-6">
                     <Settings className="text-red-500" size={24} />
                     <h3 className="text-white font-black italic text-xl uppercase tracking-tighter">إعدادات الميدان</h3>
                  </div>

                  <div className="space-y-6 flex-1">
                     <div className="space-y-2">
                        <label className="text-[10px] text-gray-500 font-bold uppercase tracking-widest pl-2 italic">مود دخول اللاعبين</label>
                        <div className="grid grid-cols-2 gap-3">
                           <button
                              onClick={() => setSettings({ ...settings, entryMode: 'OPEN' })}
                              className={`py-3 rounded-2xl border-2 transition-all font-black text-xs italic ${settings.entryMode === 'OPEN' ? 'bg-red-600 border-red-400 text-white' : 'bg-black/40 border-white/5 text-gray-500 hover:text-gray-300'}`}
                           >دخول مفتوح</button>
                           <button
                              onClick={() => setSettings({ ...settings, entryMode: 'WAITING' })}
                              className={`py-3 rounded-2xl border-2 transition-all font-black text-xs italic ${settings.entryMode === 'WAITING' ? 'bg-red-600 border-red-400 text-white' : 'bg-black/40 border-white/5 text-gray-500 hover:text-gray-300'}`}
                           >شاشة انتظار</button>
                        </div>
                     </div>

                     <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                           <label className="text-[10px] text-gray-500 font-bold uppercase tracking-widest pl-2 italic">عدد الفائزين</label>
                           <input type="number" value={settings.winnersNeeded} onChange={e => setSettings({ ...settings, winnersNeeded: Number(e.target.value) })} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white font-black text-center text-sm outline-none focus:border-red-500 transition-colors" />
                        </div>
                        <div className="space-y-2">
                           <label className="text-[10px] text-gray-500 font-bold uppercase tracking-widest pl-2 italic">محاولات الشخص</label>
                           <input type="number" value={settings.maxAttempts} onChange={e => setSettings({ ...settings, maxAttempts: Number(e.target.value) })} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white font-black text-center text-sm outline-none focus:border-red-500 transition-colors" />
                        </div>
                     </div>

                     <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                           <label className="text-[10px] text-gray-500 font-bold uppercase tracking-widest pl-2 italic">الماوسات</label>
                           <input type="number" value={settings.treasureCount} onChange={e => setSettings({ ...settings, treasureCount: Number(e.target.value) })} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white font-black text-center text-sm outline-none focus:border-red-500 transition-colors" />
                        </div>
                        <div className="space-y-2">
                           <label className="text-[10px] text-gray-500 font-bold uppercase tracking-widest pl-2 italic">الألغام</label>
                           <input type="number" value={settings.bombCount} onChange={e => setSettings({ ...settings, bombCount: Number(e.target.value) })} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white font-black text-center text-sm outline-none focus:border-red-500 transition-colors" />
                        </div>
                     </div>
                  </div>

                  <div className="flex gap-4 pt-8">
                     <button onClick={onHome} className="px-5 py-4 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/10 text-white transition-all"><ChevronLeft size={20} /></button>
                     <button onClick={initializeGame} className="flex-1 bg-red-600 hover:bg-red-500 py-4 rounded-2xl font-black text-white italic tracking-tighter text-lg shadow-[0_10px_30px_rgba(185,28,28,0.4)] hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3">
                        <Play size={20} fill="currentColor" /> إطلاق العملية
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
                  <Users size={100} className="text-white relative z-10 animate-bounce" />
                  <div className="absolute -bottom-2 -right-2 bg-red-600 px-5 py-1.5 rounded-full border-4 border-black text-white font-black text-xl shadow-xl">
                     {joinedPlayers.length}/{settings.requiredPlayers}
                  </div>
               </div>

               <div className="space-y-4">
                  <h2 className="text-6xl md:text-7xl font-black italic text-white red-neon-text tracking-tighter">في انتظار الفريق</h2>
                  <p className="text-xl md:text-2xl text-white/40 font-bold">أكتب <span className="text-white px-4 py-1 bg-red-600 rounded-lg italic shadow-[0_0_20px_rgba(220,38,38,0.5)]">انضمام</span> في الدردشة الآن للدخول</p>
               </div>

               <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4 justify-center">
                  {joinedPlayers.map((p, i) => (
                     <div key={i} className="space-y-2 animate-in zoom-in" style={{ animationDelay: `${i * 80}ms` }}>
                        <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-red-600/50 shadow-lg transform hover:scale-110 transition-transform">
                           <img src={p.avatar} className="w-full h-full object-cover" />
                        </div>
                        <div className="text-[9px] font-black text-white/50 truncate max-w-[64px] mx-auto italic uppercase">{p.name}</div>
                     </div>
                  ))}
                  {Array.from({ length: Math.max(0, settings.requiredPlayers - joinedPlayers.length) }).map((_, i) => (
                     <div key={i} className="w-16 h-16 rounded-2xl bg-white/5 border-2 border-white/10 border-dashed flex items-center justify-center text-white/5 font-black text-2xl">?</div>
                  ))}
               </div>

               <button onClick={() => setPhase('SETTINGS')} className="text-white/20 hover:text-white/50 transition-all font-black uppercase tracking-widest text-[10px] flex items-center gap-2 mx-auto pt-12 italic">
                  <ChevronLeft size={14} /> العودة للإعدادات
               </button>
            </div>
         </div>
      );
   }

   return (
      <>
         <SidebarPortal>
            <div className="bg-zinc-900/90 p-5 rounded-[2rem] border-l border-white/10 space-y-6 animate-in slide-in-from-right duration-500 shadow-2xl backdrop-blur-3xl h-full flex flex-col w-[320px]">
               <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <h4 className="text-[12px] font-black text-iabs-red uppercase tracking-widest flex items-center gap-2 italic">
                     <Radar size={16} className="animate-spin-slow" /> الميدان التكتيكي
                  </h4>
                  <button onClick={() => setPhase('SETTINGS')} className="p-2 bg-white/5 hover:bg-red-600/20 text-white/40 hover:text-red-500 rounded-lg transition-all border border-white/5">
                     <LogOut size={14} />
                  </button>
               </div>

               <div className="flex-1 space-y-6 overflow-y-auto custom-scrollbar pr-1">
                  {/* Dynamic Alerts */}
                  {lastAction && (
                     <div className={`p-4 rounded-xl text-[11px] font-black text-center border shadow-xl transition-all animate-in slide-in-from-top duration-300 italic ${lastAction.type === 'good' ? 'bg-blue-600/10 border-blue-500/30 text-blue-400' :
                           lastAction.type === 'bad' ? 'bg-red-600/10 border-red-500/30 text-red-400' :
                              lastAction.type === 'special' ? 'bg-emerald-600/10 border-emerald-500/30 text-emerald-400' :
                                 'bg-white/5 border-white/10 text-gray-500'
                        }`}>
                        {lastAction.text}
                     </div>
                  )}

                  {/* Top Winners (Compact) */}
                  {winners.length > 0 && (
                     <div className="space-y-2">
                        <div className="flex items-center gap-2 text-[9px] font-black text-white/30 uppercase tracking-widest mb-1">
                           <Trophy size={10} className="text-yellow-500" /> الأبطال الفائزون
                        </div>
                        {winners.map((w, i) => (
                           <div key={i} className="flex items-center justify-between p-2 rounded-xl bg-yellow-500/5 border border-yellow-500/20 animate-in slide-in-from-left duration-300">
                              <div className="flex items-center gap-2">
                                 <div className="w-7 h-7 rounded-lg overflow-hidden border border-yellow-500/30">
                                    <img src={w.avatar} className="w-full h-full object-cover" />
                                 </div>
                                 <span className="text-[10px] font-black text-white italic">{w.name}</span>
                              </div>
                              <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse"></div>
                           </div>
                        ))}
                     </div>
                  )}

                  {/* Live Scoreboard (TALLER) */}
                  <div className="bg-black/30 rounded-2xl border border-white/5 flex flex-col flex-1 min-h-[400px]">
                     <div className="p-3 border-b border-white/5 bg-white/5 flex justify-between items-center rounded-t-2xl">
                        <span className="text-[9px] font-black text-white/40 uppercase tracking-widest flex items-center gap-2 italic">
                           <BarChart3 size={12} className="text-red-500" /> نشاط الميدان
                        </span>
                        <span className="text-[8px] font-bold text-gray-600">LIVE FEED</span>
                     </div>
                     <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
                        {scoreBoard.sort((a, b) => b.attempts - a.attempts).map((p, i) => (
                           <div key={i} className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all group">
                              <div className="flex items-center gap-2.5">
                                 <div className="w-7 h-7 rounded-lg overflow-hidden border border-white/10 relative">
                                    <img src={p.avatar} className="w-full h-full object-cover" />
                                    {p.hasShield && <div className="absolute inset-0 bg-emerald-500/50 flex items-center justify-center"><Shield size={10} className="text-white" /></div>}
                                 </div>
                                 <span className="text-[10px] font-bold text-gray-400 group-hover:text-white truncate max-w-[90px] italic">{p.name}</span>
                              </div>
                              <div className={`text-[10px] font-mono font-black border px-2 py-0.5 rounded-lg transition-colors ${p.attempts >= settings.maxAttempts ? 'bg-red-500/20 border-red-500/30 text-red-400' : 'bg-white/5 border-white/10 text-gray-500'}`}>
                                 {p.attempts}/{settings.maxAttempts || '∞'}
                              </div>
                           </div>
                        ))}
                        {scoreBoard.length === 0 && (
                           <div className="h-full flex flex-col items-center justify-center py-20 opacity-10">
                              <Radar size={40} />
                              <span className="text-[8px] font-black tracking-widest mt-2 uppercase">Searching for targets...</span>
                           </div>
                        )}
                     </div>
                  </div>
               </div>

               <button
                  onClick={() => setPhase('SETTINGS')}
                  className="w-full bg-white/5 hover:bg-white/10 py-3 rounded-xl font-black text-white text-[9px] transition-all border border-white/5 italic flex items-center justify-center gap-2 uppercase tracking-widest"
               >
                  <RotateCcw size={14} /> إعادة التوجيه الفني
               </button>
            </div>
         </SidebarPortal>

         <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-transparent relative overflow-hidden select-none animate-in fade-in duration-500">

            {/* Radar Map Elements */}
            <div className="absolute inset-0 pointer-events-none">
               <div className="w-full h-full opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '50px 50px' }}></div>
               <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[160vh] h-[160vh] rounded-full border border-red-500/5 animate-ping-slow"></div>
            </div>

            <div className="relative z-10 flex flex-col items-center max-w-[90vw]">

               {/* Header Dashboard (MORE COMPACT) */}
               <div className="flex gap-6 mb-6 bg-zinc-900/40 backdrop-blur-3xl px-10 py-4 rounded-[2rem] border border-white/10 shadow-2xl">
                  <div className="flex items-center gap-3">
                     <div className="w-10 h-10 bg-blue-600/10 rounded-xl flex items-center justify-center border border-blue-500/20"><Gem size={22} className="text-blue-400" /></div>
                     <div>
                        <div className="text-[8px] text-gray-500 font-black uppercase tracking-widest leading-none mb-1">الماوسات</div>
                        <div className="text-2xl font-black text-white italic leading-none">{winners.length}/{settings.winnersNeeded}</div>
                     </div>
                  </div>
                  <div className="w-[1px] h-10 bg-white/5"></div>
                  <div className="flex items-center gap-3">
                     <div className="w-10 h-10 bg-emerald-600/10 rounded-xl flex items-center justify-center border border-emerald-500/20"><Shield size={22} className="text-emerald-400" /></div>
                     <div>
                        <div className="text-[8px] text-gray-500 font-black uppercase tracking-widest leading-none mb-1">الـدروع</div>
                        <div className="text-2xl font-black text-white italic leading-none">{scoreBoard.filter(p => p.hasShield).length}</div>
                     </div>
                  </div>
                  <div className="w-[1px] h-10 bg-white/5"></div>
                  <div className="flex items-center gap-3 text-right">
                     <div className="px-3 py-1 bg-red-600/20 border border-red-500/30 rounded-lg">
                        <div className="text-[10px] font-black text-red-500 italic animate-pulse tracking-tighter">OPERATIONAL</div>
                     </div>
                  </div>
               </div>

               <div className="flex flex-col items-center transform scale-[0.85] md:scale-100">
                  {/* Top Coordinates */}
                  <div className="flex gap-1 mb-2 ml-[45px] md:ml-[55px]">
                     {COL_LABELS.map((c, i) => (
                        <div key={c} className={`w-[35px] h-[35px] md:w-[50px] md:h-[50px] flex items-center justify-center font-black text-xs md:text-xl transition-all ${scannerCol === i ? 'text-white scale-125 drop-shadow-[0_0_10px_white]' : 'text-zinc-700'}`}>
                           {c}
                        </div>
                     ))}
                  </div>

                  <div className="flex gap-2">
                     {/* Left Coordinates */}
                     <div className="flex flex-col gap-1">
                        {ROW_LABELS.map((r, i) => (
                           <div key={r} className={`w-[35px] h-[35px] md:w-[50px] md:h-[50px] flex items-center justify-center font-black text-xs md:text-xl transition-all ${scannerRow === i ? 'text-white scale-125 drop-shadow-[0_0_10px_white]' : 'text-zinc-700'}`}>
                              {r}
                           </div>
                        ))}
                     </div>

                     {/* GRID (COMPACTED) */}
                     <div className="grid grid-cols-10 gap-1 p-3 bg-zinc-950/90 backdrop-blur-3xl rounded-[2.5rem] border-2 border-white/5 shadow-2xl relative">

                        {/* Scanner Animations */}
                        <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden rounded-[2rem]">
                           {scannerRow !== null && (
                              <div className="absolute left-0 w-full h-[50px] bg-red-600/5 border-y-2 border-red-500/50 shadow-[0_0_30px_rgba(239,68,68,0.2)] animate-pulse" style={{ top: scannerRow * 51 + 14 }} />
                           )}
                           {scannerCol !== null && (
                              <div className="absolute top-0 w-[50px] h-full bg-red-600/5 border-x-2 border-red-500/50 shadow-[0_0_30px_rgba(239,68,68,0.2)] animate-pulse" style={{ left: scannerCol * 51 + 14 }} />
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
                        w-[35px] h-[35px] md:w-[50px] md:h-[50px] rounded-lg border flex items-center justify-center transition-all duration-500 relative overflow-hidden group
                        ${!isRevealed
                                       ? `bg-[#070b0f] ${isBeingScanned ? 'border-red-500/50 scale-95 shadow-inner' : 'border-white/[0.03]'} hover:border-white/20 hover:bg-zinc-900 cursor-crosshair`
                                       : 'border-transparent'}
                        ${isRevealed && cell.type === 'TREASURE' ? 'bg-gradient-to-br from-blue-500 to-blue-900 shadow-[0_0_20px_rgba(59,130,246,0.4)] animate-in zoom-in' : ''}
                        ${isRevealed && cell.type === 'BOMB' ? 'bg-gradient-to-br from-red-600 to-red-950 shadow-[0_0_20px_rgba(239,68,68,0.6)] animate-in zoom-in' : ''}
                        ${isRevealed && cell.type === 'SHIELD' ? 'bg-gradient-to-br from-emerald-500 to-emerald-900 shadow-[0_0_20px_rgba(16,185,129,0.6)] animate-in zoom-in' : ''}
                        ${isRevealed && cell.type === 'RADAR' ? 'bg-gradient-to-br from-purple-500 to-purple-900 shadow-[0_0_20px_rgba(168,85,247,0.6)] animate-in zoom-in' : ''}
                        ${isRevealed && cell.type === 'EMPTY' ? 'bg-white/5 opacity-40' : ''}
                      `}
                              >
                                 {!isRevealed && (
                                    <span className={`text-[9px] md:text-sm font-black transition-colors ${isBeingScanned ? 'text-white' : 'text-white/5'} group-hover:text-white/20`}>{coord}</span>
                                 )}

                                 {isRevealed && (
                                    <div className="animate-in zoom-in spin-in-180 duration-700 flex items-center justify-center w-full h-full p-2">
                                       {cell.type === 'TREASURE' && <Gem className="w-6 h-6 md:w-9 md:h-9 text-white" />}
                                       {cell.type === 'BOMB' && <Skull className="w-6 h-6 md:w-9 md:h-9 text-white animate-bounce" />}
                                       {cell.type === 'SHIELD' && <Shield className="w-6 h-6 md:w-9 md:h-9 text-white" />}
                                       {cell.type === 'RADAR' && <Radio className="w-6 h-6 md:w-9 md:h-9 text-white animate-pulse" />}
                                       {cell.type === 'EMPTY' && <div className="w-2 h-2 rounded-full bg-white/20"></div>}
                                    </div>
                                 )}

                                 {isRevealed && cell.finder && cell.type !== 'EMPTY' && (
                                    <div className="absolute bottom-0 w-full bg-black/60 backdrop-blur-sm py-0.5 border-t border-white/5">
                                       <div className="text-[6px] md:text-[8px] text-white font-bold text-center truncate italic px-1 uppercase tracking-tighter">
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

            {/* Floating Legend (COMPACT) */}
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex gap-6 items-center bg-black/60 backdrop-blur-3xl px-8 py-3 rounded-full border border-white/10 shadow-xl">
               <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-md bg-blue-600"></div>
                  <span className="text-[8px] font-black text-white/40 uppercase tracking-widest italic">Mouse Pad</span>
               </div>
               <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-md bg-red-600"></div>
                  <span className="text-[8px] font-black text-white/40 uppercase tracking-widest italic">Bomb</span>
               </div>
               <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-md bg-emerald-600"></div>
                  <span className="text-[8px] font-black text-white/40 uppercase tracking-widest italic">Shield</span>
               </div>
               <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-md bg-purple-600"></div>
                  <span className="text-[8px] font-black text-white/40 uppercase tracking-widest italic">Radar</span>
               </div>
            </div>

            {/* GAME OVER OVERLAY (COMPACTED) */}
            {phase === 'GAME_OVER' && (
               <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/85 backdrop-blur-2xl animate-in fade-in duration-1000 p-8">
                  <div className="relative mb-6 animate-in zoom-in duration-700">
                     <div className="absolute -inset-20 bg-red-600/20 blur-[100px] animate-pulse rounded-full"></div>
                     <Trophy size={140} className="text-yellow-500 relative z-10 drop-shadow-[0_0_40px_rgba(234,179,8,0.5)]" />
                  </div>
                  <h3 className="text-7xl md:text-8xl font-black italic text-white red-neon-text mb-8">اكتملت المهمة!</h3>

                  <div className="flex flex-wrap justify-center gap-6">
                     {winners.map((w, i) => (
                        <div key={i} className="flex flex-col items-center gap-4 bg-white/5 p-8 rounded-[3rem] border-2 border-yellow-500/30 shadow-2xl animate-in slide-in-from-bottom duration-1000" style={{ animationDelay: `${i * 150}ms` }}>
                           <div className="w-20 h-20 rounded-[1.8rem] overflow-hidden border-4 border-yellow-500">
                              <img src={w.avatar} className="w-full h-full object-cover" />
                           </div>
                           <div className="text-2xl font-black text-white italic">{w.name}</div>
                           <div className="px-6 py-2 bg-yellow-500 text-black text-xs font-black rounded-full uppercase italic">MISSION COMPLETE</div>
                        </div>
                     ))}
                  </div>

                  <button onClick={() => setPhase('SETTINGS')} className="mt-16 text-white/30 hover:text-white font-black text-lg italic tracking-[0.4em] transition-all hover:scale-110 flex items-center gap-4 group">
                     <RotateCcw className="group-hover:rotate-180 transition-transform duration-700" size={24} /> العودة للقـيادة
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
          75%, 100% { transform: scale(1.6); opacity: 0; }
        }
        .animate-ping-slow { animation: ping-slow 5s cubic-bezier(0, 0, 0.2, 1) infinite; }
        .animate-spin-slow { animation: spin 15s linear infinite; }
      `}</style>
      </>
   );
};
