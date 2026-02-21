
import React, { useState, useEffect, useRef } from 'react';
import { chatService } from '../services/chatService';
import { ChatUser } from '../types';
import { Flame, Play, Settings, Users, Trophy, Skull, LogOut, User, Crown, ChevronRight, Sparkles, AlertTriangle, RotateCcw, Zap } from 'lucide-react';
import { ProAvatar } from './ProAvatar';

interface FloorIsLavaProps {
    onHome: () => void;
    isOBS?: boolean;
}

interface LavaConfig {
    joinKeyword: string;
    maxPlayers: number;
    voteTime: number;
    totalRounds: number;
}

interface LavaZone {
    id: number;
    color: string;
    name: string;
    nameAr: string;
    gradient: string;
    glow: string;
    players: string[];
    isSafe: boolean;
    isRevealed: boolean;
}

type GamePhase = 'SETUP' | 'LOBBY' | 'CHOOSING' | 'REVEAL' | 'LAVA' | 'ROUND_END' | 'FINALE';

const ZONE_TEMPLATES: Omit<LavaZone, 'players' | 'isSafe' | 'isRevealed'>[] = [
    { id: 1, color: '#ef4444', name: 'Red', nameAr: 'أحمر', gradient: 'from-red-600 to-red-800', glow: 'rgba(239,68,68,0.5)' },
    { id: 2, color: '#3b82f6', name: 'Blue', nameAr: 'أزرق', gradient: 'from-blue-600 to-blue-800', glow: 'rgba(59,130,246,0.5)' },
    { id: 3, color: '#22c55e', name: 'Green', nameAr: 'أخضر', gradient: 'from-green-600 to-green-800', glow: 'rgba(34,197,94,0.5)' },
    { id: 4, color: '#eab308', name: 'Yellow', nameAr: 'أصفر', gradient: 'from-yellow-500 to-yellow-700', glow: 'rgba(234,179,8,0.5)' },
];

export const FloorIsLava: React.FC<FloorIsLavaProps> = ({ onHome, isOBS }) => {
    const [config, setConfig] = useState<LavaConfig>({
        joinKeyword: 'نار',
        maxPlayers: 200,
        voteTime: 10,
        totalRounds: 5,
    });

    const [phase, setPhase] = useState<GamePhase>('SETUP');
    const [participants, setParticipants] = useState<ChatUser[]>([]);
    const [zones, setZones] = useState<LavaZone[]>([]);
    const [timeLeft, setTimeLeft] = useState(0);
    const [currentRound, setCurrentRound] = useState(0);
    const [eliminated, setEliminated] = useState<ChatUser[]>([]);
    const [roundFallen, setRoundFallen] = useState<string[]>([]);
    const [safeZoneId, setSafeZoneId] = useState<number>(0);
    const [showLava, setShowLava] = useState(false);

    const phaseRef = useRef(phase);
    const configRef = useRef(config);
    const participantsRef = useRef(participants);
    const zonesRef = useRef(zones);

    useEffect(() => { phaseRef.current = phase; }, [phase]);
    useEffect(() => { configRef.current = config; }, [config]);
    useEffect(() => { participantsRef.current = participants; }, [participants]);
    useEffect(() => { zonesRef.current = zones; }, [zones]);

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

            if (phaseRef.current === 'CHOOSING') {
                const username = msg.user.username.toLowerCase();
                // Check if already in a zone
                const alreadyInZone = zonesRef.current.some(z => z.players.includes(username));
                if (alreadyInZone) return;

                // Check if eliminated
                const isAlive = participantsRef.current.some(p => p.username.toLowerCase() === username);
                if (!isAlive) return;

                const colorMap: Record<string, number> = {
                    'أحمر': 1, 'red': 1, '1': 1, 'احمر': 1,
                    'أزرق': 2, 'blue': 2, '2': 2, 'ازرق': 2,
                    'أخضر': 3, 'green': 3, '3': 3, 'اخضر': 3,
                    'أصفر': 4, 'yellow': 4, '4': 4, 'اصفر': 4,
                };

                const zoneId = colorMap[content];
                if (zoneId) {
                    setZones(prev => prev.map(z =>
                        z.id === zoneId ? { ...z, players: [...z.players, username] } : z
                    ));
                }
            }
        });
        return () => unsubscribe();
    }, []);

    // Timer
    useEffect(() => {
        if (phase === 'CHOOSING' && timeLeft > 0) {
            const timer = window.setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 1) { revealSafeZone(); return 0; }
                    return prev - 1;
                });
            }, 1000);
            return () => clearInterval(timer);
        }
    }, [phase, timeLeft]);

    const initializeZones = () => {
        return ZONE_TEMPLATES.map(t => ({
            ...t,
            players: [],
            isSafe: false,
            isRevealed: false,
        }));
    };

    const startGame = () => {
        if (participants.length < 2) return;
        setCurrentRound(1);
        setEliminated([]);
        startRound();
    };

    const startRound = () => {
        const newZones = initializeZones();
        const safeId = ZONE_TEMPLATES[Math.floor(Math.random() * ZONE_TEMPLATES.length)].id;
        setSafeZoneId(safeId);
        setZones(newZones);
        setTimeLeft(config.voteTime);
        setRoundFallen([]);
        setShowLava(false);
        setPhase('CHOOSING');
    };

    const revealSafeZone = () => {
        setPhase('REVEAL');

        // Mark zones as revealed
        setZones(prev => prev.map(z => ({
            ...z,
            isSafe: z.id === safeZoneId,
            isRevealed: true,
        })));

        // Players who chose wrong + who didn't choose at all
        const currentZones = zonesRef.current;
        const allChosenPlayers = currentZones.flatMap(z => z.players);
        const alivePlayers = participantsRef.current.map(p => p.username.toLowerCase());
        const safePlayers = currentZones.find(z => z.id === safeZoneId)?.players || [];
        const nonChoosers = alivePlayers.filter(p => !allChosenPlayers.includes(p));
        const wrongChoosers = allChosenPlayers.filter(p => !safePlayers.includes(p));
        const fallen = [...wrongChoosers, ...nonChoosers];

        setRoundFallen(fallen);

        setTimeout(() => {
            setShowLava(true);
            setPhase('LAVA');

            setTimeout(() => {
                // Remove eliminated
                const newParticipants = participantsRef.current.filter(p => !fallen.includes(p.username.toLowerCase()));
                const newEliminated = participantsRef.current.filter(p => fallen.includes(p.username.toLowerCase()));
                setParticipants(newParticipants);
                setEliminated(prev => [...prev, ...newEliminated]);

                if (newParticipants.length <= 1 || currentRound >= config.totalRounds) {
                    setPhase('FINALE');
                } else {
                    setPhase('ROUND_END');
                }
            }, 3000);
        }, 2000);
    };

    const nextRound = () => {
        setCurrentRound(prev => prev + 1);
        startRound();
    };

    const resetGame = () => {
        setPhase('SETUP');
        setParticipants([]);
        setZones([]);
        setTimeLeft(0);
        setCurrentRound(0);
        setEliminated([]);
        setRoundFallen([]);
        setShowLava(false);
    };

    return (
        <div className={`w-full h-full flex flex-col items-center bg-transparent text-right font-display select-none ${isOBS ? 'overflow-hidden' : ''}`} dir="rtl">
            <style>{`
            @keyframes lava-flow {
               0% { background-position: 0% 50%; }
               50% { background-position: 100% 50%; }
               100% { background-position: 0% 50%; }
            }
            @keyframes zone-sink {
               0% { transform: translateY(0) scale(1); opacity: 1; }
               50% { transform: translateY(30px) scale(0.9); opacity: 0.6; }
               100% { transform: translateY(200px) scale(0.5); opacity: 0; }
            }
            @keyframes safe-bounce {
               0% { transform: scale(1); }
               50% { transform: scale(1.1); }
               100% { transform: scale(1); }
            }
            @keyframes fire-particle {
               0% { transform: translateY(0) scale(1); opacity: 1; }
               100% { transform: translateY(-100px) scale(0); opacity: 0; }
            }
            .lava-bg {
               background: linear-gradient(45deg, #dc2626, #f97316, #ef4444, #fb923c, #dc2626);
               background-size: 400% 400%;
               animation: lava-flow 3s ease infinite;
            }
            .zone-sink { animation: zone-sink 2s ease-in forwards; }
            .safe-bounce { animation: safe-bounce 0.5s ease-in-out 3; }
         `}</style>

            {/* --- SETUP --- */}
            {phase === 'SETUP' && (
                <div className="w-full max-w-5xl animate-in fade-in zoom-in duration-700 py-6 px-4 pb-20 overflow-y-auto custom-scrollbar h-full">
                    <div className="flex items-center justify-between mb-8">
                        <button onClick={onHome} className="p-4 bg-red-600/10 rounded-3xl hover:bg-red-600/20 text-red-500 transition-all border border-red-500/20">
                            <LogOut size={24} />
                        </button>
                        <div className="text-center">
                            <h1 className="text-6xl font-black text-white italic tracking-tighter uppercase">أرضية الحمم</h1>
                            <p className="text-red-600 font-black tracking-[0.4em] text-[10px] uppercase">FLOOR IS LAVA • iABS</p>
                        </div>
                        <div className="w-14"></div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="glass-card p-6 rounded-[2.5rem] border border-white/5 shadow-2xl relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-600 via-orange-500 to-red-600"></div>
                            <h3 className="text-lg font-black text-white flex items-center gap-3 mb-6"><Settings size={18} className="text-red-500" /> إعدادات اللعبة</h3>
                            <div className="space-y-5">
                                <div className="bg-black/30 p-4 rounded-3xl border border-white/5 text-center space-y-2">
                                    <label className="text-[9px] font-bold text-gray-500 uppercase">وقت الاختيار</label>
                                    <div className="flex items-center justify-center gap-3">
                                        <button onClick={() => setConfig({ ...config, voteTime: Math.max(5, config.voteTime - 2) })} className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-white">-</button>
                                        <span className="text-2xl font-black text-white font-mono">{config.voteTime}s</span>
                                        <button onClick={() => setConfig({ ...config, voteTime: config.voteTime + 2 })} className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-white">+</button>
                                    </div>
                                </div>

                                <div className="bg-black/30 p-4 rounded-3xl border border-white/5 text-center space-y-2">
                                    <label className="text-[9px] font-bold text-gray-500 uppercase">عدد الجولات</label>
                                    <div className="flex items-center justify-center gap-3">
                                        <button onClick={() => setConfig({ ...config, totalRounds: Math.max(1, config.totalRounds - 1) })} className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-white">-</button>
                                        <span className="text-2xl font-black text-white font-mono">{config.totalRounds}</span>
                                        <button onClick={() => setConfig({ ...config, totalRounds: config.totalRounds + 1 })} className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-white">+</button>
                                    </div>
                                </div>

                                <div className="bg-black/30 p-4 rounded-3xl border border-white/5">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">كلمة الانضمام</label>
                                    <input value={config.joinKeyword} onChange={e => setConfig({ ...config, joinKeyword: e.target.value })} className="w-full bg-black border-2 border-white/10 focus:border-red-600 rounded-xl p-3 text-white font-bold text-sm text-center outline-none transition-all" />
                                </div>
                            </div>
                        </div>

                        <div className="glass-card p-6 rounded-[2.5rem] border border-white/5 shadow-2xl flex flex-col items-center justify-center relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-red-900/20 via-transparent to-orange-900/20"></div>
                            <div className="relative z-10 text-center">
                                <div className="grid grid-cols-2 gap-3 mb-6">
                                    {ZONE_TEMPLATES.map(z => (
                                        <div key={z.id} className={`w-24 h-24 rounded-2xl bg-gradient-to-br ${z.gradient} flex items-center justify-center text-2xl font-black text-white shadow-lg`}>
                                            {z.nameAr}
                                        </div>
                                    ))}
                                </div>
                                <h2 className="text-3xl font-black text-white mb-3">كيف تلعب؟</h2>
                                <div className="space-y-3 text-gray-400 text-sm font-bold max-w-sm">
                                    <p className="flex items-center gap-3"><span className="w-8 h-8 bg-red-600 text-white rounded-xl flex items-center justify-center font-black text-xs">1</span> اختر لوناً بكتابة اسمه</p>
                                    <p className="flex items-center gap-3"><span className="w-8 h-8 bg-orange-600 text-white rounded-xl flex items-center justify-center font-black text-xs">2</span> 3 ألوان تختفي في الحمم!</p>
                                    <p className="flex items-center gap-3"><span className="w-8 h-8 bg-yellow-600 text-white rounded-xl flex items-center justify-center font-black text-xs">3</span> لون واحد فقط آمن!</p>
                                </div>
                            </div>
                            <button onClick={() => setPhase('LOBBY')} className="mt-8 bg-gradient-to-r from-red-600 to-orange-600 text-white font-black py-5 px-16 rounded-3xl text-3xl hover:scale-[1.05] active:scale-95 transition-all flex items-center gap-4 shadow-[0_15px_40px_rgba(239,68,68,0.4)] italic relative z-10 border-t border-white/20">
                                ادخل الحلبة <Flame fill="currentColor" size={28} />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- LOBBY --- */}
            {phase === 'LOBBY' && (
                <div className="w-full h-full flex flex-col items-center justify-center p-10 animate-in fade-in duration-1000 relative overflow-hidden">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-red-900/20 via-transparent to-transparent"></div>
                    <div className="text-center mb-10 z-10">
                        <Flame size={80} className="text-red-500 mx-auto mb-6 drop-shadow-[0_0_40px_rgba(239,68,68,1)] animate-bounce" />
                        <h1 className="text-7xl font-black text-white italic tracking-tighter mb-6 uppercase">في انتظار اللاعبين</h1>
                        <div className="flex items-center justify-center gap-4 text-2xl text-gray-400 font-bold bg-black/40 backdrop-blur-xl px-10 py-6 rounded-[3rem] border-2 border-white/5">
                            أرسل <span className="bg-red-600 text-white px-6 py-2 rounded-2xl font-black italic">{config.joinKeyword}</span> للمشاركة
                        </div>
                    </div>
                    <div className="flex-1 w-full max-w-4xl overflow-y-auto custom-scrollbar px-6 mb-6">
                        <div className="flex flex-wrap justify-center gap-3 max-w-3xl mx-auto">
                            {participants.map(p => (
                                <div key={p.id} className="animate-in zoom-in duration-300 bg-black/40 border border-white/10 rounded-2xl px-4 py-2 flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg overflow-hidden border border-white/10">
                                        <ProAvatar url={p.avatar || ''} username={p.username} size="w-8 h-8" />
                                    </div>
                                    <span className="font-black text-white text-xs">{p.username}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="w-full max-w-4xl bg-black/60 backdrop-blur-[40px] p-8 rounded-[3rem] border border-white/10 flex items-center justify-between z-20">
                        <div className="text-4xl font-black text-white font-mono italic">{participants.length}</div>
                        <div className="flex gap-4">
                            <button onClick={resetGame} className="px-8 py-5 rounded-2xl bg-white/5 text-gray-500 font-black hover:text-white transition-all border border-white/10">تراجع</button>
                            <button onClick={startGame} disabled={participants.length < 2} className="px-12 py-5 bg-gradient-to-r from-red-600 to-orange-600 text-white font-black text-2xl rounded-2xl hover:scale-105 transition-all disabled:opacity-20 italic flex items-center gap-3">
                                ابدأ! <Flame size={24} />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- CHOOSING --- */}
            {phase === 'CHOOSING' && (
                <div className="w-full h-full flex flex-col items-center justify-center p-8 animate-in fade-in duration-500 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-zinc-950 via-black to-zinc-950"></div>

                    <div className="relative z-10 flex flex-col items-center w-full max-w-5xl">
                        <div className="mb-4 text-center">
                            <span className="text-red-500 font-black text-sm uppercase tracking-[0.5em]">الجولة {currentRound} / {config.totalRounds}</span>
                        </div>

                        <div className={`text-[80px] font-black font-mono mb-8 ${timeLeft <= 3 ? 'text-red-500 animate-pulse' : 'text-white'}`}>
                            {timeLeft}
                        </div>

                        <h2 className="text-4xl font-black text-white italic mb-2">اختر لونك الآن!</h2>
                        <p className="text-gray-500 font-bold mb-8">اكتب اسم اللون في الشات</p>

                        <div className="grid grid-cols-2 gap-8 mb-8">
                            {zones.map(zone => (
                                <div key={zone.id} className={`relative w-60 h-60 rounded-[3rem] bg-gradient-to-br ${zone.gradient} flex flex-col items-center justify-center shadow-[0_0_40px_${zone.glow}] hover:scale-105 transition-all cursor-default border-4 border-white/20`}>
                                    <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-[3rem]"></div>
                                    <span className="text-5xl font-black text-white relative z-10 drop-shadow-lg">{zone.nameAr}</span>
                                    <div className="absolute bottom-4 bg-black/40 px-4 py-2 rounded-2xl text-white font-black text-xl font-mono relative z-10">
                                        {zone.players.length}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="flex items-center gap-4 text-gray-500 font-bold text-sm">
                            <Users size={16} /> {participants.length} لاعبين | الباقون: <span className="text-red-400">{participants.length - eliminated.length}</span>
                        </div>

                        <div className="w-full max-w-3xl mt-6 h-3 bg-black/60 rounded-full overflow-hidden border border-white/10">
                            <div className={`h-full rounded-full transition-all duration-1000 ${timeLeft <= 3 ? 'bg-red-500' : 'bg-gradient-to-r from-red-500 to-orange-500'}`} style={{ width: `${(timeLeft / config.voteTime) * 100}%` }} />
                        </div>
                    </div>
                </div>
            )}

            {/* --- REVEAL/LAVA --- */}
            {(phase === 'REVEAL' || phase === 'LAVA') && (
                <div className="w-full h-full flex flex-col items-center justify-center p-8 animate-in zoom-in duration-500 relative overflow-hidden">
                    {showLava && (
                        <div className="absolute inset-0 lava-bg opacity-30"></div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-br from-black/80 via-transparent to-black/80"></div>

                    <div className="relative z-10 flex flex-col items-center w-full max-w-5xl">
                        <h2 className="text-6xl font-black text-white italic mb-8 animate-pulse">
                            {showLava ? '🔥 الأرض حمم! 🔥' : '⚡ الكشف...'}
                        </h2>

                        <div className="grid grid-cols-2 gap-8 mb-8">
                            {zones.map(zone => {
                                const isSafe = zone.id === safeZoneId;
                                return (
                                    <div key={zone.id} className={`relative w-60 h-60 rounded-[3rem] bg-gradient-to-br ${zone.gradient} flex flex-col items-center justify-center transition-all duration-1000 border-4 ${isSafe ? 'border-green-400 safe-bounce shadow-[0_0_60px_rgba(34,197,94,0.6)]' : showLava ? 'zone-sink border-red-800 opacity-30' : 'border-red-500/50'}`}>
                                        <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-[3rem]"></div>
                                        {isSafe ? (
                                            <div className="relative z-10 flex flex-col items-center gap-2">
                                                <Trophy size={50} className="text-white drop-shadow-lg" />
                                                <span className="text-3xl font-black text-white drop-shadow-lg">آمن!</span>
                                                <span className="text-lg font-bold text-white/80">{zone.players.length} ناجين</span>
                                            </div>
                                        ) : (
                                            <div className="relative z-10 flex flex-col items-center gap-2">
                                                {showLava ? (
                                                    <>
                                                        <Skull size={50} className="text-white/60" />
                                                        <span className="text-xl font-black text-white/60">{zone.players.length} سقطوا</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Flame size={50} className="text-white/80 animate-pulse" />
                                                        <span className="text-2xl font-black text-white/80">{zone.nameAr}</span>
                                                    </>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {roundFallen.length > 0 && showLava && (
                            <div className="text-center mb-6">
                                <div className="text-red-500 font-black text-3xl">{roundFallen.length} سقطوا في الحمم! 🔥</div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* --- ROUND END --- */}
            {phase === 'ROUND_END' && (
                <div className="w-full h-full flex flex-col items-center justify-center p-8 animate-in fade-in duration-500 relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-zinc-950 via-black to-red-950/20"></div>
                    <div className="relative z-10 text-center">
                        <h2 className="text-6xl font-black text-white italic mb-4">الباقون: {participants.length}</h2>
                        <p className="text-red-400 font-bold mb-8 text-xl">تم إقصاء {roundFallen.length} لاعب</p>
                        <button onClick={nextRound} className="px-16 py-6 bg-gradient-to-r from-red-600 to-orange-600 text-white font-black text-3xl rounded-[2.5rem] hover:scale-105 transition-all italic shadow-[0_0_40px_rgba(239,68,68,0.4)]">
                            الجولة التالية <ChevronRight size={28} className="inline" />
                        </button>
                    </div>
                </div>
            )}

            {/* --- FINALE --- */}
            {phase === 'FINALE' && (
                <div className="w-full h-full flex flex-col items-center justify-center p-10 animate-in zoom-in duration-1000 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-950 via-black to-yellow-950"></div>
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-yellow-600/20 via-transparent to-transparent"></div>
                    <div className="relative z-10 text-center">
                        <Crown size={80} className="text-yellow-400 mx-auto mb-6 drop-shadow-[0_0_40px_rgba(251,191,36,1)] animate-bounce" />
                        <h2 className="text-7xl font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-yellow-600 italic uppercase mb-8">
                            {participants.length > 0 ? 'الناجون!' : 'الجميع سقطوا!'}
                        </h2>

                        {participants.length > 0 ? (
                            <div className="flex flex-wrap justify-center gap-4 mb-10 max-w-3xl">
                                {participants.map(p => (
                                    <div key={p.id} className="flex flex-col items-center gap-2 animate-in zoom-in">
                                        <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-yellow-500/40 shadow-[0_0_15px_rgba(251,191,36,0.3)]">
                                            <ProAvatar url={p.avatar || ''} username={p.username} size="w-16 h-16" />
                                        </div>
                                        <span className="text-sm font-black text-yellow-400">{p.username}</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="mb-10">
                                <Skull size={60} className="text-red-500 mx-auto mb-4" />
                                <p className="text-xl text-gray-500 font-bold">لم ينجُ أحد!</p>
                            </div>
                        )}

                        <div className="flex gap-4 justify-center">
                            <button onClick={resetGame} className="px-12 py-5 bg-gradient-to-r from-red-600 to-orange-600 text-white font-black text-2xl rounded-2xl hover:scale-105 transition-all italic">لعبة جديدة</button>
                            <button onClick={onHome} className="px-8 py-5 bg-white/5 text-gray-500 font-black text-xl rounded-2xl border border-white/10 hover:text-white transition-all">الرئيسية</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
