
import React, { useState, useEffect, useRef } from 'react';
import { chatService } from '../services/chatService';
import { ChatUser } from '../types';
import { Footprints, Play, Settings, Users, Trophy, Skull, LogOut, User, Crown, ChevronRight, ArrowLeft, ArrowRight, Sparkles, Eye, ShieldCheck, AlertTriangle, RotateCcw } from 'lucide-react';
import { ProAvatar } from './ProAvatar';

interface GlassBridgeV2Props {
    onHome: () => void;
    isOBS?: boolean;
}

interface BridgeConfig {
    joinKeyword: string;
    maxPlayers: number;
    steps: number;
    voteTime: number;
}

interface BridgeStep {
    safeSide: 'left' | 'right';
    revealed: boolean;
    passed: boolean;
}

type GamePhase = 'SETUP' | 'LOBBY' | 'VOTING' | 'REVEAL' | 'FALLEN' | 'VICTORY' | 'GAME_OVER';

export const GlassBridgeV2: React.FC<GlassBridgeV2Props> = ({ onHome, isOBS }) => {
    const [config, setConfig] = useState<BridgeConfig>({
        joinKeyword: 'عبور',
        maxPlayers: 200,
        steps: 7,
        voteTime: 10,
    });

    const [phase, setPhase] = useState<GamePhase>('SETUP');
    const [participants, setParticipants] = useState<ChatUser[]>([]);
    const [currentStep, setCurrentStep] = useState(0);
    const [bridgePath, setBridgePath] = useState<BridgeStep[]>([]);
    const [votes, setVotes] = useState<{ left: string[]; right: string[] }>({ left: [], right: [] });
    const [timeLeft, setTimeLeft] = useState(0);
    const [eliminated, setEliminated] = useState<ChatUser[]>([]);
    const [lastFallen, setLastFallen] = useState<string[]>([]);
    const [survivors, setSurvivors] = useState<ChatUser[]>([]);
    const [shatterSide, setShatterSide] = useState<'left' | 'right' | null>(null);

    const phaseRef = useRef(phase);
    const configRef = useRef(config);
    const participantsRef = useRef(participants);
    const votesRef = useRef(votes);

    useEffect(() => { phaseRef.current = phase; }, [phase]);
    useEffect(() => { configRef.current = config; }, [config]);
    useEffect(() => { participantsRef.current = participants; }, [participants]);
    useEffect(() => { votesRef.current = votes; }, [votes]);

    // Chat listener
    useEffect(() => {
        const unsubscribe = chatService.onMessage((msg) => {
            const content = msg.content.trim().toLowerCase();

            if (phaseRef.current === 'LOBBY') {
                if (content.includes(configRef.current.joinKeyword.toLowerCase())) {
                    setParticipants(prev => {
                        if (prev.length >= configRef.current.maxPlayers) return prev;
                        if (prev.some(p => p.username.toLowerCase() === msg.user.username.toLowerCase())) return prev;
                        const newUser = { ...msg.user };
                        chatService.fetchKickAvatar(newUser.username).then(avatar => {
                            if (avatar) setParticipants(c => c.map(p => p.username.toLowerCase() === newUser.username.toLowerCase() ? { ...p, avatar } : p));
                        }).catch(() => { });
                        return [...prev, newUser];
                    });
                }
            }

            if (phaseRef.current === 'VOTING') {
                const username = msg.user.username.toLowerCase();
                const alreadyVoted = votesRef.current.left.includes(username) || votesRef.current.right.includes(username);
                if (alreadyVoted) return;

                if (content === '!يسار' || content === 'يسار' || content === '!left' || content === 'left' || content === '1') {
                    setVotes(prev => ({ ...prev, left: [...prev.left, username] }));
                } else if (content === '!يمين' || content === 'يمين' || content === '!right' || content === 'right' || content === '2') {
                    setVotes(prev => ({ ...prev, right: [...prev.right, username] }));
                }
            }
        });
        return () => unsubscribe();
    }, []);

    // Timer
    useEffect(() => {
        if (phase === 'VOTING' && timeLeft > 0) {
            const timer = window.setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 1) { resolveStep(); return 0; }
                    return prev - 1;
                });
            }, 1000);
            return () => clearInterval(timer);
        }
    }, [phase, timeLeft]);

    const generateBridge = (steps: number) => {
        return Array.from({ length: steps }, () => ({
            safeSide: Math.random() > 0.5 ? 'left' : 'right' as 'left' | 'right',
            revealed: false,
            passed: false,
        }));
    };

    const startGame = () => {
        if (participants.length < 2) return;
        const bridge = generateBridge(config.steps);
        setBridgePath(bridge);
        setCurrentStep(0);
        setEliminated([]);
        setSurvivors([...participants]);
        startVoting();
    };

    const startVoting = () => {
        setVotes({ left: [], right: [] });
        setTimeLeft(config.voteTime);
        setShatterSide(null);
        setLastFallen([]);
        setPhase('VOTING');
    };

    const resolveStep = () => {
        const currentBridge = bridgePath;
        const step = currentBridge[currentStep];
        if (!step) return;

        const safeSide = step.safeSide;
        const dangerSide = safeSide === 'left' ? 'right' : 'left';
        const currentVotes = votesRef.current;

        // People who chose wrong
        const fallenUsernames = currentVotes[dangerSide];
        const safeUsernames = currentVotes[safeSide];

        // People who didn't vote = also fall
        const allVoters = [...currentVotes.left, ...currentVotes.right];
        const nonVoters = participantsRef.current
            .filter(p => !allVoters.includes(p.username.toLowerCase()) && !eliminated.some(e => e.username.toLowerCase() === p.username.toLowerCase()))
            .map(p => p.username.toLowerCase());

        const allFallen = [...fallenUsernames, ...nonVoters];

        setShatterSide(dangerSide);
        setLastFallen(allFallen);

        // Update bridge
        setBridgePath(prev => prev.map((s, i) => i === currentStep ? { ...s, revealed: true, passed: true } : s));

        // Mark eliminated
        const newEliminated = participantsRef.current.filter(p => allFallen.includes(p.username.toLowerCase()));
        setEliminated(prev => [...prev, ...newEliminated]);

        // Update survivors
        const remainingSurvivors = participantsRef.current.filter(p =>
            !allFallen.includes(p.username.toLowerCase()) &&
            !eliminated.some(e => e.username.toLowerCase() === p.username.toLowerCase())
        );
        setSurvivors(remainingSurvivors);

        setPhase('REVEAL');

        setTimeout(() => {
            if (remainingSurvivors.length === 0) {
                setPhase('GAME_OVER');
            } else if (currentStep + 1 >= config.steps) {
                setPhase('VICTORY');
            } else {
                if (allFallen.length > 0) {
                    setPhase('FALLEN');
                } else {
                    setCurrentStep(prev => prev + 1);
                    startVoting();
                }
            }
        }, 3000);
    };

    const continueToNext = () => {
        setCurrentStep(prev => prev + 1);
        startVoting();
    };

    const resetGame = () => {
        setPhase('SETUP');
        setParticipants([]);
        setCurrentStep(0);
        setBridgePath([]);
        setVotes({ left: [], right: [] });
        setTimeLeft(0);
        setEliminated([]);
        setLastFallen([]);
        setSurvivors([]);
    };

    const totalVotes = votes.left.length + votes.right.length;

    return (
        <div className={`w-full h-full flex flex-col items-center bg-transparent text-right font-display select-none ${isOBS ? 'overflow-hidden' : ''}`} dir="rtl">
            <style>{`
            @keyframes glass-shatter {
               0% { transform: scale(1); opacity: 1; clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%); }
               30% { transform: scale(1.05); }
               60% { clip-path: polygon(10% 0, 90% 5%, 85% 95%, 15% 100%); opacity: 0.7; }
               100% { transform: scale(0.3) translateY(200px) rotate(30deg); opacity: 0; clip-path: polygon(20% 10%, 80% 15%, 75% 85%, 25% 90%); }
            }
            @keyframes glass-glow {
               0%, 100% { box-shadow: 0 0 20px rgba(6, 182, 212, 0.3), inset 0 0 20px rgba(6, 182, 212, 0.1); }
               50% { box-shadow: 0 0 40px rgba(6, 182, 212, 0.6), inset 0 0 40px rgba(6, 182, 212, 0.2); }
            }
            @keyframes safe-glow {
               0% { box-shadow: 0 0 0px rgba(34, 197, 94, 0); }
               100% { box-shadow: 0 0 40px rgba(34, 197, 94, 0.6), 0 0 80px rgba(34, 197, 94, 0.3); }
            }
            @keyframes fall-animation {
               0% { transform: translateY(0) rotate(0); opacity: 1; }
               100% { transform: translateY(300px) rotate(45deg); opacity: 0; }
            }
            .glass-shatter { animation: glass-shatter 1.5s ease-out forwards; }
            .glass-glow { animation: glass-glow 2s ease-in-out infinite; }
            .safe-glow { animation: safe-glow 0.5s ease-out forwards; }
            .fall-anim { animation: fall-animation 1.5s ease-in forwards; }
         `}</style>

            {/* --- SETUP --- */}
            {phase === 'SETUP' && (
                <div className="w-full max-w-5xl animate-in fade-in zoom-in duration-700 py-6 px-4 pb-20 overflow-y-auto custom-scrollbar h-full">
                    <div className="flex items-center justify-between mb-8">
                        <button onClick={onHome} className="p-4 bg-red-600/10 rounded-3xl hover:bg-red-600/20 text-red-500 transition-all border border-red-500/20">
                            <LogOut size={24} />
                        </button>
                        <div className="text-center">
                            <h1 className="text-6xl font-black text-white italic tracking-tighter uppercase">جسر الزجاج</h1>
                            <p className="text-cyan-600 font-black tracking-[0.4em] text-[10px] uppercase">GLASS BRIDGE • iABS</p>
                        </div>
                        <div className="w-14"></div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="glass-card p-6 rounded-[2.5rem] border border-white/5 shadow-2xl relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 via-blue-500 to-cyan-500"></div>
                            <h3 className="text-lg font-black text-white flex items-center gap-3 mb-6"><Settings size={18} className="text-cyan-500" /> إعدادات الجسر</h3>
                            <div className="space-y-5">
                                <div className="bg-black/30 p-4 rounded-3xl border border-white/5">
                                    <div className="flex justify-between mb-2">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">عدد الخطوات</label>
                                        <span className="text-2xl font-black text-cyan-500 font-mono">{config.steps}</span>
                                    </div>
                                    <input type="range" min="3" max="15" value={config.steps} onChange={e => setConfig({ ...config, steps: +e.target.value })} className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-cyan-600" />
                                </div>

                                <div className="bg-black/30 p-4 rounded-3xl border border-white/5 text-center space-y-2">
                                    <label className="text-[9px] font-bold text-gray-500 uppercase">وقت التصويت</label>
                                    <div className="flex items-center justify-center gap-3">
                                        <button onClick={() => setConfig({ ...config, voteTime: Math.max(5, config.voteTime - 5) })} className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-white">-</button>
                                        <span className="text-2xl font-black text-white font-mono">{config.voteTime}s</span>
                                        <button onClick={() => setConfig({ ...config, voteTime: config.voteTime + 5 })} className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-white">+</button>
                                    </div>
                                </div>

                                <div className="bg-black/30 p-4 rounded-3xl border border-white/5">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">كلمة الانضمام</label>
                                    <input value={config.joinKeyword} onChange={e => setConfig({ ...config, joinKeyword: e.target.value })} className="w-full bg-black border-2 border-white/10 focus:border-cyan-600 rounded-xl p-3 text-white font-bold text-sm text-center outline-none transition-all" />
                                </div>
                            </div>
                        </div>

                        <div className="glass-card p-6 rounded-[2.5rem] border border-white/5 shadow-2xl flex flex-col items-center justify-center relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-cyan-900/20 via-transparent to-blue-900/20"></div>
                            <div className="relative z-10 text-center">
                                <div className="relative mb-8">
                                    <div className="absolute inset-0 bg-cyan-500/20 blur-[80px] rounded-full"></div>
                                    <Footprints size={100} className="text-cyan-500 relative z-10 drop-shadow-[0_0_40px_rgba(6,182,212,0.8)]" strokeWidth={1.5} />
                                </div>
                                <h2 className="text-3xl font-black text-white mb-3">كيف تلعب؟</h2>
                                <div className="space-y-3 text-gray-400 text-sm font-bold max-w-sm">
                                    <p className="flex items-center gap-3"><span className="w-8 h-8 bg-cyan-600 text-white rounded-xl flex items-center justify-center font-black text-xs">1</span> الجميع يختار يمين أو يسار</p>
                                    <p className="flex items-center gap-3"><span className="w-8 h-8 bg-cyan-600 text-white rounded-xl flex items-center justify-center font-black text-xs">2</span> الجانب الخطأ ينكسر!</p>
                                    <p className="flex items-center gap-3"><span className="w-8 h-8 bg-red-600 text-white rounded-xl flex items-center justify-center font-black text-xs">3</span> من اختار الخطأ يسقط ويخرج</p>
                                </div>
                            </div>
                            <button onClick={() => setPhase('LOBBY')} className="mt-8 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-black py-5 px-16 rounded-3xl text-3xl hover:scale-[1.05] active:scale-95 transition-all flex items-center gap-4 shadow-[0_15px_40px_rgba(6,182,212,0.4)] italic relative z-10 border-t border-white/20">
                                عبور الجسر <Play fill="currentColor" size={28} />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- LOBBY --- */}
            {phase === 'LOBBY' && (
                <div className="w-full h-full flex flex-col items-center justify-center p-10 animate-in fade-in duration-1000 relative overflow-hidden">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-cyan-900/20 via-transparent to-transparent"></div>
                    <div className="text-center mb-10 z-10">
                        <Footprints size={80} className="text-cyan-500 mx-auto mb-6 drop-shadow-[0_0_40px_rgba(6,182,212,1)] animate-bounce" />
                        <h1 className="text-7xl font-black text-white italic tracking-tighter mb-6 uppercase">في انتظار العابرين</h1>
                        <div className="flex items-center justify-center gap-4 text-2xl text-gray-400 font-bold bg-black/40 backdrop-blur-xl px-10 py-6 rounded-[3rem] border-2 border-white/5">
                            أرسل <span className="bg-cyan-600 text-white px-6 py-2 rounded-2xl font-black italic">{config.joinKeyword}</span> للمشاركة
                        </div>
                    </div>
                    <div className="flex-1 w-full max-w-4xl overflow-y-auto custom-scrollbar px-6 mb-6">
                        <div className="flex flex-wrap justify-center gap-3 max-w-3xl mx-auto">
                            {participants.map(p => (
                                <div key={p.id} className="animate-in zoom-in duration-300 bg-black/40 border border-white/10 rounded-2xl px-4 py-2 flex items-center gap-3">
                                    <ProAvatar
                                        url={p.avatar}
                                        username={p.username}
                                        size="w-12 h-12"
                                    />
                                    <span className="font-black text-white text-xs">{p.username}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="w-full max-w-4xl bg-black/60 backdrop-blur-[40px] p-8 rounded-[3rem] border border-white/10 flex items-center justify-between z-20">
                        <div className="text-4xl font-black text-white font-mono italic">{participants.length}</div>
                        <div className="flex gap-4">
                            <button onClick={resetGame} className="px-8 py-5 rounded-2xl bg-white/5 text-gray-500 font-black hover:text-white transition-all border border-white/10">تراجع</button>
                            <button onClick={startGame} disabled={participants.length < 2} className="px-12 py-5 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-black text-2xl rounded-2xl hover:scale-105 transition-all disabled:opacity-20 italic flex items-center gap-3">
                                ابدأ! <Footprints size={24} />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- VOTING --- */}
            {phase === 'VOTING' && (
                <div className="w-full h-full flex flex-col items-center justify-center p-8 animate-in fade-in duration-500 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-b from-black via-cyan-950/30 to-black"></div>

                    {/* Bridge progress */}
                    <div className="relative z-10 w-full max-w-4xl mb-6">
                        <div className="flex items-center gap-2 justify-center mb-2">
                            {bridgePath.map((step, i) => (
                                <div key={i} className={`w-10 h-3 rounded-full transition-all duration-500 ${i < currentStep ? (step.safeSide ? 'bg-green-500' : 'bg-green-500') : i === currentStep ? 'bg-cyan-500 animate-pulse' : 'bg-white/10'}`} />
                            ))}
                        </div>
                        <div className="text-center text-cyan-500 font-black text-sm uppercase tracking-[0.3em]">
                            الخطوة {currentStep + 1} / {config.steps}
                        </div>
                    </div>

                    {/* Timer */}
                    <div className={`text-[100px] font-black font-mono mb-6 relative z-10 ${timeLeft <= 3 ? 'text-red-500 animate-pulse' : 'text-white'}`}>
                        {timeLeft}
                    </div>

                    {/* Glass panels */}
                    <div className="flex gap-16 items-stretch relative z-10 mb-8">
                        {/* Left */}
                        <button className="group flex flex-col items-center gap-4">
                            <div className="w-56 h-56 bg-cyan-500/10 border-4 border-cyan-500/40 rounded-[3rem] flex flex-col items-center justify-center gap-4 glass-glow group-hover:border-cyan-400 transition-all relative overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent"></div>
                                <ArrowRight size={60} className="text-cyan-400 relative z-10" />
                                <span className="text-3xl font-black text-white relative z-10">يسار</span>
                                <div className="absolute bottom-4 text-4xl font-black text-cyan-400 font-mono">{votes.left.length}</div>
                            </div>
                            <span className="text-cyan-500 font-bold text-sm">!يسار</span>
                        </button>

                        <div className="flex flex-col items-center justify-center">
                            <Sparkles size={30} className="text-white/20 animate-pulse" />
                            <span className="text-white/20 text-xs font-bold mt-2">أو</span>
                        </div>

                        {/* Right */}
                        <button className="group flex flex-col items-center gap-4">
                            <div className="w-56 h-56 bg-cyan-500/10 border-4 border-cyan-500/40 rounded-[3rem] flex flex-col items-center justify-center gap-4 glass-glow group-hover:border-cyan-400 transition-all relative overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent"></div>
                                <ArrowLeft size={60} className="text-cyan-400 relative z-10" />
                                <span className="text-3xl font-black text-white relative z-10">يمين</span>
                                <div className="absolute bottom-4 text-4xl font-black text-cyan-400 font-mono">{votes.right.length}</div>
                            </div>
                            <span className="text-cyan-500 font-bold text-sm">!يمين</span>
                        </button>
                    </div>

                    {/* Survivors count */}
                    <div className="flex items-center gap-4 text-gray-400 font-bold text-sm relative z-10">
                        <Users size={16} /> {survivors.length} عابرين على الجسر | <span className="text-cyan-400">{totalVotes}</span> صوّتوا
                    </div>

                    {/* Timer bar */}
                    <div className="w-full max-w-3xl mt-6 h-2 bg-black/60 rounded-full overflow-hidden border border-white/10 relative z-10">
                        <div className={`h-full rounded-full transition-all duration-1000 ${timeLeft <= 3 ? 'bg-red-500' : 'bg-cyan-500'}`} style={{ width: `${(timeLeft / config.voteTime) * 100}%` }} />
                    </div>
                </div>
            )}

            {/* --- REVEAL --- */}
            {phase === 'REVEAL' && (
                <div className="w-full h-full flex flex-col items-center justify-center p-8 animate-in zoom-in duration-300 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-b from-black via-transparent to-black"></div>
                    <div className="flex gap-16 items-stretch relative z-10">
                        {/* Left panel */}
                        <div className={`w-56 h-56 rounded-[3rem] flex items-center justify-center transition-all duration-500 ${bridgePath[currentStep]?.safeSide === 'left' ? 'bg-green-500/20 border-4 border-green-500 safe-glow' : 'bg-red-500/20 border-4 border-red-500 glass-shatter'}`}>
                            {bridgePath[currentStep]?.safeSide === 'left' ? (
                                <ShieldCheck size={80} className="text-green-500" />
                            ) : (
                                <Skull size={80} className="text-red-500" />
                            )}
                        </div>

                        <div className="flex flex-col items-center justify-center">
                            <div className="text-6xl font-black text-white">
                                {bridgePath[currentStep]?.safeSide === 'left' ? '← آمن' : 'آمن →'}
                            </div>
                        </div>

                        {/* Right panel */}
                        <div className={`w-56 h-56 rounded-[3rem] flex items-center justify-center transition-all duration-500 ${bridgePath[currentStep]?.safeSide === 'right' ? 'bg-green-500/20 border-4 border-green-500 safe-glow' : 'bg-red-500/20 border-4 border-red-500 glass-shatter'}`}>
                            {bridgePath[currentStep]?.safeSide === 'right' ? (
                                <ShieldCheck size={80} className="text-green-500" />
                            ) : (
                                <Skull size={80} className="text-red-500" />
                            )}
                        </div>
                    </div>

                    {lastFallen.length > 0 && (
                        <div className="mt-10 text-center relative z-10">
                            <div className="text-red-500 font-black text-2xl mb-2">{lastFallen.length} سقطوا!</div>
                        </div>
                    )}
                </div>
            )}

            {/* --- FALLEN --- */}
            {phase === 'FALLEN' && (
                <div className="w-full h-full flex flex-col items-center justify-center p-8 animate-in fade-in duration-500 relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-red-950/40 via-black to-black"></div>
                    <div className="relative z-10 text-center">
                        <Skull size={80} className="text-red-500 mx-auto mb-6 animate-pulse" />
                        <h2 className="text-6xl font-black text-red-500 italic mb-4">{lastFallen.length} سقطوا في الهاوية!</h2>
                        <p className="text-2xl text-gray-400 font-bold mb-8">الباقون: <span className="text-cyan-400">{survivors.length}</span></p>
                        <button onClick={continueToNext} className="px-16 py-6 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-black text-3xl rounded-[2.5rem] hover:scale-105 transition-all italic shadow-lg">
                            الخطوة التالية <ChevronRight size={28} className="inline" />
                        </button>
                    </div>
                </div>
            )}

            {/* --- VICTORY --- */}
            {phase === 'VICTORY' && (
                <div className="w-full h-full flex flex-col items-center justify-center p-10 animate-in zoom-in duration-1000 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-950 via-black to-yellow-950"></div>
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-yellow-600/20 via-transparent to-transparent"></div>
                    <div className="relative z-10 text-center">
                        <Trophy size={100} className="text-yellow-400 mx-auto mb-6 drop-shadow-[0_0_40px_rgba(251,191,36,1)] animate-bounce" />
                        <h2 className="text-[70px] font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-yellow-600 italic uppercase mb-4">عبروا الجسر!</h2>
                        <p className="text-3xl text-gray-400 font-bold mb-8">{survivors.length} ناجين من أصل {participants.length + eliminated.length}</p>
                        <div className="flex flex-wrap justify-center gap-4 mb-10 max-w-3xl">
                            {survivors.map(p => (
                                <div key={p.id} className="flex flex-col items-center gap-2 animate-in zoom-in">
                                    <ProAvatar
                                        url={p.avatar}
                                        username={p.username}
                                        size="w-20 h-20"
                                    />
                                    <span className="text-xs font-black text-yellow-400">{p.username}</span>
                                </div>
                            ))}
                        </div>
                        <div className="flex gap-4 justify-center">
                            <button onClick={resetGame} className="px-12 py-5 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-black text-2xl rounded-2xl hover:scale-105 transition-all italic">لعبة جديدة</button>
                            <button onClick={onHome} className="px-8 py-5 bg-white/5 text-gray-500 font-black text-xl rounded-2xl border border-white/10 hover:text-white transition-all">الرئيسية</button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- GAME OVER --- */}
            {phase === 'GAME_OVER' && (
                <div className="w-full h-full flex flex-col items-center justify-center p-8 animate-in zoom-in duration-500 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-red-950 via-black to-black"></div>
                    <div className="relative z-10 text-center">
                        <Skull size={120} className="text-red-600 mx-auto mb-6 animate-pulse" />
                        <h2 className="text-8xl font-black text-red-500 italic uppercase mb-4">الجميع سقطوا!</h2>
                        <p className="text-2xl text-gray-500 mb-10">لم ينجُ أحد من الجسر الزجاجي</p>
                        <div className="flex gap-4 justify-center">
                            <button onClick={resetGame} className="px-12 py-5 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-black text-2xl rounded-2xl hover:scale-105 transition-all italic">حاول مرة أخرى</button>
                            <button onClick={onHome} className="px-8 py-5 bg-white/5 text-gray-500 font-black text-xl rounded-2xl border border-white/10 hover:text-white transition-all">الرئيسية</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
