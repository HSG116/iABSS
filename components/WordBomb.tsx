
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { chatService } from '../services/chatService';
import { BOMB_SYLLABLES } from '../constants';
import { ChatUser } from '../types';
import { Bomb, Play, RotateCcw, UserPlus } from 'lucide-react';
import { ProAvatar } from './ProAvatar';

interface WordBombProps {
  channelConnected: boolean;
}

const SidebarPortal = ({ children }: { children?: React.ReactNode }) => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); return () => setMounted(false); }, []);
  const el = document.getElementById('game-sidebar-portal');
  if (!mounted || !el) return null;
  return createPortal(children, el);
};

export const WordBomb: React.FC<WordBombProps> = ({ channelConnected }) => {
  const [gameState, setGameState] = useState<'WAITING' | 'PLAYING' | 'EXPLODED'>('WAITING');
  const [participants, setParticipants] = useState<ChatUser[]>([]);
  const [holder, setHolder] = useState<ChatUser | null>(null);
  const [syllable, setSyllable] = useState('');
  const [timeLeft, setTimeLeft] = useState(10);
  const [explosion, setExplosion] = useState(false);

  // Refs for loop
  const participantsRef = useRef(participants);
  const holderRef = useRef(holder);
  const syllableRef = useRef(syllable);
  const gameStateRef = useRef(gameState);

  useEffect(() => { participantsRef.current = participants; }, [participants]);
  useEffect(() => { holderRef.current = holder; }, [holder]);
  useEffect(() => { syllableRef.current = syllable; }, [syllable]);
  useEffect(() => { gameStateRef.current = gameState; }, [gameState]);

  // Timer logic
  useEffect(() => {
     let interval: number;
     if (gameState === 'PLAYING' && timeLeft > 0) {
        interval = window.setInterval(() => {
           setTimeLeft(prev => prev - 1);
        }, 1000);
     } else if (gameState === 'PLAYING' && timeLeft === 0) {
        handleExplosion();
     }
     return () => clearInterval(interval);
  }, [gameState, timeLeft]);

  // Chat listener for joins
  useEffect(() => {
     if (!channelConnected) return;
     const cleanup = chatService.onMessage((msg) => {
        const content = msg.content.trim().toUpperCase();
        
        // Join Logic
        if (gameStateRef.current === 'WAITING' && (content === '!JOIN' || content === '!دخول')) {
           if (!participantsRef.current.find(p => p.username === msg.user.username)) {
              setParticipants(prev => [...prev, msg.user]);
           }
        }

        // Gameplay Logic
        if (gameStateRef.current === 'PLAYING' && holderRef.current?.username === msg.user.username) {
           if (content.includes(syllableRef.current)) {
              // Valid pass!
              passBomb();
           }
        }
     });
     return cleanup;
  }, [channelConnected]);

  const startGame = () => {
     if (participants.length < 1) return;
     passBomb(true); // Initial pass
     setGameState('PLAYING');
     setExplosion(false);
  };

  const passBomb = (isFirst = false) => {
     const currentList = participantsRef.current;
     // Pick random NEXT player (not current)
     let nextHolder;
     if (isFirst) {
        nextHolder = currentList[Math.floor(Math.random() * currentList.length)];
     } else {
        const others = currentList.filter(p => p.username !== holderRef.current?.username);
        // If single player, they get the bomb again
        if (others.length === 0) {
            nextHolder = currentList[0];
        } else {
            nextHolder = others[Math.floor(Math.random() * others.length)];
        }
     }

     // Pick random syllable
     const nextSyllable = BOMB_SYLLABLES[Math.floor(Math.random() * BOMB_SYLLABLES.length)];

     setHolder(nextHolder);
     setSyllable(nextSyllable);
     setTimeLeft(10 + Math.floor(Math.random() * 5)); // 10-15s random time
  };

  const handleExplosion = () => {
     setGameState('EXPLODED');
     setExplosion(true);
     // Eliminate loser
     const loser = holderRef.current;
     setParticipants(prev => prev.filter(p => p.username !== loser?.username));
     setHolder(null);
  };

  const resetGame = () => {
     setParticipants([]);
     setGameState('WAITING');
     setHolder(null);
     setSyllable('');
     setExplosion(false);
  };

  return (
    <>
      <SidebarPortal>
         <div className="bg-[#141619] p-4 rounded-xl border border-white/5 space-y-3 animate-in slide-in-from-right-4">
             <h4 className="text-xs font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                <Bomb size={12} /> تحكم القنبلة
             </h4>
             {gameState === 'WAITING' ? (
                <button 
                   onClick={startGame}
                   disabled={participants.length < 1}
                   className="w-full bg-orange-600 text-white font-bold py-2 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50"
                >
                   <Play size={14} /> ابدأ ({participants.length})
                </button>
             ) : (
                <button onClick={() => setGameState('WAITING')} className="w-full bg-red-500/20 text-red-500 py-2 rounded-lg text-xs font-bold">
                   إيقاف
                </button>
             )}
             <button onClick={resetGame} className="w-full bg-white/5 py-2 rounded-lg text-xs text-gray-400">
                <RotateCcw size={12} className="inline mr-1" /> تصفية
             </button>
         </div>

         <div className="bg-[#141619] rounded-xl border border-white/5 flex flex-col overflow-hidden h-[300px] mt-3">
             <div className="p-3 border-b border-white/5 bg-[#0b0e0f] text-xs font-bold text-gray-400">
                <UserPlus size={14} className="inline mr-1" /> اللاعبين ({participants.length})
             </div>
             <div className="overflow-y-auto flex-1 p-2 space-y-2 custom-scrollbar">
                {participants.map(p => (
                    <div key={p.username} className="flex items-center gap-3 p-2 bg-white/5 rounded-xl border border-white/5 hover:bg-white/10 transition-colors overflow-visible">
                       <ProAvatar username={p.username} size="w-14 h-14" className="overflow-visible" />
                       <span className="text-xs text-gray-300 font-bold truncate">{p.username}</span>
                    </div>
                ))}
             </div>
          </div>
      </SidebarPortal>

      <div className="w-full h-full flex flex-col items-center justify-center p-6 relative overflow-hidden">
         {gameState === 'WAITING' && (
            <div className="text-center opacity-60">
               <Bomb size={80} className="mx-auto mb-4 text-orange-500" />
               <h2 className="text-4xl font-black text-white">الكلمة القنبلة</h2>
               <p className="text-xl mt-2">اكتب <span className="text-orange-500">!دخول</span> للمشاركة</p>
            </div>
         )}

          {gameState === 'PLAYING' && holder && (
            <div className="text-center w-full max-w-lg flex flex-col items-center">
                <div className="flex flex-col items-center mb-8 gap-4 animate-in slide-in-from-top duration-500 overflow-visible">
                   <ProAvatar username={holder.username} size="w-72 h-72" className="overflow-visible" />
                   <div className="text-6xl font-black text-white neon-text">{holder.username}</div>
                </div>
               
               <div className="relative inline-block animate-bounce">
                  <Bomb size={150} className="text-gray-200" />
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-black font-black text-3xl bg-orange-500 px-4 py-2 rounded shadow-lg border-2 border-white">
                     {syllable}
                  </div>
                  <div className="absolute -top-4 -right-4 text-2xl font-mono text-red-500 bg-black px-2 rounded border border-red-500 animate-pulse">
                     {timeLeft}s
                  </div>
               </div>
               
               <p className="mt-10 text-xl text-gray-400 font-bold">
                  بسرعة! اكتب كلمة تحتوي على <span className="text-orange-500 text-2xl mx-2">{syllable}</span>
               </p>
            </div>
         )}

         {gameState === 'EXPLODED' && (
            <div className="text-center animate-in zoom-in duration-300">
               <div className="text-9xl mb-4">💥</div>
               <h1 className="text-6xl font-black text-red-600 neon-text">BOOM!</h1>
               <button onClick={startGame} className="mt-8 px-8 py-3 bg-white/10 hover:bg-white/20 rounded-xl text-white font-bold">
                   الجولة التالية
               </button>
            </div>
         )}
      </div>
    </>
  );
};
