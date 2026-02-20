
import React, { useState, useEffect, useRef } from 'react';
import { chatService } from '../services/chatService';
import { leaderboardService } from '../services/supabase';
import { ChatUser } from '../types';
import { Smile, Play, Settings, Users, Trophy, LogOut, User, Crown, ChevronRight, Sparkles, Star, Award, Zap, Eye, RotateCcw, Brain, Timer } from 'lucide-react';

interface EmojiCodeProps {
    onHome: () => void;
    isOBS?: boolean;
}

interface GameConfig {
    joinKeyword: string;
    maxPlayers: number;
    roundDuration: number;
    pointsPerAnswer: number;
    totalQuestions: number;
    category: string;
}

interface EmojiPuzzle {
    id: number;
    emojis: string;
    answers: string[];
    category: string;
    hint?: string;
    difficulty: 'easy' | 'medium' | 'hard';
}

interface PlayerScore {
    user: ChatUser;
    score: number;
    correctAnswers: number;
    streak: number;
}

type GamePhase = 'SETUP' | 'LOBBY' | 'LOADING' | 'QUESTION' | 'ANSWERED' | 'BETWEEN' | 'FINALE';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";

const normalizeArabic = (text: string) => {
    if (!text) return "";
    return text.trim().toLowerCase()
        .replace(/[أإآ]/g, 'ا')
        .replace(/ة/g, 'ه')
        .replace(/ى/g, 'ي')
        .replace(/[ؤئ]/g, 'ء')
        .replace(/[\u064B-\u0652]/g, '') // Remove Harakat
        .replace(/\s+/g, ' ') // Normalize spaces
        .trim();
};

const EMOJI_PUZZLES: EmojiPuzzle[] = [
    // Fallback puzzles only
    { id: 1, emojis: '🦁👑', answers: ['الأسد الملك', 'lion king', 'the lion king', 'اسد الملك'], category: 'أفلام', difficulty: 'easy' },
    { id: 2, emojis: '❄️👸', answers: ['فروزن', 'frozen', 'ملكة الثلج'], category: 'أفلام', difficulty: 'easy' },

    { id: 2, emojis: '❄️👸', answers: ['فروزن', 'frozen', 'ملكة الثلج'], category: 'أفلام', difficulty: 'easy' },
    { id: 3, emojis: '🕷️🦸‍♂️', answers: ['سبايدرمان', 'spider man', 'spiderman', 'الرجل العنكبوت'], category: 'أفلام', difficulty: 'easy' },
    { id: 4, emojis: '🦇🌃🦸', answers: ['باتمان', 'batman', 'الرجل الوطواط'], category: 'أفلام', difficulty: 'easy' },
    { id: 5, emojis: '⭐🔫🌌', answers: ['ستار وورز', 'star wars', 'حرب النجوم'], category: 'أفلام', difficulty: 'medium' },
    { id: 6, emojis: '🧙‍♂️💍🌋', answers: ['سيد الخواتم', 'lord of the rings'], category: 'أفلام', difficulty: 'medium' },
    { id: 7, emojis: '🏠🎈🎈🎈', answers: ['أب', 'up'], category: 'أفلام', difficulty: 'hard' },
    { id: 8, emojis: '🤖❤️🌱', answers: ['وال إي', 'wall-e', 'wall e'], category: 'أفلام', difficulty: 'medium' },
    { id: 9, emojis: '🧊💔🚢', answers: ['تايتنك', 'titanic'], category: 'أفلام', difficulty: 'easy' },
    { id: 10, emojis: '🐀👨‍🍳🇫🇷', answers: ['راتاتوي', 'ratatouille'], category: 'أفلام', difficulty: 'medium' },

    // Food brands
    { id: 11, emojis: '🍔👑', answers: ['برجر كنج', 'burger king', 'برقر كنق'], category: 'ماركات', difficulty: 'easy' },
    { id: 12, emojis: '☕🧜‍♀️💚', answers: ['ستاربكس', 'starbucks'], category: 'ماركات', difficulty: 'easy' },
    { id: 13, emojis: '🍎📱', answers: ['ابل', 'apple', 'آبل'], category: 'ماركات', difficulty: 'easy' },
    { id: 14, emojis: '✔️', answers: ['نايك', 'nike', 'نايكي'], category: 'ماركات', difficulty: 'easy' },
    { id: 15, emojis: '🎵🔊👂', answers: ['سبوتيفاي', 'spotify'], category: 'ماركات', difficulty: 'medium' },
    { id: 16, emojis: '📺🍿🔴', answers: ['نتفلكس', 'netflix'], category: 'ماركات', difficulty: 'easy' },
    { id: 17, emojis: '🔍🌐', answers: ['قوقل', 'google', 'جوجل'], category: 'ماركات', difficulty: 'easy' },
    { id: 18, emojis: '🐦💙', answers: ['تويتر', 'twitter'], category: 'ماركات', difficulty: 'easy' },
    { id: 19, emojis: '📸🟪✨', answers: ['انستقرام', 'instagram', 'انستا', 'insta'], category: 'ماركات', difficulty: 'easy' },
    { id: 20, emojis: '🎮🕹️🟢', answers: ['اكس بوكس', 'xbox', 'اكسبوكس'], category: 'ماركات', difficulty: 'medium' },

    // Food
    { id: 21, emojis: '🍕🇮🇹🧀', answers: ['بيتزا', 'pizza'], category: 'أكلات', difficulty: 'easy' },
    { id: 22, emojis: '🍣🇯🇵🐟', answers: ['سوشي', 'sushi'], category: 'أكلات', difficulty: 'easy' },
    { id: 23, emojis: '🥙🧆🇱🇧', answers: ['فلافل', 'falafel', 'شاورما', 'shawarma'], category: 'أكلات', difficulty: 'easy' },
    { id: 24, emojis: '🍝🍅🇮🇹', answers: ['باستا', 'pasta', 'مكرونة', 'معكرونة'], category: 'أكلات', difficulty: 'easy' },
    { id: 25, emojis: '🌮🇲🇽🌶️', answers: ['تاكو', 'taco', 'تاكوز'], category: 'أكلات', difficulty: 'easy' },

    // Football players
    { id: 26, emojis: '🇵🇹⚽7️⃣👑', answers: ['رونالدو', 'ronaldo', 'كريستيانو', 'cr7'], category: 'لاعبين', difficulty: 'easy' },
    { id: 27, emojis: '🇦🇷⚽🐐🏆', answers: ['ميسي', 'messi'], category: 'لاعبين', difficulty: 'easy' },
    { id: 28, emojis: '🇫🇷⚽🐢💨', answers: ['مبابي', 'mbappe', 'امبابي'], category: 'لاعبين', difficulty: 'easy' },
    { id: 29, emojis: '🇧🇷⚽🪄✨', answers: ['نيمار', 'neymar'], category: 'لاعبين', difficulty: 'easy' },
    { id: 30, emojis: '🇳🇴⚽🤖💪', answers: ['هالاند', 'haaland'], category: 'لاعبين', difficulty: 'easy' },

    // Countries
    { id: 31, emojis: '🏛️🍕🎨', answers: ['ايطاليا', 'italy', 'إيطاليا'], category: 'دول', difficulty: 'easy' },
    { id: 32, emojis: '🗼🥐🎭', answers: ['فرنسا', 'france'], category: 'دول', difficulty: 'easy' },
    { id: 33, emojis: '🎌🍣🗻', answers: ['اليابان', 'japan'], category: 'دول', difficulty: 'easy' },
    { id: 34, emojis: '🦘🏖️🕷️', answers: ['استراليا', 'australia', 'أستراليا'], category: 'دول', difficulty: 'medium' },
    { id: 35, emojis: '🐂🏟️🎸', answers: ['اسبانيا', 'spain', 'إسبانيا'], category: 'دول', difficulty: 'medium' },

    // General
    { id: 36, emojis: '⚽🏟️📺', answers: ['كرة قدم', 'football', 'soccer', 'كورة'], category: 'عام', difficulty: 'easy' },
    { id: 37, emojis: '💀🎃🕷️', answers: ['هالوين', 'halloween'], category: 'عام', difficulty: 'easy' },
    { id: 38, emojis: '🎅🎄🎁', answers: ['كريسماس', 'christmas', 'عيد الميلاد'], category: 'عام', difficulty: 'easy' },
    { id: 39, emojis: '🌙✨🕌', answers: ['رمضان', 'ramadan'], category: 'عام', difficulty: 'easy' },
    { id: 40, emojis: '☕📖🤓', answers: ['مكتبة', 'library', 'دراسة', 'مذاكرة', 'study'], category: 'عام', difficulty: 'medium' },
];

const CATEGORIES = ['الكل', 'أفلام', 'ماركات', 'أكلات', 'لاعبين', 'دول', 'عام'];

export const EmojiCode: React.FC<EmojiCodeProps> = ({ onHome, isOBS }) => {
    const [config, setConfig] = useState<GameConfig>({
        joinKeyword: 'ايموجي',
        maxPlayers: 200,
        roundDuration: 20,
        pointsPerAnswer: 10,
        totalQuestions: 10,
        category: 'الكل',
    });

    const [phase, setPhase] = useState<GamePhase>('SETUP');
    const [participants, setParticipants] = useState<ChatUser[]>([]);
    const [playerScores, setPlayerScores] = useState<Record<string, PlayerScore>>({});
    const [currentPuzzle, setCurrentPuzzle] = useState<EmojiPuzzle | null>(null);
    const [usedTopics, setUsedTopics] = useState<string[]>([]);
    const [questionNumber, setQuestionNumber] = useState(0);
    const [timeLeft, setTimeLeft] = useState(0);
    const [winner, setWinner] = useState<{ user: ChatUser; time: number } | null>(null);
    const [showEmojis, setShowEmojis] = useState(false);
    const [emojiScale, setEmojiScale] = useState(0);
    const [answeredThisRound, setAnsweredThisRound] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const phaseRef = useRef(phase);
    const configRef = useRef(config);
    const participantsRef = useRef(participants);
    const currentPuzzleRef = useRef(currentPuzzle);
    const playerScoresRef = useRef(playerScores);
    const answeredRef = useRef(answeredThisRound);
    const questionStartRef = useRef(0);

    useEffect(() => { phaseRef.current = phase; }, [phase]);
    useEffect(() => { configRef.current = config; }, [config]);
    useEffect(() => { participantsRef.current = participants; }, [participants]);
    useEffect(() => { currentPuzzleRef.current = currentPuzzle; }, [currentPuzzle]);
    useEffect(() => { playerScoresRef.current = playerScores; }, [playerScores]);
    useEffect(() => { answeredRef.current = answeredThisRound; }, [answeredThisRound]);

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

            if (phaseRef.current === 'QUESTION' && !answeredRef.current && currentPuzzleRef.current) {
                const puzzle = currentPuzzleRef.current;
                const normalizedContent = normalizeArabic(content);
                const isCorrect = puzzle.answers.some(a => {
                    const normalizedAnswer = normalizeArabic(a);
                    const isExact = normalizedContent === normalizedAnswer;
                    const isUserInside = normalizedAnswer.includes(normalizedContent) && normalizedContent.length >= 3;
                    const isAnswerInside = normalizedContent.includes(normalizedAnswer) && normalizedAnswer.length >= 2;
                    return isExact || isUserInside || isAnswerInside;
                });

                if (isCorrect) {
                    const timeTaken = (Date.now() - questionStartRef.current) / 1000;
                    const timeBonus = Math.max(1, Math.floor((configRef.current.roundDuration - timeTaken) / 2));
                    const points = configRef.current.pointsPerAnswer + timeBonus;

                    setAnsweredThisRound(true);
                    setWinner({ user: msg.user, time: timeTaken });

                    // Record win in leaderboard
                    leaderboardService.recordWin(msg.user.username, msg.user.avatar || '', points);

                    // Update score
                    setPlayerScores(prev => {
                        const key = msg.user.username.toLowerCase();
                        const existing = prev[key] || { user: msg.user, score: 0, correctAnswers: 0, streak: 0 };
                        return {
                            ...prev,
                            [key]: {
                                ...existing,
                                user: msg.user,
                                score: existing.score + points,
                                correctAnswers: existing.correctAnswers + 1,
                                streak: existing.streak + 1,
                            }
                        };
                    });

                    // Reset streaks for others
                    setPlayerScores(prev => {
                        const updated = { ...prev };
                        Object.keys(updated).forEach(k => {
                            if (k !== msg.user.username.toLowerCase()) {
                                updated[k] = { ...updated[k], streak: 0 };
                            }
                        });
                        return updated;
                    });

                    setPhase('ANSWERED');
                }
            }
        });
        return () => unsubscribe();
    }, []);

    // Timer
    useEffect(() => {
        if (phase === 'QUESTION' && timeLeft > 0) {
            const timer = window.setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 1) { timeUp(); return 0; }
                    return prev - 1;
                });
            }, 1000);
            return () => clearInterval(timer);
        }
    }, [phase, timeLeft]);

    // Emoji entrance animation
    useEffect(() => {
        if (phase === 'QUESTION') {
            setShowEmojis(false);
            setEmojiScale(0);
            setTimeout(() => { setShowEmojis(true); setEmojiScale(1); }, 300);
        }
    }, [phase, currentPuzzle]);

    const generatePuzzleWithAI = async (excludeTopics: string[], category: string): Promise<EmojiPuzzle | null> => {
        try {
            const prompt = `Generate a unique emoji puzzle for a game. 
            Topic: ${category === 'الكل' ? 'Popular Movie, Brand, Food, or Famous Person' : category}.
            Output strict JSON with fields: 
            - "emojis" (string containing ONLY 2-4 emoji characters, NO LETTERS, NO PUNCTUATION, NO TEXT)
            - "answers" (array of strings, include English and Arabic names/spellings)
            - "category" (string based on Topic)
            - "difficulty" ("easy"|"medium"|"hard")
            - "topic_name" (main answer for uniqueness check)
            
            DO NOT USE English letters in the "emojis" field. DO NOT repeat these topics: ${excludeTopics.slice(-30).join(', ')}.
            `;

            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: { responseMimeType: "application/json" }
                })
            });

            if (!response.ok) throw new Error('AI Error');
            const data = await response.json();
            const jsonText = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!jsonText) throw new Error('No Data');

            const puzzle = JSON.parse(jsonText);
            return {
                id: Date.now(),
                ...puzzle
            };
        } catch (e) {
            console.error(e);
            return null;
        }
    };

    const startGame = () => {
        if (participants.length < 1) return;
        const initialScores: Record<string, PlayerScore> = {};
        participants.forEach(p => {
            initialScores[p.username.toLowerCase()] = { user: p, score: 0, correctAnswers: 0, streak: 0 };
        });
        setPlayerScores(initialScores);
        setUsedTopics([]);
        setQuestionNumber(0);
        nextQuestion();
    };

    const nextQuestion = async () => {
        if (questionNumber >= config.totalQuestions) {
            setPhase('FINALE');
            return;
        }

        setPhase('LOADING');
        setIsLoading(true);

        // Try AI generation
        let puzzle = await generatePuzzleWithAI(usedTopics, config.category);

        // Fallback or retry logic could go here, but for simplicity we rely on AI or fallback if null
        if (!puzzle) {
            // Fallback to random hardcoded if AI fails
            const available = EMOJI_PUZZLES.filter(p =>
                !usedTopics.includes(p.answers[0]) &&
                (config.category === 'الكل' || p.category === config.category)
            );
            const pool = available.length > 0 ? available : EMOJI_PUZZLES;
            puzzle = pool[Math.floor(Math.random() * pool.length)];
        }

        if (puzzle) {
            setCurrentPuzzle(puzzle);
            setUsedTopics(prev => [...prev, puzzle!.answers[0]]); // Track main answer
            setQuestionNumber(prev => prev + 1);
            setTimeLeft(config.roundDuration);
            setWinner(null);
            setAnsweredThisRound(false);

            // Short delay to show loading state if instant
            setTimeout(() => {
                setPhase('QUESTION');
                setIsLoading(false);
                questionStartRef.current = Date.now();
            }, 500);
        } else {
            // If everything failed
            setPhase('FINALE');
        }
    };

    const timeUp = () => {
        // Reset all streaks
        setPlayerScores(prev => {
            const updated = { ...prev };
            Object.keys(updated).forEach(k => { updated[k] = { ...updated[k], streak: 0 }; });
            return updated;
        });
        setPhase('ANSWERED');
    };

    const continueToNext = () => {
        if (questionNumber >= config.totalQuestions) {
            setPhase('FINALE');
        } else {
            setPhase('BETWEEN');
            setTimeout(() => nextQuestion(), 1500);
        }
    };

    const resetGame = () => {
        setPhase('SETUP');
        setParticipants([]);
        setPlayerScores({});
        setCurrentPuzzle(null);
        setUsedTopics([]);
        setQuestionNumber(0);
        setTimeLeft(0);
        setWinner(null);
        setAnsweredThisRound(false);
    };

    const getSortedPlayers = (): PlayerScore[] =>
        (Object.values(playerScores) as PlayerScore[]).sort((a, b) => b.score - a.score);

    const getDifficultyColor = (d: string) => {
        if (d === 'easy') return 'text-green-400 bg-green-500/10 border-green-500/20';
        if (d === 'medium') return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
        return 'text-red-400 bg-red-500/10 border-red-500/20';
    };

    return (
        <div className={`w-full h-full flex flex-col items-center bg-transparent text-right font-display select-none ${isOBS ? 'overflow-hidden' : ''}`} dir="rtl">
            <style>{`
            @keyframes emoji-bounce-in {
               0% { transform: scale(0) rotate(-30deg); opacity: 0; }
               50% { transform: scale(1.3) rotate(10deg); }
               70% { transform: scale(0.9) rotate(-5deg); }
               100% { transform: scale(1) rotate(0deg); opacity: 1; }
            }
            @keyframes sparkle {
               0%, 100% { opacity: 0; transform: scale(0) rotate(0deg); }
               50% { opacity: 1; transform: scale(1) rotate(180deg); }
            }
            @keyframes correct-flash {
               0% { background-color: transparent; }
               50% { background-color: rgba(34, 197, 94, 0.2); }
               100% { background-color: transparent; }
            }
            @keyframes streak-fire {
               0%, 100% { text-shadow: 0 0 10px rgba(251,191,36,0.5); }
               50% { text-shadow: 0 0 30px rgba(251,191,36,1), 0 0 60px rgba(249,115,22,0.8); }
            }
            .emoji-enter { animation: emoji-bounce-in 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
            .sparkle-anim { animation: sparkle 2s ease-in-out infinite; }
            .correct-flash { animation: correct-flash 0.5s ease-out 3; }
            .streak-fire { animation: streak-fire 1s ease-in-out infinite; }
         `}</style>

            {/* --- SETUP --- */}
            {phase === 'SETUP' && (
                <div className="w-full max-w-5xl animate-in fade-in zoom-in duration-700 py-6 px-4 pb-20 overflow-y-auto custom-scrollbar h-full">
                    <div className="flex items-center justify-between mb-8">
                        <button onClick={onHome} className="p-4 bg-red-600/10 rounded-3xl hover:bg-red-600/20 text-red-500 transition-all border border-red-500/20">
                            <LogOut size={24} />
                        </button>
                        <div className="text-center">
                            <h1 className="text-6xl font-black text-white italic tracking-tighter uppercase">فك الشفرة</h1>
                            <p className="text-purple-600 font-black tracking-[0.4em] text-[10px] uppercase">EMOJI CODE • iABS</p>
                        </div>
                        <div className="w-14"></div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="glass-card p-6 rounded-[2.5rem] border border-white/5 shadow-2xl relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500"></div>
                            <h3 className="text-lg font-black text-white flex items-center gap-3 mb-6"><Settings size={18} className="text-purple-500" /> إعدادات اللعبة</h3>
                            <div className="space-y-5">
                                <div className="bg-black/30 p-4 rounded-3xl border border-white/5">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">التصنيف</label>
                                    <div className="flex flex-wrap gap-2">
                                        {CATEGORIES.map(cat => (
                                            <button key={cat} onClick={() => setConfig({ ...config, category: cat })} className={`px-4 py-2 rounded-xl font-black text-xs transition-all ${config.category === cat ? 'bg-purple-600 text-white shadow-lg' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}>
                                                {cat}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-black/30 p-4 rounded-3xl border border-white/5 text-center space-y-2">
                                        <label className="text-[9px] font-bold text-gray-500 uppercase">وقت الإجابة</label>
                                        <div className="flex items-center justify-center gap-2">
                                            <button onClick={() => setConfig({ ...config, roundDuration: Math.max(5, config.roundDuration - 5) })} className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 text-white text-sm">-</button>
                                            <span className="text-xl font-black text-white font-mono">{config.roundDuration}s</span>
                                            <button onClick={() => setConfig({ ...config, roundDuration: config.roundDuration + 5 })} className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 text-white text-sm">+</button>
                                        </div>
                                    </div>
                                    <div className="bg-black/30 p-4 rounded-3xl border border-white/5 text-center space-y-2">
                                        <label className="text-[9px] font-bold text-gray-500 uppercase">عدد الأسئلة</label>
                                        <div className="flex items-center justify-center gap-2">
                                            <button onClick={() => setConfig({ ...config, totalQuestions: Math.max(3, config.totalQuestions - 1) })} className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 text-white text-sm">-</button>
                                            <span className="text-xl font-black text-white font-mono">{config.totalQuestions}</span>
                                            <button onClick={() => setConfig({ ...config, totalQuestions: config.totalQuestions + 1 })} className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 text-white text-sm">+</button>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-black/30 p-4 rounded-3xl border border-white/5">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">كلمة الانضمام</label>
                                    <input value={config.joinKeyword} onChange={e => setConfig({ ...config, joinKeyword: e.target.value })} className="w-full bg-black border-2 border-white/10 focus:border-purple-600 rounded-xl p-3 text-white font-bold text-sm text-center outline-none transition-all" />
                                </div>
                            </div>
                        </div>

                        <div className="glass-card p-6 rounded-[2.5rem] border border-white/5 shadow-2xl flex flex-col items-center justify-center relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-transparent to-pink-900/20"></div>
                            <div className="relative z-10 text-center">
                                <div className="text-[100px] mb-4 animate-bounce">🤔</div>
                                <div className="flex gap-2 justify-center mb-6">
                                    {['🦁', '👑', '=', '?'].map((e, i) => (
                                        <span key={i} className="text-5xl" style={{ animationDelay: `${i * 0.2}s` }}>{e}</span>
                                    ))}
                                </div>
                                <h2 className="text-3xl font-black text-white mb-3">كيف تلعب؟</h2>
                                <div className="space-y-3 text-gray-400 text-sm font-bold max-w-sm">
                                    <p className="flex items-center gap-3"><span className="w-8 h-8 bg-purple-600 text-white rounded-xl flex items-center justify-center font-black text-xs">1</span> إيموجيات تظهر على الشاشة</p>
                                    <p className="flex items-center gap-3"><span className="w-8 h-8 bg-purple-600 text-white rounded-xl flex items-center justify-center font-black text-xs">2</span> فك الشفرة واكتب الإجابة!</p>
                                    <p className="flex items-center gap-3"><span className="w-8 h-8 bg-pink-600 text-white rounded-xl flex items-center justify-center font-black text-xs">3</span> أسرع إجابة = نقاط أكثر!</p>
                                </div>
                            </div>
                            <button onClick={() => setPhase('LOBBY')} className="mt-8 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-black py-5 px-16 rounded-3xl text-3xl hover:scale-[1.05] active:scale-95 transition-all flex items-center gap-4 shadow-[0_15px_40px_rgba(147,51,234,0.4)] italic relative z-10 border-t border-white/20">
                                فك الشفرة <Smile size={32} />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- LOBBY --- */}
            {phase === 'LOBBY' && (
                <div className="w-full h-full flex flex-col items-center justify-center p-10 animate-in fade-in duration-1000 relative overflow-hidden">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-purple-900/20 via-transparent to-transparent"></div>
                    <div className="text-center mb-10 z-10">
                        <div className="text-[80px] mb-4 animate-bounce">😎</div>
                        <h1 className="text-7xl font-black text-white italic tracking-tighter mb-6 uppercase">في انتظار المتنافسين</h1>
                        <div className="flex items-center justify-center gap-4 text-2xl text-gray-400 font-bold bg-black/40 backdrop-blur-xl px-10 py-6 rounded-[3rem] border-2 border-white/5">
                            أرسل <span className="bg-purple-600 text-white px-6 py-2 rounded-2xl font-black italic">{config.joinKeyword}</span> للمشاركة
                        </div>
                    </div>
                    <div className="flex-1 w-full max-w-4xl overflow-y-auto custom-scrollbar px-6 mb-6">
                        <div className="flex flex-wrap justify-center gap-3 max-w-3xl mx-auto">
                            {participants.map(p => (
                                <div key={p.id} className="animate-in zoom-in duration-300 bg-black/40 border border-white/10 rounded-2xl px-4 py-2 flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg overflow-hidden border border-white/10">
                                        {p.avatar ? <img src={p.avatar} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-zinc-900 flex items-center justify-center"><User size={14} /></div>}
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
                            <button onClick={startGame} disabled={participants.length < 1} className="px-12 py-5 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-black text-2xl rounded-2xl hover:scale-105 transition-all disabled:opacity-20 italic flex items-center gap-3">
                                ابدأ! <Brain size={24} />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- QUESTION --- */}
            {phase === 'QUESTION' && currentPuzzle && (
                <div className="w-full h-full flex flex-col items-center justify-center p-8 animate-in fade-in duration-300 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-950/40 via-black to-pink-950/40"></div>

                    {/* Decorative sparkles */}
                    {Array.from({ length: 15 }).map((_, i) => (
                        <div key={i} className="absolute sparkle-anim" style={{
                            left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`,
                            animationDelay: `${Math.random() * 2}s`, fontSize: '20px',
                        }}>✨</div>
                    ))}

                    <div className="relative z-10 flex flex-col items-center w-full max-w-4xl">
                        {/* Progress */}
                        <div className="flex items-center gap-4 mb-6">
                            <span className="text-purple-500 font-black text-sm uppercase tracking-[0.5em]">السؤال {questionNumber} / {config.totalQuestions}</span>
                            <div className={`px-3 py-1 rounded-lg border text-xs font-bold ${getDifficultyColor(currentPuzzle.difficulty)}`}>
                                {currentPuzzle.difficulty === 'easy' ? 'سهل' : currentPuzzle.difficulty === 'medium' ? 'متوسط' : 'صعب'}
                            </div>
                            <div className="bg-purple-500/10 border border-purple-500/20 px-3 py-1 rounded-lg text-xs font-bold text-purple-400">
                                {currentPuzzle.category}
                            </div>
                        </div>

                        {/* Timer */}
                        <div className={`text-[80px] font-black font-mono mb-6 ${timeLeft <= 5 ? 'text-red-500 animate-pulse' : 'text-white'}`}>
                            {timeLeft}
                        </div>

                        {/* Emoji Display */}
                        <div className="bg-black/60 backdrop-blur-2xl border-4 border-purple-500/30 rounded-[4rem] p-12 mb-8 shadow-[0_0_80px_rgba(147,51,234,0.3)] relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent"></div>
                            <div className="relative z-10 flex items-center gap-6" style={{ transform: `scale(${emojiScale})`, transition: 'transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)' }}>
                                {Array.from(currentPuzzle.emojis)
                                    .filter((c: string) => {
                                        const code = c.charCodeAt(0);
                                        // Filter out English letters and numbers that might creep in from AI
                                        return !(/[a-zA-Z0-9]/.test(c)) && c.trim();
                                    })
                                    .map((emoji, i) => (
                                        <span key={i} className={`text-[80px] ${showEmojis ? 'emoji-enter' : 'opacity-0'}`} style={{ animationDelay: `${i * 0.15}s` }}>
                                            {emoji}
                                        </span>
                                    ))}
                            </div>
                            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs text-purple-400 font-bold uppercase tracking-widest">
                                = ؟
                            </div>
                        </div>

                        {/* Instruction */}
                        <p className="text-purple-400 font-bold text-xl mb-8">اكتب الإجابة في الشات! 💬</p>

                        {/* Timer bar */}
                        <div className="w-full max-w-2xl h-3 bg-black/60 rounded-full overflow-hidden border border-white/10">
                            <div className={`h-full rounded-full transition-all duration-1000 ${timeLeft <= 5 ? 'bg-red-500' : 'bg-gradient-to-r from-purple-500 to-pink-500'}`} style={{ width: `${(timeLeft / config.roundDuration) * 100}%` }} />
                        </div>

                        {/* Mini leaderboard */}
                        <div className="flex gap-3 mt-6">
                            {getSortedPlayers().slice(0, 5).map((p, i) => (
                                <div key={p.user.username} className="bg-black/40 border border-white/10 rounded-2xl px-3 py-2 flex items-center gap-2">
                                    <span className={`font-black text-xs ${i === 0 ? 'text-yellow-400' : 'text-gray-500'}`}>#{i + 1}</span>
                                    <span className="text-xs font-bold text-gray-300">{p.user.username}</span>
                                    <span className="text-xs font-black text-purple-400 font-mono">{p.score}</span>
                                    {p.streak >= 2 && <span className="text-xs streak-fire">🔥{p.streak}</span>}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* --- ANSWERED --- */}
            {phase === 'ANSWERED' && currentPuzzle && (
                <div className={`w-full h-full flex flex-col items-center justify-center p-8 animate-in zoom-in duration-500 relative overflow-hidden ${winner ? 'correct-flash' : ''}`}>
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-950/40 via-black to-pink-950/40"></div>
                    <div className="relative z-10 text-center w-full max-w-3xl">
                        {/* Emoji + answer */}
                        <div className="text-[80px] mb-4">{currentPuzzle.emojis}</div>
                        <div className="text-2xl font-bold text-gray-500 mb-2">=</div>
                        <div className="text-5xl font-black text-white italic mb-8">{currentPuzzle.answers[0]}</div>

                        {winner ? (
                            <div className="bg-green-500/10 border-2 border-green-500/30 rounded-[3rem] p-8 mb-6 animate-in slide-in-from-bottom">
                                <div className="flex items-center justify-center gap-4 mb-4">
                                    <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-green-500">
                                        {winner.user.avatar ? <img src={winner.user.avatar} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-zinc-900 flex items-center justify-center"><User size={24} /></div>}
                                    </div>
                                    <div>
                                        <div className="text-3xl font-black text-green-400">{winner.user.username}</div>
                                        <div className="text-green-600 font-bold text-sm">في {winner.time.toFixed(1)} ثانية ⚡</div>
                                    </div>
                                </div>
                                <div className="text-green-400 font-black text-sm uppercase tracking-widest">🎉 CORRECT!</div>
                            </div>
                        ) : (
                            <div className="bg-red-500/10 border-2 border-red-500/30 rounded-[3rem] p-8 mb-6">
                                <div className="text-6xl mb-3">⏰</div>
                                <div className="text-red-400 font-black text-2xl">انتهى الوقت!</div>
                                <div className="text-gray-500 font-bold mt-2">لم يجب أحد</div>
                            </div>
                        )}

                        <button onClick={continueToNext} className="px-16 py-6 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-black text-3xl rounded-[2.5rem] hover:scale-105 transition-all italic shadow-[0_0_40px_rgba(147,51,234,0.4)]">
                            {questionNumber >= config.totalQuestions ? 'النتائج النهائية' : 'السؤال التالي'} <ChevronRight size={28} className="inline" />
                        </button>
                    </div>
                </div>
            )}

            {/* --- LOADING --- */}
            {phase === 'LOADING' && (
                <div className="w-full h-full flex flex-col items-center justify-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-black"></div>
                    <div className="relative z-10 text-center">
                        <div className="text-[100px] mb-8 animate-bounce">🤖</div>
                        <h2 className="text-4xl font-black text-white italic mb-2">الذكاء الاصطناعي يفكر...</h2>
                        <p className="text-purple-500 font-bold">جاري إعداد لغز جديد لك!</p>
                        <div className="w-64 h-2 bg-white/10 rounded-full mt-8 overflow-hidden">
                            <div className="h-full bg-purple-600 animate-[progress_1s_infinite]"></div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- BETWEEN --- */}
            {phase === 'BETWEEN' && (
                <div className="w-full h-full flex items-center justify-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-black"></div>
                    <div className="relative z-10 text-center animate-pulse">
                        <div className="text-[100px] mb-4">🤔</div>
                        <div className="text-3xl font-black text-purple-400 italic">السؤال التالي...</div>
                    </div>
                </div>
            )}

            {/* --- FINALE --- */}
            {phase === 'FINALE' && (
                <div className="w-full h-full flex flex-col items-center justify-center p-10 animate-in zoom-in duration-1000 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-950 via-black to-yellow-950"></div>
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-yellow-600/20 via-transparent to-transparent"></div>

                    <div className="relative z-10 text-center w-full max-w-2xl">
                        <Crown size={80} className="text-yellow-400 mx-auto mb-6 drop-shadow-[0_0_40px_rgba(251,191,36,1)] animate-bounce" />
                        <h2 className="text-7xl font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-yellow-600 italic uppercase mb-8">النتائج النهائية!</h2>

                        <div className="bg-black/40 rounded-[2.5rem] border border-yellow-500/20 p-6 mb-8 shadow-2xl">
                            {getSortedPlayers().slice(0, 10).map((p, i) => (
                                <div key={p.user.username} className={`flex justify-between items-center py-4 border-b border-white/5 last:border-0 animate-in slide-in-from-right ${i === 0 ? 'bg-yellow-500/10 rounded-2xl px-4 -mx-2' : ''}`} style={{ animationDelay: `${i * 150}ms` }}>
                                    <div className="flex items-center gap-4">
                                        <span className={`text-2xl font-black ${i === 0 ? 'text-yellow-400' : i === 1 ? 'text-gray-400' : i === 2 ? 'text-orange-700' : 'text-gray-600'}`}>#{i + 1}</span>
                                        <div className={`${i === 0 ? 'w-14 h-14' : 'w-10 h-10'} rounded-xl overflow-hidden border-2 ${i === 0 ? 'border-yellow-500' : 'border-white/10'}`}>
                                            {p.user.avatar ? <img src={p.user.avatar} className="w-full h-full object-cover" /> : <User size={16} />}
                                        </div>
                                        <div>
                                            <span className={`${i === 0 ? 'text-xl' : 'text-lg'} font-black text-white`}>{p.user.username}</span>
                                            <span className="text-xs text-gray-500 block">{p.correctAnswers} إجابات صحيحة</span>
                                        </div>
                                    </div>
                                    <span className={`${i === 0 ? 'text-3xl text-yellow-400' : 'text-xl text-purple-400'} font-black font-mono`}>{p.score}</span>
                                </div>
                            ))}
                        </div>

                        <div className="flex gap-4 justify-center">
                            <button onClick={resetGame} className="px-12 py-5 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-black text-2xl rounded-2xl hover:scale-105 transition-all italic">لعبة جديدة</button>
                            <button onClick={onHome} className="px-8 py-5 bg-white/5 text-gray-500 font-black text-xl rounded-2xl border border-white/10 hover:text-white transition-all">الرئيسية</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
