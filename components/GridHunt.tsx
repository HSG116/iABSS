import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { chatService } from '../services/chatService';
import { leaderboardService } from '../services/supabase';
import {
   Grid, RotateCcw, Gem, Skull, Target, LogOut, Radar,
   Map as MapIcon, Crosshair, Settings, Users, Play,
   Shield, Zap, Radio, Timer, Trophy, Star
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
   maxAttempts: number; // 0 for infinite/spam
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
      placeItems('SHIELD', 3); // Extra Feature: Shields
      placeItems('RADAR', 2);  // Extra Feature: Radars

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

         // Handle Joining
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

         // Handle Grid Input (A1, B5, J10)
         const match = content.match(/^([A-J])(10|[1-9])$/);
         if (match) {
            // Check attempts
            const userStats = currentScores.find(p => p.name === msg.user.username);
            if (currentSettings.maxAttempts > 0 && userStats && userStats.attempts >= currentSettings.maxAttempts) {
               // No more attempts for this user
               return;
            }

            const colChar = match[1];
            const rowNum = parseInt(match[2]);
            const colIndex = colChar.charCodeAt(0) - 65;
            const rowIndex = rowNum - 1;
            const flatIndex = rowIndex * currentSettings.cols + colIndex;

            const currentGrid = [...gridRef.current];
            if (!currentGrid[flatIndex].revealed) {
               // Reveal Logic
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

                  const newWinner = { name: msg.user.username, avatar: msg.user.avatar, type: 'MOUSEPAD' };
                  setWinners(prev => {
                     const newList = [...prev, newWinner];
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

   return (
      <>
         <SidebarPortal>
            <div className="bg-zinc-900/90 p-6 rounded-[2.5rem] border border-white/10 space-y-6 animate-in slide-in-from-right duration-500 shadow-2xl backdrop-blur-xl h-full flex flex-col">
               <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <h4 className="text-[14px] font-black text-iabs-red uppercase tracking-widest flex items-center gap-3 italic">
                     <Radar size={18} className="animate-spin-slow" /> صائد الماوس باد V2
                  </h4>
                  <button onClick={onHome} className="p-2.5 bg-white/5 hover:bg-red-600/20 text-white/50 hover:text-red-500 rounded-xl transition-all border border-white/10 hover:border-red-500/20">
                     <LogOut size={16} />
                  </button>
               </div>

               <div className="flex-1 space-y-4 overflow-y-auto custom-scrollbar pr-2">
                  {phase === 'SETTINGS' && (
                     <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="p-4 bg-white/5 rounded-2xl border border-white/5 space-y-4 text-white">
                           <div className="flex items-center gap-2 mb-2 text-red-500">
                              <Settings size={16} />
                              <span className="text-xs font-black uppercase">إعدادات اللعبة</span>
                           </div>

                           <div className="space-y-3">
                              <label className="block">
                                 <span className="text-[10px] text-gray-400 font-bold block mb-1">مود الدخول</span>
                                 <select
                                    value={settings.entryMode}
                                    onChange={e => setSettings({ ...settings, entryMode: e.target.value as any })}
                                    className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-xs font-bold focus:border-red-500 outline-none"
                                 >
                                    <option value="OPEN">دخول عام للهواة (Open)</option>
                                    <option value="WAITING">انتظار اللاعبين (Waiting)</option>
                                 </select>
                              </label>

                              <div className="grid grid-cols-2 gap-2">
                                 <label>
                                    <span className="text-[10px] text-gray-400 font-bold block mb-1">عدد الفائزين</span>
                                    <input
                                       type="number"
                                       value={settings.winnersNeeded}
                                       onChange={e => setSettings({ ...settings, winnersNeeded: Number(e.target.value) })}
                                       className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-xs font-bold"
                                    />
                                 </label>
                                 <label>
                                    <span className="text-[10px] text-gray-400 font-bold block mb-1">المحاولات (0 = عشوائي)</span>
                                    <input
                                       type="number"
                                       value={settings.maxAttempts}
                                       onChange={e => setSettings({ ...settings, maxAttempts: Number(e.target.value) })}
                                       className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-xs font-bold"
                                    />
                                 </label>
                              </div>

                              <div className="grid grid-cols-2 gap-2">
                                 <label>
                                    <span className="text-[10px] text-gray-400 font-bold block mb-1">الماوسات</span>
                                    <input
                                       type="number"
                                       value={settings.treasureCount}
                                       onChange={e => setSettings({ ...settings, treasureCount: Number(e.target.value) })}
                                       className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-xs font-bold"
                                    />
                                 </label>
                                 <label>
                                    <span className="text-[10px] text-gray-400 font-bold block mb-1">الألغام</span>
                                    <input
                                       type="number"
                                       value={settings.bombCount}
                                       onChange={e => setSettings({ ...settings, bombCount: Number(e.target.value) })}
                                       className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-xs font-bold"
                                    />
                                 </label>
                              </div>
                           </div>
                        </div>

                        <button
                           onClick={initializeGame}
                           className="w-full bg-gradient-to-r from-red-600 to-red-500 py-4 rounded-2xl font-black text-white text-sm shadow-[0_10px_30px_rgba(220,38,38,0.3)] hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3 uppercase italic"
                        >
                           <Play size={18} fill="currentColor" /> لبدء اللعبة
                        </button>
                     </div>
                  )}

                  {phase === 'WAITING' && (
                     <div className="text-center space-y-6 py-8 animate-in zoom-in duration-500">
                        <div className="relative inline-block">
                           <Users size={64} className="text-red-500 mx-auto animate-pulse" />
                           <div className="absolute -top-2 -right-2 bg-white text-black text-[10px] font-black px-2 py-0.5 rounded-full border-2 border-red-500">
                              {joinedPlayers.length}/{settings.requiredPlayers}
                           </div>
                        </div>
                        <div>
                           <h5 className="text-white font-black text-xl italic mb-2">في انتظار الـقـيـادة</h5>
                           <p className="text-gray-400 text-xs font-bold">أكتب <span className="text-red-500">انضمام</span> للدخول في المعركة</p>
                        </div>
                        <div className="grid grid-cols-4 gap-2">
                           {joinedPlayers.map((p, i) => (
                              <div key={i} className="w-10 h-10 rounded-xl overflow-hidden border border-white/10 animate-in zoom-in" style={{ animationDelay: `${i * 100}ms` }}>
                                 <img src={p.avatar} className="w-full h-full object-cover" />
                              </div>
                           ))}
                           {Array.from({ length: Math.max(0, settings.requiredPlayers - joinedPlayers.length) }).map((_, i) => (
                              <div key={i} className="w-10 h-10 rounded-xl bg-white/5 border border-white/5 border-dashed flex items-center justify-center text-white/5">?</div>
                           ))}
                        </div>
                     </div>
                  )}

                  {(phase === 'PLAYING' || phase === 'GAME_OVER') && (
                     <div className="space-y-4">
                        <div className="flex items-center justify-between text-[10px] font-black uppercase text-gray-500 border-b border-white/5 pb-2">
                           <span>إحصاءات الميدان</span>
                           <span className="text-red-500">{phase === 'GAME_OVER' ? 'انتهت اللعبة' : 'جار التنفيذ...'}</span>
                        </div>

                        {/* Last Action Box */}
                        {lastAction && (
                           <div className={`p-4 rounded-2xl text-[11px] font-bold text-center border transition-all animate-in slide-in-from-right duration-300 ${lastAction.type === 'good' ? 'bg-blue-600/20 border-blue-500/50 text-blue-300' :
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
                                 <span className="text-[10px] font-black text-yellow-500">🏆 بطل الميدان</span>
                              </div>
                           ))}
                        </div>

                        {/* Leaderboard Small */}
                        <div className="bg-black/40 rounded-3xl border border-white/10 p-4 space-y-3">
                           <div className="flex items-center gap-2 text-xs font-black text-white/60 italic mb-2">
                              <Zap size={14} className="text-yellow-500" />
                              أشرس المفجرين
                           </div>
                           <div className="space-y-2 max-h-[200px] overflow-y-auto custom-scrollbar pr-2">
                              {scoreBoard.sort((a, b) => b.attempts - a.attempts).map((p, i) => (
                                 <div key={i} className="flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/5 group hover:bg-white/10 transition-all">
                                    <div className="flex items-center gap-3">
                                       <div className="w-6 h-6 rounded-lg overflow-hidden border border-white/10 relative">
                                          <img src={p.avatar} className="w-full h-full object-cover" />
                                          {p.hasShield && <div className="absolute inset-0 bg-emerald-500/40 flex items-center justify-center"><Shield size={10} className="text-white" /></div>}
                                       </div>
                                       <span className="text-[10px] font-bold text-gray-300 group-hover:text-white truncate max-w-[80px]">{p.name}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                       <div className="text-[10px] font-mono font-black text-red-500 bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/20">
                                          {p.attempts}/{settings.maxAttempts || '∞'}
                                       </div>
                                    </div>
                                 </div>
                              ))}
                           </div>
                        </div>
                     </div>
                  )}
               </div>

               {phase === 'GAME_OVER' && (
                  <button
                     onClick={() => setPhase('SETTINGS')}
                     className="w-full bg-white/10 hover:bg-white/20 py-3 rounded-2xl font-black text-white text-xs transition-all border border-white/10 flex items-center justify-center gap-2"
                  >
                     <RotateCcw size={14} /> إعادة الضبط
                  </button>
               )}
            </div>
         </SidebarPortal>

         <div className="w-full h-full flex flex-col items-center justify-center p-6 bg-transparent relative overflow-hidden select-none">

            {/* Dynamic Background */}
            <div className="absolute inset-0 pointer-events-none">
               <div className="w-full h-full opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '60px 60px' }}></div>
               {phase === 'PLAYING' && (
                  <div className="absolute inset-0 transition-opacity duration-1000">
                     <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle_at_center,rgba(220,38,38,0.1)_0%,transparent_70%)] animate-pulse"></div>
                  </div>
               )}
            </div>

            {phase === 'SETTINGS' && (
               <div className="relative z-10 text-center space-y-8 max-w-2xl px-8 py-16 rounded-[4rem] bg-zinc-900/40 backdrop-blur-3xl border-2 border-white/10 shadow-[0_40px_100px_rgba(0,0,0,0.5)] animate-in zoom-in duration-700">
                  <div className="w-32 h-32 mx-auto bg-iabs-red rounded-[2.5rem] flex items-center justify-center shadow-[0_20px_60px_rgba(239,68,68,0.4)] rotate-12 transition-transform hover:rotate-0 duration-500 mb-8">
                     <Gem size={64} color="white" strokeWidth={2.5} className="drop-shadow-[0_0_20px_rgba(255,255,255,0.5)]" />
                  </div>
                  <div>
                     <h2 className="text-6xl font-black italic text-white tracking-tighter mb-4 red-neon-text">صائد الماوس باد</h2>
                     <p className="text-white/40 font-bold uppercase tracking-[0.5em] text-xs">Tactical Mouse Pad Collection • Ver 2.0</p>
                  </div>
                  <div className="grid grid-cols-3 gap-6 py-6 border-y border-white/10">
                     <div className="space-y-1">
                        <div className="text-2xl font-black text-white italic">{settings.treasureCount}</div>
                        <div className="text-[10px] text-gray-500 font-black uppercase">ماوسات نادرة</div>
                     </div>
                     <div className="space-y-1">
                        <div className="text-2xl font-black text-red-500 italic">{settings.bombCount}</div>
                        <div className="text-[10px] text-gray-500 font-black uppercase">أفخاخ متفجرة</div>
                     </div>
                     <div className="space-y-1">
                        <div className="text-2xl font-black text-emerald-500 italic">2+</div>
                        <div className="text-[10px] text-gray-500 font-black uppercase">أدوات مساعدة</div>
                     </div>
                  </div>
                  <div className="flex items-center justify-center gap-4 text-white/60 font-black text-sm animate-bounce mt-4 italic">
                     <Settings size={20} className="text-red-500" /> استخدم لوحة التحكم الجانبية للبدء
                  </div>
               </div>
            )}

            {(phase === 'WAITING' || phase === 'PLAYING' || phase === 'GAME_OVER') && (
               <div className="relative z-10 flex flex-col items-center animate-in fade-in duration-1000">

                  {/* Stats Bar */}
                  <div className="flex gap-8 mb-8 bg-black/40 backdrop-blur-xl px-12 py-4 rounded-full border border-white/10 shadow-2xl">
                     <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-600/20 rounded-xl"><Gem size={20} className="text-blue-400" /></div>
                        <div>
                           <div className="text-lg font-black text-white italic leading-none">{winners.length}/{settings.winnersNeeded}</div>
                           <div className="text-[8px] text-gray-500 font-black uppercase">الأبطال</div>
                        </div>
                     </div>
                     <div className="w-[1px] h-10 bg-white/10"></div>
                     <div className="flex items-center gap-3">
                        <div className="p-2 bg-yellow-600/20 rounded-xl"><Star size={20} className="text-yellow-400" /></div>
                        <div>
                           <div className="text-lg font-black text-white italic leading-none">{settings.treasureCount - winners.length}</div>
                           <div className="text-[8px] text-gray-500 font-black uppercase">متبقي</div>
                        </div>
                     </div>
                     <div className="w-[1px] h-10 bg-white/10"></div>
                     <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-600/20 rounded-xl"><Timer size={20} className="text-purple-400" /></div>
                        <div>
                           <div className="text-lg font-black text-white italic leading-none">{settings.maxAttempts || '∞'}</div>
                           <div className="text-[8px] text-gray-500 font-black uppercase">المحاولات</div>
                        </div>
                     </div>
                  </div>

                  {/* Top Coordinates (A-J) */}
                  <div className={`flex gap-1.5 mb-2 ml-[40px] md:ml-[60px] transition-opacity duration-500 ${phase === 'WAITING' ? 'opacity-20' : 'opacity-100'}`}>
                     {COL_LABELS.map((c, i) => (
                        <div key={c} className={`w-[35px] h-[35px] md:w-[55px] md:h-[55px] flex items-center justify-center font-black text-sm md:text-xl transition-all ${scannerCol === i ? 'text-white scale-125 drop-shadow-[0_0_10px_white]' : 'text-iabs-red/40'}`}>
                           {c}
                        </div>
                     ))}
                  </div>

                  <div className="flex gap-3">
                     {/* Left Coordinates (1-10) */}
                     <div className={`flex flex-col gap-1.5 transition-opacity duration-500 ${phase === 'WAITING' ? 'opacity-20' : 'opacity-100'}`}>
                        {ROW_LABELS.map((r, i) => (
                           <div key={r} className={`w-[35px] h-[35px] md:w-[55px] md:h-[55px] flex items-center justify-center font-black text-sm md:text-xl transition-all ${scannerRow === i ? 'text-white scale-125 drop-shadow-[0_0_10px_white]' : 'text-iabs-red/40'}`}>
                              {r}
                           </div>
                        ))}
                     </div>

                     {/* THE GRID */}
                     <div className={`
                grid grid-cols-10 gap-1.5 p-3 bg-zinc-950/80 backdrop-blur-3xl rounded-[2.5rem] border-4 border-white/5 shadow-[0_0_100px_rgba(0,0,0,0.8)] relative transition-all duration-1000
                ${phase === 'WAITING' ? 'scale-90 opacity-40 blur-sm pointer-events-none' : 'scale-100 opacity-100'}
                ${phase === 'GAME_OVER' ? 'pointer-events-none' : ''}
              `}>

                        {/* Visual Scanner Overlay */}
                        <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden rounded-[2rem]">
                           {scannerRow !== null && (
                              <div
                                 className="absolute left-0 w-full h-[55px] bg-white/20 border-y-2 border-white shadow-[0_0_40px_white] animate-pulse"
                                 style={{ top: scannerRow * 61.5 + 12 }}
                              />
                           )}
                           {scannerCol !== null && (
                              <div
                                 className="absolute top-0 w-[55px] h-full bg-white/20 border-x-2 border-white shadow-[0_0_40px_white] animate-pulse"
                                 style={{ left: scannerCol * 61.5 + 12 }}
                              />
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
                        w-[35px] h-[35px] md:w-[55px] md:h-[55px] rounded-xl border-2 flex items-center justify-center transition-all duration-500 relative overflow-hidden group
                        ${!isRevealed
                                       ? `bg-[#0a0f14] ${isBeingScanned ? 'border-white/40 scale-95' : 'border-white/5'} hover:border-red-500/50 hover:bg-red-950/20 cursor-crosshair`
                                       : 'border-transparent'}
                        ${isRevealed && cell.type === 'TREASURE' ? 'bg-gradient-to-br from-blue-600 to-blue-900 shadow-[0_0_30px_rgba(59,130,246,0.6)] animate-in zoom-in' : ''}
                        ${isRevealed && cell.type === 'BOMB' ? 'bg-gradient-to-br from-red-600 to-red-900 shadow-[0_0_30px_rgba(239,68,68,0.6)] animate-in zoom-in' : ''}
                        ${isRevealed && cell.type === 'SHIELD' ? 'bg-gradient-to-br from-emerald-600 to-emerald-900 shadow-[0_0_30px_rgba(16,185,129,0.6)] animate-in zoom-in' : ''}
                        ${isRevealed && cell.type === 'RADAR' ? 'bg-gradient-to-br from-purple-600 to-purple-900 shadow-[0_0_30px_rgba(168,85,247,0.6)] animate-in zoom-in' : ''}
                        ${isRevealed && cell.type === 'EMPTY' ? 'bg-white/5 scale-90 opacity-20' : ''}
                      `}
                              >
                                 {!isRevealed && (
                                    <>
                                       <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent"></div>
                                       <span className={`text-[10px] md:text-sm font-black transition-colors ${isBeingScanned ? 'text-white' : 'text-white/10'} group-hover:text-red-500/40`}>{coord}</span>
                                       {isBeingScanned && (
                                          <div className="absolute inset-0 flex items-center justify-center animate-pulse">
                                             <Crosshair size={24} className="text-white/20" />
                                          </div>
                                       )}
                                    </>
                                 )}

                                 {isRevealed && (
                                    <div className="animate-in zoom-in spin-in-180 duration-700 flex flex-col items-center justify-center w-full h-full p-1">
                                       {cell.type === 'TREASURE' && <Gem className="w-6 h-6 md:w-10 md:h-10 text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]" />}
                                       {cell.type === 'BOMB' && <Skull className="w-6 h-6 md:w-10 md:h-10 text-white animate-bounce" />}
                                       {cell.type === 'SHIELD' && <Shield className="w-6 h-6 md:w-10 md:h-10 text-white" />}
                                       {cell.type === 'RADAR' && <Radio className="w-6 h-6 md:w-10 md:h-10 text-white animate-pulse" />}
                                       {cell.type === 'EMPTY' && <div className="w-2 h-2 rounded-full bg-white/20"></div>}
                                    </div>
                                 )}

                                 {isRevealed && cell.finder && cell.type !== 'EMPTY' && (
                                    <div className="absolute bottom-0 w-full bg-black/60 backdrop-blur-md py-0.5 border-t border-white/10">
                                       <div className="text-[6px] md:text-[8px] text-white font-black text-center truncate italic px-1 uppercase leading-none">
                                          {cell.finder}
                                       </div>
                                    </div>
                                 )}
                              </div>
                           );
                        })}
                     </div>
                  </div>

                  {/* Bottom Legend */}
                  <div className={`mt-10 flex gap-8 items-center bg-zinc-900/40 px-10 py-4 rounded-full border border-white/5 transition-opacity duration-1000 ${phase === 'PLAYING' ? 'opacity-100' : 'opacity-0'}`}>
                     <div className="flex items-center gap-3">
                        <div className="w-4 h-4 rounded-md bg-blue-600 shadow-[0_0_10px_rgba(59,130,246,0.6)]"></div>
                        <span className="text-[10px] font-black text-white/40 uppercase">Target</span>
                     </div>
                     <div className="flex items-center gap-3">
                        <div className="w-4 h-4 rounded-md bg-red-600 shadow-[0_0_10px_rgba(239,68,68,0.6)]"></div>
                        <span className="text-[10px] font-black text-white/40 uppercase">Hazard</span>
                     </div>
                     <div className="flex items-center gap-3">
                        <div className="w-4 h-4 rounded-md bg-emerald-600 shadow-[0_0_10px_rgba(16,185,129,0.6)]"></div>
                        <span className="text-[10px] font-black text-white/40 uppercase">Shield</span>
                     </div>
                     <div className="flex items-center gap-3">
                        <div className="w-4 h-4 rounded-md bg-purple-600 shadow-[0_0_10px_rgba(168,85,247,0.6)]"></div>
                        <span className="text-[10px] font-black text-white/40 uppercase">Radar</span>
                     </div>
                  </div>
               </div>
            )}

            {/* Global Game Phase Notifications */}
            {phase === 'GAME_OVER' && (
               <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/60 backdrop-blur-md animate-in fade-in duration-1000">
                  <div className="relative mb-12 animate-in zoom-in duration-700">
                     <div className="absolute -inset-20 bg-yellow-500/20 blur-[100px] animate-pulse rounded-full"></div>
                     <Trophy size={160} className="text-yellow-500 relative z-10 drop-shadow-[0_0_40px_rgba(234,179,8,0.6)]" />
                  </div>
                  <h3 className="text-8xl font-black italic text-white red-neon-text mb-6">انتهت المعركة!</h3>
                  <div className="flex gap-4">
                     {winners.map((w, i) => (
                        <div key={i} className="flex flex-col items-center gap-4 bg-white/5 p-8 rounded-[3rem] border-2 border-yellow-500/30 shadow-2xl animate-in slide-in-from-bottom duration-1000" style={{ animationDelay: `${i * 200}ms` }}>
                           <div className="w-24 h-24 rounded-[2rem] overflow-hidden border-4 border-yellow-500">
                              <img src={w.avatar} className="w-full h-full object-cover" />
                           </div>
                           <div className="text-3xl font-black text-white italic">{w.name}</div>
                           <div className="px-6 py-2 bg-yellow-500 text-black text-sm font-black rounded-full uppercase tracking-tighter shadow-lg">Victory Achieved</div>
                        </div>
                     ))}
                  </div>
                  <button onClick={() => setPhase('SETTINGS')} className="mt-16 text-white/40 hover:text-white font-black text-xl italic tracking-widest transition-all hover:scale-110 flex items-center gap-4 group">
                     <RotateCcw className="group-hover:rotate-180 transition-transform duration-700" /> للعودة للإعدادات
                  </button>
               </div>
            )}
         </div>

         <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 10px; }
        .red-neon-text {
          text-shadow: 0 0 10px rgba(255,0,0,0.5), 0 0 20px rgba(255,0,0,0.3);
        }
        @keyframes ping-slow {
          75%, 100% { transform: scale(1.5); opacity: 0; }
        }
        .animate-ping-slow { animation: ping-slow 3s cubic-bezier(0, 0, 0.2, 1) infinite; }
        .animate-spin-slow { animation: spin 8s linear infinite; }
      `}</style>
      </>
   );
};
