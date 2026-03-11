
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { chatService } from '../services/chatService';
import { ChatUser } from '../types';
import { Footprints, RotateCcw, User, ArrowBigLeft, ArrowBigRight, Trophy, Skull, Crown, ListOrdered } from 'lucide-react';
import { ProAvatar } from './ProAvatar';

interface GlassBridgeProps {
   channelConnected: boolean;
}

const BRIDGE_LENGTH = 10;
const PLAYER_LIMIT = 10; // Updated to 10 players

const SidebarPortal = ({ children }: { children?: React.ReactNode }) => {
   const [mounted, setMounted] = useState(false);
   useEffect(() => { setMounted(true); return () => setMounted(false); }, []);
   const el = document.getElementById('game-sidebar-portal');
   if (!mounted || !el) return null;
   return createPortal(children, el);
};

export const GlassBridge: React.FC<GlassBridgeProps> = ({ channelConnected }) => {
   const [gameState, setGameState] = useState<'WAITING' | 'PLAYING' | 'WINNER' | 'GAMEOVER'>('WAITING');
   const [participants, setParticipants] = useState<ChatUser[]>([]);
   const [queue, setQueue] = useState<ChatUser[]>([]);
   const [activePlayerIndex, setActivePlayerIndex] = useState(0);
   const [currentStep, setCurrentStep] = useState(0);
   const [safePath, setSafePath] = useState<number[]>([]); // 0=L, 1=R
   const [turnDuration, setTurnDuration] = useState(10);
   const [timeLeft, setTimeLeft] = useState(0);
   const [eliminatedPlayers, setEliminatedPlayers] = useState<string[]>([]);

   // Scoring System
   const [playerScores, setPlayerScores] = useState<Record<string, number>>({});

   // Animation states
   const [isProcessing, setIsProcessing] = useState(false);
   const [lastResult, setLastResult] = useState<'JUMPING' | 'SAFE' | 'BROKEN' | null>(null);
   const [revealedSide, setRevealedSide] = useState<number | null>(null);

   // Refs
   const queueRef = useRef(queue);
   const activeIndexRef = useRef(activePlayerIndex);
   const gameStateRef = useRef(gameState);
   const participantsRef = useRef(participants);
   const isProcessingRef = useRef(isProcessing);
   const safePathRef = useRef(safePath);
   const currentStepRef = useRef(currentStep);

   useEffect(() => { queueRef.current = queue; }, [queue]);
   useEffect(() => { activeIndexRef.current = activePlayerIndex; }, [activePlayerIndex]);
   useEffect(() => { gameStateRef.current = gameState; }, [gameState]);
   useEffect(() => { participantsRef.current = participants; }, [participants]);
   useEffect(() => { isProcessingRef.current = isProcessing; }, [isProcessing]);
   useEffect(() => { safePathRef.current = safePath; }, [safePath]);
   useEffect(() => { currentStepRef.current = currentStep; }, [currentStep]);

   // Turn Timer
   useEffect(() => {
      let interval: number;
      if (gameState === 'PLAYING' && timeLeft > 0 && !isProcessing) {
         interval = window.setInterval(() => {
            setTimeLeft(prev => prev - 1);
         }, 1000);
      } else if (gameState === 'PLAYING' && timeLeft === 0 && !isProcessing) {
         handleElimination(true);
      }
      return () => clearInterval(interval);
   }, [gameState, timeLeft, isProcessing]);

   // Chat Listener
   useEffect(() => {
      if (!channelConnected) return;
      const cleanup = chatService.onMessage((msg) => {
         const content = msg.content.trim().toUpperCase();

         // JOIN
         if (gameStateRef.current === 'WAITING' && (content === '!JOIN' || content === '!دخول')) {
            if (!participantsRef.current.find(p => p.username === msg.user.username)) {
               setParticipants(prev => [...prev, msg.user]);

               // Fetch real Kick avatar asynchronously
               chatService.fetchKickAvatar(msg.user.username).then(avatar => {
                  if (avatar) {
                     setParticipants(current => current.map(p =>
                        p.username === msg.user.username ? { ...p, avatar } : p
                     ));
                  }
               });
            }
         }

         // MOVE
         if (gameStateRef.current === 'PLAYING' && !isProcessingRef.current) {
            const activePlayer = queueRef.current[activeIndexRef.current];
            if (activePlayer && activePlayer.username === msg.user.username) {
               if (content === '!L' || content === '!يسار' || content === 'يسار') {
                  handleMove(0);
               } else if (content === '!R' || content === '!يمين' || content === 'يمين') {
                  handleMove(1);
               }
            }
         }
      });
      return cleanup;
   }, [channelConnected]);

   const startGame = () => {
      if (participants.length < 1) return;

      const shuffled = [...participants].sort(() => 0.5 - Math.random());
      const selected = shuffled.slice(0, PLAYER_LIMIT);

      setQueue(selected);
      setEliminatedPlayers([]);
      setActivePlayerIndex(0);
      setCurrentStep(0);
      setLastResult(null);
      setRevealedSide(null);

      // Initialize Scores
      const initialScores: Record<string, number> = {};
      selected.forEach(p => initialScores[p.username] = 0);
      setPlayerScores(initialScores);

      // Generate Path
      const path = Array.from({ length: BRIDGE_LENGTH }, () => Math.floor(Math.random() * 2));
      setSafePath(path);

      setGameState('PLAYING');
      setTimeLeft(turnDuration);
   };

   const handleMove = (choice: number) => {
      if (isProcessingRef.current) return;
      setIsProcessing(true);
      setLastResult('JUMPING');

      setTimeout(() => {
         const currentPath = safePathRef.current;
         const stepIndex = currentStepRef.current;
         const correctSide = currentPath[stepIndex];
         const activePlayer = queueRef.current[activeIndexRef.current];

         const isCorrect = correctSide === choice;

         if (isCorrect) {
            setLastResult('SAFE');

            // Update Score
            setPlayerScores(prev => ({
               ...prev,
               [activePlayer.username]: Math.max(prev[activePlayer.username] || 0, stepIndex + 1)
            }));

            setTimeout(() => {
               setLastResult(null);
               if (stepIndex + 1 >= currentPath.length) {
                  setGameState('WINNER');
               } else {
                  setCurrentStep(prev => prev + 1);
                  setTimeLeft(turnDuration);
               }
               setIsProcessing(false);
            }, 1000);
         } else {
            setLastResult('BROKEN');
            setRevealedSide(correctSide);
            setTimeout(() => {
               setLastResult(null);
               setRevealedSide(null);
               handleElimination(false);
               setIsProcessing(false);
            }, 2000);
         }
      }, 1500);
   };

   const handleElimination = (timeout: boolean) => {
      const activePlayer = queueRef.current[activeIndexRef.current];
      if (!activePlayer) return;

      setEliminatedPlayers(prev => [...prev, activePlayer.username]);

      if (activeIndexRef.current + 1 >= queueRef.current.length) {
         setGameState('GAMEOVER');
      } else {
         setActivePlayerIndex(prev => prev + 1);
         setTimeLeft(turnDuration);
      }
   };

   const resetGame = () => {
      setParticipants([]);
      setQueue([]);
      setGameState('WAITING');
      setCurrentStep(0);
      setActivePlayerIndex(0);
      setLastResult(null);
      setSafePath([]);
      setIsProcessing(false);
      setRevealedSide(null);
      setPlayerScores({});
   };

   // Sort queue by Score for Leaderboard display
   // Logic: Alive players first? Or just strictly by score? 
   // Requirement: "Rank who crossed more correct glasses".
   // So Sort by Score DESC.
   const getLeaderboard = () => {
      if (gameState === 'WAITING') return [];

      return [...queue].sort((a, b) => {
         const scoreA = playerScores[a.username] || 0;
         const scoreB = playerScores[b.username] || 0;
         return scoreB - scoreA;
      });
   };

   return (
      <>
         <SidebarPortal>
            <div className="bg-[#141619] p-4 rounded-xl border border-white/5 space-y-4 animate-in slide-in-from-right-4">
               <h4 className="text-xs font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                  <Footprints size={12} /> تحكم الجسر
               </h4>

               {gameState === 'WAITING' && (
                  <div className="space-y-2">
                     <label className="text-xs text-gray-400 block">وقت التفكير (ثواني)</label>
                     <input
                        type="number"
                        value={turnDuration}
                        onChange={(e) => setTurnDuration(parseInt(e.target.value) || 10)}
                        className="w-full bg-[#0b0e0f] border border-white/10 rounded px-2 py-1 text-white text-sm"
                     />
                     <button
                        onClick={startGame}
                        disabled={participants.length < 1}
                        className="w-full bg-cyan-600 text-white font-bold py-2 rounded-lg disabled:opacity-50"
                     >
                        بدء (يختار {PLAYER_LIMIT} عشوائياً)
                     </button>
                  </div>
               )}

               <button onClick={resetGame} className="w-full bg-white/5 py-2 rounded-lg text-xs text-gray-400">
                  <RotateCcw size={12} className="inline mr-1" /> تصفية وإعادة
               </button>
            </div>

            <div className="bg-[#141619] rounded-xl border border-white/5 flex flex-col overflow-hidden h-[350px] mt-3">
               <div className="p-3 border-b border-white/5 bg-[#0b0e0f] text-xs font-bold text-gray-400 flex justify-between items-center">
                  <div className="flex items-center gap-1">
                     <ListOrdered size={14} className="text-cyan-400" />
                     <span>الترتيب (الأكثر تقدماً)</span>
                  </div>
                  {gameState === 'PLAYING' && <span className="text-cyan-400 font-mono">الخطوة: {currentStep + 1}</span>}
               </div>
               <div className="overflow-y-auto flex-1 p-2 space-y-1 custom-scrollbar">
                  {gameState === 'WAITING' ? (
                     participants.map(p => (
                        <div key={p.username} className="px-2 py-1 bg-white/5 rounded text-xs text-gray-300 mb-1">
                           {p.username}
                        </div>
                     ))
                  ) : (
                     getLeaderboard().map((p, i) => {
                        const isDead = eliminatedPlayers.includes(p.username);
                        const score = playerScores[p.username] || 0;
                        const isActive = p.username === queue[activePlayerIndex]?.username;

                        return (
                           <div key={p.username} className={`flex justify-between px-2 py-2 rounded text-xs mb-1 items-center border border-transparent transition-all
                              ${isActive ? 'bg-cyan-900/20 border-cyan-500/30' : 'bg-white/5'}
                              ${isDead ? 'opacity-50 grayscale' : ''}
                           `}>
                              <div className="flex items-center gap-2">
                                 <span className={`font-mono font-bold w-4 ${i < 3 ? 'text-yellow-400' : 'text-gray-500'}`}>#{i + 1}</span>
                                 <ProAvatar
                                    url={p.avatar}
                                    username={p.username}
                                    size="w-10 h-10"
                                 />
                                 <span className={isActive ? 'text-cyan-400 font-bold' : 'text-gray-300'}>{p.username}</span>
                              </div>
                              <div className="flex items-center gap-3">
                                 {isDead && <Skull size={12} className="text-red-500" />}
                                 {isActive && !isDead && <span className="animate-pulse w-2 h-2 rounded-full bg-cyan-400"></span>}
                                 <span className="bg-black/30 px-1.5 rounded font-mono text-cyan-500 font-bold min-w-[20px] text-center">
                                    {score}
                                 </span>
                              </div>
                           </div>
                        )
                     })
                  )}
               </div>
            </div>
         </SidebarPortal>

         <div className="w-full h-full flex flex-col items-center justify-center p-6 relative overflow-hidden bg-[#0b0e0f]">
            {/* Background Grid */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(0,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,255,0.05)_1px,transparent_1px)] bg-[size:50px_50px] [transform:perspective(500px)_rotateX(60deg)] pointer-events-none opacity-30"></div>

            <div className="z-10 text-center mb-4 relative w-full max-w-4xl">

               {gameState === 'WAITING' && (
                  <div className="animate-in fade-in zoom-in duration-500">
                     <h1 className="text-6xl font-black text-white neon-text mb-4">الجسر الزجاجي</h1>
                     <div className="text-xl text-gray-500">
                        اكتب <span className="text-cyan-400">!دخول</span> للانضمام ({participants.length})
                     </div>
                     <div className="mt-4 flex gap-4 justify-center">
                        <div className="bg-white/5 px-4 py-2 rounded border border-white/10 text-sm text-gray-400">
                           {PLAYER_LIMIT} لاعبين
                        </div>
                        <div className="bg-white/5 px-4 py-2 rounded border border-white/10 text-sm text-gray-400">
                           {BRIDGE_LENGTH} خطوات
                        </div>
                     </div>
                  </div>
               )}

               {gameState === 'PLAYING' && queue[activePlayerIndex] && (
                  <div className="bg-[#141619]/90 backdrop-blur border border-cyan-500/30 p-6 rounded-2xl shadow-[0_0_30px_rgba(6,182,212,0.2)] animate-in slide-in-from-top-4 relative overflow-hidden">
                     {/* Result Overlays */}
                     {lastResult === 'JUMPING' && <div className="absolute inset-0 bg-black/50 z-20 flex items-center justify-center text-4xl font-black text-white animate-pulse">يقفز...</div>}
                     {lastResult === 'SAFE' && <div className="absolute inset-0 bg-green-500/80 z-20 flex items-center justify-center text-5xl font-black text-white">آمن! ✅</div>}
                     {lastResult === 'BROKEN' && (
                        <div className="absolute inset-0 bg-red-500/80 z-20 flex flex-col items-center justify-center animate-in zoom-in">
                           <div className="text-5xl font-black text-white mb-2">تحطم! 💀</div>
                           <div className="text-xl text-white font-bold bg-black/30 px-4 py-1 rounded">
                              الصحيح كان: {revealedSide === 0 ? 'اليسار ⬅️' : 'اليمين ➡️'}
                           </div>
                        </div>
                     )}

                     <div className="flex justify-between items-center mb-4">
                        <div className="text-sm text-gray-400 font-bold uppercase tracking-widest">الدور الحالي</div>
                        <div className="text-xs bg-cyan-900 text-cyan-200 px-2 py-1 rounded">الخطوة {currentStep + 1} / {BRIDGE_LENGTH}</div>
                     </div>
                     <div className="text-5xl font-black text-white mb-6 flex items-center justify-center gap-6">
                        <ProAvatar
                           url={queue[activePlayerIndex].avatar}
                           username={queue[activePlayerIndex].username}
                           size="w-24 h-24"
                           className="shadow-2xl"
                        />
                        {queue[activePlayerIndex].username}
                     </div>

                     <div className="flex items-center justify-center gap-8 mb-6">
                        <div className="text-center group">
                           <div className="bg-white/10 p-4 rounded-xl mb-2 group-hover:bg-cyan-500/20 transition-colors border border-white/5 group-hover:border-cyan-500">
                              <ArrowBigRight size={32} className="text-white" />
                           </div>
                           <div className="text-sm font-bold text-gray-400">!يمين</div>
                        </div>

                        <div className="text-7xl font-mono font-black text-yellow-500 w-32 tabular-nums relative">
                           {timeLeft}s
                        </div>

                        <div className="text-center group">
                           <div className="bg-white/10 p-4 rounded-xl mb-2 group-hover:bg-cyan-500/20 transition-colors border border-white/5 group-hover:border-cyan-500">
                              <ArrowBigLeft size={32} className="text-white" />
                           </div>
                           <div className="text-sm font-bold text-gray-400">!يسار</div>
                        </div>
                     </div>

                     <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden">
                        <div
                           className="bg-cyan-500 h-full transition-all duration-1000 linear"
                           style={{ width: `${(timeLeft / turnDuration) * 100}%` }}
                        ></div>
                     </div>
                  </div>
               )}

               {gameState === 'GAMEOVER' && (
                  <div className="text-center animate-in zoom-in duration-300">
                     <Skull size={100} className="mx-auto text-red-600 mb-4 animate-pulse" />
                     <div className="text-6xl font-black text-red-600">
                        الجميع سقطوا!
                     </div>
                     <div className="text-xl text-gray-400 mt-2">انظر للقائمة لمعرفة من وصل لأبعد نقطة</div>
                  </div>
               )}

               {gameState === 'WINNER' && queue[activePlayerIndex] && (
                  <div className="text-center animate-in zoom-in duration-500">
                     <Trophy size={100} className="text-yellow-400 mx-auto mb-4 animate-bounce" />
                     <h2 className="text-5xl font-black text-white mb-2">تم الوصول للنهاية!</h2>
                     <p className="text-2xl text-cyan-400 mt-2 font-black">{queue[activePlayerIndex].username} بطل الجسر</p>
                  </div>
               )}
            </div>

            {/* Bridge Visualization */}
            {gameState === 'PLAYING' && (
               <div className="w-full max-w-4xl mt-4 perspective-1000 relative h-40 flex items-center justify-center">
                  {/* Current Step Highlight */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                     <div className="w-full h-1 bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent"></div>
                  </div>

                  <div className="flex gap-6 transform rotate-x-12 items-end justify-center h-full">
                     {/* Show Previous Step (Faded) */}
                     {currentStep > 0 && (
                        <div className="flex flex-col gap-2 opacity-30 scale-75 blur-[1px]">
                           <div className={`w-24 h-24 border-2 rounded-lg flex items-center justify-center text-3xl font-black ${safePath[currentStep - 1] === 0 ? 'border-green-500 text-green-500 bg-green-500/20' : 'border-red-500/20 text-red-500/20'}`}>L</div>
                           <div className={`w-24 h-24 border-2 rounded-lg flex items-center justify-center text-3xl font-black ${safePath[currentStep - 1] === 1 ? 'border-green-500 text-green-500 bg-green-500/20' : 'border-red-500/20 text-red-500/20'}`}>R</div>
                        </div>
                     )}

                     {/* Current Step (Active) */}
                     <div className="flex flex-col gap-2 scale-110 z-10 mx-4 relative">
                        <div className="absolute -top-12 left-1/2 -translate-x-1/2 text-cyan-400 font-bold text-xs whitespace-nowrap">الخطوة {currentStep + 1}</div>
                        <div className="w-24 h-24 bg-cyan-500/10 border-4 border-cyan-500/50 rounded-lg flex items-center justify-center text-4xl font-black text-cyan-500 shadow-[0_0_20px_rgba(6,182,212,0.2)]">L</div>
                        <div className="w-24 h-24 bg-cyan-500/10 border-4 border-cyan-500/50 rounded-lg flex items-center justify-center text-4xl font-black text-cyan-500 shadow-[0_0_20px_rgba(6,182,212,0.2)]">R</div>
                        {/* Player Avatar */}
                        {!isProcessing && lastResult !== 'BROKEN' && (
                           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 bg-white rounded-full border-4 border-cyan-500 flex items-center justify-center text-black font-black z-20 shadow-xl animate-bounce overflow-visible">
                              <ProAvatar
                                 url={queue[activeIndexRef.current]?.avatar}
                                 username={queue[activeIndexRef.current]?.username || ''}
                                 size="w-full h-full"
                              />
                           </div>
                        )}
                     </div>

                     {/* Next Steps */}
                     {[1, 2].map((offset) => {
                        const nextStep = currentStep + offset;
                        if (nextStep >= BRIDGE_LENGTH) return null;
                        return (
                           <div key={nextStep} className="flex flex-col gap-2 opacity-50 scale-90">
                              <div className="w-24 h-24 border-2 border-white/10 bg-white/5 rounded-lg flex items-center justify-center text-2xl font-black text-white/20">?</div>
                              <div className="w-24 h-24 border-2 border-white/10 bg-white/5 rounded-lg flex items-center justify-center text-2xl font-black text-white/20">?</div>
                           </div>
                        )
                     })}

                     {/* Finish Line Visual */}
                     {currentStep + 1 >= BRIDGE_LENGTH && (
                        <div className="flex flex-col gap-2 opacity-50 scale-90 ml-4">
                           <div className="h-48 border-l-4 border-dashed border-yellow-500 flex items-center pl-4">
                              <span className="text-yellow-500 font-black text-xl [writing-mode:vertical-rl]">FINISH</span>
                           </div>
                        </div>
                     )}
                  </div>
               </div>
            )}
         </div>
      </>
   );
};
