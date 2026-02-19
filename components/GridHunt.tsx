import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { chatService } from '../services/chatService';
import { leaderboardService } from '../services/supabase';
import {
   Grid, RotateCcw, Gem, Skull, Target, LogOut, Radar,
   Map as MapIcon, Crosshair, Settings, Users, Play,
   Shield, Zap, Radio, Timer, Trophy, Star, ChevronLeft,
   Search, ShieldCheck, Activity, BarChart3, Bomb
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface GridHuntProps {
   channelConnected: boolean;
   onHome: () => void;
   isOBS?: boolean;
}

type CellType = 'EMPTY' | 'TREASURE' | 'BOMB';
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
      maxAttempts: 2,
      entryMode: 'OPEN',
      requiredPlayers: 5
   });

   const [grid, setGrid] = useState<GridCell[]>([]);
   const [joinedPlayers, setJoinedPlayers] = useState<{ name: string, avatar?: string }[]>([]);
   const [winner, setWinner] = useState<{ name: string, avatar?: string } | null>(null);
   const [scoreBoard, setScoreBoard] = useState<{ name: string, score: number, avatar?: string, attempts: number }[]>([]);
   const [lastAction, setLastAction] = useState<{ text: string, type: 'good' | 'bad' | 'neutral' } | null>(null);

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
      // Decision made BEFORE game: One winner, everything else is a BOMB
      let newGrid: GridCell[] = Array(totalCells).fill(null).map(() => ({ type: 'BOMB', revealed: false }));

      // Decide the winning square
      const winnerIdx = Math.floor(Math.random() * totalCells);
      newGrid[winnerIdx] = { type: 'TREASURE', revealed: false };

      setGrid(newGrid);
      setWinner(null);
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

         // Improved Coordinate Parsing: Matches A1, C3, J10, etc. Handle spaces like "C 1"
         const match = content.match(/^([A-Z])\s*(\d+)$/);
         if (match) {
            const colChar = match[1];
            const rowNum = parseInt(match[2]);
            const colIndex = colChar.charCodeAt(0) - 65;
            const rowIndex = rowNum - 1;

            // Check bounds
            if (colIndex < 0 || colIndex >= currentSettings.cols || rowIndex < 0 || rowIndex >= currentSettings.rows) {
               return;
            }

            const userStats = currentScores.find(p => p.name === msg.user.username);
            if (currentSettings.maxAttempts > 0 && userStats && userStats.attempts >= currentSettings.maxAttempts) {
               return;
            }

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

               const cellType = currentGrid[flatIndex].type;

               if (cellType === 'TREASURE') {
                  setLastAction({ text: `🏆 تم العثور على الماوس باد بواسطة ${msg.user.username}!`, type: 'good' });
                  setWinner({ name: msg.user.username, avatar: msg.user.avatar });
                  triggerConfetti(window.innerWidth / 2, window.innerHeight / 2, ['#ff0000', '#ffd700'], 150);
                  setPhase('GAME_OVER');
                  await leaderboardService.recordWin(msg.user.username, msg.user.avatar || '', 500);
               }
               else {
                  setLastAction({ text: `💥 انفجار! ${msg.user.username} اختار لغماً!`, type: 'bad' });
                  const rect = document.getElementById(`cell-${flatIndex}`)?.getBoundingClientRect();
                  if (rect) triggerConfetti(rect.x + rect.width / 2, rect.y + rect.height / 2, ['#ef4444', '#000000'], 15);
               }
            }
         }
      });
      return cleanup;
   }, [channelConnected]);

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
         return [...prev, { name, score: 0, avatar, attempts }];
      });
   };

   const COL_LABELS = Array.from({ length: settings.cols }, (_, i) => String.fromCharCode(65 + i));
   const ROW_LABELS = Array.from({ length: settings.rows }, (_, i) => i + 1);

   // --- RENDERING LOGIC ---

   if (phase === 'SETTINGS') {
      return (
         <div className="w-full h-full flex items-center justify-center p-4 bg-transparent overflow-y-auto">
            <div className="max-w-4xl w-full flex flex-col md:flex-row gap-8 items-center animate-in zoom-in duration-700">
               {/* Info Section */}
               <div className="flex-1 space-y-4 text-center md:text-left flex flex-col justify-center bg-zinc-900/40 p-10 md:p-14 rounded-[3.5rem] border border-white/5">
                  <div className="w-20 h-20 bg-iabs-red rounded-[2rem] flex items-center justify-center shadow-[0_15px_40px_rgba(239,68,68,0.4)] rotate-12 mb-6 mx-auto md:mx-0">
                     <Gem size={40} color="white" />
                  </div>
                  <h2 className="text-5xl md:text-6xl font-black italic text-white red-neon-text tracking-tighter leading-tight">صائد البطل<br />الواحد</h2>
                  <p className="text-white/30 font-bold uppercase tracking-[0.3em] text-[10px]">One Target • Total Destruction</p>

                  <div className="pt-8 space-y-3">
                     <div className="flex items-center gap-3 text-white/50 justify-center md:justify-start">
                        <Target size={16} className="text-red-500" />
                        <span className="font-black text-[10px] italic">ماوس باد واحد مخفي</span>
                     </div>
                     <div className="flex items-center gap-3 text-white/50 justify-center md:justify-start">
                        <Bomb size={16} className="text-red-600" />
                        <span className="font-black text-[10px] italic">باقي الميدان مليء بالألغام</span>
                     </div>
                  </div>
               </div>

               {/* Settings Card */}
               <div className="flex-[1.2] bg-zinc-900/80 backdrop-blur-3xl p-10 rounded-[3.5rem] border-2 border-white/10 shadow-2xl flex flex-col w-full">
                  <div className="flex items-center gap-3 border-b border-white/10 pb-6 mb-8">
                     <Settings className="text-red-500" size={24} />
                     <h3 className="text-white font-black italic text-2xl uppercase tracking-tighter">التحكم بالميدان</h3>
                  </div>

                  <div className="space-y-8 flex-1">
                     <div className="space-y-3">
                        <label className="text-[10px] text-gray-500 font-black uppercase tracking-widest pl-2 italic">نظام دخول اللاعبين</label>
                        <div className="grid grid-cols-1 gap-3">
                           <button
                              onClick={() => setSettings({ ...settings, entryMode: 'OPEN' })}
                              className={`py-4 rounded-2xl border-2 transition-all font-black text-xs italic flex items-center justify-center gap-3 ${settings.entryMode === 'OPEN' ? 'bg-red-600 border-red-400 text-white shadow-lg' : 'bg-black/40 border-white/5 text-gray-500 hover:text-gray-300'}`}
                           >
                              <Radar size={16} /> دخول مفتوح للجميع
                           </button>
                           <button
                              onClick={() => setSettings({ ...settings, entryMode: 'WAITING' })}
                              className={`py-4 rounded-2xl border-2 transition-all font-black text-xs italic flex items-center justify-center gap-3 ${settings.entryMode === 'WAITING' ? 'bg-red-600 border-red-400 text-white shadow-lg' : 'bg-black/40 border-white/5 text-gray-500 hover:text-gray-300'}`}
                           >
                              <Users size={16} /> شاشة انتظار اللاعبين
                           </button>
                        </div>
                     </div>

                     <div className="space-y-3">
                        <label className="text-[10px] text-gray-500 font-black uppercase tracking-widest pl-2 italic">أقصى محاولات للشخص</label>
                        <div className="flex items-center gap-4 bg-black/40 p-4 rounded-2xl border border-white/10">
                           <input
                              type="number"
                              value={settings.maxAttempts}
                              onChange={e => setSettings({ ...settings, maxAttempts: Number(e.target.value) })}
                              className="flex-1 bg-transparent text-white font-black text-center text-xl outline-none"
                           />
                           <Zap size={20} className="text-yellow-500" />
                        </div>
                     </div>
                  </div>

                  <div className="flex gap-4 pt-10">
                     <button onClick={onHome} className="px-6 py-5 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/10 text-white transition-all"><ChevronLeft size={24} /></button>
                     <button onClick={initializeGame} className="flex-1 bg-red-600 hover:bg-red-500 py-5 rounded-2xl font-black text-white italic tracking-tighter text-xl shadow-[0_15px_45px_rgba(185,28,28,0.5)] hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3">
                        <Play size={24} fill="currentColor" /> تـبـدأ الآن
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
            <div className="text-center space-y-12 max-w-4xl w-full bg-zinc-900/40 p-16 rounded-[4rem] border border-white/5 backdrop-blur-3xl">
               <div className="relative inline-block">
                  <div className="absolute -inset-10 bg-red-600/20 blur-[60px] animate-pulse rounded-full"></div>
                  <Users size={120} className="text-white relative z-10 animate-bounce" />
                  <div className="absolute -bottom-2 -right-2 bg-red-600 px-6 py-2 rounded-full border-4 border-black text-white font-black text-2xl shadow-xl">
                     {joinedPlayers.length}/{settings.requiredPlayers}
                  </div>
               </div>

               <div className="space-y-4">
                  <h2 className="text-6xl md:text-7xl font-black italic text-white red-neon-text tracking-tighter">في انتظار الفريق</h2>
                  <p className="text-xl md:text-2xl text-white/40 font-bold">أكتب <span className="text-white px-6 py-2 bg-red-600 rounded-2xl italic shadow-[0_0_30px_rgba(220,38,38,0.5)]">انضمام</span> في الدردشة</p>
               </div>

               <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4 justify-center">
                  {joinedPlayers.map((p, i) => (
                     <div key={i} className="space-y-2 animate-in zoom-in" style={{ animationDelay: `${i * 50}ms` }}>
                        <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-red-600/50 shadow-lg transform hover:scale-110 transition-transform">
                           <img src={p.avatar} className="w-full h-full object-cover" />
                        </div>
                        <div className="text-[10px] font-black text-white/50 truncate max-w-[64px] mx-auto italic uppercase">{p.name}</div>
                     </div>
                  ))}
                  {Array.from({ length: Math.max(0, settings.requiredPlayers - joinedPlayers.length) }).map((_, i) => (
                     <div key={i} className="w-16 h-16 rounded-2xl bg-white/5 border-2 border-white/10 border-dashed flex items-center justify-center text-white/5 font-black text-3xl">?</div>
                  ))}
               </div>

               <button onClick={() => setPhase('SETTINGS')} className="text-white/20 hover:text-white/50 transition-all font-black uppercase tracking-widest text-[10px] flex items-center gap-2 mx-auto pt-10 italic">
                  <ChevronLeft size={16} /> العودة للإعدادات
               </button>
            </div>
         </div>
      );
   }

   return (
      <>
         <SidebarPortal>
            <div className="h-full flex flex-col p-6 space-y-6">
               {/* Dynamic Alerts */}
               {lastAction && (
                  <div className={`p-5 rounded-2xl text-[12px] font-black text-center border shadow-xl transition-all animate-in slide-in-from-top duration-300 italic ${lastAction.type === 'good' ? 'bg-blue-600/10 border-blue-500/30 text-blue-400' :
                        lastAction.type === 'bad' ? 'bg-red-600/10 border-red-500/30 text-red-400' :
                           'bg-white/5 border-white/10 text-gray-500'
                     }`}>
                     {lastAction.text}
                  </div>
               )}

               {/* Live Scoreboard */}
               <div className="bg-black/30 rounded-[2.5rem] border border-white/5 flex flex-col flex-1 min-h-[500px] shadow-2xl overflow-hidden">
                  <div className="p-5 border-b border-white/5 bg-white/5 flex justify-between items-center">
                     <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] flex items-center gap-2 italic">
                        <BarChart3 size={14} className="text-red-500" /> نشاط الميدان
                     </span>
                     <span className="text-[8px] font-bold text-gray-700">TARGET ACQUISITION</span>
                  </div>
                  <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
                     {scoreBoard.sort((a, b) => b.attempts - a.attempts).map((p, i) => (
                        <div key={i} className={`flex items-center justify-between p-3 rounded-2xl border transition-all group ${p.attempts >= settings.maxAttempts ? 'bg-red-600/5 border-red-900/30 opacity-60' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}>
                           <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl overflow-hidden border border-white/10">
                                 <img src={p.avatar} className="w-full h-full object-cover" />
                              </div>
                              <span className="text-[11px] font-black text-gray-300 group-hover:text-white truncate max-w-[120px] italic">{p.name}</span>
                           </div>
                           <div className={`text-[11px] font-mono font-black border px-3 py-1 rounded-xl transition-colors ${p.attempts >= settings.maxAttempts ? 'bg-red-500/20 border-red-500/30 text-red-400' : 'bg-white/5 border-white/10 text-gray-500'}`}>
                              {p.attempts}/{settings.maxAttempts || '∞'}
                           </div>
                        </div>
                     ))}
                     {scoreBoard.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center py-40 opacity-10">
                           <Radar size={60} className="animate-pulse" />
                           <span className="text-[10px] font-black tracking-[0.3em] mt-6 uppercase">Listening for coordinates...</span>
                        </div>
                     )}
                  </div>
               </div>

               <button
                  onClick={() => setPhase('SETTINGS')}
                  className="w-full bg-white/5 hover:bg-red-600/20 py-4 rounded-2xl font-black text-white text-[10px] transition-all border border-white/5 italic flex items-center justify-center gap-3 uppercase tracking-widest"
               >
                  <RotateCcw size={16} /> العودة لغرفة المراقبة
               </button>
            </div>
         </SidebarPortal>

         <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-transparent relative overflow-hidden select-none animate-in fade-in duration-500">

            {/* Radar Map Elements */}
            <div className="absolute inset-0 pointer-events-none">
               <div className="w-full h-full opacity-[0.025]" style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
               <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200vh] h-[200vh] rounded-full border border-red-500/5 animate-ping-slow"></div>
            </div>

            <div className="relative z-10 flex flex-col items-center max-w-[95vw]">

               {/* Header Dashboard */}
               <div className="flex gap-8 mb-8 bg-black/40 backdrop-blur-3xl px-12 py-6 rounded-[3rem] border-2 border-white/5 shadow-2xl">
                  <div className="flex items-center gap-4">
                     <div className="w-12 h-12 bg-red-600/10 rounded-2xl flex items-center justify-center border border-red-500/20"><Skull size={24} className="text-red-500" /></div>
                     <div>
                        <div className="text-[8px] text-gray-500 font-black uppercase tracking-widest leading-none mb-1">حمولة الألغام</div>
                        <div className="text-3xl font-black text-white italic leading-none">{settings.rows * settings.cols - 1}</div>
                     </div>
                  </div>
                  <div className="w-[1px] h-12 bg-white/5"></div>
                  <div className="flex items-center gap-4">
                     <div className="w-12 h-12 bg-blue-600/10 rounded-2xl flex items-center justify-center border border-blue-500/20"><Gem size={24} className="text-blue-400" /></div>
                     <div>
                        <div className="text-[8px] text-gray-500 font-black uppercase tracking-widest leading-none mb-1">الهدف الثمين</div>
                        <div className="text-3xl font-black text-white italic leading-none">{winner ? '0' : '1'}</div>
                     </div>
                  </div>
                  <div className="w-[1px] h-12 bg-white/5"></div>
                  <div className="flex items-center gap-4">
                     <div className="px-5 py-2 bg-red-600 rounded-xl shadow-[0_0_20px_rgba(239,68,68,0.4)]">
                        <div className="text-[12px] font-black text-white italic animate-pulse tracking-widest">ACTIVE SIGNAL</div>
                     </div>
                  </div>
               </div>

               <div className="flex flex-col items-center transform scale-[0.8] md:scale-90 lg:scale-100 origin-center">
                  {/* Top Coordinates */}
                  <div className="flex gap-1 mb-3 ml-[45px] md:ml-[60px]">
                     {COL_LABELS.map((c) => (
                        <div key={c} className="w-[35px] h-[35px] md:w-[55px] md:h-[55px] flex items-center justify-center font-black text-sm md:text-2xl text-zinc-700 tracking-tighter">
                           {c}
                        </div>
                     ))}
                  </div>

                  <div className="flex gap-3">
                     {/* Left Coordinates */}
                     <div className="flex flex-col gap-1">
                        {ROW_LABELS.map((r) => (
                           <div key={r} className="w-[35px] h-[35px] md:w-[55px] md:h-[55px] flex items-center justify-center font-black text-sm md:text-2xl text-zinc-700 tracking-tighter">
                              {r}
                           </div>
                        ))}
                     </div>

                     {/* GRID */}
                     <div className="grid grid-cols-10 gap-1.5 p-4 bg-zinc-950/70 backdrop-blur-3xl rounded-[3rem] border-4 border-white/5 shadow-[0_30px_100px_rgba(0,0,0,0.8)] relative overflow-hidden">
                        {grid.map((cell, idx) => {
                           const row = Math.floor(idx / settings.cols);
                           const col = idx % settings.cols;
                           const coord = `${String.fromCharCode(65 + col)}${row + 1}`;
                           const isRevealed = cell.revealed;

                           return (
                              <div
                                 id={`cell-${idx}`}
                                 key={idx}
                                 className={`
                        w-[35px] h-[35px] md:w-[55px] md:h-[55px] rounded-xl border flex items-center justify-center transition-all duration-700 relative overflow-hidden group
                        ${!isRevealed
                                       ? `bg-[#080a0d] border-white/[0.03] hover:border-red-500/40 hover:bg-zinc-900 cursor-crosshair`
                                       : 'border-transparent'}
                        ${isRevealed && cell.type === 'TREASURE' ? 'bg-gradient-to-br from-blue-500 to-blue-900 shadow-[0_0_30px_rgba(59,130,246,0.6)]' : ''}
                        ${isRevealed && cell.type === 'BOMB' ? 'bg-gradient-to-br from-red-600 to-red-950 shadow-[0_0_20px_rgba(239,68,68,0.4)] opacity-80' : ''}
                      `}
                              >
                                 {!isRevealed && (
                                    <span className="text-[9px] md:text-sm font-black text-white/5 group-hover:text-red-500/40 transition-colors uppercase italic">{coord}</span>
                                 )}

                                 {isRevealed && (
                                    <div className="animate-in zoom-in spin-in-180 duration-700 flex items-center justify-center w-full h-full p-2">
                                       {cell.type === 'TREASURE' && <Gem className="w-7 h-7 md:w-10 md:h-10 text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.8)]" />}
                                       {cell.type === 'BOMB' && <Skull className="w-7 h-7 md:w-10 md:h-10 text-white animate-pulse" />}
                                    </div>
                                 )}

                                 {isRevealed && cell.finder && cell.type !== 'EMPTY' && (
                                    <div className="absolute bottom-0 w-full bg-black/60 backdrop-blur-sm py-1">
                                       <div className="text-[6px] md:text-[8px] text-white font-black text-center truncate italic px-1 uppercase tracking-tighter">
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

            {/* Floating Instructions */}
            <div className="mt-12 text-center space-y-2 opacity-40">
               <div className="text-[10px] font-black text-white uppercase tracking-[0.5em] italic">ارسل الإحداثيات في الدردشة</div>
               <p className="text-[8px] font-bold text-gray-500 italic">Example: A1, C3, J10</p>
            </div>

            {/* GAME OVER OVERLAY */}
            {phase === 'GAME_OVER' && winner && (
               <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/90 backdrop-blur-3xl animate-in fade-in duration-1000 p-8">
                  <div className="relative mb-8 animate-in zoom-in duration-700">
                     <div className="absolute -inset-20 bg-blue-600/20 blur-[120px] animate-pulse rounded-full"></div>
                     <Trophy size={160} className="text-yellow-500 relative z-10 drop-shadow-[0_0_50px_rgba(234,179,8,0.6)]" />
                  </div>
                  <h3 className="text-7xl md:text-9xl font-black italic text-white red-neon-text mb-12 uppercase tracking-tighter text-center">بـطل الميدان</h3>

                  <div className="flex flex-col items-center gap-6 bg-white/5 p-12 rounded-[5rem] border-2 border-yellow-500/30 shadow-[0_0_100px_rgba(234,179,8,0.2)] animate-in slide-in-from-bottom duration-1000">
                     <div className="relative">
                        <div className="absolute -inset-6 bg-yellow-500/20 blur-3xl rounded-full animate-pulse"></div>
                        <div className="w-24 h-24 md:w-32 md:h-32 rounded-[2.5rem] overflow-hidden border-4 border-yellow-500 relative z-10 shadow-2xl">
                           <img src={winner.avatar} className="w-full h-full object-cover" />
                        </div>
                     </div>
                     <div className="text-4xl md:text-5xl font-black text-white italic drop-shadow-2xl">{winner.name}</div>
                     <div className="px-10 py-3 bg-yellow-500 text-black text-sm md:text-lg font-black rounded-full uppercase italic shadow-lg">MISSION WINNER</div>
                  </div>

                  <button onClick={() => setPhase('SETTINGS')} className="mt-16 text-white/30 hover:text-white font-black text-xl italic tracking-[0.4em] transition-all hover:scale-110 flex items-center gap-4 group">
                     <RotateCcw className="group-hover:rotate-180 transition-transform duration-1000" size={24} /> إعادة الضبط
                  </button>
               </div>
            )}
         </div>

         <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 10px; }
        .red-neon-text {
          text-shadow: 0 0 20px rgba(239,68,68,0.6), 0 0 40px rgba(239,68,68,0.3);
        }
        @keyframes ping-slow {
          75%, 100% { transform: scale(1.6); opacity: 0; }
        }
        .animate-ping-slow { animation: ping-slow 5s cubic-bezier(0, 0, 0.2, 1) infinite; }
      `}</style>
      </>
   );
};
