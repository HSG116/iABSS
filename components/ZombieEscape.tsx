
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { chatService } from '../services/chatService';
import { ZOMBIE_OBSTACLES } from '../constants';
import { ChatUser } from '../types';
import { Biohazard, Play, RotateCcw, UserPlus, Timer, Skull, ShieldCheck, Ghost } from 'lucide-react';
import { ProAvatar } from './ProAvatar';

interface ZombieEscapeProps {
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

export const ZombieEscape: React.FC<ZombieEscapeProps> = ({ channelConnected, isOBS }) => {
    const [gameState, setGameState] = useState<'WAITING' | 'RUNNING' | 'FINISHED'>('WAITING');
    const [players, setPlayers] = useState<{ user: ChatUser, status: 'ALIVE' | 'ZOMBIE' }[]>([]);
    const [obstacle, setObstacle] = useState<{ question: string, answer: string, endsAt: number } | null>(null);
    const [safePlayers, setSafePlayers] = useState<string[]>([]);
    const [timeLeft, setTimeLeft] = useState(0);

    const playersRef = useRef(players);
    const gameStateRef = useRef(gameState);
    const obstacleRef = useRef(obstacle);
    const safePlayersRef = useRef(safePlayers);

    useEffect(() => { playersRef.current = players; }, [players]);
    useEffect(() => { gameStateRef.current = gameState; }, [gameState]);
    useEffect(() => { obstacleRef.current = obstacle; }, [obstacle]);
    useEffect(() => { safePlayersRef.current = safePlayers; }, [safePlayers]);

    useEffect(() => {
        if (!channelConnected) return;
        const cleanup = chatService.onMessage((msg) => {
            const content = msg.content.trim().toLowerCase();

            // Join
            if (gameStateRef.current === 'WAITING' && (content === '!join' || content === '!دخول' || content.includes('🏃'))) {
                if (!playersRef.current.find(p => p.user.username === msg.user.username)) {
                    setPlayers(prev => [...prev, { user: msg.user, status: 'ALIVE' }]);
                }
            }

            // Solve Obstacle
            if (gameStateRef.current === 'RUNNING' && obstacleRef.current) {
                if (content === obstacleRef.current.answer.toLowerCase()) {
                    markPlayerSafe(msg.user.username);
                }
            }
        });
        return cleanup;
    }, [channelConnected]);

    // Timer Update
    useEffect(() => {
        if (obstacle) {
            const interval = setInterval(() => {
                const rem = Math.max(0, obstacle.endsAt - Date.now());
                setTimeLeft(rem);
                if (rem <= 0) clearInterval(interval);
            }, 50);
            return () => clearInterval(interval);
        }
    }, [obstacle]);

    const markPlayerSafe = (username: string) => {
        if (!safePlayersRef.current.includes(username)) {
            setSafePlayers(prev => [...prev, username]);
        }
    };

    const startGame = () => {
        if (players.length < 1) return;
        setGameState('RUNNING');
        nextObstacle();
    };

    const nextObstacle = () => {
        setSafePlayers([]);
        const obs = ZOMBIE_OBSTACLES[Math.floor(Math.random() * ZOMBIE_OBSTACLES.length)];
        const duration = 7000; // 7 seconds
        const newObs = { ...obs, endsAt: Date.now() + duration };
        setObstacle(newObs);

        setTimeout(() => {
            resolveObstacle();
        }, duration);
    };

    const resolveObstacle = () => {
        setPlayers(prev => prev.map(p => {
            if (p.status === 'ZOMBIE') return p;
            if (safePlayersRef.current.includes(p.user.username)) return p;
            return { ...p, status: 'ZOMBIE' };
        }));

        setObstacle(null);

        setTimeout(() => {
            const alive = playersRef.current.filter(p => !safePlayersRef.current.includes(p.user.username) ? false : p.status === 'ALIVE');
            // Check who is still alive after the map
            const stillAlive = playersRef.current.filter(p => {
                const isSafe = safePlayersRef.current.includes(p.user.username);
                return p.status === 'ALIVE' && isSafe;
            });

            if (playersRef.current.filter(p => p.status === 'ALIVE').length === 0 || Math.random() > 0.8) {
                setGameState('FINISHED');
            } else {
                nextObstacle();
            }
        }, 3000);
    };

    const resetGame = () => {
        setPlayers([]);
        setGameState('WAITING');
        setObstacle(null);
        setSafePlayers([]);
    };

    return (
        <>
            {!isOBS && (
                <SidebarPortal>
                    <div className="bg-[#0a0a0c]/90 backdrop-blur-md p-5 rounded-[2rem] border border-white/10 space-y-4 animate-in slide-in-from-right-4 shadow-2xl">
                        <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                            <Biohazard size={12} className="text-green-500" /> ZOMBIE CONTROL
                        </h4>
                        {gameState === 'WAITING' && (
                            <button onClick={startGame} className="w-full bg-green-600 hover:bg-green-500 text-black font-black py-3 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-green-900/20">
                                <Play size={18} /> START ESCAPE
                            </button>
                        )}
                        <button onClick={resetGame} className="w-full bg-white/5 hover:bg-white/10 py-3 rounded-2xl text-[10px] text-gray-400 font-black uppercase tracking-widest border border-white/5 transition-all">
                            <RotateCcw size={14} className="inline mr-2" /> RESET GAME
                        </button>
                    </div>

                    <div className="bg-[#0a0a0c]/90 backdrop-blur-md rounded-[2rem] border border-white/10 flex flex-col overflow-hidden h-[400px] mt-4 shadow-2xl">
                        <div className="p-4 border-b border-white/5 bg-gradient-to-r from-green-600/10 to-transparent flex items-center justify-between">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Survivors</span>
                            <span className="text-[10px] font-black text-green-500 bg-green-500/10 px-2 py-1 rounded-lg">
                                {players.filter(p => p.status === 'ALIVE').length} ALIVE
                            </span>
                        </div>
                        <div className="overflow-y-auto flex-1 p-3 space-y-2 custom-scrollbar">
                            {players.map(p => (
                                <div key={p.user.username} className={`flex items-center justify-between px-4 py-3 rounded-2xl border transition-all ${p.status === 'ZOMBIE' ? 'bg-red-950/20 border-red-500/20 text-red-500 grayscale' : 'bg-green-950/20 border-green-500/20 text-green-500'}`}>
                                    <div className="flex items-center gap-3">
                                        <ProAvatar
                                            url={p.user.avatar}
                                            username={p.user.username}
                                            size="w-8 h-8"
                                            className={p.status === 'ZOMBIE' ? 'grayscale opacity-50' : ''}
                                        />
                                        <span className="text-xs font-black truncate w-24">{p.user.username}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {safePlayers.includes(p.user.username) && <ShieldCheck size={14} className="text-green-400 animate-pulse" />}
                                        <span>{p.status === 'ZOMBIE' ? '🧟' : '🏃'}</span>
                                    </div>
                                </div>
                            ))}
                            {players.length === 0 && (
                                <div className="h-full flex flex-col items-center justify-center opacity-20 grayscale italic text-[10px] font-black uppercase tracking-[0.2em]">
                                    <UserPlus size={40} className="mb-2" />
                                    No Players Joined
                                </div>
                            )}
                        </div>
                    </div>
                </SidebarPortal>
            )}

            <div className="w-full h-full flex flex-col items-center justify-center p-6 relative overflow-hidden bg-[#050505]">
                {/* Gritty Cinematic Overlay */}
                <div className="absolute inset-0 opacity-40 bg-[url('https://images.unsplash.com/photo-1509248961158-e54f6934749c?q=80&w=2000&auto=format&fit=crop')] bg-cover bg-center brightness-[0.2] saturate-0"></div>
                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black"></div>

                {/* Scanline Effect */}
                <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-10 bg-[length:100%_4px,3px_100%] shadow-[inset_0_0_100px_rgba(0,0,0,0.5)]"></div>

                {gameState === 'RUNNING' && obstacle && (
                    <div className="z-20 text-center flex flex-col items-center max-w-4xl w-full px-10">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="h-[2px] w-20 bg-gradient-to-r from-transparent to-red-600"></div>
                            <div className="text-xs font-black text-red-600 uppercase tracking-[1em] animate-pulse italic">Obstacle Detected</div>
                            <div className="h-[2px] w-20 bg-gradient-to-l from-transparent to-red-600"></div>
                        </div>

                        <div className="relative w-full">
                            <div className="absolute -inset-4 bg-red-600/20 blur-2xl rounded-[3rem] animate-pulse"></div>
                            <div className="relative bg-black/80 backdrop-blur-xl px-12 py-10 rounded-[3rem] border-4 border-red-600 shadow-[0_0_50px_rgba(220,38,38,0.4)] transform hover:scale-105 transition-transform duration-500 group overflow-hidden">
                                <div className="absolute top-0 left-0 w-full h-1 bg-white/10 overflow-hidden">
                                    <div className="h-full bg-red-500 animate-shimmer"></div>
                                </div>
                                <h2 className="text-4xl md:text-6xl font-black text-white leading-tight drop-shadow-2xl">
                                    {obstacle.question}
                                </h2>
                                <div className="mt-8 flex justify-center items-center gap-6">
                                    <div className="flex items-center gap-2 text-red-500 font-black italic">
                                        <Timer size={20} />
                                        <span className="text-2xl font-mono">{(timeLeft / 1000).toFixed(1)}s</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Progress Bar Container */}
                        <div className="w-[80%] h-2 bg-white/5 rounded-full mt-10 overflow-hidden border border-white/5">
                            <div
                                className={`h-full transition-all duration-100 ease-linear ${timeLeft < 2000 ? 'bg-red-500' : 'bg-white/40'}`}
                                style={{ width: `${(timeLeft / 7000) * 100}%` }}
                            ></div>
                        </div>
                    </div>
                )}

                {gameState === 'WAITING' && (
                    <div className="z-20 text-center animate-in zoom-in duration-1000">
                        <Biohazard size={120} className="text-green-600 mb-8 mx-auto drop-shadow-[0_0_40px_rgba(22,163,74,0.4)] animate-spin-slow" />
                        <h1 className="text-7xl font-black text-white uppercase tracking-tighter italic scale-y-110">
                            Zombie <span className="text-green-600">Escape</span>
                        </h1>
                        <p className="mt-4 text-white/40 font-black tracking-[0.5em] uppercase text-xs">Join the horde or survive the night</p>
                        <div className="mt-12 flex items-center justify-center gap-4">
                            <div className="px-8 py-3 bg-white/5 backdrop-blur-md rounded-full border border-white/10 flex items-center gap-4 animate-bounce">
                                <Skull size={20} className="text-green-500" />
                                <span className="text-white font-black text-xl tracking-tight">
                                    اكتب <span className="text-green-500 px-1 underline decoration-2">!دخول</span> أو <span className="text-green-500 px-1 decoration-2">!join</span> للمشاركة
                                </span>
                                <Skull size={20} className="text-green-500 scale-x-[-1]" />
                            </div>
                        </div>
                    </div>
                )}

                {gameState === 'FINISHED' && (
                    <div className="z-20 text-center animate-in zoom-in duration-700">
                        <div className="relative mb-10">
                            <Ghost size={140} className="text-green-500 mx-auto drop-shadow-[0_0_60px_rgba(34,197,94,0.6)]" />
                            <div className="absolute inset-0 bg-green-500/10 blur-3xl rounded-full"></div>
                        </div>
                        <h1 className="text-8xl font-black text-white uppercase italic tracking-tighter mb-4">
                            Escape <span className="text-green-500">Over</span>
                        </h1>
                        <div className="flex items-center justify-center gap-8 mt-10">
                            <div className="flex flex-col items-center p-6 bg-green-500/10 rounded-3xl border border-green-500/20 backdrop-blur-xl w-40">
                                <span className="text-5xl font-black text-green-500">{players.filter(p => p.status === 'ALIVE').length}</span>
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-2">Survivors</span>
                            </div>
                            <div className="flex flex-col items-center p-6 bg-red-500/10 rounded-3xl border border-red-500/20 backdrop-blur-xl w-40">
                                <span className="text-5xl font-black text-red-500">{players.filter(p => p.status === 'ZOMBIE').length}</span>
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-2">Infected</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Animated Participants Layer */}
                <div className="absolute bottom-10 left-0 w-full h-40 pointer-events-none overflow-hidden flex items-end px-20 gap-4">
                    {players.filter(p => p.status === 'ALIVE').map((p, i) => (
                        <div key={`alive-${i}`} className="flex flex-col items-center animate-bounce" style={{ animationDuration: `${0.8 + Math.random() * 0.4}s`, animationDelay: `${i * 0.1}s` }}>
                            <div className="px-2 py-1 bg-black/40 backdrop-blur-md rounded text-[8px] font-black text-white/60 mb-2 border border-white/5">{p.user.username}</div>
                            <div className="text-5xl drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">🏃</div>
                        </div>
                    ))}
                    {players.filter(p => p.status === 'ZOMBIE').map((p, i) => (
                        <div key={`zombie-${i}`} className="flex flex-col items-center animate-pulse opacity-60 grayscale-[0.5]" style={{ animationDelay: `${i * 0.2}s` }}>
                            <div className="px-2 py-1 bg-red-950/40 backdrop-blur-md rounded text-[8px] font-black text-red-400/60 mb-2 border border-red-500/10">{p.user.username}</div>
                            <div className="text-5xl drop-shadow-[0_0_20px_rgba(239,68,68,0.4)]">🧟</div>
                        </div>
                    ))}
                </div>

                {/* Gritty Vignette */}
                <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_200px_black] z-30"></div>
            </div>
        </>
    );
};
