
import React, { useState, useEffect, useRef } from 'react';
import { chatService } from '../services/chatService';
import { ChatUser } from '../types';
import { Bomb, Play, Settings, Users, Skull, Trophy, Clock, LogOut, RotateCcw, User, Flame, Zap, Timer, Crown, ChevronRight, Sparkles, AlertTriangle } from 'lucide-react';
import { ProAvatar } from './ProAvatar';

interface TimeBombProps {
    onHome: () => void;
    isOBS?: boolean;
}

interface BombConfig {
    joinKeyword: string;
    maxPlayers: number;
    minTimer: number;
    maxTimer: number;
    passTimeLimit: number;
    rounds: number;
}

type GamePhase = 'SETUP' | 'LOBBY' | 'PLAYING' | 'EXPLODED' | 'ROUND_END' | 'FINALE';

export const TimeBomb: React.FC<TimeBombProps> = ({ onHome, isOBS }) => {
    const [config, setConfig] = useState<BombConfig>({
        joinKeyword: 'دخول',
        maxPlayers: 50,
        minTimer: 15,
        maxTimer: 45,
        passTimeLimit: 8,
        rounds: 3,
    });

    const [phase, setPhase] = useState<GamePhase>('SETUP');
    const [participants, setParticipants] = useState<ChatUser[]>([]);
    const [currentHolder, setCurrentHolder] = useState<ChatUser | null>(null);
    const [bombTimer, setBombTimer] = useState(0);
    const [passTimer, setPassTimer] = useState(0);
    const [currentRound, setCurrentRound] = useState(0);
    const [totalRounds, setTotalRounds] = useState(3);
    const [eliminated, setEliminated] = useState<ChatUser[]>([]);
    const [lastEliminated, setLastEliminated] = useState<ChatUser | null>(null);
    const [winner, setWinner] = useState<ChatUser | null>(null);
    const [passHistory, setPassHistory] = useState<string[]>([]);
    const [shakeIntensity, setShakeIntensity] = useState(0);
    const [isExploding, setIsExploding] = useState(false);

    const phaseRef = useRef(phase);
    const configRef = useRef(config);
    const participantsRef = useRef(participants);
    const currentHolderRef = useRef(currentHolder);
    const bombTimerRef = useRef(bombTimer);

    useEffect(() => { phaseRef.current = phase; }, [phase]);
    useEffect(() => { configRef.current = config; }, [config]);
    useEffect(() => { participantsRef.current = participants; }, [participants]);
    useEffect(() => { currentHolderRef.current = currentHolder; }, [currentHolder]);
    useEffect(() => { bombTimerRef.current = bombTimer; }, [bombTimer]);

    // Chat listener
    useEffect(() => {
        const unsubscribe = chatService.onMessage((msg) => {
            const content = msg.content.trim().toLowerCase();

            // Join lobby
            if (phaseRef.current === 'LOBBY') {
                const keyword = configRef.current.joinKeyword.toLowerCase();
                if (content.includes(keyword)) {
                    setParticipants(prev => {
                        if (prev.length >= configRef.current.maxPlayers) return prev;
                        if (prev.some(p => p.username.toLowerCase() === msg.user.username.toLowerCase())) return prev;
                        const newUser: ChatUser = { ...msg.user };
                        chatService.fetchKickAvatar(newUser.username).then(avatar => {
                            if (avatar) {
                                setParticipants(curr => curr.map(p =>
                                    p.username.toLowerCase() === newUser.username.toLowerCase() ? { ...p, avatar } : p
                                ));
                            }
                        }).catch(() => { });
                        return [...prev, newUser];
                    });
                }
            }

            // Pass bomb
            if (phaseRef.current === 'PLAYING' && currentHolderRef.current) {
                if (msg.user.username.toLowerCase() === currentHolderRef.current.username.toLowerCase()) {
                    const rawContent = msg.content.trim();

                    // Extract name from @mention or plain text
                    // Supports: @username, @ username, or just username
                    const mentionMatch = rawContent.match(/^@?([\w.\-\u0600-\u06FF]+)$/);
                    const targetName = mentionMatch ? mentionMatch[1].trim() : null;

                    if (targetName) {
                        const target = participantsRef.current.find(p =>
                            p.username.toLowerCase() === targetName.toLowerCase() &&
                            p.username.toLowerCase() !== currentHolderRef.current!.username.toLowerCase()
                        );
                        if (target) {
                            setPassHistory(prev => [...prev, `${currentHolderRef.current!.username} → ${target.username}`]);
                            setCurrentHolder(target);
                            setPassTimer(configRef.current.passTimeLimit);
                        }
                    }
                }
            }
        });
        return () => unsubscribe();
    }, []);

    // Bomb countdown
    useEffect(() => {
        let interval: number;
        if (phase === 'PLAYING' && bombTimer > 0) {
            interval = window.setInterval(() => {
                setBombTimer(prev => {
                    if (prev <= 1) {
                        explodeBomb();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [phase, bombTimer]);

    // Pass timer countdown
    useEffect(() => {
        let interval: number;
        if (phase === 'PLAYING' && passTimer > 0) {
            interval = window.setInterval(() => {
                setPassTimer(prev => Math.max(0, prev - 1));
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [phase, passTimer]);

    // Shake intensity based on remaining time
    useEffect(() => {
        if (phase === 'PLAYING' && bombTimer > 0) {
            const totalTime = config.maxTimer;
            const remaining = bombTimer / totalTime;
            setShakeIntensity(Math.max(0, (1 - remaining) * 20));
        }
    }, [bombTimer, phase]);

    const startGame = () => {
        if (participants.length < 3) return;
        setCurrentRound(1);
        setTotalRounds(config.rounds);
        setEliminated([]);
        startRound();
    };

    const startRound = () => {
        const alivePlayers = participantsRef.current;
        if (alivePlayers.length <= 1) {
            setWinner(alivePlayers[0] || null);
            setPhase('FINALE');
            return;
        }
        const randomHolder = alivePlayers[Math.floor(Math.random() * alivePlayers.length)];
        const randomTime = Math.floor(Math.random() * (config.maxTimer - config.minTimer + 1)) + config.minTimer;
        setCurrentHolder(randomHolder);
        setBombTimer(randomTime);
        setPassTimer(config.passTimeLimit);
        setPassHistory([]);
        setIsExploding(false);
        setPhase('PLAYING');
    };

    const explodeBomb = () => {
        setIsExploding(true);
        const holder = currentHolderRef.current;
        if (!holder) return;
        setLastEliminated(holder);
        setEliminated(prev => [...prev, holder]);
        setPhase('EXPLODED');

        setTimeout(() => {
            setParticipants(prev => prev.filter(p => p.username.toLowerCase() !== holder.username.toLowerCase()));
            const remaining = participantsRef.current.filter(p => p.username.toLowerCase() !== holder.username.toLowerCase());
            if (remaining.length <= 1) {
                setWinner(remaining[0] || null);
                setPhase('FINALE');
            } else {
                setPhase('ROUND_END');
            }
            setIsExploding(false);
        }, 3000);
    };

    const nextRound = () => {
        setCurrentRound(r => r + 1);
        startRound();
    };

    const resetGame = () => {
        setPhase('SETUP');
        setParticipants([]);
        setCurrentHolder(null);
        setBombTimer(0);
        setPassTimer(0);
        setCurrentRound(0);
        setEliminated([]);
        setLastEliminated(null);
        setWinner(null);
        setPassHistory([]);
        setIsExploding(false);
    };

    const getDynamicSize = (count: number) => {
        if (count < 12) return { box: 'w-20 h-20', icon: 50, text: 'text-xl' };
        if (count < 30) return { box: 'w-16 h-16', icon: 40, text: 'text-lg' };
        if (count < 60) return { box: 'w-14 h-14', icon: 35, text: 'text-base' };
        return { box: 'w-12 h-12', icon: 30, text: 'text-sm' };
    };

    return (
        <div className={`w-full h-full flex flex-col items-center bg-transparent text-right font-display select-none ${isOBS ? 'overflow-hidden' : ''}`} dir="rtl">
            <style>{`
            @keyframes bomb-shake {
               0%, 100% { transform: translate(0, 0) rotate(0deg); }
               10% { transform: translate(-2px, -1px) rotate(-1deg); }
               20% { transform: translate(2px, 1px) rotate(1deg); }
               30% { transform: translate(-1px, 2px) rotate(0deg); }
               40% { transform: translate(1px, -1px) rotate(1deg); }
               50% { transform: translate(-1px, -1px) rotate(-1deg); }
               60% { transform: translate(2px, 1px) rotate(0deg); }
               70% { transform: translate(-2px, 1px) rotate(-1deg); }
               80% { transform: translate(-1px, -1px) rotate(1deg); }
               90% { transform: translate(1px, 2px) rotate(0deg); }
            }
            @keyframes bomb-pulse {
               0%, 100% { transform: scale(1); filter: brightness(1); }
               50% { transform: scale(1.05); filter: brightness(1.3); }
            }
            @keyframes explosion {
               0% { transform: scale(0.5); opacity: 1; }
               50% { transform: scale(3); opacity: 0.8; }
               100% { transform: scale(5); opacity: 0; }
            }
            @keyframes fuse-spark {
               0%, 100% { opacity: 1; transform: scale(1); }
               50% { opacity: 0.5; transform: scale(1.5); }
            }
            @keyframes float-up {
               0% { transform: translateY(0) scale(1); opacity: 1; }
               100% { transform: translateY(-100px) scale(0.5); opacity: 0; }
            }
            .bomb-shake { animation: bomb-shake 0.3s infinite; }
            .bomb-pulse { animation: bomb-pulse 0.8s ease-in-out infinite; }
            .explosion-ring { animation: explosion 1.5s ease-out forwards; }
            .fuse-spark { animation: fuse-spark 0.3s infinite; }
         `}</style>

            {/* --- SETUP --- */}
            {phase === 'SETUP' && (
                <div className="w-full max-w-5xl animate-in fade-in zoom-in duration-700 py-6 px-4 pb-20 overflow-y-auto custom-scrollbar h-full">
                    <div className="flex items-center justify-between mb-8">
                        <button onClick={onHome} className="p-4 bg-red-600/10 rounded-3xl hover:bg-red-600/20 text-red-500 transition-all border border-red-500/20 shadow-xl group">
                            <LogOut size={24} className="group-hover:scale-110" />
                        </button>
                        <div className="text-center">
                            <div className="flex items-center justify-center gap-3 mb-1">
                                <h1 className="text-6xl font-black text-white italic tracking-tighter uppercase">القنبلة الموقوتة</h1>
                            </div>
                            <p className="text-orange-600 font-black tracking-[0.4em] text-[10px] uppercase">TIME BOMB • iABS</p>
                        </div>
                        <div className="w-14"></div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="glass-card p-6 rounded-[2.5rem] border border-white/5 shadow-2xl relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-600 via-red-600 to-orange-600"></div>
                            <h3 className="text-lg font-black text-white flex items-center gap-3 mb-6">
                                <Settings size={18} className="text-orange-500" /> إعدادات اللعبة
                            </h3>
                            <div className="space-y-5">
                                <div className="bg-black/30 p-4 rounded-3xl border border-white/5">
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">الحد الأقصى للاعبين</label>
                                        <span className="text-2xl font-black text-orange-500 font-mono">{config.maxPlayers}</span>
                                    </div>
                                    <input type="range" min="3" max="200" value={config.maxPlayers} onChange={e => setConfig({ ...config, maxPlayers: +e.target.value })} className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-orange-600" />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-black/30 p-4 rounded-3xl border border-white/5 text-center space-y-2">
                                        <label className="text-[9px] font-bold text-gray-500 uppercase">أقل وقت للقنبلة</label>
                                        <div className="flex items-center justify-center gap-2">
                                            <button onClick={() => setConfig({ ...config, minTimer: Math.max(5, config.minTimer - 5) })} className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 text-white text-sm">-</button>
                                            <span className="text-xl font-black text-white font-mono">{config.minTimer}s</span>
                                            <button onClick={() => setConfig({ ...config, minTimer: config.minTimer + 5 })} className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 text-white text-sm">+</button>
                                        </div>
                                    </div>
                                    <div className="bg-black/30 p-4 rounded-3xl border border-white/5 text-center space-y-2">
                                        <label className="text-[9px] font-bold text-gray-500 uppercase">أكثر وقت للقنبلة</label>
                                        <div className="flex items-center justify-center gap-2">
                                            <button onClick={() => setConfig({ ...config, maxTimer: Math.max(config.minTimer + 5, config.maxTimer - 5) })} className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 text-white text-sm">-</button>
                                            <span className="text-xl font-black text-white font-mono">{config.maxTimer}s</span>
                                            <button onClick={() => setConfig({ ...config, maxTimer: config.maxTimer + 5 })} className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 text-white text-sm">+</button>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-black/30 p-4 rounded-3xl border border-white/5 text-center space-y-2">
                                    <label className="text-[9px] font-bold text-gray-500 uppercase">وقت التمرير (ثواني)</label>
                                    <div className="flex items-center justify-center gap-3">
                                        <button onClick={() => setConfig({ ...config, passTimeLimit: Math.max(3, config.passTimeLimit - 1) })} className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-white">-</button>
                                        <span className="text-2xl font-black text-white font-mono">{config.passTimeLimit}s</span>
                                        <button onClick={() => setConfig({ ...config, passTimeLimit: config.passTimeLimit + 1 })} className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-white">+</button>
                                    </div>
                                </div>

                                <div className="bg-black/30 p-4 rounded-3xl border border-white/5">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">كلمة الانضمام</label>
                                    <input value={config.joinKeyword} onChange={e => setConfig({ ...config, joinKeyword: e.target.value })} className="w-full bg-black border-2 border-white/10 focus:border-orange-600 rounded-xl p-3 text-white font-bold text-sm text-center outline-none transition-all" />
                                </div>
                            </div>
                        </div>

                        <div className="glass-card p-6 rounded-[2.5rem] border border-white/5 shadow-2xl flex flex-col items-center justify-center relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-orange-900/20 via-transparent to-red-900/20"></div>
                            <div className="relative z-10 text-center">
                                <div className="relative mb-8">
                                    <div className="absolute inset-0 bg-orange-500/20 blur-[80px] rounded-full"></div>
                                    <Bomb size={120} className="text-orange-500 relative z-10 drop-shadow-[0_0_40px_rgba(249,115,22,0.8)]" strokeWidth={1.5} />
                                </div>
                                <h2 className="text-3xl font-black text-white mb-3">كيف تلعب؟</h2>
                                <div className="space-y-3 text-gray-400 text-sm font-bold max-w-sm">
                                    <p className="flex items-center gap-3"><span className="w-8 h-8 bg-orange-600 text-white rounded-xl flex items-center justify-center font-black text-xs">1</span> القنبلة عند لاعب عشوائي</p>
                                    <p className="flex items-center gap-3"><span className="w-8 h-8 bg-orange-600 text-white rounded-xl flex items-center justify-center font-black text-xs">2</span> اكتب <span className="text-orange-400 font-mono">@اسم_اللاعب</span> أو اسمه لتمريرها</p>
                                    <p className="flex items-center gap-3"><span className="w-8 h-8 bg-red-600 text-white rounded-xl flex items-center justify-center font-black text-xs">3</span> من تنفجر عنده يخرج!</p>
                                </div>
                            </div>

                            <button onClick={() => setPhase('LOBBY')} className="mt-8 bg-gradient-to-r from-orange-600 to-red-600 text-white font-black py-5 px-16 rounded-3xl text-3xl hover:scale-[1.05] active:scale-95 transition-all flex items-center justify-center gap-4 shadow-[0_15px_40px_rgba(249,115,22,0.4)] border-t border-white/20 italic relative z-10">
                                بـدء المـعـركـة <Play fill="currentColor" size={28} />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- LOBBY --- */}
            {phase === 'LOBBY' && (
                <div className="w-full h-full flex flex-col items-center justify-center p-10 animate-in fade-in duration-1000 relative overflow-hidden">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-orange-900/20 via-transparent to-transparent"></div>

                    <div className="text-center mb-10 z-10">
                        <div className="relative inline-block mb-6">
                            <div className="absolute inset-0 bg-orange-500/30 blur-[60px] animate-pulse"></div>
                            <Bomb size={100} className="text-orange-500 relative z-10 drop-shadow-[0_0_40px_rgba(249,115,22,1)] animate-bounce" strokeWidth={1.5} />
                        </div>
                        <h1 className="text-8xl font-black text-white italic tracking-tighter mb-6 drop-shadow-[0_10px_60px_rgba(0,0,0,1)] uppercase">
                            في انتظار اللاعبين
                        </h1>
                        <div className="flex items-center justify-center gap-4 text-3xl text-gray-400 font-bold bg-black/40 backdrop-blur-xl px-12 py-8 rounded-[3rem] border-2 border-white/5 shadow-2xl">
                            أرسل <span className="bg-orange-600 text-white px-8 py-3 rounded-2xl font-black italic shadow-lg">{config.joinKeyword}</span> للمشاركة
                        </div>
                    </div>

                    <div className="flex-1 w-full max-w-5xl overflow-y-auto custom-scrollbar px-6 mb-6">
                        {participants.length === 0 ? (
                            <div className="flex flex-col items-center animate-pulse opacity-30">
                                <Users size={80} className="text-gray-700 mb-4" />
                            </div>
                        ) : (
                            <div className="flex flex-wrap justify-center gap-4 max-w-4xl mx-auto">
                                {participants.map((p) => {
                                    const sizes = getDynamicSize(participants.length);
                                    return (
                                        <div key={p.id} className="animate-in zoom-in duration-500 flex flex-col items-center gap-2 group">
                                            <div className={`${sizes.box} rounded-[2rem] border-2 p-1 transition-all duration-300 shadow-2xl relative bg-black/40 backdrop-blur-xl group-hover:border-orange-600 overflow-visible`} style={{ borderColor: p.color || 'rgba(255,255,255,0.1)' }}>
                                                <ProAvatar
                                                    url={p.avatar || ''}
                                                    username={p.username}
                                                    size="w-full h-full"
                                                    className="overflow-visible"
                                                />
                                            </div>
                                            <span className={`${sizes.text} font-black uppercase drop-shadow-md`} style={{ color: p.color || '#9ca3af' }}>{p.username}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    <div className="w-full max-w-4xl bg-black/60 backdrop-blur-[40px] p-8 rounded-[3rem] border border-white/10 shadow-2xl flex items-center justify-between z-20">
                        <div className="flex items-center gap-4 bg-white/5 px-6 py-3 rounded-2xl border border-white/5">
                            <span className="text-5xl font-black text-white font-mono italic">{participants.length}</span>
                            <span className="text-lg text-orange-500 font-black opacity-40">/ {config.maxPlayers}</span>
                        </div>
                        <div className="flex gap-4">
                            <button onClick={resetGame} className="px-8 py-5 rounded-2xl bg-white/5 text-gray-500 font-black hover:text-white transition-all text-lg border border-white/10">تراجع</button>
                            <button onClick={startGame} disabled={participants.length < 3} className="px-12 py-5 bg-gradient-to-r from-orange-600 to-red-600 text-white font-black text-2xl rounded-2xl shadow-2xl hover:scale-[1.05] active:scale-95 transition-all disabled:opacity-20 italic flex items-center gap-3">
                                ابدأ! <Bomb size={28} />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- PLAYING --- */}
            {phase === 'PLAYING' && currentHolder && (
                <div className="w-full h-full flex flex-col items-center justify-center p-8 animate-in fade-in duration-500 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-orange-950/40 via-black to-red-950/40"></div>

                    {/* Danger particles */}
                    {Array.from({ length: 20 }).map((_, i) => (
                        <div key={`spark-${i}`} className="absolute rounded-full fuse-spark" style={{
                            width: `${3 + Math.random() * 5}px`, height: `${3 + Math.random() * 5}px`,
                            backgroundColor: i % 2 === 0 ? '#f97316' : '#ef4444',
                            left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`,
                            opacity: 0.3, animationDelay: `${Math.random() * 2}s`,
                        }} />
                    ))}

                    <div className="relative z-10 flex flex-col items-center w-full max-w-4xl">
                        {/* Round Info */}
                        <div className="mb-6 text-center">
                            <span className="text-orange-500 font-black text-sm uppercase tracking-[0.5em]">الجولة {currentRound}</span>
                        </div>

                        {/* Bomb holder card */}
                        <div className="relative mb-8" style={{ animation: shakeIntensity > 5 ? `bomb-shake ${Math.max(0.1, 0.5 - shakeIntensity * 0.02)}s infinite` : 'none' }}>
                            {/* Glow */}
                            <div className="absolute inset-0 bg-orange-500/30 blur-[80px] rounded-full animate-pulse" style={{ transform: `scale(${1 + shakeIntensity * 0.05})` }}></div>

                            <div className="relative bg-black/80 backdrop-blur-2xl border-4 border-orange-500/50 rounded-[4rem] p-10 shadow-[0_0_80px_rgba(249,115,22,0.4)] flex flex-col items-center gap-6">
                                {/* Avatar */}
                                 <div className="w-40 h-40 rounded-[2.5rem] border-4 border-orange-500 overflow-visible shadow-[0_0_40px_rgba(249,115,22,0.6)] bomb-pulse relative">
                                     <ProAvatar
                                         url={currentHolder.avatar || ''}
                                         username={currentHolder.username}
                                         size="w-full h-full"
                                         className="overflow-visible"
                                     />
                                 </div>

                                <div className="text-4xl font-black text-white italic">{currentHolder.username}</div>

                                {/* Bomb icon */}
                                <div className="relative">
                                    <Bomb size={80} className="text-orange-500 drop-shadow-[0_0_30px_rgba(249,115,22,0.8)]" style={{ animation: `bomb-pulse ${Math.max(0.3, 1 - shakeIntensity * 0.05)}s ease-in-out infinite` }} />
                                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-yellow-400 rounded-full fuse-spark"></div>
                                </div>

                                <p className="text-orange-400 font-bold text-lg">منشن لاعب <span className="text-white font-mono">@username</span> أو اكتب اسمه لتمرير القنبلة!</p>
                            </div>
                        </div>

                        {/* Pass history */}
                        {passHistory.length > 0 && (
                            <div className="mb-6 flex flex-wrap justify-center gap-3">
                                {passHistory.slice(-5).map((pass, i) => (
                                    <div key={i} className="bg-black/40 border border-white/10 px-4 py-2 rounded-2xl text-sm font-bold text-gray-400 flex items-center gap-2 animate-in slide-in-from-bottom duration-300">
                                        <ChevronRight size={14} className="text-orange-500" /> {pass}
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Players grid */}
                        <div className="flex flex-wrap justify-center gap-3 max-w-3xl">
                            {participants.filter(p => p.username !== currentHolder.username).map(p => (
                                <div key={p.id} className="bg-black/40 border border-white/10 hover:border-orange-500/50 rounded-2xl px-4 py-2 flex items-center gap-2 transition-all hover:scale-105 cursor-default">
                                    <div className="w-10 h-10">
                                        <ProAvatar url={p.avatar || ''} username={p.username} size="w-10 h-10" className="overflow-visible" />
                                    </div>
                                    <span className="text-sm font-black text-gray-300">{p.username}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Exit */}
                    <button onClick={onHome} className="absolute bottom-6 left-6 p-4 bg-black/60 rounded-2xl border border-red-500/20 text-red-500 hover:bg-red-600 hover:text-white transition-all z-50">
                        <LogOut size={24} />
                    </button>
                </div>
            )}

            {/* --- EXPLODED --- */}
            {phase === 'EXPLODED' && lastEliminated && (
                <div className="w-full h-full flex flex-col items-center justify-center p-8 animate-in zoom-in duration-300 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-red-950 via-black to-orange-950"></div>

                    {/* Explosion rings */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-40 h-40 rounded-full bg-orange-500/60 explosion-ring"></div>
                        <div className="w-40 h-40 rounded-full bg-red-500/40 explosion-ring" style={{ animationDelay: '0.2s' }}></div>
                        <div className="w-40 h-40 rounded-full bg-yellow-500/30 explosion-ring" style={{ animationDelay: '0.4s' }}></div>
                    </div>

                    <div className="relative z-10 text-center">
                        <div className="text-[200px] mb-4 animate-pulse">💥</div>
                        <h2 className="text-8xl font-black text-red-500 italic uppercase tracking-tighter mb-6 drop-shadow-[0_0_40px_rgba(239,68,68,0.8)]">انفجرت!</h2>

                        <div className="bg-black/60 backdrop-blur-xl border-2 border-red-500/30 rounded-[3rem] p-8 flex flex-col items-center gap-4 shadow-2xl overflow-visible">
                             <div className="w-40 h-40 rounded-[2rem] shadow-[0_0_30px_rgba(239,68,68,0.5)] overflow-visible">
                                 <ProAvatar url={lastEliminated.avatar || ''} username={lastEliminated.username} size="w-full h-full" className="overflow-visible" />
                             </div>
                            <div className="text-3xl font-black text-red-400">{lastEliminated.username}</div>
                            <div className="text-red-600/60 font-bold text-sm uppercase tracking-widest">ELIMINATED</div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- ROUND END --- */}
            {phase === 'ROUND_END' && (
                <div className="w-full h-full flex flex-col items-center justify-center p-8 animate-in fade-in duration-500 relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-zinc-950 via-black to-orange-950/30"></div>
                    <div className="relative z-10 text-center">
                        <h2 className="text-6xl font-black text-white italic mb-4">الباقون: {participants.length}</h2>
                        <div className="flex flex-wrap justify-center gap-4 mb-10 max-w-3xl">
                            {participants.map(p => (
                                <div key={p.id} className="flex flex-col items-center gap-2 animate-in zoom-in duration-500">
                                     <div className="w-24 h-24 overflow-visible">
                                         <ProAvatar url={p.avatar || ''} username={p.username} size="w-full h-full" className="overflow-visible" />
                                     </div>
                                    <span className="text-xs font-black text-gray-400">{p.username}</span>
                                </div>
                            ))}
                        </div>
                        <div className="flex gap-4">
                            <button onClick={nextRound} className="px-16 py-6 bg-gradient-to-r from-orange-600 to-red-600 text-white font-black text-3xl rounded-[2.5rem] hover:scale-105 active:scale-95 transition-all italic shadow-[0_0_40px_rgba(249,115,22,0.4)]">
                                الجولة التالية <ChevronRight size={28} className="inline" />
                            </button>
                            <button onClick={resetGame} className="px-10 py-6 bg-white/5 text-gray-500 font-black text-xl rounded-2xl border border-white/10 hover:text-white transition-all">
                                إعادة
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- FINALE --- */}
            {phase === 'FINALE' && winner && (
                <div className="w-full h-full flex flex-col items-center justify-center p-10 animate-in zoom-in duration-1000 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-950 via-black to-yellow-950"></div>
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-yellow-600/20 via-transparent to-transparent"></div>

                    {Array.from({ length: 40 }).map((_, i) => (
                        <div key={`gold-${i}`} className="absolute rounded-full animate-particle" style={{
                            width: `${2 + Math.random() * 6}px`, height: `${2 + Math.random() * 6}px`,
                            backgroundColor: ['#fbbf24', '#f59e0b', '#fcd34d', '#fef3c7'][i % 4],
                            left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`,
                            opacity: 0.5, animationDelay: `${Math.random() * 4}s`, animationDuration: `${4 + Math.random() * 6}s`,
                            filter: 'blur(1px)', boxShadow: '0 0 10px currentColor'
                        }} />
                    ))}

                    <div className="relative z-10 text-center">
                        <Trophy size={100} className="text-yellow-400 mx-auto mb-6 drop-shadow-[0_0_40px_rgba(251,191,36,1)] animate-bounce" strokeWidth={1.5} />
                        <h2 className="text-[80px] font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-yellow-600 italic uppercase tracking-tighter mb-6">الناجي الأخير!</h2>

                        <div className="relative mb-8">
                             <div className="absolute inset-0 bg-yellow-500/30 blur-[80px] rounded-full"></div>
                             <div className="w-64 h-64 rounded-[3rem] mx-auto overflow-visible border-4 border-yellow-500 shadow-[0_0_60px_rgba(251,191,36,0.6)] relative z-10">
                                 <ProAvatar url={winner.avatar || ''} username={winner.username} size="w-full h-full" className="overflow-visible" />
                             </div>
                         </div>
                        <div className="text-5xl font-black text-white italic mb-8">{winner.username}</div>

                        <div className="flex gap-4 justify-center">
                            <button onClick={resetGame} className="px-12 py-5 bg-gradient-to-r from-yellow-600 to-amber-600 text-white font-black text-2xl rounded-2xl hover:scale-105 transition-all italic shadow-lg">
                                لعبة جديدة
                            </button>
                            <button onClick={onHome} className="px-8 py-5 bg-white/5 text-gray-500 font-black text-xl rounded-2xl border border-white/10 hover:text-white transition-all">
                                الرئيسية
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
