import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { chatService } from '../services/chatService';
import { leaderboardService } from '../services/supabase';
import { GRID_DATA } from '../constants';
import { Grid, RotateCcw, Gem, Skull, Target, LogOut, Radar, Map as MapIcon, Crosshair } from 'lucide-react';
import confetti from 'canvas-confetti';

interface GridHuntProps {
   channelConnected: boolean;
   onHome: () => void;
}

type CellType = 'EMPTY' | 'TREASURE' | 'BOMB';
interface GridCell {
   type: CellType;
   revealed: boolean;
   finder?: string;
   avatar?: string;
}

const SidebarPortal = ({ children }: { children?: React.ReactNode }) => {
   const [mounted, setMounted] = useState(false);
   useEffect(() => { setMounted(true); return () => setMounted(false); }, []);
   const el = document.getElementById('game-sidebar-portal');
   if (!mounted || !el) return null;
   return createPortal(children, el);
};

export const GridHunt: React.FC<GridHuntProps> = ({ channelConnected, onHome }) => {
   const [grid, setGrid] = useState<GridCell[]>([]);
   const [isActive, setIsActive] = useState(false);
   const [scoreBoard, setScoreBoard] = useState<{ name: string, score: number, avatar?: string }[]>([]);
   const [lastAction, setLastAction] = useState<{ text: string, type: 'good' | 'bad' | 'neutral' } | null>(null);

   // 10x10 Grid (100 cells)
   const ROWS = 10;
   const COLS = 10;
   const TREASURE_COUNT = 15;
   const BOMB_COUNT = 8;

   const isActiveRef = useRef(isActive);
   const gridRef = useRef(grid);

   useEffect(() => { isActiveRef.current = isActive; }, [isActive]);
   useEffect(() => { gridRef.current = grid; }, [grid]);

   useEffect(() => {
      initializeGrid();
   }, []);

   const initializeGrid = () => {
      const totalCells = ROWS * COLS;
      let newGrid: GridCell[] = Array(totalCells).fill({ type: 'EMPTY', revealed: false });

      // Place Treasures
      let placed = 0;
      while (placed < TREASURE_COUNT) {
         const idx = Math.floor(Math.random() * totalCells);
         if (newGrid[idx].type === 'EMPTY') {
            newGrid[idx] = { ...newGrid[idx], type: 'TREASURE' };
            placed++;
         }
      }

      // Place Bombs
      placed = 0;
      while (placed < BOMB_COUNT) {
         const idx = Math.floor(Math.random() * totalCells);
         if (newGrid[idx].type === 'EMPTY') {
            newGrid[idx] = { ...newGrid[idx], type: 'BOMB' };
            placed++;
         }
      }

      setGrid(newGrid);
      setIsActive(false);
      setScoreBoard([]);
      setLastAction(null);
   };

   const triggerExplosion = (x: number, y: number) => {
      confetti({
         particleCount: 20,
         spread: 40,
         origin: { x: x / window.innerWidth, y: y / window.innerHeight },
         colors: ['#ef4444', '#000000']
      });
   };

   const triggerTreasure = (x: number, y: number) => {
      confetti({
         particleCount: 30,
         spread: 50,
         origin: { x: x / window.innerWidth, y: y / window.innerHeight },
         colors: ['#3b82f6', '#fbbf24']
      });
   };

   useEffect(() => {
      if (!channelConnected) return;
      const cleanup = chatService.onMessage(async (msg) => {
         if (!isActiveRef.current) return;

         // Allow inputs like "A1", "a1", "J10" directly (No '!' needed)
         const content = msg.content.trim().toUpperCase();
         const match = content.match(/^([A-J])(10|[1-9])$/);

         if (match) {
            const colChar = match[1];
            const rowNum = parseInt(match[2]);

            const colIndex = colChar.charCodeAt(0) - 65; // A=0, B=1...
            const rowIndex = rowNum - 1; // 1=0...
            const flatIndex = rowIndex * COLS + colIndex;

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

               // Visual Effects Position simulation (approx center screen)
               const rect = document.getElementById(`cell-${flatIndex}`)?.getBoundingClientRect();
               const px = rect ? rect.x + rect.width / 2 : window.innerWidth / 2;
               const py = rect ? rect.y + rect.height / 2 : window.innerHeight / 2;

               // Scoring
               if (currentGrid[flatIndex].type === 'TREASURE') {
                  setLastAction({ text: `${msg.user.username} عثر على ماوس باد! +100`, type: 'good' });
                  updateScore(msg.user.username, msg.user.avatar, 100);
                  triggerTreasure(px, py);
                  await leaderboardService.recordWin(msg.user.username, msg.user.avatar || '', 25);
               } else if (currentGrid[flatIndex].type === 'BOMB') {
                  setLastAction({ text: `${msg.user.username} داس على لغم! -50`, type: 'bad' });
                  updateScore(msg.user.username, msg.user.avatar, -50);
                  triggerExplosion(px, py);
               } else {
                  setLastAction({ text: `${msg.user.username} حفر في مكان فارغ`, type: 'neutral' });
               }
            }
         }
      });
      return cleanup;
   }, [channelConnected]);

   const updateScore = (user: string, avatar: string | undefined, points: number) => {
      setScoreBoard(prev => {
         const exists = prev.find(p => p.name === user);
         if (exists) {
            return prev.map(p => p.name === user ? { ...p, score: p.score + points } : p).sort((a, b) => b.score - a.score);
         }
         return [...prev, { name: user, score: points, avatar }].sort((a, b) => b.score - a.score);
      });
   };

   const startGame = () => setIsActive(true);

   // Custom coordinate generators
   const COL_LABELS = Array.from({ length: 10 }, (_, i) => String.fromCharCode(65 + i)); // A-J
   const ROW_LABELS = Array.from({ length: 10 }, (_, i) => i + 1); // 1-10

   return (
      <>
         <SidebarPortal>
            <div className="bg-black/40 p-6 rounded-[2.5rem] border border-white/5 space-y-6 animate-in slide-in-from-right duration-500 shadow-2xl backdrop-blur-md">
               <div className="flex items-center justify-between border-b border-white/5 pb-4">
                  <h4 className="text-[12px] font-black text-cyan-400 uppercase tracking-widest flex items-center gap-3">
                     <Radar size={16} className="animate-spin-slow" /> رادار الماوس باد
                  </h4>
                  <button onClick={onHome} className="p-2.5 bg-red-600/10 hover:bg-red-600/20 text-red-500 rounded-xl transition-all border border-red-500/20"><LogOut size={16} /></button>
               </div>

               <button onClick={isActive ? initializeGrid : startGame} className={`w-full font-black py-4 rounded-[1.5rem] text-xs shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3 border-t border-white/20 uppercase tracking-widest ${isActive ? 'bg-red-600/20 text-red-500 border-red-500/20' : 'bg-cyan-600 text-white'}`}>
                  {isActive ? <RotateCcw size={16} /> : <Target size={16} />}
                  {isActive ? 'RELOAD MAP' : 'START SCAN'}
               </button>

               <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-gray-400 bg-black/20 p-4 rounded-2xl border border-white/5">
                  <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-cyan-500"></div>Treasures: {TREASURE_COUNT}</div>
                  <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-red-500"></div>Bombs: {BOMB_COUNT}</div>
                  <div className="col-span-2 text-center text-white/50 mt-2 border-t border-white/5 pt-2">Type: A1, B5, J10</div>
               </div>

               {/* Live Feed */}
               {lastAction && (
                  <div className={`p-4 rounded-2xl text-[11px] font-bold text-center animate-pulse border transition-colors ${lastAction.type === 'good' ? 'bg-cyan-900/30 border-cyan-500/50 text-cyan-200' : lastAction.type === 'bad' ? 'bg-red-900/30 border-red-500/50 text-red-200' : 'bg-gray-800/30 border-white/10 text-gray-400'}`}>
                     {lastAction.text}
                  </div>
               )}

               {scoreBoard.length > 0 && (
                  <div className="bg-black/20 rounded-[2rem] border border-white/5 flex flex-col overflow-hidden h-[300px] mt-4">
                     <div className="p-4 border-b border-white/5 bg-white/5 flex justify-between items-center">
                        <span className="text-[10px] font-black text-white uppercase tracking-widest flex items-center gap-2"><MapIcon size={14} className="text-yellow-500" /> Top Hunters</span>
                     </div>
                     <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
                        {scoreBoard.map((p, i) => (
                           <div key={i} className="flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors group">
                              <div className="flex items-center gap-3">
                                 <div className="w-6 h-6 rounded-full overflow-hidden border border-white/20">
                                    {p.avatar ? <img src={p.avatar} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gray-700"></div>}
                                 </div>
                                 <span className="text-[10px] font-bold text-gray-300 truncate max-w-[80px] group-hover:text-white">{p.name}</span>
                              </div>
                              <span className={`font-mono font-black text-xs ${p.score > 0 ? 'text-cyan-400' : 'text-red-400'}`}>{p.score}</span>
                           </div>
                        ))}
                     </div>
                  </div>
               )}
            </div>
         </SidebarPortal>

         <div className="w-full h-full flex flex-col items-center justify-center p-6 bg-transparent relative overflow-hidden select-none">

            {/* Background Grid Lines */}
            <div className="absolute inset-0 pointer-events-none opacity-20">
               <div className="w-full h-full" style={{ backgroundImage: 'linear-gradient(#1f2937 1px, transparent 1px), linear-gradient(90deg, #1f2937 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
            </div>

            {/* Radar Scan Effect */}
            <div className="absolute inset-0 pointer-events-none opacity-30">
               <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120vh] h-[120vh] rounded-full border border-cyan-500/10 animate-ping-slow"></div>
            </div>

            <div className="relative z-10 flex flex-col items-center">

               {/* Top Coordinates (A-J) */}
               <div className="flex gap-1 mb-2 ml-[30px] md:ml-[40px]">
                  {COL_LABELS.map(c => (
                     <div key={c} className="w-[30px] h-[30px] md:w-[50px] md:h-[50px] flex items-center justify-center text-cyan-500 font-black text-xs md:text-lg animate-pulse">{c}</div>
                  ))}
               </div>

               <div className="flex gap-2">
                  {/* Left Coordinates (1-10) */}
                  <div className="flex flex-col gap-1">
                     {ROW_LABELS.map(r => (
                        <div key={r} className="w-[30px] h-[30px] md:w-[50px] md:h-[50px] flex items-center justify-center text-cyan-500 font-black text-xs md:text-lg animate-pulse">{r}</div>
                     ))}
                  </div>

                  {/* THE GRID */}
                  <div className="grid grid-cols-10 gap-1 p-2 bg-black/40 backdrop-blur-xl rounded-2xl border-2 border-cyan-500/30 shadow-[0_0_50px_rgba(6,182,212,0.15)] relative">
                     {/* Scanner Line */}
                     <div className="absolute top-0 left-0 w-full h-1 bg-cyan-400/50 shadow-[0_0_20px_#22d3ee] animate-scan pointer-events-none z-20"></div>

                     {grid.map((cell, idx) => {
                        const row = Math.floor(idx / COLS);
                        const col = idx % COLS;
                        const coord = `${String.fromCharCode(65 + col)}${row + 1}`;
                        const isRevealed = cell.revealed;

                        return (
                           <div
                              id={`cell-${idx}`}
                              key={idx}
                              className={`
                                    w-[30px] h-[30px] md:w-[50px] md:h-[50px] rounded-[0.4rem] md:rounded-lg border flex items-center justify-center text-[8px] md:text-xs font-bold transition-all duration-500 relative overflow-hidden group
                                    ${!isRevealed
                                    ? 'bg-[#0a0f14] border-white/5 hover:border-cyan-500/50 hover:bg-cyan-900/20 cursor-crosshair'
                                    : 'border-transparent shadow-inner'}
                                    ${isRevealed && cell.type === 'TREASURE' ? 'bg-blue-500/20 shadow-[inset_0_0_20px_rgba(59,130,246,0.3)] min-h-[30px]' : ''}
                                    ${isRevealed && cell.type === 'BOMB' ? 'bg-red-500/20 shadow-[inset_0_0_20px_rgba(239,68,68,0.3)] min-h-[30px]' : ''}
                                    ${isRevealed && cell.type === 'EMPTY' ? 'bg-gray-800/40 text-gray-700 min-h-[30px]' : ''}
                                `}
                           >
                              {!isRevealed && (
                                 <>
                                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20"></div>
                                    <span className="absolute inset-0 flex items-center justify-center text-[10px] md:text-sm text-white/20 font-mono pointer-events-none">{coord}</span>
                                 </>
                              )}

                              {isRevealed && (
                                 <div className="animate-in zoom-in spin-in-180 duration-500 flex items-center justify-center w-full h-full">
                                    {cell.type === 'TREASURE' && <Gem className="w-5 h-5 md:w-8 md:h-8 text-cyan-400 drop-shadow-[0_0_10px_cyan] animate-pulse" />}
                                    {cell.type === 'BOMB' && <Skull className="w-5 h-5 md:w-8 md:h-8 text-red-500 drop-shadow-[0_0_10px_red] animate-bounce" />}
                                    {cell.type === 'EMPTY' && <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-gray-600"></div>}
                                 </div>
                              )}

                              {isRevealed && cell.finder && cell.type !== 'EMPTY' && (
                                 <div className={`absolute bottom-0 w-full text-[6px] md:text-[8px] text-center truncate px-0.5 font-mono ${cell.type === 'TREASURE' ? 'bg-blue-900/80 text-blue-200' : 'bg-red-900/80 text-red-200'}`}>
                                    {cell.finder}
                                 </div>
                              )}
                           </div>
                        );
                     })}
                  </div>
               </div>
            </div>
         </div>

         <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 10px; }
        @keyframes scan {
            0% { top: 0%; opacity: 0; }
            10% { opacity: 1; }
            90% { opacity: 1; }
            100% { top: 100%; opacity: 0; }
        }
        .animate-scan { animation: scan 4s linear infinite; }
        .animate-ping-slow { animation: ping 3s cubic-bezier(0, 0, 0.2, 1) infinite; }
      `}</style>
      </>
   );
};
