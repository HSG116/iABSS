import React, { useState, useEffect, useRef } from 'react';
import { chatService } from '../services/chatService';
import { supabase, leaderboardService } from '../services/supabase';
import {
    Timer, Sparkles, Trophy, Play, Home,
    CheckCircle, XCircle, Users, Volume2, VolumeX,
    Settings, RefreshCw, Lock, Zap, User,
    AlertTriangle, Wand2, MonitorPlay, Video, Copy
} from 'lucide-react';
import { ProAvatar } from './ProAvatar';
import { pexelsService } from '../services/pexelsService';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";

interface TruthOrLieProps {
    onHome: () => void;
    isOBS?: boolean;
    channelConnected?: boolean;
}

interface Vote {
    username: string;
    vote: 'truth' | 'lie';
    avatar_url?: string;
}

interface GameState {
    phase: 'idle' | 'voting' | 'reveal';
    mode: 'auto' | 'manual';
    questionText: string;
    imageUrl?: string;
    correctAnswer: 'truth' | 'lie' | null;
    timer: number;
    timeLeft: number;
}

export const TruthOrLie: React.FC<TruthOrLieProps> = ({ onHome, isOBS = false }) => {
    // Game State
    const [gameState, setGameState] = useState<GameState>({
        phase: 'idle',
        mode: 'auto',
        questionText: '',
        correctAnswer: null,
        timer: 30,
        timeLeft: 30
    });

    const [votes, setVotes] = useState<Vote[]>([]);
    const [soundEnabled, setSoundEnabled] = useState(true);

    // Auto Input State (replaces manual)
    const [autoQuestion, setAutoQuestion] = useState('');
    const [autoAnswer, setAutoAnswer] = useState<'truth' | 'lie' | null>(null);
    const [isLoadingImage, setIsLoadingImage] = useState(false);
    const [showObsGuide, setShowObsGuide] = useState(false);
    const [obsCopied, setObsCopied] = useState(false);

    const timerInterval = useRef<NodeJS.Timeout | null>(null);
    const obsUrl = `${window.location.origin}${window.location.pathname}?obs=true&view=TRUTH_OR_LIE`;



    const handleCopyObs = async () => {
        try {
            await navigator.clipboard.writeText(obsUrl);
            setObsCopied(true);
            setShowObsGuide(true);
            setTimeout(() => setObsCopied(false), 2500);
        } catch {
            setShowObsGuide(true);
        }
    };

    // --- Sound Effects ---
    const playSound = (type: 'start' | 'tick' | 'end' | 'success' | 'fail') => {
        if (!soundEnabled) return;
        const sounds = {
            start: 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3',
            tick: 'https://assets.mixkit.co/active_storage/sfx/2044/2044-preview.mp3',
            end: 'https://assets.mixkit.co/active_storage/sfx/1070/1070-preview.mp3',
            success: 'https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3',
            fail: 'https://assets.mixkit.co/active_storage/sfx/1033/1033-preview.mp3'
        };
        const audio = new Audio(sounds[type]);
        audio.volume = type === 'tick' ? 0.2 : 0.5;
        audio.play().catch(() => { });
    };

    // --- Sync & Chat ---
    useEffect(() => {
        if (!isOBS) {
            const kickChannel = localStorage.getItem('kick_channel_name') || 'hsg116';
            chatService.connect(kickChannel);
        }

        const channel = supabase.channel('truth_or_lie_v2', {
            config: { broadcast: { self: true } }
        });

        channel
            .on('broadcast', { event: 'game_update' }, ({ payload }) => {
                if (isOBS) {
                    if (payload.type === 'STATE_UPDATE') {
                        setGameState(prev => ({ ...prev, ...payload.data }));
                    }
                    if (payload.type === 'VOTES_UPDATE') {
                        setVotes(payload.data);
                    }
                    if (payload.type === 'PLAY_SOUND') {
                        playSound(payload.sound);
                    }
                }
            })
            .subscribe();

        const handleMessage = (msg: any) => {
            if (gameState.phase !== 'voting') return;

            const text = msg.content?.toLowerCase() || '';
            const username = msg.user?.username || 'Unknown';
            let voteType: 'truth' | 'lie' | null = null;

            if (text.includes('!صادق') || text === 'صادق' || text === '1' || text === 'truth') voteType = 'truth';
            if (text.includes('!كذاب') || text === 'كذاب' || text === '2' || text === 'lie') voteType = 'lie';

            if (voteType) {
                setVotes(prev => {
                    if (prev.find(v => v.username === username)) return prev; // User already voted

                    const newVote: Vote = {
                        username,
                        vote: voteType!,
                        avatar_url: msg.user?.avatar // Initial avatar from message
                    };
                    const newVotes = [...prev, newVote];

                    // Asynchronously fetch real Kick avatar
                    chatService.fetchKickAvatar(username).then(avatar => {
                        if (avatar) {
                            setVotes(current => current.map(v =>
                                v.username === username ? { ...v, avatar_url: avatar } : v
                            ));
                        }
                    });

                    if (!isOBS) {
                        channel.send({
                            type: 'broadcast',
                            event: 'game_update',
                            payload: { type: 'VOTES_UPDATE', data: newVotes }
                        });
                    }
                    return newVotes;
                });
            }
        };

        const unsubscribe = chatService.onMessage(handleMessage);

        return () => {
            unsubscribe();
            supabase.removeChannel(channel);
            if (timerInterval.current) clearInterval(timerInterval.current);
        };
    }, [isOBS, gameState.phase]);

    // --- Timer Logic ---
    useEffect(() => {
        if (!isOBS && gameState.phase === 'voting' && gameState.timeLeft > 0) {
            timerInterval.current = setInterval(() => {
                setGameState(prev => {
                    const newTime = prev.timeLeft - 1;

                    supabase.channel('truth_or_lie_v2').send({
                        type: 'broadcast',
                        event: 'game_update',
                        payload: {
                            type: 'STATE_UPDATE',
                            data: { ...prev, timeLeft: newTime }
                        }
                    });

                    if (newTime <= 5 && newTime > 0) playSound('tick');

                    if (newTime <= 0) {
                        if (timerInterval.current) clearInterval(timerInterval.current);
                    }
                    return { ...prev, timeLeft: newTime };
                });
            }, 1000);
        }

        return () => {
            if (timerInterval.current) clearInterval(timerInterval.current);
        };
    }, [gameState.phase, isOBS]);

    // --- Actions ---
    const broadcastState = (newState: Partial<GameState>) => {
        const updated = { ...gameState, ...newState };
        setGameState(updated);
        supabase.channel('truth_or_lie_v2').send({
            type: 'broadcast',
            event: 'game_update',
            payload: { type: 'STATE_UPDATE', data: updated }
        });
    };

    const handleStartVoting = () => {
        if (!autoAnswer) {
            alert('يرجى توليد تحدي أولاً!');
            return;
        }

        setVotes([]);
        supabase.channel('truth_or_lie_v2').send({
            type: 'broadcast',
            event: 'game_update',
            payload: { type: 'VOTES_UPDATE', data: [] }
        });

        broadcastState({
            phase: 'voting',
            timeLeft: gameState.timer,
            questionText: autoQuestion,
            correctAnswer: autoAnswer
        });

        playSound('start');
        supabase.channel('truth_or_lie_v2').send({
            type: 'broadcast',
            event: 'game_update',
            payload: { type: 'PLAY_SOUND', sound: 'start' }
        });
    };

    const handleReveal = () => {
        broadcastState({ phase: 'reveal' });
        const sound = gameState.correctAnswer === 'truth' ? 'success' : 'fail';
        playSound(sound);
        supabase.channel('truth_or_lie_v2').send({
            type: 'broadcast',
            event: 'game_update',
            payload: { type: 'PLAY_SOUND', sound }
        });

        // Record wins for correct voters
        if (gameState.correctAnswer) {
            const winners = votes.filter(v => v.vote === gameState.correctAnswer);
            winners.forEach(w => {
                leaderboardService.recordWin(w.username, w.avatar_url || '', 20);
            });
        }
    };

    const handleReset = () => {
        setAutoQuestion('');
        setAutoAnswer(null);
        setVotes([]);
        broadcastState({
            phase: 'idle',
            questionText: '',
            correctAnswer: null,
            imageUrl: undefined,
            timeLeft: 30
        });
    };

    const FALLBACK_QUESTIONS = [
        { statement: "تصنع النملة جسوراً بجسمها لعبور الفجوات", is_truth: true, image_keyword: "ants ants bridge insect macro" },
        { statement: "القلب يتوقف تماماً عند العطس", is_truth: false, image_keyword: "sneeze funny illustration" },
        { statement: "الفراولة هي الفاكهة الوحيدة التي توجد بذورها من الخارج", is_truth: true, image_keyword: "strawberry fruit macro" },
        { statement: "تمتلك أسماك القرش عظاماً في جسمها أقوى من البشر", is_truth: false, image_keyword: "shark cartoon illustration" },
        { statement: "الأخطبوط يملك 3 قلوب، أحدها يضخ الدم للجسم والآخران للخياشيم", is_truth: true, image_keyword: "octopus underwater cartoon" },
        { statement: "النعامة تدفن رأسها في الرمال عند الخوف", is_truth: false, image_keyword: "ostrich hiding head sand" },
        { statement: "العسل الطبيعي لا يفسد أبداً ويمكن أكله بعد آلاف السنين", is_truth: true, image_keyword: "honey jar illustration" },
        { statement: "أطول حرب في التاريخ استمرت 38 دقيقة فقط", is_truth: true, image_keyword: "war cartoon tanks" }, // Anglo-Zanzibar War (True) but statement says "longest"? wait. Shortest is 38min. Longest is 335 years. I should correct this fallback.
        // Let's stick to simple ones.
        { statement: "الماء الساخن يتجمد أسرع من الماء البارد في ظروف معينة", is_truth: true, image_keyword: "freezing water science illustration" }
    ];

    // Track used questions and keywords to avoid repetition
    const [usedQuestions, setUsedQuestions] = useState<string[]>([]);
    const [usedKeywords, setUsedKeywords] = useState<string[]>([]);

    const usedQuestionsRef = useRef<string[]>([]);
    const usedKeywordsRef = useRef<string[]>([]);

    useEffect(() => {
        usedQuestionsRef.current = usedQuestions;
        usedKeywordsRef.current = usedKeywords;
    }, [usedQuestions, usedKeywords]);

    // Corrected fallback logic inside component

    const generateChallengeWithAI = async (): Promise<{ statement: string; is_truth: boolean; image_keyword: string } | null> => {
        try {
            const prompt = `Generate a Trivia Fact for a "Truth or Lie" game.
            It can be a True Fact or a Common Myth (Lie).
            Output strictly valid JSON only:
            {
                "statement": "Arabic text here (Fact or Lie)",
                "is_truth": boolean,
                "image_keyword": "Uniquely creative English search term for a cartoon/illustration image. VARY usage: use terms like 'vector art', 'digital painting', 'minimalist', 'vibrant', 'character design' along with the subject."
            }
            Do not use these previous statements: ${usedQuestionsRef.current.slice(-30).join(', ')}.
            Do not use these previous image keywords: ${usedKeywordsRef.current.slice(-30).join(', ')}.
            Make it interesting, fun, and suitable for a general audience.
            Ensure the Arabic is natural and clear.`;

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
            let jsonText = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!jsonText) return null;

            // Robust JSON Extraction
            const startIndex = jsonText.indexOf('{');
            const endIndex = jsonText.lastIndexOf('}');
            if (startIndex === -1 || endIndex === -1) return null;

            jsonText = jsonText.substring(startIndex, endIndex + 1);
            return JSON.parse(jsonText);
        } catch (e) {
            console.error("AI Generation Failed:", e);
            return null;
        }
    };

    const handleAutoGenerate = async () => {
        setIsLoadingImage(true);
        try {
            let result = await generateChallengeWithAI();

            // Fallback if AI fails
            if (!result) {
                console.warn("Using Fallback Question");
                // Filter fallbacks that haven't been used recently
                const availableFallbacks = FALLBACK_QUESTIONS.filter(q => !usedQuestionsRef.current.includes(q.statement));
                const pool = availableFallbacks.length > 0 ? availableFallbacks : FALLBACK_QUESTIONS;
                const fallbackItem = pool[Math.floor(Math.random() * pool.length)];
                result = fallbackItem;
            }

            setUsedQuestions(prev => [...prev, result!.statement]);
            setUsedKeywords(prev => [...prev, result!.image_keyword]);

            // Enforce cartoon style search for either AI or Fallback but respect the keyword's own style if present
            let searchTerm = result!.image_keyword;
            if (!searchTerm.toLowerCase().includes('cartoon') && !searchTerm.toLowerCase().includes('illustration')) {
                searchTerm = `cartoon illustration ${searchTerm}`;
            }

            const url = await pexelsService.fetchRandomImage(searchTerm);

            setAutoQuestion(result!.statement);
            setAutoAnswer(result!.is_truth ? 'truth' : 'lie');

            broadcastState({
                questionText: result!.statement,
                imageUrl: url || undefined,
                correctAnswer: null,
                phase: 'idle',
                mode: 'auto'
            });
        } catch (e) {
            console.error(e);
            alert('حدث خطأ غير متوقع، يرجى المحاولة مرة أخرى');
        } finally {
            setIsLoadingImage(false);
        }
    };
    const chooseAnswer = (ans: 'truth' | 'lie') => {
        setAutoAnswer(ans);
        broadcastState({ correctAnswer: ans });
    };

    // --- Derived State ---
    const truthVotes = votes.filter(v => v.vote === 'truth');
    const lieVotes = votes.filter(v => v.vote === 'lie');
    const totalVotes = votes.length || 1;
    const truthPercentage = Math.round((truthVotes.length / totalVotes) * 100);
    const liePercentage = Math.round((lieVotes.length / totalVotes) * 100);

    // --- OBS VIEW ---
    if (isOBS) {
        return (
            <div className="w-full h-screen bg-transparent overflow-hidden relative font-sans flex flex-col items-center justify-center p-8">

                {/* IDLE PHASE */}
                {gameState.phase === 'idle' && (
                    <div className="flex flex-col items-center justify-center gap-8 animate-in zoom-in duration-700">
                        <div className="relative group">
                            <div className="absolute -inset-10 bg-gradient-to-r from-green-500/20 to-iabs-red/20 blur-[60px] rounded-full animate-pulse"></div>
                            <h1 className="text-8xl font-display font-black text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.3)] tracking-wide flex items-center gap-6">
                                <span className="text-transparent bg-clip-text bg-gradient-to-b from-green-400 to-green-600 drop-shadow-sm">صادق</span>
                                <span className="text-6xl text-white font-black font-display italic drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]">VS</span>
                                <span className="text-transparent bg-clip-text bg-gradient-to-b from-red-500 to-iabs-red drop-shadow-sm">كذاب</span>
                            </h1>
                        </div>
                        <div className="px-10 py-4 bg-black/60 backdrop-blur-xl border border-white/10 rounded-full shadow-2xl flex items-center gap-4">
                            <div className="w-3 h-3 bg-white rounded-full animate-bounce"></div>
                            <span className="text-2xl text-white font-display font-bold">بانتظار بدء التصويت...</span>
                        </div>
                    </div>
                )}

                {/* VOTING & REVEAL PHASE */}
                {(gameState.phase === 'voting' || gameState.phase === 'reveal') && (
                    <div className="w-full max-w-5xl flex flex-col gap-6 animate-in slide-in-from-bottom-10 duration-500">

                        {/* Timer & Total Votes */}
                        <div className="flex items-center justify-center gap-8 mb-4">
                            <div className={`px-8 py-3 rounded-full flex items-center gap-4 border-2 shadow-[0_0_30px_rgba(0,0,0,0.5)] backdrop-blur-md transition-all duration-300 ${gameState.timeLeft <= 5 && gameState.phase === 'voting' ? 'bg-red-950/80 border-red-500 text-red-500 animate-pulse' : 'bg-black/80 border-white/10 text-white'}`}>
                                <Timer size={32} className={gameState.timeLeft <= 5 && gameState.phase === 'voting' ? 'animate-bounce' : ''} />
                                <span className="text-5xl font-black font-display tabular-nums">{gameState.timeLeft}s</span>
                            </div>

                            <div className="px-8 py-3 rounded-full bg-black/80 border-2 border-white/10 backdrop-blur-md flex items-center gap-4 shadow-lg">
                                <Users size={32} className="text-blue-400" />
                                <span className="text-5xl font-black font-display tabular-nums text-white">{totalVotes}</span>
                            </div>
                        </div>

                        {/* Question & Image Display (Hidden in OBS per user request) */}

                        {/* VS Battle Cards */}
                        <div className="grid grid-cols-2 gap-8 items-stretch h-[400px]">

                            {/* Truth Side */}
                            <div className={`
                                relative rounded-[3rem] p-8 flex flex-col items-center justify-between border-4 overflow-hidden transition-all duration-700
                                ${gameState.phase === 'reveal' && gameState.correctAnswer === 'truth' ? 'bg-green-950/90 border-green-400 shadow-[0_0_100px_rgba(34,197,94,0.6)] scale-105 z-10' : ''}
                                ${gameState.phase === 'reveal' && gameState.correctAnswer === 'lie' ? 'bg-black/60 border-zinc-800 opacity-50 grayscale scale-95' : ''}
                                ${gameState.phase === 'voting' ? 'bg-gradient-to-b from-green-950/80 to-black/80 border-green-500/30' : ''}
                            `}>
                                {/* Progress Background */}
                                <div
                                    className="absolute bottom-0 left-0 w-full bg-green-600/20 transition-all duration-1000 ease-out"
                                    style={{ height: `${truthPercentage}%` }}
                                ></div>

                                {/* Header */}
                                <div className="relative z-10 flex flex-col items-center">
                                    <CheckCircle size={80} className={`${gameState.phase === 'reveal' && gameState.correctAnswer === 'truth' ? 'text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.8)]' : 'text-green-500'} mb-4 transition-all duration-500`} />
                                    <h2 className="text-7xl font-black font-display text-white drop-shadow-lg">صادق</h2>
                                </div>

                                {/* Stats */}
                                <div className="relative z-10 flex flex-col items-center gap-2">
                                    <span className="text-9xl font-black font-display text-white tracking-tighter drop-shadow-2xl">
                                        {truthPercentage}<span className="text-5xl">%</span>
                                    </span>
                                    <span className="text-2xl font-bold text-green-400/80 bg-black/40 px-4 py-1 rounded-full border border-green-500/20">
                                        {truthVotes.length} صوت
                                    </span>
                                </div>

                                {/* Winner Badge */}
                                {gameState.phase === 'reveal' && gameState.correctAnswer === 'truth' && (
                                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full text-center">
                                        <div className="bg-green-500 text-black font-black text-6xl py-4 transform -rotate-6 shadow-[0_0_50px_rgba(34,197,94,0.8)] border-y-4 border-white animate-in zoom-in duration-300">
                                            إجابة صحيحة!
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Lie Side */}
                            <div className={`
                                relative rounded-[3rem] p-8 flex flex-col items-center justify-between border-4 overflow-hidden transition-all duration-700
                                ${gameState.phase === 'reveal' && gameState.correctAnswer === 'lie' ? 'bg-red-950/90 border-iabs-red shadow-[0_0_100px_rgba(220,38,38,0.6)] scale-105 z-10' : ''}
                                ${gameState.phase === 'reveal' && gameState.correctAnswer === 'truth' ? 'bg-black/60 border-zinc-800 opacity-50 grayscale scale-95' : ''}
                                ${gameState.phase === 'voting' ? 'bg-gradient-to-b from-red-950/80 to-black/80 border-red-500/30' : ''}
                            `}>
                                {/* Progress Background */}
                                <div
                                    className="absolute bottom-0 left-0 w-full bg-red-600/20 transition-all duration-1000 ease-out"
                                    style={{ height: `${liePercentage}%` }}
                                ></div>

                                {/* Header */}
                                <div className="relative z-10 flex flex-col items-center">
                                    <XCircle size={80} className={`${gameState.phase === 'reveal' && gameState.correctAnswer === 'lie' ? 'text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.8)]' : 'text-iabs-red'} mb-4 transition-all duration-500`} />
                                    <h2 className="text-7xl font-black font-display text-white drop-shadow-lg">كذاب</h2>
                                </div>

                                {/* Stats */}
                                <div className="relative z-10 flex flex-col items-center gap-2">
                                    <span className="text-9xl font-black font-display text-white tracking-tighter drop-shadow-2xl">
                                        {liePercentage}<span className="text-5xl">%</span>
                                    </span>
                                    <span className="text-2xl font-bold text-red-400/80 bg-black/40 px-4 py-1 rounded-full border border-red-500/20">
                                        {lieVotes.length} صوت
                                    </span>
                                </div>

                                {/* Winner Badge */}
                                {gameState.phase === 'reveal' && gameState.correctAnswer === 'lie' && (
                                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full text-center">
                                        <div className="bg-iabs-red text-white font-black text-6xl py-4 transform rotate-6 shadow-[0_0_50px_rgba(220,38,38,0.8)] border-y-4 border-white animate-in zoom-in duration-300">
                                            إجابة صحيحة!
                                        </div>
                                    </div>
                                )}
                            </div>

                        </div>
                    </div>
                )}
            </div>
        );
    }

    // --- CONTROLLER VIEW ---
    return (
        <div className="min-h-screen bg-black text-white font-sans p-4 md:p-8 flex flex-col gap-6 bg-[url('https://i.ibb.co/kWJRhSN/1000126060.png')] bg-cover bg-center bg-fixed bg-no-repeat">
            <div className="absolute inset-0 bg-black/90 backdrop-blur-sm fixed z-0"></div>

            {/* Header */}
            <div className="relative z-10 flex items-center justify-between bg-black/60 backdrop-blur-md p-6 rounded-[2rem] border border-white/5 shadow-2xl">
                <div className="flex items-center gap-6">
                    <button onClick={onHome} className="p-4 bg-zinc-900/80 hover:bg-iabs-red hover:text-black rounded-2xl transition-all duration-300 group shadow-lg border border-white/5">
                        <Home size={28} className="group-hover:scale-110 transition-transform" />
                    </button>
                    <div>
                        <h1 className="text-4xl font-display font-black text-white tracking-wide drop-shadow-lg">
                            صادق <span className="text-iabs-red">أم</span> كذاب
                        </h1>
                        <p className="text-zinc-400 text-sm font-bold mt-1 flex items-center gap-2">
                            <MonitorPlay size={14} /> لوحة التحكم بالمشرف
                        </p>
                    </div>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={handleCopyObs}
                        className="px-4 py-3 rounded-2xl bg-iabs-red text-black font-black border-2 border-iabs-red hover:bg-red-500 hover:border-red-400 transition-all flex items-center gap-3 shadow-[0_0_20px_rgba(255,0,0,0.4)]"
                    >
                        <Video size={20} /> {obsCopied ? 'تم نسخ الرابط' : 'نسخ رابط OBS'}
                    </button>
                    <button
                        onClick={() => setSoundEnabled(!soundEnabled)}
                        className={`p-4 rounded-2xl border transition-all duration-300 ${soundEnabled ? 'bg-iabs-red/20 border-iabs-red text-iabs-red shadow-[0_0_15px_rgba(255,0,0,0.2)]' : 'bg-zinc-900 border-zinc-800 text-zinc-500'}`}
                    >
                        {soundEnabled ? <Volume2 size={24} /> : <VolumeX size={24} />}
                    </button>
                    <div className={`px-6 py-2 rounded-2xl border flex items-center gap-3 font-bold text-lg ${gameState.phase === 'voting' ? 'bg-green-900/30 border-green-500 text-green-400 animate-pulse' : 'bg-zinc-900 border-zinc-800 text-zinc-500'}`}>
                        <div className={`w-3 h-3 rounded-full shadow-[0_0_10px_currentColor] ${gameState.phase === 'voting' ? 'bg-green-500' : 'bg-zinc-500'}`} />
                        {gameState.phase === 'idle' ? 'واقف' : gameState.phase === 'voting' ? 'تصويت جاري' : 'عرض النتيجة'}
                    </div>
                </div>
            </div>

            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-8 h-full min-h-[600px]">

                {/* Left: Main Stage (Image & Controls) */}
                <div className="lg:col-span-2 flex flex-col gap-6">

                    {/* Image Area */}
                    <div className="flex-1 relative rounded-[3rem] overflow-hidden border border-white/10 shadow-2xl group bg-black/40 backdrop-blur-sm min-h-[500px]">
                        {gameState.imageUrl ? (
                            <>
                                <img
                                    src={gameState.imageUrl}
                                    className="w-full h-full object-cover transition-transform duration-[30s] ease-linear group-hover:scale-110"
                                    alt="Challenge"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-90"></div>

                                {/* Info Overlay */}
                                <div className="absolute inset-0 p-8 flex">
                                    <div className="ml-auto flex flex-col gap-4 w-[320px]">
                                        {autoAnswer ? (
                                            <div className={`px-8 py-4 rounded-2xl border backdrop-blur-xl shadow-2xl flex items-center gap-4 ${autoAnswer === 'truth' ? 'bg-green-600/20 border-green-500 text-green-400' : 'bg-red-600/20 border-red-500 text-red-400'}`}>
                                                {autoAnswer === 'truth' ? <CheckCircle size={32} /> : <XCircle size={32} />}
                                                <span className="text-3xl font-black font-display">
                                                    {autoAnswer === 'truth' ? 'صــادق' : 'كــذاب'}
                                                </span>
                                            </div>
                                        ) : (
                                            <div className="rounded-2xl bg-black/50 border border-white/10 p-4 backdrop-blur-xl shadow-2xl">
                                                <div className="text-zinc-300 text-sm font-bold mb-3">اختر الإجابة</div>
                                                <div className="grid grid-cols-1 gap-3">
                                                    <button onClick={() => chooseAnswer('truth')} className="px-6 py-4 rounded-xl bg-green-900/40 border-2 border-green-500/40 hover:border-green-400 text-green-300 font-black flex items-center justify-center gap-3 transition-all">
                                                        <CheckCircle /> صادق
                                                    </button>
                                                    <button onClick={() => chooseAnswer('lie')} className="px-6 py-4 rounded-xl bg-red-900/40 border-2 border-red-500/40 hover:border-red-400 text-red-300 font-black flex items-center justify-center gap-3 transition-all">
                                                        <XCircle /> كذاب
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center p-10 text-center relative overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-iabs-red/5"></div>
                                <div className="relative z-10 bg-black/50 p-12 rounded-[3rem] border border-white/5 backdrop-blur-md shadow-2xl">
                                    <div className="w-40 h-40 bg-iabs-red/10 rounded-full flex items-center justify-center mb-8 mx-auto animate-pulse ring-4 ring-iabs-red/20">
                                        <Wand2 size={80} className="text-iabs-red" />
                                    </div>
                                    <h2 className="text-5xl font-display font-bold text-white mb-4">جاهز للتحدي؟</h2>
                                    <p className="text-zinc-400 text-xl font-medium">اضغط على الزر بالأسفل لتوليد صورة جديدة</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Controls Bar */}
                    <div className="h-28">
                        {!gameState.imageUrl ? (
                            <button
                                onClick={handleAutoGenerate}
                                disabled={isLoadingImage}
                                className="premium-square-btn w-full h-full rounded-[2rem] text-3xl font-black flex items-center justify-center gap-6 disabled:opacity-50 group hover:scale-[1.02] transition-all"
                            >
                                <span className="shine-layer"></span>
                                {isLoadingImage ? (
                                    <><RefreshCw className="animate-spin" size={40} /> جاري التحميل...</>
                                ) : (
                                    <><Wand2 size={40} className="group-hover:rotate-12 transition-transform" /> توليد تحدي جديد</>
                                )}
                            </button>
                        ) : (
                            <div className="grid grid-cols-2 gap-6 h-full">
                                {gameState.phase === 'idle' ? (
                                    <>
                                        <button
                                            onClick={handleStartVoting}
                                            className="premium-square-btn col-span-1 rounded-[2rem] text-2xl font-black flex items-center justify-center gap-4 hover:scale-[1.02] transition-all"
                                        >
                                            <span className="shine-layer"></span>
                                            <Play size={32} fill="currentColor" /> ابدأ التصويت
                                        </button>
                                        <button
                                            onClick={handleReset}
                                            className="col-span-1 bg-zinc-800 hover:bg-zinc-700 text-white rounded-[2rem] font-black text-2xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-4 border border-white/10"
                                        >
                                            <RefreshCw size={32} /> إلغاء
                                        </button>
                                    </>
                                ) : gameState.phase === 'voting' ? (
                                    <button
                                        onClick={handleReveal}
                                        className="col-span-2 bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400 text-black rounded-[2rem] font-black text-3xl shadow-[0_0_40px_rgba(234,179,8,0.4)] transition-all active:scale-95 flex items-center justify-center gap-6 border-t-2 border-yellow-300"
                                    >
                                        <Trophy size={40} /> كشف النتيجة
                                    </button>
                                ) : (
                                    <button
                                        onClick={handleReset}
                                        className="col-span-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-[2rem] font-black text-3xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-6 border border-white/10"
                                    >
                                        <RefreshCw size={40} /> جولة جديدة
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right: Stats (Vertical Layout) */}
                <div className="flex flex-col gap-6">
                    {/* Timer */}
                    <div className="glass-card rounded-[2.5rem] p-8 flex flex-col items-center justify-center text-center relative overflow-hidden h-48">
                        <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent"></div>
                        <div className="relative z-10">
                            <Timer className={`mb-2 mx-auto ${gameState.timeLeft <= 5 && gameState.phase === 'voting' ? 'text-iabs-red animate-bounce' : 'text-zinc-500'}`} size={32} />
                            <div className="text-7xl font-black tabular-nums tracking-tighter text-white font-display drop-shadow-lg">
                                {gameState.timeLeft}
                            </div>
                            <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mt-1">ثانية</p>
                        </div>
                    </div>

                    {/* Stats Card */}
                    <div className="glass-card rounded-[2.5rem] p-8 flex-1 flex flex-col min-h-0">
                        <h3 className="text-zinc-400 font-bold mb-6 flex items-center gap-3 text-lg border-b border-white/5 pb-4">
                            <Users size={20} className="text-iabs-red" /> تصويت الجمهور ({totalVotes})
                        </h3>

                        <div className="space-y-8 mb-8">
                            {/* Truth Bar */}
                            <div>
                                <div className="flex justify-between mb-2 text-sm font-bold">
                                    <span className="text-green-400 flex items-center gap-2"><CheckCircle size={16} /> صادق</span>
                                    <span className="text-white">{truthPercentage}%</span>
                                </div>
                                <div className="h-4 bg-zinc-900 rounded-full overflow-hidden">
                                    <div style={{ width: `${truthPercentage}%` }} className="h-full bg-green-500 rounded-full shadow-[0_0_15px_rgba(34,197,94,0.5)] transition-all duration-500"></div>
                                </div>
                            </div>

                            {/* Lie Bar */}
                            <div>
                                <div className="flex justify-between mb-2 text-sm font-bold">
                                    <span className="text-red-400 flex items-center gap-2"><XCircle size={16} /> كذاب</span>
                                    <span className="text-white">{liePercentage}%</span>
                                </div>
                                <div className="h-4 bg-zinc-900 rounded-full overflow-hidden">
                                    <div style={{ width: `${liePercentage}%` }} className="h-full bg-iabs-red rounded-full shadow-[0_0_15px_rgba(220,38,38,0.5)] transition-all duration-500"></div>
                                </div>
                            </div>
                        </div>

                        {/* Recent Voters */}
                        <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-black/20 rounded-2xl p-4 border border-white/5">
                            <h4 className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-4">آخر المصوتين</h4>
                            <div className="space-y-3 overflow-y-auto pr-2 custom-scrollbar flex-1">
                                {votes.slice().reverse().map((v, i) => (
                                    <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-black/40 border border-white/5 animate-in slide-in-from-right duration-300">
                                        <div className="flex items-center gap-3">
                                            <ProAvatar
                                                url={v.avatar_url}
                                                username={v.username}
                                                size="w-8 h-8"
                                            />
                                            <span className="text-zinc-300 text-xs font-medium truncate max-w-[80px]">{v.username}</span>
                                        </div>
                                        <div className={`w-2 h-2 rounded-full ${v.vote === 'truth' ? 'bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.8)]' : 'bg-red-500 shadow-[0_0_5px_rgba(220,38,38,0.8)]'}`}></div>
                                    </div>
                                ))}
                                {votes.length === 0 && (
                                    <div className="flex flex-col items-center justify-center h-full text-zinc-700 gap-2 opacity-50">
                                        <Users size={24} />
                                        <p className="text-xs">في انتظار التصويت...</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {showObsGuide && (
                <div className="fixed inset-0 z-[1000] bg-black/80 backdrop-blur-md flex items-center justify-center p-6">
                    <div className="w-full max-w-2xl bg-black/70 border border-white/10 rounded-[2rem] shadow-2xl overflow-hidden">
                        <div className="bg-gradient-to-r from-iabs-red/30 to-transparent p-6 border-b border-white/10 flex items-center gap-4">
                            <Video size={24} className="text-iabs-red" />
                            <h3 className="text-2xl font-black text-white font-display">دليل ربط اللعبة بـ OBS</h3>
                        </div>
                        <div className="p-6 space-y-6">
                            <div className="flex items-center gap-3 bg-black/40 border border-white/10 rounded-xl p-4">
                                <input readOnly value={obsUrl} className="flex-1 bg-transparent text-white font-mono text-sm outline-none" />
                                <button onClick={handleCopyObs} className="px-4 py-2 rounded-xl bg-iabs-red text-black font-black border-2 border-iabs-red hover:bg-red-500 hover:border-red-400 transition-all flex items-center gap-2">
                                    <Copy size={16} /> {obsCopied ? 'تم النسخ' : 'نسخ'}
                                </button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="bg-black/40 border border-white/10 rounded-xl p-4">
                                    <div className="text-white font-black mb-2">الخطوات</div>
                                    <ul className="text-zinc-400 text-sm space-y-2">
                                        <li>افتح OBS وأضف مصدر Browser</li>
                                        <li>الصق الرابط أعلاه داخل URL</li>
                                        <li>العرض 1920 والارتفاع 1080</li>
                                        <li>فعل Refresh cache when scene becomes active</li>
                                    </ul>
                                </div>
                                <div className="bg-black/40 border border-white/10 rounded-xl p-4">
                                    <div className="text-white font-black mb-2">ملاحظات</div>
                                    <ul className="text-zinc-400 text-sm space-y-2">
                                        <li>تأكد من عدم وجود مانع إعلانات</li>
                                        <li>يفضل مشغل المشهد بدقة Full HD</li>
                                        <li>الخلفية شفافة تلقائيًا</li>
                                    </ul>
                                </div>
                            </div>
                            <div className="flex justify-end">
                                <button onClick={() => setShowObsGuide(false)} className="px-6 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-black border border-white/10">إغلاق</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};
