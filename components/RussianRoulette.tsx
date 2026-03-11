
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { chatService } from '../services/chatService';
import { ChatUser } from '../types';
import { Disc, RotateCcw, Skull, User, Target, Zap, Trophy, Flame } from 'lucide-react';
import { ProAvatar } from './ProAvatar';

interface RussianRouletteProps {
   channelConnected: boolean;
   isOBS?: boolean;
}

const SidebarPortal = ({ children }: { children?: React.ReactNode }) => {
   const [mounted, setMounted] = useState(false);
   useEffect(() => { setMounted(true); return () => setMounted(false); }, []);
   const el = document.getElementById('game-sidebar-portal');
   if (!mounted || !el) return null;
   return createPortal(children, el);
};

export const RussianRoulette: React.FC<RussianRouletteProps> = ({ channelConnected, isOBS }) => {
   const [participants, setParticipants] = useState<ChatUser[]>([]);
   const [gameState, setGameState] = useState<'WAITING' | 'ACTIVE' | 'ELIMINATED' | 'WINNER' | 'CLICK'>('WAITING');
   const [bulletIndex, setBulletIndex] = useState(0);
   const [currentTurnIndex, setCurrentTurnIndex] = useState(0);
   const [cylinderPosition, setCylinderPosition] = useState(0);
   const [flash, setFlash] = useState(false);

   const participantsRef = useRef(participants);
   const gameStateRef = useRef(gameState);
   const turnIndexRef = useRef(currentTurnIndex);

   useEffect(() => { participantsRef.current = participants; }, [participants]);
   useEffect(() => { gameStateRef.current = gameState; }, [gameState]);
   useEffect(() => { turnIndexRef.current = currentTurnIndex; }, [currentTurnIndex]);

   useEffect(() => {
      if (!channelConnected) return;
      const cleanup = chatService.onMessage((msg) => {
         const content = msg.content.trim().toLowerCase();

         // Join
         if (gameStateRef.current === 'WAITING' && (content === '!join' || content === '!دخول' || content.includes('🔫'))) {
            if (participantsRef.current.length < 6 && !participantsRef.current.find(p => p.username === msg.user.username)) {
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

         // Pull Trigger
         if (gameStateRef.current === 'ACTIVE') {
            const currentPlayer = participantsRef.current[turnIndexRef.current];
            if (currentPlayer && currentPlayer.username === msg.user.username) {
               if (content === '!pull' || content === '!أطلق' || content === '!shoot' || content === 'shoot' || content.includes('🔫') || content.includes('🔥')) {
                  pullTrigger();
               }
            }
         }
      });
      return cleanup;
   }, [channelConnected]);

   const startGame = () => {
      if (participants.length < 1) return;
      // Randomize bullet
      setBulletIndex(Math.floor(Math.random() * 6));
      setCurrentTurnIndex(0);
      setCylinderPosition(0);
      setGameState('ACTIVE');
   };

   const pullTrigger = () => {
      const isHit = cylinderPosition % 6 === bulletIndex;

      if (isHit) {
         setGameState('ELIMINATED');
         setFlash(true);
         setTimeout(() => setFlash(false), 200);

         setTimeout(() => {
            const loser = participantsRef.current[turnIndexRef.current];
            const survivors = participantsRef.current.filter(p => p.username !== loser.username);
            setParticipants(survivors);

            if (survivors.length === 1) {
               setGameState('WINNER');
            } else if (survivors.length === 0) {
               setGameState('WAITING');
            } else {
               setGameState('ACTIVE');
               // Re-spin bullet for next round? Classic RR keeps current position, but game-wise re-spin is more unpredictable
               setBulletIndex(Math.floor(Math.random() * 6));
               setCylinderPosition(0);
               setCurrentTurnIndex(prev => prev % survivors.length);
            }
         }, 2500);
      } else {
         setGameState('CLICK');
         // Temporary "Click" state for tension
         setTimeout(() => {
            if (gameStateRef.current === 'CLICK') {
               setGameState('ACTIVE');
               setCylinderPosition(prev => prev + 1);
               setCurrentTurnIndex(prev => (prev + 1) % participantsRef.current.length);
            }
         }, 1000);
      }
   };

   const resetGame = () => {
      setParticipants([]);
      setGameState('WAITING');
   };

   return (
      <>
         {!isOBS && (
            <SidebarPortal>
               <div className="bg-[#0a0a0c]/90 backdrop-blur-md p-5 rounded-[2rem] border border-white/10 space-y-4 animate-in slide-in-from-right-4 shadow-2xl">
                  <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                     <Target size={12} className="text-red-500" /> ROULETTE CONTROL
                  </h4>
                  {gameState === 'WAITING' && (
                     <button
                        onClick={startGame}
                        disabled={participants.length < 1}
                        className="w-full bg-red-600 hover:bg-red-500 text-white font-black py-3 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-20 shadow-lg shadow-red-900/20"
                     >
                        <Zap size={18} /> START GAME ({participants.length}/6)
                     </button>
                  )}
                  <button onClick={resetGame} className="w-full bg-white/5 hover:bg-white/10 py-3 rounded-2xl text-[10px] text-gray-400 font-black uppercase tracking-widest border border-white/5 transition-all">
                     <RotateCcw size={14} className="inline mr-2" /> WIPE TABLE
                  </button>
               </div>

               <div className="bg-[#0a0a0c]/90 backdrop-blur-md rounded-[2rem] border border-white/10 flex flex-col h-[400px] mt-4 shadow-2xl">
                  <div className="p-4 border-b border-white/5 bg-gradient-to-r from-red-600/10 to-transparent">
                     <span className="text-[10px] font-black text-white flex items-center gap-2 uppercase tracking-widest">
                        <User size={14} className="text-gray-400" /> Chamber Players
                     </span>
                  </div>
                  <div className="overflow-y-auto flex-1 p-3 space-y-2 custom-scrollbar">
                     {participants.map((p, i) => (
                        <div key={p.username} className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${i === currentTurnIndex && gameState === 'ACTIVE' ? 'bg-red-500/20 border-red-500/50 scale-105 shadow-lg' : 'bg-white/5 border-white/5'}`}>
                           <div className="flex items-center gap-3">
                              <ProAvatar
                                 url={p.avatar}
                                 username={p.username}
                                 size="w-14 h-14"
                              />
                              <span className="text-sm font-black text-white truncate w-24">{p.username}</span>
                           </div>
                           {i === currentTurnIndex && gameState === 'ACTIVE' && <Flame size={16} className="text-red-500 animate-pulse" />}
                        </div>
                     ))}
                     {participants.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center opacity-20 grayscale italic text-[10px] font-black uppercase tracking-[0.2em]">
                           Empty Table
                        </div>
                     )}
                  </div>
               </div>
            </SidebarPortal>
         )}

         <div className={`w-full h-full flex flex-col items-center justify-center p-6 relative overflow-hidden transition-colors duration-200 ${flash ? 'bg-red-600' : 'bg-[#050505]'}`}>

            {/* Atmospheric Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black pointer-events-none z-10"></div>

            {gameState === 'WAITING' && (
               <div className="z-20 text-center animate-in zoom-in duration-1000 flex flex-col items-center">
                  <div className="relative mb-10 group">
                     <div className="absolute -inset-10 bg-red-600/10 blur-[100px] rounded-full group-hover:bg-red-500/20 transition-all duration-1000"></div>
                     <Skull size={140} className="relative text-gray-400 group-hover:text-red-600 group-hover:scale-110 transition-all duration-1000 drop-shadow-[0_0_50px_rgba(0,0,0,0.8)]" />
                  </div>
                  <h2 className="text-7xl font-black text-white uppercase tracking-tighter italic scale-y-110 mb-4">
                     Russian <span className="text-red-600">Roulette</span>
                  </h2>
                  <div className="flex items-center justify-center gap-4 mt-8">
                     {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className={`w-28 h-28 rounded-2xl border-2 transition-all duration-500 flex items-center justify-center rotate-${i * 10} ${participants[i] ? 'bg-red-600 border-red-400 shadow-[0_0_30px_rgba(220,38,38,0.5)] scale-110' : 'bg-transparent border-white/10 opacity-20'} overflow-visible`}>
                           {participants[i] ? (
                              <ProAvatar
                                 url={participants[i].avatar}
                                 username={participants[i].username}
                                 size="w-28 h-28"
                                 className="overflow-visible"
                              />
                           ) : (
                              <Target size={24} className="text-white/20" />
                           )}
                        </div>
                     ))}
                  </div>
                  <div className="mt-16 bg-white/5 backdrop-blur-md px-10 py-4 rounded-full border border-white/10 animate-bounce">
                     <span className="text-white font-black text-xl">اكتب <span className="text-red-600 underline">!دخول</span> للمقامرة بحياتك</span>
                  </div>
               </div>
            )}

            {(gameState === 'ACTIVE' || gameState === 'CLICK') && participants.length > 0 && (
               <div className="z-20 text-center flex flex-col items-center">
                  <div className="text-xs font-black text-red-500 uppercase tracking-[1em] mb-4 animate-pulse">Current Target</div>
                  <div className="relative group mb-12">
                     <div className="absolute -inset-4 bg-red-600/20 blur-2xl rounded-full group-hover:bg-red-500/30 transition-all"></div>
                     <ProAvatar
                        url={participants[currentTurnIndex].avatar}
                        username={participants[currentTurnIndex].username}
                        size="w-48 h-48"
                        className="overflow-visible"
                     />
                     <div className="absolute -bottom-4 -right-4 bg-red-600 text-white px-4 py-1 rounded-lg font-black text-xs shadow-lg">Target #{(currentTurnIndex + 1)}</div>
                  </div>

                  <h1 className="text-8xl font-black text-white italic tracking-tighter drop-shadow-2xl mb-12">
                     {participants[currentTurnIndex].username}
                  </h1>

                  {/* Cylinder Visual */}
                  <div className="relative w-48 h-48 mb-12">
                     <div className="absolute inset-0 bg-neutral-900 rounded-full border-[12px] border-neutral-800 shadow-[inset_0_0_40px_rgba(0,0,0,0.8)] flex items-center justify-center">
                        {Array.from({ length: 6 }).map((_, i) => (
                           <div
                              key={i}
                              className={`absolute w-10 h-10 rounded-full border-2 transition-all duration-500 flex items-center justify-center
                                   ${i === (cylinderPosition % 6) ? 'bg-red-600 border-white shadow-[0_0_20px_red]' : 'bg-neutral-800 border-white/10'}`}
                              style={{
                                 transform: `rotate(${i * 60}deg) translateY(-55px) rotate(-${i * 60}deg)`
                              }}
                           >
                              {i < (cylinderPosition % 6) && <div className="text-[10px] opacity-20">EMPTY</div>}
                           </div>
                        ))}
                        <div className="w-12 h-12 bg-neutral-800 rounded-full border-4 border-neutral-700 flex items-center justify-center shadow-lg">
                           <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse shadow-[0_0_10px_red]"></div>
                        </div>
                     </div>
                     <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-4 text-red-600 animate-bounce">
                        <Target size={32} />
                     </div>
                  </div>

                  {gameState === 'CLICK' ? (
                     <div className="px-12 py-6 bg-white/10 backdrop-blur-3xl rounded-[2rem] border-2 border-green-500/50 text-green-500 font-black text-4xl animate-in zoom-in italic shadow-[0_0_40px_rgba(34,197,94,0.3)]">
                        * CLICK *
                     </div>
                  ) : (
                     <div className="flex flex-col items-center gap-6">
                        <div className="px-12 py-5 bg-red-600 text-white rounded-[2rem] font-black text-3xl shadow-[0_0_50px_rgba(220,38,38,0.4)] animate-pulse border-t border-red-400">
                           اطلق النار !أطلق
                        </div>
                        <div className="text-[10px] text-white/20 font-black uppercase tracking-[0.5em]">The chamber is ready</div>
                     </div>
                  )}
               </div>
            )}

            {gameState === 'ELIMINATED' && (
               <div className="z-20 text-center animate-in zoom-in duration-75 flex flex-col items-center">
                  <div className="text-[200px] filter drop-shadow-[0_0_100px_red]">💀</div>
                  <h1 className="text-9xl font-black text-red-600 italic tracking-tighter skew-x-[-10deg] red-neon-text">
                     BANG!
                  </h1>
                  <p className="mt-8 text-white/40 font-black tracking-[1em] uppercase text-xs">A player has fallen</p>
               </div>
            )}

            {gameState === 'WINNER' && participants[0] && (
               <div className="z-20 text-center animate-in zoom-in duration-500 flex flex-col items-center">
                  <div className="relative mb-8">
                     <div className="absolute inset-0 bg-yellow-500/20 blur-[100px] rounded-full animate-pulse scale-150"></div>
                     <ProAvatar
                        url={participants[0].avatar}
                        username={participants[0].username}
                        size="w-64 h-64"
                        className="shadow-[0_0_80px_rgba(234,179,8,0.4)] relative z-10 overflow-visible"
                     />
                     <div className="absolute -top-10 -right-10 z-20 animate-bounce">
                        <Trophy size={100} className="text-yellow-500 drop-shadow-[0_0_30px_rgba(234,179,8,0.8)]" />
                     </div>
                  </div>
                  <h2 className="text-xs font-black text-yellow-500 uppercase tracking-[1em] mb-4">The Last Living Being</h2>
                  <h1 className="text-8xl font-black text-white italic tracking-tighter mb-4 gold-glow-text">{participants[0].username}</h1>
                  <p className="mt-4 text-white/20 font-black tracking-[0.5em] uppercase text-xs">Survived the Roulette</p>
               </div>
            )}

            {/* Cinematic Vignette */}
            <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_300px_black] z-30"></div>
         </div>
      </>
   );
};
