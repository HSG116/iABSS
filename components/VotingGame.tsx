import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    Settings, Play, Users, Trophy, Clock, ChevronLeft, User,
    Plus, Trash2, BarChart3, Crown, Sparkles, Copy, Check,
    Monitor, ChevronRight, RotateCcw, Vote as VoteIcon, Zap, Flame, X,
    Award, Eye, EyeOff, Timer, TrendingUp
} from 'lucide-react';
import { ProAvatar } from './ProAvatar';
import { ChatUser } from '../types';
import { chatService } from '../services/chatService';
import { supabase } from '../services/supabase';

interface VotingGameProps {
    onHome: () => void;
    isOBS?: boolean;
}

interface VoteOption {
    id: string;
    label: string;
    emoji: string;
    color: string;
}

interface VoterInfo extends ChatUser {
    optionId: string;
    votedAt: number;
}

type GamePhase = 'SETUP' | 'VOTING' | 'RESULTS';

interface SyncData {
    phase: GamePhase;
    options: VoteOption[];
    question: string;
    timer: number;
    totalVotes: number;
    sortedResults: any[];
    showVoterCount: boolean;
}

const EMOJI_POOL = ['🔴', '🔵', '🟢', '🟡', '🟣', '🟠', '⚪', '🟤', '💎', '⭐', '🎯', '🏆', '💰', '🎲', '🎮', '🎪', '🌟', '💫', '🔥', '❄️'];

const COLOR_POOL = [
    '#ef4444', '#3b82f6', '#22c55e', '#eab308', '#a855f7',
    '#f97316', '#e2e8f0', '#78350f', '#06b6d4', '#f59e0b',
    '#ec4899', '#14b8a6', '#8b5cf6', '#84cc16', '#f43f5e',
    '#6366f1', '#10b981', '#fbbf24', '#e11d48', '#0ea5e9'
];

// Arabic normalization for robust matching
const normalizeTxt = (str: string) => {
    return str
        .toLowerCase()
        .replace(/[أإآ]/g, 'ا')
        .replace(/ة/g, 'ه')
        .replace(/ى/g, 'ي')
        .replace(/[\ufe0f\u200d]/g, '')
        .trim();
};

export const VotingGame: React.FC<VotingGameProps> = ({ onHome, isOBS }) => {
    // Config
    const [votingDuration, setVotingDuration] = useState(60);
    const [allowChangeVote, setAllowChangeVote] = useState(true);
    const [showVoterCount, setShowVoterCount] = useState(true);
    const [question, setQuestion] = useState('');

    // Options
    const [options, setOptions] = useState<VoteOption[]>([
        { id: '1', label: '', emoji: '🔴', color: '#ef4444' },
        { id: '2', label: '', emoji: '🔵', color: '#3b82f6' },
    ]);

    // Game State
    const [phase, setPhase] = useState<GamePhase>('SETUP');
    const [voters, setVoters] = useState<VoterInfo[]>([]);
    const [timer, setTimer] = useState(0);
    const [copiedOBS, setCopiedOBS] = useState(false);
    const [revealedOptions, setRevealedOptions] = useState<Set<string>>(new Set());

    // Sync State for OBS
    const [obsData, setObsData] = useState<SyncData | null>(null);

    // Refs
    const phaseRef = useRef(phase);
    const votersRef = useRef(voters);
    const optionsRef = useRef(options);
    const allowChangeRef = useRef(allowChangeVote);

    useEffect(() => {
        phaseRef.current = phase;
        votersRef.current = voters;
        optionsRef.current = options;
        allowChangeRef.current = allowChangeVote;
    }, [phase, voters, options, allowChangeVote]);

    // Get vote counts (used by Streamer dashboard)
    const getVoteCounts = useCallback(() => {
        return options.map(opt => ({
            option: opt,
            count: voters.filter(v => v.optionId === opt.id).length,
            voters: voters.filter(v => v.optionId === opt.id),
        })).sort((a, b) => b.count - a.count);
    }, [options, voters]);

    // Function to broadcast state (Streamer only)
    const broadcastState = useCallback((customData?: any) => {
        if (isOBS) return;
        const data: SyncData = {
            phase,
            options,
            question,
            timer,
            totalVotes: voters.length,
            sortedResults: getVoteCounts(),
            showVoterCount,
            ...customData
        };
        supabase.channel('voting_game_sync').send({
            type: 'broadcast',
            event: 'state_sync',
            payload: data
        });
    }, [isOBS, phase, options, question, timer, voters, showVoterCount, getVoteCounts]);

    // Supabase Channel
    useEffect(() => {
        const channel = supabase.channel('voting_game_sync', {
            config: { broadcast: { self: true } }
        });

        channel
            .on('broadcast', { event: 'state_sync' }, ({ payload }) => {
                if (isOBS) {
                    setObsData(payload);
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [isOBS]);

    // Streamer initial sync
    useEffect(() => {
        if (!isOBS) {
            const timer = setTimeout(() => broadcastState(), 1000);
            return () => clearTimeout(timer);
        }
    }, [isOBS, broadcastState]);

    // Option Management
    const addOption = () => {
        if (options.length >= 20) return;
        const nextIdx = options.length;
        const newOption: VoteOption = {
            id: Date.now().toString(),
            label: '',
            emoji: EMOJI_POOL[nextIdx % EMOJI_POOL.length],
            color: COLOR_POOL[nextIdx % COLOR_POOL.length],
        };
        setOptions([...options, newOption]);
    };

    const removeOption = (id: string) => {
        if (options.length <= 2) return;
        setOptions(options.filter(o => o.id !== id));
    };

    const updateOptionLabel = (id: string, label: string) => {
        setOptions(options.map(o => o.id === id ? { ...o, label } : o));
    };

    const updateOptionEmoji = (id: string, emoji: string) => {
        setOptions(options.map(o => o.id === id ? { ...o, emoji } : o));
    };

    // Chat Handler
    useEffect(() => {
        const unsubscribe = chatService.onMessage((msg) => {
            if (phaseRef.current !== 'VOTING') return;

            const username = msg.user.username;
            const normContent = normalizeTxt(msg.content);

            const matchingOption = optionsRef.current.find(opt => {
                const normLabel = normalizeTxt(opt.label);
                return normContent === normLabel ||
                    (normContent.length > 1 && normLabel.includes(normContent)) ||
                    (normContent.length > 1 && normContent.includes(normLabel));
            });

            if (matchingOption) {
                setVoters(prev => {
                    const existing = prev.find(v => v.username === username);
                    let newVoters;

                    if (existing) {
                        if (!allowChangeRef.current) return prev;
                        newVoters = prev.map(v => v.username === username ? { ...v, optionId: matchingOption.id, votedAt: Date.now() } : v);
                    } else {
                        const newVoter: VoterInfo = {
                            ...msg.user,
                            optionId: matchingOption.id,
                            votedAt: Date.now()
                        };
                        newVoters = [...prev, newVoter];

                        chatService.fetchKickAvatar(username).then(avatar => {
                            if (avatar) {
                                setVoters(current => current.map(v =>
                                    v.username === username ? { ...v, avatar } : v
                                ));
                            }
                        });
                    }

                    // For Streamer: Immediate broadcast on vote
                    setTimeout(() => broadcastState(), 0);
                    return newVoters;
                });
            }
        });
        return () => unsubscribe();
    }, [broadcastState]);

    // Timer
    useEffect(() => {
        let interval: number;
        if (phase === 'VOTING' && timer > 0) {
            interval = window.setInterval(() => {
                setTimer(prev => {
                    const next = prev - 1;
                    if (next % 5 === 0) broadcastState({ timer: next }); // Sync every 5 seconds to reduce messages
                    return next;
                });
            }, 1000);
        } else if (phase === 'VOTING' && timer === 0) {
            setPhase('RESULTS');
            broadcastState({ phase: 'RESULTS', timer: 0 });
        }
        return () => clearInterval(interval);
    }, [phase, timer, broadcastState]);

    // Start voting
    const startVoting = () => {
        const validOptions = options.filter(o => o.label.trim() !== '');
        if (validOptions.length < 2) return;
        setOptions(validOptions);
        setVoters([]);
        setTimer(votingDuration);
        setRevealedOptions(new Set());
        setPhase('VOTING');
        // Initial broadcast
        setTimeout(() => broadcastState({
            phase: 'VOTING',
            options: validOptions,
            timer: votingDuration,
            totalVotes: 0
        }), 100);
    };

    // Reset
    const resetGame = () => {
        setPhase('SETUP');
        setVoters([]);
        setTimer(0);
        setRevealedOptions(new Set());
        broadcastState({ phase: 'SETUP', timer: 0, totalVotes: 0 });
    };

    // End early
    const endVotingEarly = () => {
        setTimer(0);
        setPhase('RESULTS');
        broadcastState({ phase: 'RESULTS', timer: 0 });
    };

    // Copy OBS link
    const copyOBSLink = () => {
        const baseUrl = window.location.origin;
        const link = `${baseUrl}/?obs=true&view=VOTING_GAME&transparent=true`;
        navigator.clipboard.writeText(link);
        setCopiedOBS(true);
        setTimeout(() => setCopiedOBS(false), 2000);
    };



    // Use synced data if in OBS mode
    const currentPhase = isOBS ? (obsData?.phase || 'SETUP') : phase;
    const currentTimer = isOBS ? (obsData?.timer || 0) : timer;
    const currentQuestion = isOBS ? (obsData?.question || '') : question;
    const currentResults = isOBS ? (obsData?.sortedResults || []) : getVoteCounts();
    const currentTotalVotes = isOBS ? (obsData?.totalVotes || 0) : voters.length;
    const winner = currentResults.length > 0 && currentResults[0].count > 0 ? currentResults[0] : null;

    // Format time
    const formatTime = (s: number) => {
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
    };

    // ======================== OBS VIEW ========================
    if (isOBS) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-transparent select-none font-display" dir="rtl">
                {currentPhase === 'SETUP' && (
                    <div className="text-center animate-pulse">
                        <VoteIcon size={80} className="mx-auto text-white/20 mb-4" />
                        <div className="text-white/30 text-2xl font-black italic">في الانتظار...</div>
                    </div>
                )}

                {currentPhase === 'VOTING' && (
                    <div className="w-full max-w-[1200px] px-8 animate-in fade-in duration-700">
                        {/* Question */}
                        {currentQuestion && (
                            <div className="text-center mb-8">
                                <h1 className="text-5xl font-black text-white italic tracking-tight drop-shadow-[0_0_30px_rgba(255,255,255,0.3)]">
                                    {currentQuestion}
                                </h1>
                            </div>
                        )}

                        {/* Timer */}
                        <div className="flex justify-center mb-8">
                            <div className={`px-8 py-3 rounded-full font-black text-3xl ${currentTimer <= 10 ? 'bg-red-600/90 text-white animate-pulse' : 'bg-black/60 text-white/90'} backdrop-blur-xl border border-white/10 shadow-2xl`}>
                                <Clock size={28} className="inline-block ml-3 -mt-1" />
                                {formatTime(currentTimer)}
                            </div>
                        </div>

                        {/* Vote Bars */}
                        <div className="space-y-4">
                            {currentResults.map((result, idx) => {
                                const pct = currentTotalVotes > 0 ? (result.count / currentTotalVotes) * 100 : 0;
                                return (
                                    <div key={result.option.id} className="relative animate-in slide-in-from-right duration-700" style={{ animationDelay: `${idx * 100}ms` }}>
                                        <div className="relative flex items-center gap-4 bg-black/50 backdrop-blur-xl rounded-2xl overflow-hidden border border-white/10 h-[72px]">
                                            {/* Progress Fill */}
                                            <div
                                                className="absolute inset-y-0 left-0 rounded-2xl transition-all duration-1000 ease-out"
                                                style={{
                                                    width: `${pct}%`,
                                                    background: `linear-gradient(90deg, ${result.option.color}90, ${result.option.color}40)`,
                                                }}
                                            />

                                            {/* Content */}
                                            <div className="relative z-10 flex items-center justify-between w-full px-6">
                                                <div className="flex items-center gap-4">
                                                    <span className="text-4xl drop-shadow-lg">{result.option.emoji}</span>
                                                    <span className="text-2xl font-black text-white drop-shadow-lg">{result.option.label}</span>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <span className="text-xl font-black text-white/80 font-mono">{result.count}</span>
                                                    <span className="text-lg font-bold text-white/50">{pct.toFixed(0)}%</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Total */}
                        <div className="text-center mt-6">
                            <span className="text-white/40 font-bold text-lg">إجمالي الأصوات: <span className="text-white font-black text-2xl">{currentTotalVotes}</span></span>
                        </div>
                    </div>
                )}

                {currentPhase === 'RESULTS' && (
                    <div className="w-full max-w-[1200px] px-8 animate-in fade-in zoom-in duration-1000">
                        {/* Winner Announcement */}
                        {winner && (
                            <div className="text-center mb-10">
                                <Crown size={80} className="mx-auto text-yellow-400 mb-4 animate-bounce drop-shadow-[0_0_40px_rgba(250,204,21,0.7)]" />
                                <h1 className="text-7xl font-black text-white italic tracking-tighter mb-2 drop-shadow-2xl">الـنـتـيـجـة</h1>
                            </div>
                        )}

                        {/* Results Bars */}
                        <div className="space-y-4">
                            {currentResults.map((result, idx) => {
                                const pct = currentTotalVotes > 0 ? (result.count / currentTotalVotes) * 100 : 0;
                                const isWinner = idx === 0 && result.count > 0;
                                return (
                                    <div key={result.option.id} className={`relative animate-in slide-in-from-right duration-700 ${isWinner ? 'scale-[1.03]' : ''}`} style={{ animationDelay: `${idx * 150}ms` }}>
                                        <div className={`relative flex items-center gap-4 backdrop-blur-xl rounded-2xl overflow-hidden h-[80px] ${isWinner ? 'bg-yellow-500/10 border-2 border-yellow-500/50 shadow-[0_0_40px_rgba(250,204,21,0.2)]' : 'bg-black/50 border border-white/10'}`}>
                                            <div
                                                className="absolute inset-y-0 left-0 rounded-2xl transition-all duration-1500 ease-out"
                                                style={{
                                                    width: `${pct}%`,
                                                    background: `linear-gradient(90deg, ${result.option.color}${isWinner ? 'cc' : '80'}, ${result.option.color}30)`,
                                                }}
                                            />
                                            <div className="relative z-10 flex items-center justify-between w-full px-6">
                                                <div className="flex items-center gap-4">
                                                    {isWinner && <Crown size={28} className="text-yellow-400 drop-shadow-lg" />}
                                                    <span className="text-4xl drop-shadow-lg">{result.option.emoji}</span>
                                                    <span className={`text-2xl font-black drop-shadow-lg ${isWinner ? 'text-yellow-400' : 'text-white'}`}>{result.option.label}</span>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <span className={`text-2xl font-black font-mono ${isWinner ? 'text-yellow-400' : 'text-white/80'}`}>{result.count}</span>
                                                    <span className="text-lg font-bold text-white/50">{pct.toFixed(1)}%</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="text-center mt-8">
                            <span className="text-white/30 font-bold text-lg">إجمالي الأصوات: <span className="text-white/60 font-black text-2xl">{currentTotalVotes}</span></span>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // ======================== STREAMER DASHBOARD ========================
    return (
        <div className="w-full h-full flex flex-col items-center bg-transparent text-right font-display select-none overflow-auto custom-scrollbar" dir="rtl">
            {/* Background */}
            <div className="absolute inset-0 bg-[#0a0a0a] -z-20" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-purple-900/10 via-transparent to-transparent -z-10" />

            {/* ========== SETUP PHASE ========== */}
            {phase === 'SETUP' && (
                <div className="w-full max-w-5xl mt-8 px-6 pb-20 animate-in fade-in zoom-in duration-700">
                    {/* Title */}
                    <div className="text-center mb-10">
                        <VoteIcon size={70} className="mx-auto text-purple-500 mb-4 drop-shadow-[0_0_30px_rgba(168,85,247,0.5)]" />
                        <h1 className="text-7xl font-black text-white italic tracking-tighter mb-2">لـعـبـة الـتـصـويـت</h1>
                        <p className="text-purple-400 font-black tracking-[0.5em] text-sm uppercase">Live Chat Voting</p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Left: Options */}
                        <div className="space-y-6">
                            {/* Question Input */}
                            <div className="glass-card p-8 rounded-[2.5rem] border border-white/10 bg-white/5 backdrop-blur-2xl">
                                <h3 className="text-xl font-black text-white flex items-center gap-3 mb-6">
                                    <BarChart3 className="text-purple-400" size={24} /> سـؤال الـتـصـويـت
                                </h3>
                                <input
                                    type="text"
                                    value={question}
                                    onChange={e => setQuestion(e.target.value)}
                                    placeholder="مثال: ما هو أفضل لون؟ (اختياري)"
                                    className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-white text-lg font-bold placeholder:text-white/20 focus:outline-none focus:border-purple-500/50 transition-all"
                                />
                            </div>

                            {/* Options List */}
                            <div className="glass-card p-8 rounded-[2.5rem] border border-white/10 bg-white/5 backdrop-blur-2xl">
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-xl font-black text-white flex items-center gap-3">
                                        <Sparkles className="text-yellow-500" size={24} /> الـخـيـارات ({options.length}/20)
                                    </h3>
                                    <button
                                        onClick={addOption}
                                        disabled={options.length >= 20}
                                        className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white rounded-xl font-bold text-sm flex items-center gap-2 transition-all hover:scale-105 disabled:hover:scale-100"
                                    >
                                        <Plus size={16} /> إضافة
                                    </button>
                                </div>

                                <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                                    {options.map((opt, idx) => (
                                        <div key={opt.id} className="flex items-center gap-3 group animate-in slide-in-from-right duration-300" style={{ animationDelay: `${idx * 50}ms` }}>
                                            {/* Color Indicator */}
                                            <div
                                                className="w-3 h-12 rounded-full flex-shrink-0"
                                                style={{ backgroundColor: opt.color }}
                                            />

                                            {/* Emoji Selector */}
                                            <button
                                                onClick={() => {
                                                    const nextEmojiIdx = (EMOJI_POOL.indexOf(opt.emoji) + 1) % EMOJI_POOL.length;
                                                    updateOptionEmoji(opt.id, EMOJI_POOL[nextEmojiIdx]);
                                                }}
                                                className="w-12 h-12 rounded-xl bg-black/40 border border-white/10 flex items-center justify-center text-2xl hover:border-purple-500/50 transition-all flex-shrink-0"
                                                title="تغيير الإيموجي"
                                            >
                                                {opt.emoji}
                                            </button>

                                            {/* Label Input */}
                                            <input
                                                type="text"
                                                value={opt.label}
                                                onChange={e => updateOptionLabel(opt.id, e.target.value)}
                                                placeholder={`الخيار ${idx + 1}`}
                                                className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white font-bold placeholder:text-white/20 focus:outline-none focus:border-purple-500/50 transition-all"
                                            />

                                            {/* Remove */}
                                            <button
                                                onClick={() => removeOption(opt.id)}
                                                disabled={options.length <= 2}
                                                className="w-10 h-10 rounded-xl bg-red-600/10 text-red-500 hover:bg-red-600/30 disabled:opacity-20 flex items-center justify-center transition-all flex-shrink-0"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Right: Settings & Actions */}
                        <div className="space-y-6">
                            {/* Settings */}
                            <div className="glass-card p-8 rounded-[2.5rem] border border-white/10 bg-white/5 backdrop-blur-2xl">
                                <h3 className="text-xl font-black text-white flex items-center gap-3 mb-6">
                                    <Settings className="text-gray-400" size={24} /> إعـدادات الـتـصـويـت
                                </h3>
                                <div className="space-y-6">
                                    {/* Duration */}
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center">
                                            <label className="text-sm font-bold text-gray-400">مدة التصويت (ثانية)</label>
                                            <span className="text-xl font-black text-purple-400">{votingDuration}s</span>
                                        </div>
                                        <input
                                            type="range" min="10" max="300" step="5"
                                            value={votingDuration}
                                            onChange={e => setVotingDuration(+e.target.value)}
                                            className="w-full h-3 bg-white/10 rounded-full appearance-none accent-purple-500 cursor-pointer"
                                        />
                                    </div>

                                    {/* Toggle: Allow change */}
                                    <div className="flex items-center justify-between bg-black/30 px-5 py-4 rounded-2xl border border-white/5">
                                        <span className="font-bold text-gray-300 text-sm">السماح بتغيير الصوت</span>
                                        <button
                                            onClick={() => setAllowChangeVote(!allowChangeVote)}
                                            className={`w-14 h-7 rounded-full transition-all relative ${allowChangeVote ? 'bg-purple-600' : 'bg-zinc-700'}`}
                                        >
                                            <div className={`w-5 h-5 bg-white rounded-full absolute top-1 transition-all ${allowChangeVote ? 'right-1' : 'right-8'}`} />
                                        </button>
                                    </div>

                                    {/* Toggle: Show count */}
                                    <div className="flex items-center justify-between bg-black/30 px-5 py-4 rounded-2xl border border-white/5">
                                        <span className="font-bold text-gray-300 text-sm">عرض عدد المصوتين</span>
                                        <button
                                            onClick={() => setShowVoterCount(!showVoterCount)}
                                            className={`w-14 h-7 rounded-full transition-all relative ${showVoterCount ? 'bg-purple-600' : 'bg-zinc-700'}`}
                                        >
                                            <div className={`w-5 h-5 bg-white rounded-full absolute top-1 transition-all ${showVoterCount ? 'right-1' : 'right-8'}`} />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* OBS Link */}
                            <div className="glass-card p-6 rounded-[2rem] border border-purple-500/20 bg-purple-900/10 backdrop-blur-2xl">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <Monitor className="text-purple-400" size={20} />
                                        <span className="font-black text-white text-sm">رابط OBS</span>
                                    </div>
                                    <button
                                        onClick={copyOBSLink}
                                        className={`px-5 py-2 rounded-xl font-bold text-sm flex items-center gap-2 transition-all ${copiedOBS
                                            ? 'bg-green-500/20 text-green-400 border border-green-500/50'
                                            : 'bg-purple-600 hover:bg-purple-500 text-white border border-purple-400/50'
                                            }`}
                                    >
                                        {copiedOBS ? <><Check size={14} /> تم النسخ</> : <><Copy size={14} /> نسخ الرابط</>}
                                    </button>
                                </div>
                                <p className="text-gray-500 text-xs font-bold leading-relaxed">
                                    أضف هذا الرابط كمصدر Browser في OBS لعرض التصويت المباشر على البث.
                                </p>
                            </div>

                            {/* How to vote info */}
                            <div className="glass-card p-6 rounded-[2rem] border border-white/5 bg-white/[0.02]">
                                <h4 className="font-black text-white text-sm mb-3 flex items-center gap-2">
                                    <Zap className="text-yellow-500" size={18} /> طريقة التصويت
                                </h4>
                                <p className="text-gray-400 text-sm font-bold leading-relaxed">
                                    الجمهور يكتب <span className="text-purple-400">اسم الخيار</span> في الشات للتصويت عليه.
                                    <br />مثال: إذا كانت الخيارات "أحمر" و"أزرق"، يكتب المشاهد <span className="text-white">"أحمر"</span> في الشات.
                                </p>
                            </div>

                            {/* Start Button */}
                            <button
                                onClick={startVoting}
                                disabled={options.filter(o => o.label.trim() !== '').length < 2}
                                className="w-full py-7 bg-gradient-to-l from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:from-zinc-800 disabled:to-zinc-800 disabled:text-zinc-600 text-white font-black text-3xl rounded-[2.5rem] shadow-[0_10px_40px_rgba(168,85,247,0.3)] transition-all transform hover:scale-[1.02] disabled:hover:scale-100 flex items-center justify-center gap-4 border-t-2 border-white/10"
                            >
                                <Play className="fill-white" size={32} /> بـدء الـتـصـويـت
                            </button>
                        </div>
                    </div>

                    <button onClick={onHome} className="mt-10 mx-auto flex items-center gap-2 text-white/30 hover:text-white font-bold transition-all">
                        <ChevronLeft /> خروج
                    </button>
                </div>
            )}

            {/* ========== VOTING PHASE ========== */}
            {phase === 'VOTING' && (
                <div className="w-full flex-1 flex flex-col animate-in fade-in duration-700">
                    {/* Top Bar */}
                    <div className="w-full px-8 py-5 flex justify-between items-center border-b border-white/5 backdrop-blur-md bg-black/20">
                        <div className="flex items-center gap-4">
                            <div className="glass-card px-6 py-2 rounded-full border border-white/10 bg-black/40 flex items-center gap-3">
                                <Users className="text-green-500" size={18} />
                                <div className="text-right">
                                    <div className="text-[9px] font-bold text-gray-500 uppercase">المصوتين</div>
                                    <div className="text-xl font-black text-white">{currentTotalVotes}</div>
                                </div>
                            </div>

                            <button
                                onClick={endVotingEarly}
                                className="px-5 py-2 bg-red-600/80 hover:bg-red-500 text-white rounded-full font-bold text-sm flex items-center gap-2 shadow-lg transition-all hover:scale-105"
                            >
                                <X size={16} /> إنهاء التصويت
                            </button>
                        </div>

                        <div className="text-center">
                            <h2 className="text-4xl font-black text-white italic tracking-tighter">
                                {currentQuestion || 'لـعـبـة الـتـصـويـت'}
                            </h2>
                            <div className="mt-1 flex items-center justify-center gap-2 bg-green-500/10 px-4 py-1 rounded-full border border-green-500/20">
                                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                <span className="text-green-400 font-bold text-xs">اكتب اسم الخيار للتصويت!</span>
                            </div>
                        </div>

                        <div className={`glass-card px-6 py-2 rounded-full border flex items-center gap-3 ${currentTimer <= 10 ? 'border-red-500/50 bg-red-900/20 animate-pulse' : 'border-white/10 bg-black/40'}`}>
                            <Clock className={currentTimer <= 10 ? 'text-red-500' : 'text-purple-500'} size={18} />
                            <div className="text-right">
                                <div className="text-[9px] font-bold text-gray-500 uppercase">الوقت</div>
                                <div className={`text-xl font-black font-mono ${currentTimer <= 10 ? 'text-red-400' : 'text-white'}`}>{formatTime(currentTimer)}</div>
                            </div>
                        </div>
                    </div>

                    {/* Vote Options Grid */}
                    <div className="flex-1 px-8 py-8 overflow-y-auto custom-scrollbar">
                        <div className="max-w-5xl mx-auto space-y-4">
                            {currentResults.map((result, idx) => {
                                const pct = currentTotalVotes > 0 ? (result.count / currentTotalVotes) * 100 : 0;
                                const isRevealed = revealedOptions.has(result.option.id);
                                return (
                                    <div key={result.option.id} className="relative group animate-in slide-in-from-right duration-500" style={{ animationDelay: `${idx * 80}ms` }}>
                                        <div className="relative flex items-center bg-white/[0.04] hover:bg-white/[0.07] backdrop-blur-xl rounded-2xl overflow-hidden border border-white/10 hover:border-white/20 transition-all h-[80px]">
                                            {/* Progress Fill */}
                                            <div
                                                className="absolute inset-y-0 left-0 transition-all duration-700 ease-out rounded-2xl"
                                                style={{
                                                    width: `${pct}%`,
                                                    background: `linear-gradient(90deg, ${result.option.color}70, ${result.option.color}20)`,
                                                }}
                                            />

                                            {/* Content */}
                                            <div className="relative z-10 flex items-center justify-between w-full px-6">
                                                <div className="flex items-center gap-4">
                                                    <div
                                                        className="w-14 h-14 rounded-xl flex items-center justify-center text-3xl border-2 shadow-lg"
                                                        style={{ borderColor: result.option.color, backgroundColor: result.option.color + '20' }}
                                                    >
                                                        {result.option.emoji}
                                                    </div>
                                                    <span className="text-2xl font-black text-white">{result.option.label}</span>
                                                </div>

                                                <div className="flex items-center gap-6">
                                                    {showVoterCount && (
                                                        <div className="flex items-center gap-2">
                                                            <Users size={16} className="text-white/40" />
                                                            <span className="text-xl font-black text-white font-mono">{result.count}</span>
                                                        </div>
                                                    )}
                                                    <span className="text-lg font-bold text-white/50 font-mono w-16 text-left">{pct.toFixed(0)}%</span>

                                                    {/* Show voters toggle */}
                                                    <button
                                                        onClick={() => {
                                                            setRevealedOptions(prev => {
                                                                const next = new Set(prev);
                                                                if (next.has(result.option.id)) next.delete(result.option.id);
                                                                else next.add(result.option.id);
                                                                return next;
                                                            });
                                                        }}
                                                        className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-white/40 hover:text-white transition-all"
                                                    >
                                                        {isRevealed ? <EyeOff size={16} /> : <Eye size={16} />}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Voter Avatars (revealed) */}
                                        {isRevealed && result.voters.length > 0 && (
                                            <div className="mt-2 px-4 py-3 bg-black/40 rounded-xl border border-white/5 flex flex-wrap gap-2 animate-in fade-in slide-in-from-top duration-300">
                                                {result.voters.map(v => (
                                                    <div key={v.username} className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
                                                        <ProAvatar
                                                            url={v.avatar}
                                                            username={v.username}
                                                            size="w-6 h-6"
                                                        />
                                                        <span className="text-xs font-bold text-white/70">{v.username}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* ========== RESULTS PHASE ========== */}
            {phase === 'RESULTS' && (
                <div className="w-full flex-1 flex flex-col animate-in fade-in duration-700">
                    {/* Winner Banner */}
                    {winner && (
                        <div className="w-full py-8 text-center relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-b from-yellow-500/10 to-transparent" />
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-yellow-500/10 blur-[100px] rounded-full" />
                            <div className="relative z-10">
                                <Crown size={60} className="mx-auto text-yellow-400 mb-3 animate-bounce drop-shadow-[0_0_30px_rgba(250,204,21,0.6)]" />
                                <h1 className="text-6xl font-black text-white italic tracking-tighter mb-2 drop-shadow-2xl">
                                    {currentQuestion || 'نـتـائـج الـتـصـويـت'}
                                </h1>
                                <div className="flex items-center justify-center gap-4 mt-3">
                                    <span className="text-5xl">{winner.option.emoji}</span>
                                    <span className="text-4xl font-black text-yellow-400">{winner.option.label}</span>
                                    <span className="text-2xl font-bold text-white/40">({winner.count} صوت)</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Results Grid */}
                    <div className="flex-1 px-8 py-4 overflow-y-auto custom-scrollbar">
                        <div className="max-w-5xl mx-auto space-y-4">
                            {currentResults.map((result, idx) => {
                                const pct = currentTotalVotes > 0 ? (result.count / currentTotalVotes) * 100 : 0;
                                const isWinner = idx === 0 && result.count > 0;
                                return (
                                    <div key={result.option.id} className={`relative animate-in slide-in-from-right duration-700 ${isWinner ? 'scale-[1.02]' : ''}`} style={{ animationDelay: `${idx * 120}ms` }}>
                                        <div className={`relative flex items-center backdrop-blur-xl rounded-2xl overflow-hidden h-[80px] transition-all ${isWinner ? 'bg-yellow-500/10 border-2 border-yellow-500/40 shadow-[0_0_40px_rgba(250,204,21,0.15)]' : 'bg-white/[0.04] border border-white/10'}`}>
                                            <div
                                                className="absolute inset-y-0 left-0 rounded-2xl transition-all duration-1500 ease-out"
                                                style={{
                                                    width: `${pct}%`,
                                                    background: `linear-gradient(90deg, ${result.option.color}${isWinner ? 'aa' : '60'}, ${result.option.color}15)`,
                                                }}
                                            />
                                            <div className="relative z-10 flex items-center justify-between w-full px-6">
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-lg ${isWinner ? 'bg-yellow-500 text-black' : 'bg-white/10 text-white/50'}`}>
                                                        {idx + 1}
                                                    </div>
                                                    <span className="text-3xl">{result.option.emoji}</span>
                                                    <span className={`text-2xl font-black ${isWinner ? 'text-yellow-400' : 'text-white'}`}>{result.option.label}</span>
                                                </div>
                                                <div className="flex items-center gap-6">
                                                    <span className={`text-2xl font-black font-mono ${isWinner ? 'text-yellow-400' : 'text-white/80'}`}>{result.count}</span>
                                                    <span className="text-lg font-bold text-white/40 w-16 text-left">{pct.toFixed(1)}%</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Bottom Actions */}
                    <div className="w-full px-8 py-6 border-t border-white/5 bg-black/30 backdrop-blur-md flex items-center justify-center gap-6">
                        <button onClick={onHome} className="px-10 py-4 bg-white/5 hover:bg-white/10 text-white font-bold rounded-2xl transition-all border border-white/10 hover:border-white/20 flex items-center gap-3">
                            <ChevronLeft size={20} /> الرئيسية
                        </button>
                        <button onClick={resetGame} className="px-10 py-4 bg-gradient-to-l from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black rounded-2xl shadow-[0_0_30px_rgba(168,85,247,0.3)] transition-all hover:scale-105 flex items-center gap-3">
                            <RotateCcw size={20} /> تصويت جديد
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
