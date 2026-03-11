import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { chatService } from '../services/chatService';
import { leaderboardService } from '../services/supabase';
import { Coffee, Play, RotateCcw, Trophy, CheckCircle2, Lock, LogOut, Home, Settings, Users, Hash } from 'lucide-react';
import confetti from 'canvas-confetti';
import { ProAvatar } from './ProAvatar';


interface CupShuffleProps {
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

export const CupShuffle: React.FC<CupShuffleProps> = ({ channelConnected, onHome }) => {
  const [gameState, setGameState] = useState<'IDLE' | 'SHUFFLING' | 'VOTING' | 'REVEAL' | 'FINISHED'>('IDLE');
  const [cupCount, setCupCount] = useState(3);
  const [ballPosition, setBallPosition] = useState(0); // 0-indexed
  const [totalRounds, setTotalRounds] = useState(5);
  const [currentRound, setCurrentRound] = useState(1);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [roundVotes, setRoundVotes] = useState<Record<string, { vote: number, avatar?: string }>>({});
  const [voteCounts, setVoteCounts] = useState<number[]>([]);
  const [shuffleAnim, setShuffleAnim] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);

  // FIX: Use a mutable Set for synchronous immediate blocking of duplicates
  // This avoids the tiny gap between setState and the ref updating via useEffect
  const votedUsersMutRef = useRef(new Set<string>());

  const gameStateRef = useRef(gameState);
  const roundVotesRef = useRef(roundVotes);
  const cupCountRef = useRef(cupCount);

  useEffect(() => {
    gameStateRef.current = gameState;
    roundVotesRef.current = roundVotes;
    cupCountRef.current = cupCount;
  }, [gameState, roundVotes, cupCount]);

  // Init vote counts on cup change
  useEffect(() => {
    setVoteCounts(new Array(cupCount).fill(0));
    // Reset ball position if out of bounds
    if (ballPosition >= cupCount) setBallPosition(Math.floor(Math.random() * cupCount));
  }, [cupCount]);

  // VOTING TIMER
  useEffect(() => {
    let timer: number;
    if (gameState === 'VOTING' && timeLeft > 0) {
      timer = window.setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [gameState, timeLeft]);

  useEffect(() => {
    if (!channelConnected) return;
    const cleanup = chatService.onMessage((msg) => {
      if (gameStateRef.current !== 'VOTING') return;
      const user = msg.user.username;

      // STRICT SYNCHRONOUS CHECK
      // Check the mutable ref directly, not the state-synced one
      if (votedUsersMutRef.current.has(user)) return;

      const content = msg.content.trim();
      const match = content.match(/^!?(\d+)$/);

      if (match) {
        const num = parseInt(match[1]);
        if (num >= 1 && num <= cupCountRef.current) {
          // Mark as voted IMMEDIATELY
          votedUsersMutRef.current.add(user);

          const voteIndex = num - 1;
          setRoundVotes(prev => ({ ...prev, [user]: { vote: voteIndex, avatar: msg.user.avatar } }));
          setVoteCounts(prev => {
            const nc = [...prev];
            while (nc.length < cupCountRef.current) nc.push(0);
            nc[voteIndex] = (nc[voteIndex] || 0) + 1;
            return nc;
          });
        }
      }
    });
    return cleanup;
  }, [channelConnected]);

  const triggerConfetti = () => {
    let duration = 3000;
    let animationEnd = Date.now() + duration;
    let defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };
    let randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

    let interval: any = setInterval(function () {
      let timeLeft = animationEnd - Date.now();
      if (timeLeft <= 0) return clearInterval(interval);
      let particleCount = 50 * (timeLeft / duration);
      confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } }));
      confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } }));
    }, 250);
  };

  const startRoundSequence = async () => {
    // RESET VOTES FOR NEW ROUND
    setRoundVotes({});
    votedUsersMutRef.current.clear(); // Clear the sync set
    setVoteCounts(new Array(cupCount).fill(0));

    setGameState('SHUFFLING');
    setShuffleAnim(true);

    let currentBall = ballPosition;
    const shuffles = 15 + Math.floor(Math.random() * 10);

    for (let i = 0; i < shuffles; i++) {
      await new Promise(r => setTimeout(r, 150));
      const move = Math.random() > 0.5 ? 1 : -1;
      let next = currentBall + move;
      if (next < 0) next = cupCount - 1;
      if (next >= cupCount) next = 0;
      if (Math.random() > 0.8) next = Math.floor(Math.random() * cupCount);

      currentBall = next;
      setBallPosition(currentBall);
    }

    setShuffleAnim(false);

    // Start Voting Phase
    setGameState('VOTING');
    setTimeLeft(15);

    setTimeout(async () => {
      revealRound(currentBall);
    }, 15000); // 15 seconds voting time
  };

  const revealRound = async (finalBallPos: number) => {
    setGameState('REVEAL');
    triggerConfetti();

    const ns = { ...scores };
    let winnersCount = 0;

    for (const [u, rawData] of Object.entries(roundVotesRef.current)) {
      const data = rawData as { vote: number, avatar?: string };
      if (data.vote === finalBallPos) {
        ns[u] = (ns[u] || 0) + 1;
        winnersCount++;
        leaderboardService.recordWin(u, data.avatar || '', 50);
      }
    }
    setScores(ns);

    const isFinal = currentRound >= totalRounds;

    setTimeout(() => {
      if (isFinal) {
        setGameState('FINISHED');
      } else {
        setCurrentRound(p => p + 1);
        setRoundVotes({});
        setVoteCounts(new Array(cupCount).fill(0));
        setGameState('IDLE');
        setTimeout(() => startRoundSequence(), 2000);
      }
    }, 5000);
  };

  const sortedScores = Object.entries(scores).sort((a, b) => (b[1] as number) - (a[1] as number));

  return (
    <>
      <SidebarPortal>
        <div className="bg-black/40 p-5 rounded-[2.5rem] border border-white/5 space-y-6 animate-in slide-in-from-right duration-500 shadow-2xl backdrop-blur-md">
          <div className="flex items-center justify-between border-b border-white/5 pb-4">
            <h4 className="text-[12px] font-black text-red-500 uppercase tracking-widest flex items-center gap-3">
              <Coffee size={16} /> إعدادات الأكواب
            </h4>
            <button onClick={onHome} className="p-2.5 bg-red-600/10 hover:bg-red-600/20 text-red-500 rounded-xl transition-all border border-red-500/20"><LogOut size={16} /></button>
          </div>

          {/* Game Controls */}
          <div className="space-y-4">
            {gameState === 'IDLE' || gameState === 'FINISHED' ? (
              <>
                <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                  <label className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-3 block flex items-center gap-2">
                    <Hash size={12} /> عدد الأكواب: <span className="text-white text-lg">{cupCount}</span>
                  </label>
                  <input
                    type="range"
                    min="3"
                    max="10"
                    value={cupCount}
                    onChange={(e) => {
                      setCupCount(parseInt(e.target.value));
                      setVoteCounts(new Array(parseInt(e.target.value)).fill(0));
                    }}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-red-500"
                  />
                  <div className="flex justify-between text-[8px] text-gray-500 mt-2 font-mono">
                    <span>3</span><span>10</span>
                  </div>
                </div>

                <button onClick={() => {
                  setScores({});
                  setCurrentRound(1);
                  setRoundVotes({});
                  setVoteCounts(new Array(cupCount).fill(0));
                  startRoundSequence();
                }} className="w-full bg-gradient-to-r from-red-600 to-red-800 text-white font-black py-4 rounded-2xl text-sm shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2 border-t border-white/20 uppercase tracking-widest">
                  <Play fill="currentColor" size={16} /> بدء اللعبة
                </button>
              </>
            ) : (
              <div className="text-center bg-red-600/20 p-4 rounded-xl border border-red-500/20 animate-pulse">
                <div className="text-red-400 text-xs font-black uppercase tracking-widest mb-1">اللعبة جارية</div>
                <div className="text-white font-mono text-xl">{gameState}</div>
                {gameState === 'VOTING' && <div className="text-4xl font-black text-white mt-2 font-mono">{timeLeft}s</div>}
              </div>
            )}
          </div>

          {/* Leaderboard Mini */}
          {sortedScores.length > 0 && (
            <div className="bg-black/20 rounded-2xl p-4 border border-white/5 max-h-[200px] overflow-y-auto custom-scrollbar">
              <div className="flex items-center gap-2 text-[10px] text-gray-500 font-bold mb-3 uppercase tracking-widest">
                <Trophy size={12} /> المتصدرين
              </div>
              {sortedScores.map(([name, score], i) => (
                <div key={i} className="flex justify-between items-center py-2 border-b border-white/5 last:border-0 group">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-gray-600 w-4">{i + 1}.</span>
                    <ProAvatar username={name} size="w-7 h-7" className="overflow-visible" />
                    <span className="text-xs text-gray-300 font-bold group-hover:text-white transition-colors">{name}</span>
                  </div>
                  <span className="text-xs text-red-500 font-mono font-black italic">{score}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </SidebarPortal>

      <div className="w-full h-full flex flex-col items-center justify-center p-8 bg-transparent relative overflow-hidden select-none">

        {/* Background Ambient */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,rgba(220,38,38,0.1)_0%,transparent_70%)]"></div>
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20"></div>
        </div>

        {/* Header Info */}
        <div className="absolute top-10 left-0 w-full text-center z-20">
          <div className="inline-flex items-center gap-4 bg-black/40 backdrop-blur-md px-8 py-3 rounded-full border border-white/10 shadow-2xl animate-in slide-in-from-top-4">
            <span className="text-gray-400 text-sm font-black uppercase tracking-widest">Round</span>
            <span className="text-3xl font-black text-white italic">{currentRound} <span className="text-gray-600 text-lg">/ {totalRounds}</span></span>
          </div>

          <div className="mt-6 h-12">
            {gameState === 'VOTING' && <div className="text-6xl font-black text-white uppercase tracking-widest animate-pulse drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]">Vote: {timeLeft}s</div>}
            {gameState === 'SHUFFLING' && <div className="text-4xl font-black text-red-500 uppercase tracking-widest animate-pulse">Shuffling...</div>}
            {gameState === 'REVEAL' && <div className="text-5xl font-black text-yellow-400 uppercase tracking-widest drop-shadow-[0_0_25px_gold]">Revealed!</div>}
          </div>
        </div>

        {/* GAME AREA */}
        <div className="relative w-full max-w-7xl flex-1 flex flex-col justify-center">

          {/* Cups Grid - Dynamic Layout */}
          <div className={`
                 w-full mx-auto transition-all duration-500
                 ${cupCount <= 5
              ? 'flex flex-wrap justify-center items-end gap-12'
              : 'grid grid-cols-5 gap-x-8 gap-y-20 justify-items-center items-end max-w-5xl'
            }
             `}>
            {Array.from({ length: cupCount }).map((_, idx) => {
              // Determine visual state
              const isBallHere = ballPosition === idx;
              const isRevealed = gameState === 'REVEAL' || gameState === 'IDLE' || gameState === 'FINISHED';

              // Animation: If shuffling, maybe bounce randomly? 
              // Simple random jitter during shuffle
              const shuffleOffset = shuffleAnim ? `translate(${Math.random() * 10 - 5}px, ${Math.random() * 10 - 5}px)` : 'none';

              return (
                <div key={idx} className="flex flex-col items-center group relative h-[300px] justify-end" style={{ transform: shuffleOffset }}>

                  {/* Vote Counter Badge */}
                  <div className="mb-4 bg-black/60 border border-white/10 px-4 py-1.5 rounded-full flex items-center gap-2 backdrop-blur-sm shadow-xl transition-all group-hover:scale-110">
                    <Users size={12} className="text-gray-400" />
                    <span className={`font-mono font-black text-sm ${voteCounts[idx] > 0 ? 'text-white' : 'text-gray-500'}`}>{voteCounts[idx] || 0}</span>
                  </div>

                  {/* The Cup Container */}
                  <div className="relative w-24 h-32 md:w-32 md:h-40 perspective-[1000px] z-10 transition-all duration-500">

                    {/* The Cup Body */}
                    <div className={`
                                    w-full h-full relative transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)]
                                    ${isRevealed && isBallHere ? '-translate-y-24 rotate-[-15deg]' : 'translate-y-0'}
                                    ${shuffleAnim ? 'blur-[1px]' : ''}
                                `}>
                      <div className="absolute inset-0 bg-gradient-to-b from-red-600 to-red-900 rounded-t-xl rounded-b-[3rem] shadow-[0_20px_40px_rgba(0,0,0,0.6),inset_0_2px_10px_rgba(255,255,255,0.3)] border-t border-white/20 flex items-center justify-center overflow-hidden">
                        {/* Stripe Deco */}
                        <div className="absolute top-1/2 w-full h-8 bg-black/20 transform -skew-y-12"></div>
                        <div className="absolute top-8 w-full h-2 bg-white/10"></div>

                        {/* Cup Number */}
                        <span className="text-5xl font-black text-white/90 italic drop-shadow-[0_2px_0px_rgba(0,0,0,0.5)] z-10">{idx + 1}</span>
                      </div>

                      {/* Cup Rim Highlight */}
                      <div className="absolute top-0 left-0 right-0 h-4 bg-white/10 rounded-full blur-[2px]"></div>
                    </div>

                    {/* THE BALL (Hidden Layer) */}
                    {isBallHere && (
                      <div className={`
                                        absolute bottom-2 left-1/2 -translate-x-1/2 w-12 h-12 md:w-16 md:h-16 rounded-full -z-10
                                        ${isRevealed ? 'animate-bounce' : 'opacity-0'}
                                        transition-opacity duration-300
                                    `}>
                        <div className="w-full h-full rounded-full bg-gradient-to-tr from-yellow-400 to-white shadow-[0_0_20px_gold] animate-pulse"></div>
                      </div>
                    )}
                  </div>

                  {/* Platform Shadow */}
                  <div className="w-24 h-4 bg-black/60 rounded-[100%] blur-md mt-[-10px] z-0"></div>

                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
};
