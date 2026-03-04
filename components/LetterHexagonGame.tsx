import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { chatService } from '../services/chatService';
import { supabase } from '../services/supabase';
import { LETTER_GAME_QUESTIONS } from '../data/letter_game_data';
import { HexCellData, LetterQuestion } from '../types';
import { Home, LogOut, Check, X, Shield, Trophy, Smartphone, AlertTriangle, Users, Play, Settings, Paintbrush, Clock, ListOrdered, BrainCircuit } from 'lucide-react';
import { ProAvatar } from './ProAvatar';

interface LetterHexagonGameProps {
    onHome: () => void;
}

const SidebarPortal = ({ children }: { children?: React.ReactNode }) => {
    const [mounted, setMounted] = useState(false);
    useEffect(() => { setMounted(true); return () => setMounted(false); }, []);
    const el = document.getElementById('game-sidebar-portal');
    if (!mounted || !el) return null;
    return createPortal(children, el);
};

// 28 Arabic letters exactly matching our 28-cell grid (6,5,6,5,6)
const ARABIC_LETTERS = ['أ', 'ب', 'ت', 'ث', 'ج', 'ح', 'خ', 'د', 'ذ', 'ر', 'ز', 'س', 'ش', 'ص', 'ض', 'ط', 'ظ', 'ع', 'غ', 'ف', 'ق', 'ك', 'ل', 'م', 'ن', 'هـ', 'و', 'ي'];
const GRID_LAYOUT = [6, 5, 6, 5, 6];

// Helper to classify kick colors into Girls (Pink, Purple, White) vs Boys (Blue, Green, etc)
function getTeamByColor(hexColor: string): 'team1' | 'team2' {
    if (!hexColor) return 'team2'; // Default Boys
    let hex = hexColor.replace(/^#/, '');
    if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');

    const r = parseInt(hex.substring(0, 2), 16) || 0;
    const g = parseInt(hex.substring(2, 4), 16) || 0;
    const b = parseInt(hex.substring(4, 6), 16) || 0;

    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0;
    if (max !== min) {
        const d = max - min;
        if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
        else if (max === g) h = (b - r) / d + 2;
        else if (max === b) h = (r - g) / d + 4;
        h /= 6;
    }
    h *= 360;

    const s = max === 0 ? 0 : (max - min) / max;
    const v = max / 255;

    // White, Pink, Red, Purple -> Girls (team1)
    if (s < 0.15 && v > 0.8) return 'team1'; // White
    if (h >= 250 || h <= 20) return 'team1'; // Pink, Purple, Red

    // Blue, Cyan, Green, Yellow -> Boys (team2)
    return 'team2';
}

interface Player {
    username: string;
    avatar: string;
    color: string;
    team: 'team1' | 'team2';
}

export const LetterHexagonGame: React.FC<LetterHexagonGameProps> = ({ onHome }) => {
    // Game States
    const [lobbyPlayers, setLobbyPlayers] = useState<Player[]>([]);
    const [gameStage, setGameStage] = useState<'lobby' | 'playing' | 'ended'>('lobby');
    const [cells, setCells] = useState<HexCellData[]>([]);
    const [activeCell, setActiveCell] = useState<HexCellData | null>(null);
    const [currentQuestion, setCurrentQuestion] = useState<LetterQuestion | null>(null);
    const [fastestPlayer, setFastestPlayer] = useState<{ name: string, team: 'team1' | 'team2', time: number, avatar?: string } | null>(null);
    const [winner, setWinner] = useState<'team1' | 'team2' | null>(null);

    // Settings (6+)
    const [entryKeyword, setEntryKeyword] = useState('دخول');
    const [allowJoin, setAllowJoin] = useState(false);
    const [difficulty, setDifficulty] = useState<'normal' | 'hard'>('normal');
    const [answerMode, setAnswerMode] = useState<'buzzer' | 'chat'>('buzzer');
    const [timerDuration, setTimerDuration] = useState(15);
    const [team1Name, setTeam1Name] = useState('فريق البنات 🌸');
    const [team2Name, setTeam2Name] = useState('فريق الأولاد 🧊');

    const channelRef = useRef<any>(null);

    // Chat listener for Lobby (Joining) & Gameplay (Answering if Chat Mode)
    useEffect(() => {
        const cleanup = chatService.onMessage(async (msg) => {
            // Join Logic
            if (gameStage === 'lobby' && allowJoin && msg.content.trim() === entryKeyword) {
                const u = msg.user.username;
                const c = msg.user.color || '#ffffff';
                setLobbyPlayers(prev => {
                    if (prev.find(p => p.username === u)) return prev;
                    const team = getTeamByColor(c);
                    return [...prev, { username: u, color: c, team, avatar: '' }];
                });

                // Fetch avatar async and update
                chatService.fetchKickAvatar(u).then(avatar => {
                    setLobbyPlayers(prev => prev.map(p => p.username === u ? { ...p, avatar } : p));
                });
            }

            // Chat Answer Logic
            if (gameStage === 'playing' && answerMode === 'chat' && activeCell && currentQuestion && !fastestPlayer) {
                // Anyone answers in chat
                setFastestPlayer({
                    name: msg.user.username,
                    team: lobbyPlayers.find(p => p.username === msg.user.username)?.team || getTeamByColor(msg.user.color),
                    time: Date.now(),
                    avatar: msg.user.avatar || '',
                });
                try {
                    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
                    audio.volume = 0.8;
                    audio.play();
                } catch (e) { }
            }
        });
        return cleanup;
    }, [gameStage, allowJoin, entryKeyword, answerMode, activeCell, currentQuestion, fastestPlayer, lobbyPlayers]);

    // Setup Realtime for Smart Buzzers
    useEffect(() => {
        if (answerMode !== 'buzzer') return;

        channelRef.current = supabase.channel('buzzer_channel')
            .on('broadcast', { event: 'BUZZ' }, (payload) => {
                if (gameStage !== 'playing' || !currentQuestion || fastestPlayer) return;

                const { username, team, timestamp, avatar } = payload.payload;
                setFastestPlayer({ name: username, team: team, time: timestamp, avatar: avatar });

                try {
                    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
                    audio.volume = 0.8;
                    audio.play();
                } catch (e) { }
            })
            .subscribe();

        return () => {
            if (channelRef.current) supabase.removeChannel(channelRef.current);
        };
    }, [gameStage, currentQuestion, fastestPlayer, answerMode]);


    const startGame = () => {
        // Shuffle letters
        const shuffled = [...ARABIC_LETTERS].sort(() => Math.random() - 0.5);
        let lIdx = 0;
        const initialCells: HexCellData[] = [];
        GRID_LAYOUT.forEach((cols, rowIdx) => {
            for (let colIdx = 0; colIdx < cols; colIdx++) {
                initialCells.push({ id: initialCells.length, row: rowIdx, col: colIdx, letter: shuffled[lIdx++], owner: 'none' });
            }
        });
        setCells(initialCells);
        setGameStage('playing');
        setWinner(null);
        setAllowJoin(false);
    };

    const selectCell = (cell: HexCellData) => {
        if (cell.owner !== 'none' || winner) return;
        setActiveCell(cell);
        setFastestPlayer(null);

        // Fetch difficulty-based questions later (simulated for now by using different offset or filtering if we add hard ones)
        // Since we only have 100 in data, we just randomize from all for now.
        const availableQs = LETTER_GAME_QUESTIONS.filter(q => q.letter === cell.letter);
        const randomQ = availableQs[Math.floor(Math.random() * availableQs.length)];
        setCurrentQuestion(randomQ || { id: 999, letter: cell.letter, question: `سؤال صعب لحرف ${cell.letter}؟`, answer: 'الجواب' });
    };

    const markAnswer = (isCorrect: boolean) => {
        if (!activeCell || !fastestPlayer) return;
        const winningTeam = isCorrect ? fastestPlayer.team : (fastestPlayer.team === 'team1' ? 'team2' : 'team1');
        setCells(prev => prev.map(c => c.id === activeCell.id ? { ...c, owner: winningTeam } : c));
        setActiveCell(null);
        setCurrentQuestion(null);
        setFastestPlayer(null);
    };

    const assignCellManually = (team: 'team1' | 'team2') => {
        if (!activeCell) return;
        setCells(prev => prev.map(c => c.id === activeCell.id ? { ...c, owner: team } : c));
        setActiveCell(null);
        setCurrentQuestion(null);
        setFastestPlayer(null);
    };

    // Styling helpers
    const getTeamStyle = (teamId: 'team1' | 'team2' | 'none') => {
        if (teamId === 'team1') return 'from-pink-500 to-purple-600 border-pink-400 shadow-[0_0_20px_rgba(236,72,153,0.8)]'; // Girls
        if (teamId === 'team2') return 'from-blue-500 to-emerald-500 border-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.8)]'; // Boys
        return 'from-white to-gray-200 border-white shadow-[inset_0_5px_15px_rgba(0,0,0,0.1)]';
    };

    const getTeamTextColor = (teamId: 'team1' | 'team2' | 'none') => {
        if (teamId === 'none') return 'text-[#2e1065]';
        return 'text-white drop-shadow-md';
    };

    // Render logic
    const girls = lobbyPlayers.filter(p => p.team === 'team1');
    const boys = lobbyPlayers.filter(p => p.team === 'team2');

    return (
        <>
            <SidebarPortal>
                <div className="bg-black/80 backdrop-blur-2xl p-6 rounded-[2.5rem] border-2 border-white/5 space-y-6 animate-in slide-in-from-right duration-500 shadow-2xl relative w-full h-[85vh] overflow-y-auto custom-scrollbar">
                    <div className="flex items-center justify-between sticky top-0 bg-black/50 p-2 rounded-xl backdrop-blur-md z-10">
                        <h4 className="text-[14px] font-black text-white uppercase tracking-widest flex items-center gap-3">
                            <Shield size={18} className="text-blue-500" /> إعدادات حروف
                        </h4>
                        <button onClick={onHome} className="p-2.5 bg-red-500/20 hover:bg-red-500/40 text-red-500 rounded-2xl transition-all border border-red-500/30"><LogOut size={16} /></button>
                    </div>

                    <div className="space-y-6 pb-20">
                        {/* 6+ SETTINGS */}
                        <div className="grid grid-cols-1 gap-4">
                            {/* 1. Keyword */}
                            <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                                <label className="flex items-center gap-2 text-xs text-gray-400 font-bold mb-2 uppercase tracking-widest"><Play size={14} className="text-yellow-500" /> كلمة الدخول</label>
                                <input value={entryKeyword} onChange={e => setEntryKeyword(e.target.value)} disabled={gameStage !== 'lobby'} className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white font-bold disabled:opacity-50 text-center" />
                                {gameStage === 'lobby' && (
                                    <button
                                        onClick={() => setAllowJoin(!allowJoin)}
                                        className={`w-full mt-3 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${allowJoin ? 'bg-red-500/20 text-red-500 border border-red-500/30' : 'bg-green-500/20 text-green-500 border border-green-500/30'}`}
                                    >
                                        <Users size={16} /> {allowJoin ? 'إيقاف الانضمام' : 'فتح باب الانضمام'}
                                    </button>
                                )}
                            </div>

                            {/* 2 & 3. Team Names */}
                            <div className="bg-white/5 p-4 rounded-2xl border border-white/10 grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[10px] text-pink-400 font-bold mb-1 block">اسم فريق البنات (زهري/ابيض/بنفسجي)</label>
                                    <input value={team1Name} onChange={e => setTeam1Name(e.target.value)} disabled={gameStage !== 'lobby'} className="w-full bg-black/50 border border-pink-500/30 rounded-lg p-2 text-white text-xs font-bold" />
                                </div>
                                <div>
                                    <label className="text-[10px] text-blue-400 font-bold mb-1 block">اسم فريق الأولاد (أزرق/أخضر)</label>
                                    <input value={team2Name} onChange={e => setTeam2Name(e.target.value)} disabled={gameStage !== 'lobby'} className="w-full bg-black/50 border border-blue-500/30 rounded-lg p-2 text-white text-xs font-bold" />
                                </div>
                            </div>

                            {/* 4. Answer Mode */}
                            <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                                <label className="flex items-center gap-2 text-xs text-gray-400 font-bold mb-2 uppercase tracking-widest"><Smartphone size={14} className="text-purple-500" /> طريقة الإجابة</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button onClick={() => setAnswerMode('buzzer')} disabled={gameStage !== 'lobby'} className={`py-2 rounded-xl text-xs font-bold transition-all border ${answerMode === 'buzzer' ? 'bg-purple-600 border-purple-400 text-white shadow-[0_0_15px_rgba(147,51,234,0.5)]' : 'bg-black/50 border-white/10 text-gray-400'}`}>جرس ذكي</button>
                                    <button onClick={() => setAnswerMode('chat')} disabled={gameStage !== 'lobby'} className={`py-2 rounded-xl text-xs font-bold transition-all border ${answerMode === 'chat' ? 'bg-purple-600 border-purple-400 text-white shadow-[0_0_15px_rgba(147,51,234,0.5)]' : 'bg-black/50 border-white/10 text-gray-400'}`}>مباشرة من الشات</button>
                                </div>
                            </div>

                            {/* 5. Difficulty */}
                            <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                                <label className="flex items-center gap-2 text-xs text-gray-400 font-bold mb-2 uppercase tracking-widest"><BrainCircuit size={14} className="text-orange-500" /> مستوى الصعوبة</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button onClick={() => setDifficulty('normal')} disabled={gameStage !== 'lobby'} className={`py-2 rounded-xl text-xs font-bold transition-all border ${difficulty === 'normal' ? 'bg-orange-600 border-orange-400 text-white shadow-[0_0_15px_rgba(234,88,12,0.5)]' : 'bg-black/50 border-white/10 text-gray-400'}`}>عادي</button>
                                    <button onClick={() => setDifficulty('hard')} disabled={gameStage !== 'lobby'} className={`py-2 rounded-xl text-xs font-bold transition-all border ${difficulty === 'hard' ? 'bg-orange-600 border-orange-400 text-white shadow-[0_0_15px_rgba(234,88,12,0.5)]' : 'bg-black/50 border-white/10 text-gray-400'}`}>صعب ومتقدم (200 سؤال)</button>
                                </div>
                            </div>

                            {/* 6. Timer Duration */}
                            <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                                <label className="flex items-center justify-between text-xs text-gray-400 font-bold mb-2 uppercase tracking-widest">
                                    <span className="flex items-center gap-2"><Clock size={14} className="text-emerald-500" /> الوقت (ثواني)</span>
                                    <span className="text-emerald-400">{timerDuration} ثانية</span>
                                </label>
                                <input type="range" min="10" max="60" step="5" value={timerDuration} onChange={e => setTimerDuration(parseInt(e.target.value))} disabled={gameStage !== 'lobby'} className="w-full accent-emerald-500" />
                            </div>

                            {gameStage === 'lobby' && (
                                <button onClick={startGame} className="w-full bg-gradient-to-r from-emerald-500 to-emerald-700 hover:scale-[1.02] active:scale-95 transition-all py-4 rounded-2xl font-black text-white text-xl mt-4 shadow-[0_10px_30px_rgba(16,185,129,0.4)] flex items-center justify-center gap-3 uppercase">
                                    <Play fill="currentColor" /> جــــــــــــاهز
                                </button>
                            )}
                        </div>

                        {/* Host Game Controls (During Game) */}
                        {gameStage === 'playing' && (
                            <div className="space-y-4 animate-in fade-in pt-4 border-t border-white/10">
                                {answerMode === 'buzzer' && (
                                    <div className="flex items-center gap-2 p-3 bg-indigo-500/20 border border-indigo-500/40 rounded-xl relative overflow-hidden group">
                                        <div className="absolute inset-0 bg-indigo-500/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                                        <Smartphone className="text-indigo-400" size={24} />
                                        <div className="text-xs font-bold text-indigo-300 leading-tight">
                                            <span>رابط جرس الذكي للمشاركين:</span><br />
                                            <span className="text-white text-base font-black tracking-widest">iabs-arena.com/?view=BUZZER_PAD</span>
                                        </div>
                                    </div>
                                )}

                                {activeCell && currentQuestion && (
                                    <div className="bg-white/5 p-5 rounded-3xl border border-white/10 space-y-5 animate-in slide-in-from-bottom duration-300 shadow-[0_10px_40px_rgba(0,0,0,0.5)] relative overflow-hidden">

                                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 via-pink-500 to-red-500"></div>

                                        <div className="flex justify-between items-center text-sm font-black text-gray-400 bg-black/40 px-4 py-2 rounded-full border border-white/5 inline-flex w-fit mx-auto">
                                            <span>سؤال حرف: <span className="text-white text-lg">{activeCell.letter}</span></span>
                                        </div>

                                        <p className="text-white text-2xl font-black leading-relaxed mt-2 text-center drop-shadow-lg">{currentQuestion.question}</p>

                                        <div className="p-4 bg-emerald-500/10 border-2 border-emerald-500/30 rounded-2xl text-center relative overflow-hidden">
                                            <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/20 rounded-full blur-xl translate-x-1/2 -translate-y-1/2"></div>
                                            <span className="text-xs font-black text-emerald-500 uppercase block mb-1 tracking-widest">الجواب الصحيح المخفي</span>
                                            <span className="text-3xl font-black text-emerald-50 drop-shadow-[0_2px_5px_rgba(16,185,129,0.5)]">{currentQuestion.answer}</span>
                                        </div>

                                        {fastestPlayer ? (
                                            <div className="space-y-4 pt-2">
                                                <div className="text-center text-xs font-bold text-gray-500 uppercase tracking-widest">🔔 تم الضغط!</div>
                                                <div className={`p-4 rounded-2xl border-[3px] flex flex-col items-center justify-center gap-3 animate-in zoom-in duration-300 shadow-2xl ${fastestPlayer.team === 'team1' ? 'bg-pink-950/50 border-pink-500' : 'bg-blue-950/50 border-blue-500'}`}>
                                                    <div className="relative">
                                                        {fastestPlayer.avatar ? (
                                                            <img src={fastestPlayer.avatar} className="w-16 h-16 rounded-full border-4 border-white/20 shadow-lg" />
                                                        ) : (
                                                            <div className="w-16 h-16 rounded-full bg-white/10 border-4 border-white/20 flex items-center justify-center font-black text-white text-xl">{fastestPlayer.name[0]}</div>
                                                        )}
                                                        <div className={`absolute -bottom-2 -right-2 w-8 h-8 rounded-full border-2 border-white flex items-center justify-center ${fastestPlayer.team === 'team1' ? 'bg-pink-500' : 'bg-blue-500'}`}>
                                                            {fastestPlayer.team === 'team1' ? '🌸' : '🧊'}
                                                        </div>
                                                    </div>
                                                    <div className="text-center">
                                                        <div className="text-white font-black text-2xl drop-shadow-md">{fastestPlayer.name}</div>
                                                        <div className={`text-xs font-bold px-3 py-1 mt-1 rounded-full border mx-auto w-fit ${fastestPlayer.team === 'team1' ? 'text-pink-300 border-pink-500/30 bg-pink-500/10' : 'text-blue-300 border-blue-500/30 bg-blue-500/10'}`}>
                                                            {fastestPlayer.team === 'team1' ? team1Name : team2Name}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 gap-3 mt-4">
                                                    <button onClick={() => markAnswer(true)} className="bg-gradient-to-t from-emerald-700 to-emerald-500 hover:opacity-90 active:scale-95 text-white font-black text-lg py-4 rounded-2xl flex flex-col justify-center items-center gap-1 shadow-[0_10px_20px_rgba(16,185,129,0.3)] border border-emerald-400">
                                                        <Check size={24} /> صحيح
                                                    </button>
                                                    <button onClick={() => markAnswer(false)} className="bg-gradient-to-t from-red-700 to-red-500 hover:opacity-90 active:scale-95 text-white font-black text-lg py-4 rounded-2xl flex flex-col justify-center items-center gap-1 shadow-[0_10px_20px_rgba(220,38,38,0.3)] border border-red-400">
                                                        <X size={24} /> خاطئ
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center gap-3 p-8 bg-black/40 rounded-2xl border border-white/5 animate-pulse">
                                                <div className="w-12 h-12 rounded-full border-b-2 border-r-2 border-purple-500 animate-spin"></div>
                                                <span className="text-sm font-bold text-gray-400">بانتظار إجابة الأبطال...</span>
                                            </div>
                                        )}

                                        {/* Fallback override */}
                                        <div className="pt-4 mt-2">
                                            <p className="text-[10px] text-center text-gray-500 mb-2 uppercase tracking-widest border-b border-white/10 pb-2 w-fit mx-auto">تجاوز وتعيين الخلية يدوياً</p>
                                            <div className="grid grid-cols-2 gap-2 mt-2">
                                                <button onClick={() => assignCellManually('team1')} className="bg-pink-600/10 hover:bg-pink-600/30 text-pink-400 hover:text-white text-xs font-bold py-2 rounded-xl border border-pink-500/30 transition-all">للبنات 🌸</button>
                                                <button onClick={() => assignCellManually('team2')} className="bg-blue-600/10 hover:bg-blue-600/30 text-blue-400 hover:text-white text-xs font-bold py-2 rounded-xl border border-blue-500/30 transition-all">للأولاد 🧊</button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </SidebarPortal>

            {/* Main Full-Screen Game Area */}
            <div className="w-full h-full flex flex-col relative overflow-hidden bg-[#0A0A14] select-none" dir="rtl">

                {/* Background Styling */}
                <div className="absolute inset-0 flex z-0">
                    <div className="w-1/2 h-full bg-gradient-to-br from-pink-900/40 via-purple-900/30 to-black/90"></div>
                    <div className="w-1/2 h-full bg-gradient-to-bl from-blue-900/40 via-cyan-900/30 to-black/90"></div>
                    {/* Add some grid overlay */}
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] mix-blend-overlay"></div>
                    <div className="absolute inset-x-0 bottom-0 h-[50vh] bg-gradient-to-t from-black via-black/80 to-transparent"></div>
                </div>

                {/* Top Headers */}
                <div className="relative z-10 w-full flex justify-between items-start p-8 pb-0">
                    {/* Logo */}
                    <div className="absolute top-8 left-1/2 transform -translate-x-1/2 text-center animate-in slide-in-from-top-10 duration-1000">
                        <h1 className="text-6xl md:text-8xl font-black italic">
                            <span className="text-yellow-400 mr-4 drop-shadow-[0_5px_15px_rgba(250,204,21,0.5)]">حروف</span>
                            <span className="text-blue-500 mr-4 drop-shadow-[0_5px_15px_rgba(59,130,246,0.5)]">مع</span>
                            <span className="text-red-500 drop-shadow-[0_5px_20px_rgba(239,68,68,0.7)] uppercase tracking-tighter">حمودي</span>
                        </h1>
                        <p className="text-white/40 font-black tracking-[0.5em] text-sm mt-4 uppercase">حرب البنات والأولاد</p>
                    </div>

                    {/* Team 1 Score Info / Girls */}
                    <div className="bg-black/60 backdrop-blur-md border-[3px] border-pink-500/50 rounded-[2rem] p-6 text-center w-72 shadow-[0_10px_30px_rgba(236,72,153,0.3)] animate-in slide-in-from-right duration-700 z-20">
                        <div className="w-16 h-16 rounded-full bg-pink-500/20 border-2 border-pink-400 mx-auto mb-3 flex items-center justify-center text-3xl">🌸</div>
                        <h2 className="text-pink-400 font-black text-2xl truncate">{team1Name}</h2>
                        <p className="text-xs text-pink-500/60 font-bold mt-1 uppercase tracking-widest">من الأعلى للأسفل</p>
                        <div className="mt-4 pt-4 border-t border-pink-500/20 grid grid-cols-5 gap-1 max-h-48 overflow-y-auto custom-scrollbar-pink">
                            {girls.map(p => (
                                <ProAvatar key={p.username} username={p.username} url={p.avatar} size="w-10 h-10" />
                            ))}
                        </div>
                    </div>

                    {/* Team 2 Score Info / Boys */}
                    <div className="bg-black/60 backdrop-blur-md border-[3px] border-blue-500/50 rounded-[2rem] p-6 text-center w-72 shadow-[0_10px_30px_rgba(59,130,246,0.3)] animate-in slide-in-from-left duration-700 z-20">
                        <div className="w-16 h-16 rounded-full bg-blue-500/20 border-2 border-blue-400 mx-auto mb-3 flex items-center justify-center text-3xl">🧊</div>
                        <h2 className="text-blue-400 font-black text-2xl truncate">{team2Name}</h2>
                        <p className="text-xs text-blue-500/60 font-bold mt-1 uppercase tracking-widest">من اليمين لليسار</p>
                        <div className="mt-4 pt-4 border-t border-blue-500/20 grid grid-cols-5 gap-1 max-h-48 overflow-y-auto custom-scrollbar-blue">
                            {boys.map(p => (
                                <ProAvatar key={p.username} username={p.username} url={p.avatar} size="w-10 h-10" />
                            ))}
                        </div>
                    </div>
                </div>

                {/* THE LOBBY OR BOARD */}
                <div className="flex-1 w-full relative z-10 flex items-center justify-center p-8 mt-12 md:mt-24">
                    {gameStage === 'lobby' ? (
                        <div className="max-w-4xl w-full bg-black/60 border border-white/10 rounded-[3rem] p-16 text-center backdrop-blur-xl shadow-2xl animate-in fade-in zoom-in duration-700">
                            <Trophy className="mx-auto text-yellow-500 w-24 h-24 mb-6 drop-shadow-[0_0_30px_rgba(234,179,8,0.5)]" />
                            <h2 className="text-5xl font-black text-white italic mb-4">قائمة الانتظار</h2>
                            {allowJoin ? (
                                <div className="inline-block bg-white/10 px-8 py-4 rounded-full border-2 border-white/20 text-white font-bold text-2xl mb-8 shadow-inner animate-pulse">
                                    أكتب <span className="text-yellow-400 font-black mx-2 text-3xl">[{entryKeyword}]</span> في الشات للانضمام!
                                </div>
                            ) : (
                                <div className="text-gray-500 font-bold text-xl uppercase tracking-widest mb-8">الانضمام مغلق حالياً</div>
                            )}

                            <div className="flex items-center justify-center gap-12 mt-8">
                                <div className="text-center">
                                    <div className="text-6xl font-black text-pink-500 drop-shadow-md mb-2">{girls.length}</div>
                                    <div className="text-pink-400 font-bold uppercase tracking-widest text-sm">البنات</div>
                                </div>
                                <div className="h-20 w-px bg-white/20"></div>
                                <div className="text-center">
                                    <div className="text-6xl font-black text-blue-500 drop-shadow-md mb-2">{boys.length}</div>
                                    <div className="text-blue-400 font-bold uppercase tracking-widest text-sm">الأولاد</div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* The Hexagon Board */
                        <div className="relative animate-in zoom-in duration-1000 delay-300" style={{ width: `${110 * 6 + 110 / 2}px`, height: `${127 * 0.75 * 5 + 127 / 4}px` }}> {/* Scaled up 1.2x */}
                            {cells.map(cell => {
                                const hexW = 110;
                                const hexH = 127;
                                const rowH = hexH * 0.75;
                                const colW = hexW;

                                const isOffset = cell.row % 2 !== 0;
                                const left = (cell.col * colW) + (isOffset ? colW / 2 : 0);
                                const top = cell.row * rowH;

                                const isActive = activeCell?.id === cell.id;

                                return (
                                    <div
                                        key={cell.id}
                                        onClick={() => gameStage === 'playing' && selectCell(cell)}
                                        className={`absolute flex items-center justify-center cursor-pointer transition-all duration-300
                                            ${isActive ? 'scale-[1.15] z-50 animate-pulse drop-shadow-[0_0_30px_rgba(255,255,255,0.8)]' : 'hover:scale-105 hover:z-40 z-10'}
                                        `}
                                        style={{
                                            left: `${left}px`,
                                            top: `${top}px`,
                                            width: `${hexW}px`,
                                            height: `${hexH}px`,
                                            clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
                                        }}
                                    >
                                        <div className={`w-full h-full flex flex-col items-center justify-center border-4 border-black/50 bg-gradient-to-br ${getTeamStyle(cell.owner)} transition-colors duration-500 relative`}>
                                            <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/30 to-transparent"></div> {/* Glass shine */}
                                            <span className={`text-5xl font-black drop-shadow-xl ${getTeamTextColor(cell.owner)} mt-2`}>
                                                {cell.letter}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

            </div>

            <style>{`
                .custom-scrollbar-pink::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar-pink::-webkit-scrollbar-track { background: rgba(236,72,153,0.1); border-radius: 4px; }
                .custom-scrollbar-pink::-webkit-scrollbar-thumb { background: rgba(236,72,153,0.5); border-radius: 4px; }
                .custom-scrollbar-blue::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar-blue::-webkit-scrollbar-track { background: rgba(59,130,246,0.1); border-radius: 4px; }
                .custom-scrollbar-blue::-webkit-scrollbar-thumb { background: rgba(59,130,246,0.5); border-radius: 4px; }
            `}</style>
        </>
    );
};
