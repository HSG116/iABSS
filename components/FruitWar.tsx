import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, Play, Users, Trophy, Clock, ChevronLeft, User, Skull, Sword, Crown, Ban, Zap, Sparkles, RefreshCw, PaintBucket } from 'lucide-react';
import { ProAvatar } from './ProAvatar';
import { ChatUser } from '../types';
import { chatService } from '../services/chatService';
import { leaderboardService } from '../services/supabase';

interface FruitWarProps {
    onHome: () => void;
    isOBS?: boolean;
}

interface GameConfig {
    votingDuration: number;
}

type GamePhase = 'SETUP' | 'PLAYING' | 'ELIMINATION' | 'WINNER';

interface FruitParticipant extends ChatUser {
    fruitId: string;
    joinedAt: number;
}

interface Fruit {
    id: string;
    name: string;
    image: string;
    color: string;
    keywords?: string[]; // English names or alternative Arabic spellings
}

// Arabic normalization for robust matching
const normalizeTxt = (str: string) => {
    return str
        .toLowerCase()
        .replace(/[أإآ]/g, 'ا')
        .replace(/ة/g, 'ه')
        .replace(/ى/g, 'ي')
        .replace(/[\ufe0f\u200d]/g, '') // Strip emoji modifiers
        .trim();
};

const FRUITS: Fruit[] = [
    { id: 'kiwi', name: 'كيوي', image: '🥝', color: '#a3e635', keywords: ['kiwi'] },
    { id: 'coconut', name: 'جوز هند', image: '🥥', color: '#78350f', keywords: ['coconut', 'نارجيل'] },
    { id: 'grapes', name: 'عنب', image: '🍇', color: '#a855f7', keywords: ['grapes'] },
    { id: 'melon', name: 'شمام', image: '🍈', color: '#d9f99d', keywords: ['melon'] },
    { id: 'watermelon', name: 'بطيخ', image: '🍉', color: '#22c55e', keywords: ['watermelon'] },
    { id: 'orange', name: 'برتقال', image: '🍊', color: '#f97316', keywords: ['orange'] },
    { id: 'lemon', name: 'ليمون', image: '🍋', color: '#facc15', keywords: ['lemon'] },
    { id: 'banana', name: 'موز', image: '🍌', color: '#eab308', keywords: ['banana'] },
    { id: 'pineapple', name: 'أناناس', image: '🍍', color: '#fbbf24', keywords: ['pineapple'] },
    { id: 'mango', name: 'مانجو', image: '🥭', color: '#f59e0b', keywords: ['mango'] },
    { id: 'apple_red', name: 'تفاح', image: '🍎', color: '#ef4444', keywords: ['apple'] },
    { id: 'apple_green', name: 'تفاح اخضر', image: '🍏', color: '#84cc16', keywords: ['green apple'] },
    { id: 'pear', name: 'كمثرى', image: '🍐', color: '#a3e635', keywords: ['pear'] },
    { id: 'peach', name: 'خوخ', image: '🍑', color: '#fb923c', keywords: ['peach'] },
    { id: 'cherry', name: 'كرز', image: '🍒', color: '#be123c', keywords: ['cherry'] },
    { id: 'strawberry', name: 'فراولة', image: '🍓', color: '#dc2626', keywords: ['strawberry'] },
    { id: 'tomato', name: 'طماطم', image: '🍅', color: '#ef4444', keywords: ['tomato'] },
    { id: 'eggplant', name: 'باذنجان', image: '🍆', color: '#7e22ce', keywords: ['eggplant'] },
    { id: 'corn', name: 'ذرة', image: '🌽', color: '#fde047', keywords: ['corn'] },
    { id: 'pepper', name: 'فلفل', image: '🌶️', color: '#b91c1c', keywords: ['pepper', 'فلفل حار'] },
    { id: 'mushroom', name: 'فطر', image: '🍄', color: '#f43f5e', keywords: ['mushroom', 'مشروم'] },
    { id: 'avocado', name: 'أفوكادو', image: '🥑', color: '#65a30d', keywords: ['avocado'] },
    { id: 'cucumber', name: 'خيار', image: '🥒', color: '#16a34a', keywords: ['cucumber'] },
    { id: 'leaf_green', name: 'خس', image: '🥬', color: '#22c55e', keywords: ['lettuce'] },
    { id: 'broccoli', name: 'بروكلي', image: '🥦', color: '#15803d', keywords: ['broccoli'] },
    { id: 'potato', name: 'بطاطس', image: '🥔', color: '#a8a29e', keywords: ['potato'] },
    { id: 'garlic', name: 'ثوم', image: '🧄', color: '#f5f5f4', keywords: ['garlic'] },
    { id: 'onion', name: 'بصل', image: '🧅', color: '#a855f7', keywords: ['onion'] },
    { id: 'carrot', name: 'جزر', image: '🥕', color: '#ea580c', keywords: ['carrot'] },
    { id: 'chestnut', name: 'كستناء', image: '🌰', color: '#78350f', keywords: ['chestnut'] },
    { id: 'peanut', name: 'فول سوداني', image: '🥜', color: '#f59e0b', keywords: ['peanut'] },
];

export const FruitWar: React.FC<FruitWarProps> = ({ onHome, isOBS }) => {
    const [config, setConfig] = useState<GameConfig>({
        votingDuration: 60
    });

    const [phase, setPhase] = useState<GamePhase>('SETUP');
    const [participants, setParticipants] = useState<FruitParticipant[]>([]);
    const [bannedUsers, setBannedUsers] = useState<Set<string>>(new Set());
    const [timer, setTimer] = useState(0);
    const [sortedFruits, setSortedFruits] = useState<Fruit[]>(FRUITS);
    const [lastEliminatedFruit, setLastEliminatedFruit] = useState<{ fruit: Fruit, count: number } | null>(null);
    const [winningTeam, setWinningTeam] = useState<{ fruit: Fruit, players: FruitParticipant[] } | null>(null);
    const [round, setRound] = useState(1);
    const [selectedFruitVoters, setSelectedFruitVoters] = useState<Fruit | null>(null);
    const [hasEliminated, setHasEliminated] = useState(false);

    const phaseRef = useRef(phase);
    const participantsRef = useRef(participants);
    const bannedRef = useRef(bannedUsers);

    useEffect(() => {
        phaseRef.current = phase;
        participantsRef.current = participants;
        bannedRef.current = bannedUsers;
    }, [phase, participants, bannedUsers]);

    // Sorting Logic: Sort by Participant Count DESC for the display grid
    useEffect(() => {
        if (phase === 'PLAYING' || phase === 'ELIMINATION') {
            const sorted = [...FRUITS].sort((a, b) => {
                const countA = participants.filter(p => p.fruitId === a.id).length;
                const countB = participants.filter(p => p.fruitId === b.id).length;
                return countB - countA; // DESC
            });
            setSortedFruits(sorted);
        } else {
            setSortedFruits(FRUITS);
        }
    }, [participants, phase]);

    // Chat Handler
    useEffect(() => {
        const unsubscribe = chatService.onMessage((msg) => {
            if (phaseRef.current !== 'PLAYING') return;

            const username = msg.user.username;
            if (bannedRef.current.has(username)) return; // Ignored banned users

            // Enhanced Emote/Sticker Matching logic
            const emoteRegex = /\[emote:(\d+):([\w\s\-]+)\]/gi;
            let emoteNames: string[] = [];
            let match;
            while ((match = emoteRegex.exec(msg.content)) !== null) {
                emoteNames.push(match[2].toLowerCase());
            }

            const normContent = normalizeTxt(msg.content);

            const matchingFruit = FRUITS.find(f => {
                const normName = normalizeTxt(f.name);
                const normImage = normalizeTxt(f.image);

                // 1. Direct match (Text or Emoji)
                if (normContent === normName || normContent === normImage) return true;

                // 2. Keyword match (English/Alt)
                if (f.keywords?.some(k => normalizeTxt(k) === normContent)) return true;

                // 3. Emote name match (Extract from [emote:ID:NAME])
                if (emoteNames.some(en => en === normName || f.keywords?.some(k => normalizeTxt(k) === en))) return true;

                // 4. Fuzzy inclusion (only for long strings)
                if (normContent.length > 2 && normName.includes(normContent)) return true;

                return false;
            });

            if (matchingFruit) {
                setParticipants(prev => {
                    // Check if user already joined - if so, don't allow changing
                    const existing = prev.find(p => p.username === username);
                    if (existing) return prev;

                    // New User
                    const newParticipant: FruitParticipant = {
                        ...msg.user,
                        fruitId: matchingFruit.id,
                        joinedAt: Date.now()
                    };

                    chatService.fetchKickAvatar(username).then(avatar => {
                        if (avatar) {
                            setParticipants(current => current.map(p =>
                                p.username === username ? { ...p, avatar } : p
                            ));
                        }
                    });

                    return [...prev, newParticipant];
                });
            }
        });
        return () => unsubscribe();
    }, []);

    // Timer Logic
    useEffect(() => {
        let interval: number;
        if (phase === 'PLAYING' && timer > 0) {
            interval = window.setInterval(() => {
                setTimer(prev => prev - 1);
            }, 1000);
        } else if (phase === 'PLAYING' && timer === 0) {
            setPhase('ELIMINATION'); // Switch to Streamer Elimination Phase
        }
        return () => clearInterval(interval);
    }, [phase, timer]);

    // Auto-transition Logic: After elimination, wait 3s then start next round
    useEffect(() => {
        if (lastEliminatedFruit && phase === 'ELIMINATION' && !winningTeam) {
            const timeout = setTimeout(() => {
                startNextRound();
            }, 3000);
            return () => clearTimeout(timeout);
        }
    }, [lastEliminatedFruit, phase, winningTeam]);

    const startGame = () => {
        setParticipants([]);
        setBannedUsers(new Set());
        setLastEliminatedFruit(null);
        setWinningTeam(null);
        setTimer(config.votingDuration);
        setRound(1);
        setHasEliminated(false);
        setPhase('PLAYING');
    };



    const startNextRound = () => {
        setTimer(config.votingDuration);
        setLastEliminatedFruit(null);
        setHasEliminated(false);
        setRound(r => r + 1);
        setPhase('PLAYING');
    };

    const handleFruitClick = (fruit: Fruit) => {
        if (phase !== 'ELIMINATION' || hasEliminated) return;

        // Simplify: Allow eliminating any fruit to trigger the animation
        const targetPlayers = participants.filter(p => p.fruitId === fruit.id);

        const newBanned = new Set(bannedUsers);
        targetPlayers.forEach(p => newBanned.add(p.username));
        setBannedUsers(newBanned);

        const remainingPlayers = participants.filter(p => p.fruitId !== fruit.id);
        setParticipants(remainingPlayers);
        setLastEliminatedFruit({ fruit, count: targetPlayers.length });
        setHasEliminated(true);

        const newActiveFruits = Array.from(new Set(remainingPlayers.map(p => p.fruitId)));

        if (newActiveFruits.length === 1 && remainingPlayers.length >= 1) {
            const winnerFruit = FRUITS.find(f => f.id === newActiveFruits[0]);
            setWinningTeam({ fruit: winnerFruit!, players: remainingPlayers });

            // Record Wins for the team
            remainingPlayers.forEach(p => {
                leaderboardService.recordWin(p.username, p.avatar || '', 500);
            });

            setTimeout(() => setPhase('WINNER'), 2000);
        }
    };

    return (
        <div className="w-full h-full flex flex-col items-center bg-transparent text-right font-display select-none overflow-hidden" dir="rtl">
            {/* Dynamic Background */}
            <div className={`absolute inset-0 transition-colors duration-1000 ${phase === 'WINNER' ? 'bg-black' : 'bg-[#0a0a0a]'} -z-20`}></div>
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5 -z-10"></div>

            {/* Header / Info Bar */}
            {(phase === 'PLAYING' || phase === 'ELIMINATION') && (
                <div className="w-full px-8 py-6 flex justify-between items-center z-10 animate-in slide-in-from-top duration-700">
                    <div className="flex items-center gap-4">
                        <div className="glass-card px-8 py-3 rounded-full border border-white/10 bg-black/40 backdrop-blur-md flex items-center gap-4">
                            <Users className="text-green-500" />
                            <div className="text-right">
                                <div className="text-[10px] font-bold text-gray-500 uppercase">الناجين</div>
                                <div className="text-2xl font-black text-white">{participants.length}</div>
                            </div>
                        </div>
                        {/* Next Round Button - Only for Streamer in Elimination Phase */}
                        {!isOBS && phase === 'ELIMINATION' && (
                            <button
                                onClick={startNextRound}
                                className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-full font-black text-sm flex items-center gap-2 shadow-lg transition-all hover:scale-105 animate-in zoom-in"
                            >
                                <RefreshCw size={18} /> جولة تصويت جديدة ({round + 1})
                            </button>
                        )}
                    </div>

                    <div className="flex flex-col items-center">
                        <div className={`text-6xl font-black italic tracking-tighter drop-shadow-2xl transition-all duration-500 ${phase === 'ELIMINATION' ? 'text-red-500 animate-pulse scale-110' : 'text-white'}`}>
                            {phase === 'ELIMINATION' ? '🔥 إقــصــاء 🔥' : 'حــرب الــفــواكــه'}
                        </div>
                        {phase === 'PLAYING' && (
                            <div className="mt-2 flex items-center gap-2 bg-green-500/10 px-4 py-1 rounded-full border border-green-500/20 animate-bounce">
                                <span className="text-green-400 font-bold text-sm">اكتب اسم الفاكهة للانضمام!</span>
                            </div>
                        )}
                        {phase === 'ELIMINATION' && (
                            <div className="mt-2 text-red-500 font-bold text-lg animate-pulse">اضغط على الفاكهة لإقصاء فريقها!</div>
                        )}
                    </div>

                    <div className={`glass-card px-8 py-3 rounded-full border flex items-center gap-4 ${timer < 10 && phase === 'PLAYING' ? 'border-red-500/50 bg-red-900/10' : 'border-white/10 bg-black/40'} backdrop-blur-md`}>
                        <Clock className={timer < 10 && phase === 'PLAYING' ? 'text-red-500' : 'text-blue-500'} />
                        <div className="text-right">
                            <div className="text-[10px] font-bold text-gray-500 uppercase">الوقت</div>
                            <div className="text-2xl font-black text-white font-mono">
                                {phase === 'ELIMINATION' ? 'انتهى' : `${timer}s`}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {phase === 'SETUP' && (
                <div className="w-full max-w-4xl mt-12 animate-in fade-in zoom-in duration-700">
                    <div className="text-center mb-12">
                        <Crown size={80} className="mx-auto text-yellow-500 mb-6 drop-shadow-[0_0_30px_rgba(234,179,8,0.5)]" />
                        <h1 className="text-8xl font-black text-white italic tracking-tighter mb-2">حـرب الـفـواكـه</h1>
                        <p className="text-yellow-500 font-black tracking-[0.5em] text-sm uppercase">Ultimate Fruit Battle</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Settings */}
                        <div className="glass-card p-10 rounded-[3rem] border border-white/10 bg-white/5 backdrop-blur-2xl">
                            <h3 className="text-2xl font-black text-white flex items-center gap-3 mb-8">
                                <Settings className="text-gray-400" /> إعـدادات الـمـعـركـة
                            </h3>
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <label className="text-sm font-bold text-gray-400">وقت التجميع (ثانية)</label>
                                        <span className="text-xl font-black text-yellow-500">{config.votingDuration}</span>
                                    </div>
                                    <input
                                        type="range" min="15" max="180" step="5"
                                        value={config.votingDuration}
                                        onChange={e => setConfig({ ...config, votingDuration: +e.target.value })}
                                        className="w-full h-3 bg-white/10 rounded-full appearance-none accent-yellow-500 cursor-pointer"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Start Action */}
                        <div className="flex flex-col gap-4">
                            <div className="glass-card p-8 rounded-[3rem] border border-white/10 bg-white/5 backdrop-blur-2xl flex-1 flex flex-col justify-center items-center text-center">
                                <p className="text-gray-300 font-bold leading-relaxed px-4">
                                    الجماهير تختار وانضمام فوري بكتابة اسم الفاكهة.
                                    <br />
                                    الأكثر تصويتاً يظهر في المقدمة.
                                    <br /><span className="text-red-400">الإقصاء بيد الستريمر!</span>
                                </p>
                            </div>
                            <button
                                onClick={startGame}
                                className="w-full py-8 bg-yellow-500 hover:bg-yellow-400 text-black font-black text-4xl rounded-[3rem] shadow-[0_10px_40px_rgba(234,179,8,0.4)] transition-all transform hover:scale-[1.02] flex items-center justify-center gap-4"
                            >
                                <Sword className="fill-black" /> بـــدء الــنــزال
                            </button>
                        </div>
                    </div>

                    <button onClick={onHome} className="mt-12 mx-auto flex items-center gap-2 text-white/30 hover:text-white font-bold transition-all">
                        <ChevronLeft /> خروج
                    </button>
                </div>
            )}

            {(phase === 'PLAYING' || phase === 'ELIMINATION') && (
                <div className="w-full flex-1 overflow-y-auto px-8 pb-20 custom-scrollbar animate-in fade-in duration-1000">
                    <motion.div
                        layout
                        className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4 content-start"
                    >
                        <AnimatePresence mode="popLayout">
                            {sortedFruits.map((fruit, idx) => {
                                const team = participants.filter(p => p.fruitId === fruit.id);
                                const count = team.length;

                                return (
                                    <motion.div
                                        key={fruit.id}
                                        layout
                                        initial={{ scale: 0.8, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        exit={{ scale: 0.5, opacity: 0 }}
                                        transition={{ type: "spring", stiffness: 300, damping: 25, layout: { duration: 0.4 } }}
                                        onClick={() => !isOBS && handleFruitClick(fruit)}
                                        className={`
                                            relative aspect-square rounded-[2rem] p-2 flex flex-col items-center justify-between
                                            transition-colors duration-300
                                            ${count > 0 ? 'bg-white/10 border-white/20' : 'bg-black/20 border-white/5'}
                                            border-2 group overflow-hidden
                                            ${phase === 'ELIMINATION' && !isOBS ? 'cursor-pointer hover:bg-red-500/20 hover:border-red-500 hover:scale-105' : ''}
                                        `}
                                        style={{
                                            borderColor: count > 0 ? fruit.color : undefined,
                                            boxShadow: count > 0 ? `0 10px 30px -5px ${fruit.color}40` : 'none',
                                        }}
                                    >
                                        {count > 0 && phase === 'ELIMINATION' && !isOBS && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setSelectedFruitVoters(fruit); }}
                                                className="absolute top-2 left-2 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center shadow-lg hover:scale-110 active:scale-90 transition-all z-30 opacity-0 group-hover:opacity-100"
                                                title="عرض المصوتين"
                                            ><Users size={14} /></button>
                                        )}
                                        {count > 0 && (
                                            <div className="absolute top-2 left-2 w-8 h-8 bg-white text-black font-black rounded-full flex items-center justify-center text-sm shadow-lg z-20 group-hover:opacity-0 transition-opacity">#{idx + 1}</div>
                                        )}
                                        {count > 0 && (
                                            <motion.div key={count} initial={{ scale: 1.5 }} animate={{ scale: 1 }} className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm text-white px-3 py-1 rounded-full font-bold text-xs flex items-center gap-1 z-20">
                                                <Users size={10} /> {count}
                                            </motion.div>
                                        )}
                                        <div className="flex-1 flex items-center justify-center relative z-10 w-full"><span className="text-6xl drop-shadow-2xl transition-transform group-hover:scale-125">{fruit.image}</span></div>
                                        <div className="w-full text-center py-1 relative z-10"><span className="text-sm font-black text-white/80 uppercase tracking-tight">{fruit.name}</span></div>
                                        {!isOBS && phase === 'ELIMINATION' && (
                                            <div className="absolute inset-0 bg-red-600/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-50 rounded-[2rem] pointer-events-none">
                                                <div className="flex flex-col items-center text-white"><Ban size={40} className="mb-2" /><span className="font-black text-xl uppercase">إقـــصـــاء</span></div>
                                            </div>
                                        )}

                                        {/* Avatars Preview */}
                                        {count > 0 && (
                                            <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 flex -space-x-4 opacity-0 group-hover:opacity-100 group-hover:bottom-2 transition-all duration-300 z-30">
                                                {team.slice(0, 3).map(p => (
                                                    <div key={p.username} className="w-12 h-12">
                                                        <ProAvatar url={p.avatar} username={p.username} size="w-12 h-12" />
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>
                    </motion.div>
                </div>
            )}

            {phase === 'WINNER' && winningTeam && (
                <div className="absolute inset-0 z-50 bg-black/95 backdrop-blur-3xl flex flex-col items-center justify-center animate-in fade-in duration-1000">
                    <div className="absolute inset-0 overflow-hidden">
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-yellow-500/20 rounded-full blur-[120px] animate-pulse"></div>
                    </div>

                    <Crown size={120} className="text-yellow-400 mb-8 animate-bounce drop-shadow-[0_0_50px_rgba(250,204,21,0.8)]" />

                    <h1 className="text-9xl font-black text-white italic tracking-tighter mb-4 drop-shadow-2xl">الــفــريــق الــنــاجــي</h1>

                    <div className="scale-125 my-10 relative">
                        <div className="w-48 h-48 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-[3rem] rotate-12 flex items-center justify-center shadow-[0_0_100px_rgba(250,204,21,0.6)] animate-wiggle">
                            <span className="text-9xl drop-shadow-2xl">{winningTeam.fruit.image}</span>
                        </div>
                    </div>

                    <h2 className="text-6xl font-black text-yellow-500 mb-10 drop-shadow-lg uppercase tracking-tighter italic">TEAM {winningTeam.fruit.name}</h2>

                    <div className="flex flex-wrap justify-center gap-4 max-w-4xl px-8 overflow-y-auto max-h-[30vh] custom-scrollbar">
                        {winningTeam.players.map((p, i) => (
                            <div key={p.username} className="flex flex-col items-center animate-in zoom-in duration-500" style={{ animationDelay: `${i * 50}ms` }}>
                                <ProAvatar
                                    url={p.avatar}
                                    username={p.username}
                                    size="w-28 h-28"
                                    className="border-4 border-yellow-400 shadow-xl"
                                />
                                <span className="text-xs font-bold text-white/90 truncate w-24 text-center mt-2">{p.username}</span>
                            </div>
                        ))}
                    </div>

                    <div className="mt-16 flex gap-6 z-[100]">
                        {!isOBS && (
                            <>
                                <button onClick={() => onHome()} className="px-12 py-4 bg-white/10 hover:bg-white/20 text-white font-bold rounded-full transition-all border border-white/5 active:scale-95 cursor-pointer">الرئيسية</button>
                                <button onClick={() => startGame()} className="px-12 py-4 bg-yellow-500 hover:bg-yellow-400 text-black font-black rounded-full shadow-[0_0_40px_rgba(250,204,21,0.4)] transition-all hover:scale-105 active:scale-95 cursor-pointer">جولة جديدة</button>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Voters Modal */}
            {selectedFruitVoters && (
                <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-xl flex items-center justify-center p-6 animate-in fade-in duration-300" onClick={() => setSelectedFruitVoters(null)}>
                    <div className="glass-card max-w-2xl w-full max-h-[70vh] rounded-[3rem] p-10 border border-white/20 relative overflow-hidden flex flex-col items-center" onClick={e => e.stopPropagation()}>
                        <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none">
                            <Users size={120} />
                        </div>

                        <div className="text-6xl mb-4 drop-shadow-[0_0_20px_rgba(255,255,255,0.3)]">{selectedFruitVoters.image}</div>
                        <h3 className="text-4xl font-black text-white mb-2 uppercase tracking-tight">فـريـق {selectedFruitVoters.name}</h3>
                        <p className="text-gray-400 font-bold mb-8 uppercase tracking-[0.3em] text-xs">TEAM MEMBERS ({participants.filter(p => p.fruitId === selectedFruitVoters.id).length})</p>

                        <div className="w-full flex-1 overflow-y-auto grid grid-cols-4 gap-4 custom-scrollbar p-2">
                            {participants.filter(p => p.fruitId === selectedFruitVoters.id).map(p => (
                                <div key={p.username} className="flex flex-col items-center gap-2 group">
                                    <ProAvatar
                                        url={p.avatar}
                                        username={p.username}
                                        size="w-20 h-20"
                                        className="group-hover:border-blue-500 transition-all shadow-lg"
                                    />
                                    <span className="text-[10px] font-bold text-gray-400 truncate w-full text-center">{p.username}</span>
                                </div>
                            ))}
                        </div>

                        <button
                            onClick={() => setSelectedFruitVoters(null)}
                            className="mt-8 px-10 py-3 bg-white/10 hover:bg-white/20 text-white font-bold rounded-full border border-white/10 transition-all uppercase tracking-widest text-xs"
                        >
                            إغـــلاق
                        </button>
                    </div>
                </div>
            )}

            {lastEliminatedFruit && phase === 'ELIMINATION' && (
                <div key={`${lastEliminatedFruit.fruit.id}-${round}`} className="absolute inset-0 pointer-events-auto z-[200] flex items-center justify-center overflow-hidden cursor-not-allowed">
                    <div className="absolute inset-0 bg-red-600/10 backdrop-blur-[2px] animate-pulse duration-100"></div>
                    <div className="relative animate-in zoom-in fade-in duration-300 pointer-events-none">
                        <div className="flex flex-col items-center scale-150">
                            <div className="text-[12rem] animate-ping opacity-50 absolute text-red-600 top-[-50px]">❌</div>
                            <div className="bg-red-600 text-white font-black text-6xl px-16 py-8 rounded-[4rem] border-[12px] border-white shadow-[0_30px_100px_rgba(220,38,38,0.8)] skew-x-[-15deg] rotate-[-8deg] flex flex-col items-center gap-2">
                                <span className="text-3xl opacity-80">تـم اسـتـهـداف</span>
                                <span className="drop-shadow-lg uppercase tracking-tighter">فـريـق {lastEliminatedFruit.fruit.name}!</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
