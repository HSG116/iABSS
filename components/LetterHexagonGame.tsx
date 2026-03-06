import React, { useState, useEffect, useRef } from 'react';
import { chatService } from '../services/chatService';
import { supabase } from '../services/supabase';
import { LETTER_GAME_QUESTIONS } from '../data/letter_game_data';
import { HexCellData, LetterQuestion } from '../types';
import { Home, LogOut, Check, X, Shield, Trophy, Smartphone, AlertTriangle, Users, Play, Settings, Paintbrush, Clock, ListOrdered, BrainCircuit, PartyPopper, RefreshCw, ArrowLeft, ArrowRight, Stars, Sparkles, Crown, Heart, BellRing, Volume2 } from 'lucide-react';
import { ProAvatar } from './ProAvatar';

interface LetterHexagonGameProps {
    onHome: () => void;
}

// 28 Arabic letters exactly matching our 28-cell grid (6,5,6,5,6)
const ARABIC_LETTERS = ['أ', 'ب', 'ت', 'ث', 'ج', 'ح', 'خ', 'د', 'ذ', 'ر', 'ز', 'س', 'ش', 'ص', 'ض', 'ط', 'ظ', 'ع', 'غ', 'ف', 'ق', 'ك', 'ل', 'م', 'ن', 'هـ', 'و', 'ي'];
const GRID_LAYOUT = [6, 5, 6, 5, 6];

function getTeamByColor(hexColor: string): 'team1' | 'team2' {
    if (!hexColor) return 'team2';
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
    if (s < 0.15 && v > 0.8) return 'team1';
    if (h >= 250 || h <= 20) return 'team1';
    return 'team2';
}

interface Player {
    username: string;
    avatar: string;
    color: string;
    team: 'team1' | 'team2';
}

type Stage = 'settings' | 'lobby' | 'playing' | 'ended';

export const LetterHexagonGame: React.FC<LetterHexagonGameProps> = ({ onHome }) => {
    // Stage Management
    const [stage, setStage] = useState<Stage>('settings');

    // Game Data States
    const [lobbyPlayers, setLobbyPlayers] = useState<Player[]>([]);
    const [cells, setCells] = useState<HexCellData[]>([]);
    const [activeCell, setActiveCell] = useState<HexCellData | null>(null);
    const [currentQuestion, setCurrentQuestion] = useState<LetterQuestion | null>(null);
    const [winner, setWinner] = useState<'team1' | 'team2' | null>(null);
    const [winningPath, setWinningPath] = useState<number[]>([]);

    // Settings
    const [entryKeyword, setEntryKeyword] = useState('دخول');
    const [allowJoin, setAllowJoin] = useState(false);
    const [difficulty, setDifficulty] = useState<'normal' | 'hard'>('normal');
    const [answerMode, setAnswerMode] = useState<'buzzer' | 'chat'>('chat');
    const [timerDuration, setTimerDuration] = useState(7);
    const [team1Name, setTeam1Name] = useState('فريق البنات 🌸');
    const [team2Name, setTeam2Name] = useState('فريق الأولاد 🧊');

    // Chat Bell Game Logic
    const [buzzedTeam, setBuzzedTeam] = useState<'team1' | 'team2' | null>(null);
    const [buzzedPlayer, setBuzzedPlayer] = useState<Player | null>(null);
    const [answerTimer, setAnswerTimer] = useState<number>(0);
    const [triedTeams, setTriedTeams] = useState<('team1' | 'team2')[]>([]);
    const [lastAnswer, setLastAnswer] = useState<{ text: string, correct: boolean | null }>({ text: '', correct: null });

    const channelRef = useRef<any>(null);

    // Board Geometry (Matching image-match quality)
    const HEX_SIZE = 55;
    const HEX_WIDTH = Math.sqrt(3) * HEX_SIZE;
    const HEX_HEIGHT = 2 * HEX_SIZE;
    const X_OFFSET = HEX_WIDTH;
    const Y_OFFSET = HEX_HEIGHT * 0.75;
    const STROKE_WIDTH = 8;
    const SVG_WIDTH = HEX_WIDTH + STROKE_WIDTH;
    const SVG_HEIGHT = HEX_HEIGHT + STROKE_WIDTH;

    const hexPoints = [
        [0 + STROKE_WIDTH / 2, HEX_SIZE / 2 + STROKE_WIDTH / 2],
        [HEX_WIDTH / 2 + STROKE_WIDTH / 2, 0 + STROKE_WIDTH / 2],
        [HEX_WIDTH + STROKE_WIDTH / 2, HEX_SIZE / 2 + STROKE_WIDTH / 2],
        [HEX_WIDTH + STROKE_WIDTH / 2, HEX_SIZE * 1.5 + STROKE_WIDTH / 2],
        [HEX_WIDTH / 2 + STROKE_WIDTH / 2, HEX_HEIGHT + STROKE_WIDTH / 2],
        [0 + STROKE_WIDTH / 2, HEX_SIZE * 1.5 + STROKE_WIDTH / 2]
    ].map(p => `${p[0].toFixed(2)},${p[1].toFixed(2)}`).join(' ');

    const boardWidth = 6 * X_OFFSET + X_OFFSET / 2;
    const boardHeight = 4 * Y_OFFSET + HEX_HEIGHT + STROKE_WIDTH;

    // Chat listener (Main Bell Game logic)
    useEffect(() => {
        const cleanup = chatService.onMessage(async (msg) => {
            if (stage === 'lobby' && allowJoin && msg.content.trim() === entryKeyword) {
                const u = msg.user.username;
                const c = msg.user.color || '#ffffff';
                setLobbyPlayers(prev => {
                    if (prev.find(p => p.username === u)) return prev;
                    const team = getTeamByColor(c);
                    return [...prev, { username: u, color: c, team, avatar: '' }];
                });
                chatService.fetchKickAvatar(u).then(avatar => {
                    setLobbyPlayers(prev => prev.map(p => p.username === u ? { ...p, avatar } : p));
                });
            }

            if (stage === 'playing' && activeCell && currentQuestion) {
                const content = msg.content.trim();
                const u = msg.user.username;
                const player = lobbyPlayers.find(p => p.username === u) || {
                    username: u,
                    team: getTeamByColor(msg.user.color || '#ffffff'),
                    avatar: msg.user.avatar || '',
                    color: msg.user.color || '#ffffff'
                };

                // Phase 1: Wait for "جرس"
                if (!buzzedTeam) {
                    const isBell = content === 'جرس' || content.toLowerCase() === 'jaras';
                    if (isBell) {
                        // Check if this team is allowed to buzz
                        // If one team tried and failed, only the other team can buzz
                        if (triedTeams.length === 1 && triedTeams[0] === player.team) {
                            return; // Not your turn
                        }

                        setBuzzedTeam(player.team);
                        setBuzzedPlayer(player);
                        setAnswerTimer(timerDuration);
                        setLastAnswer({ text: '', correct: null });
                        playSfx('buzz');
                        return;
                    }
                }

                // Phase 2: Wait for answer from the buzzed player/team
                if (buzzedTeam && player.team === buzzedTeam) {
                    const normAns = normalize(content);
                    const normCorrect = normalize(currentQuestion.answer);

                    if (normAns === normCorrect) {
                        // Correct!
                        setLastAnswer({ text: content, correct: true });
                        playSfx('correct');
                        setTimeout(() => finalizeRound(true, buzzedTeam), 1500);
                    } else {
                        // Wrong!
                        setLastAnswer({ text: content, correct: false });
                        playSfx('wrong');
                        setTimeout(() => handleWrongAnswer(), 1500);
                    }
                }
            }
        });
        return cleanup;
    }, [stage, allowJoin, entryKeyword, activeCell, currentQuestion, buzzedTeam, lobbyPlayers, triedTeams, timerDuration]);

    // No longer using Supabase buzzer channel as the game is now "Direct Chat Only"

    const normalize = (val: string) => {
        return val.trim().toLowerCase()
            .replace(/[أإآ]/g, 'ا')
            .replace(/ة/g, 'ه')
            .replace(/ى/g, 'ي')
            .replace(/[ؤئ]/g, 'ء')
            .replace(/[\u064B-\u0652]/g, '')
            .trim();
    };

    const playSfx = (type: 'buzz' | 'correct' | 'wrong' | 'win' | 'timer') => {
        const urls = {
            buzz: 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3',
            correct: 'https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3',
            wrong: 'https://assets.mixkit.co/active_storage/sfx/2959/2959-preview.mp3',
            win: 'https://assets.mixkit.co/active_storage/sfx/2013/2013-preview.mp3',
            timer: 'https://assets.mixkit.co/active_storage/sfx/2803/2803-preview.mp3'
        };
        try { const audio = new Audio(urls[type]); audio.volume = 0.6; audio.play(); } catch (e) { }
    };

    const startGame = () => {
        const shuffled = [...ARABIC_LETTERS].sort(() => Math.random() - 0.5);
        let lIdx = 0;
        const initialCells: HexCellData[] = [];
        GRID_LAYOUT.forEach((cols, rowIdx) => {
            for (let colIdx = 0; colIdx < cols; colIdx++) {
                initialCells.push({ id: initialCells.length, row: rowIdx, col: colIdx, letter: shuffled[lIdx++], owner: 'none' });
            }
        });
        setCells(initialCells);
        setStage('playing');
        setWinner(null);
        setWinningPath([]);
        setAllowJoin(false);
    };

    const getNeighbors = (id: number) => {
        const cell = cells.find(c => c.id === id);
        if (!cell) return [];
        const neighbors: number[] = [];
        const evenRowNeighbors = [[-1, 0], [-1, 1], [0, -1], [0, 1], [1, 0], [1, 1]];
        const oddRowNeighbors = [[-1, -1], [-1, 0], [0, -1], [0, 1], [1, -1], [1, 0]];
        const deltas = (cell.row % 2 === 0) ? evenRowNeighbors : oddRowNeighbors;

        deltas.forEach(([dr, dc]) => {
            const nr = cell.row + dr, nc = cell.col + dc;
            const found = cells.find(c => c.row === nr && c.col === nc);
            if (found) neighbors.push(found.id);
        });
        return neighbors;
    };

    const checkWin = (updatedCells: HexCellData[]) => {
        // Team 1 (Girls): Top to Bottom
        const team1Cells = updatedCells.filter(c => c.owner === 'team1').map(c => c.id);
        const start1 = updatedCells.filter(c => c.row === 0 && c.owner === 'team1').map(c => c.id);
        const end1 = updatedCells.filter(c => c.row === 4 && c.owner === 'team1').map(c => c.id);

        const path1 = findPath(start1, end1, team1Cells);
        if (path1) { setWinner('team1'); setWinningPath(path1); setStage('ended'); playSfx('win'); return; }

        // Team 2 (Boys): Left to Right
        const team2Cells = updatedCells.filter(c => c.owner === 'team2').map(c => c.id);
        const leftColIndices = [0, 6, 11, 17, 22];
        const rightColIndices = [5, 10, 16, 21, 27];
        const start2 = updatedCells.filter(c => leftColIndices.includes(c.id) && c.owner === 'team2').map(c => c.id);
        const end2 = updatedCells.filter(c => rightColIndices.includes(c.id) && c.owner === 'team2').map(c => c.id);

        const path2 = findPath(start2, end2, team2Cells);
        if (path2) { setWinner('team2'); setWinningPath(path2); setStage('ended'); playSfx('win'); return; }
    };

    const findPath = (start: number[], end: number[], validSet: number[]) => {
        if (start.length === 0 || end.length === 0) return null;
        let queue: { id: number, path: number[] }[] = start.map(id => ({ id, path: [id] }));
        let visited = new Set(start);

        while (queue.length > 0) {
            let { id, path } = queue.shift()!;
            if (end.includes(id)) return path;
            for (let n of getNeighbors(id)) {
                if (validSet.includes(n) && !visited.has(n)) {
                    visited.add(n);
                    queue.push({ id: n, path: [...path, n] });
                }
            }
        }
        return null;
    };

    const handleWrongAnswer = () => {
        if (!buzzedTeam) return;

        const newTried = [...triedTeams, buzzedTeam];
        setTriedTeams(newTried);
        setBuzzedTeam(null);
        setBuzzedPlayer(null);
        setAnswerTimer(0);
        setLastAnswer({ text: '', correct: null });

        if (newTried.length >= 2) {
            // Both teams failed, reset to allow anyone
            setTriedTeams([]);
            // Keep question open for anyone
        }
    };

    const finalizeRound = (isCorrect: boolean, team: 'team1' | 'team2') => {
        if (!activeCell) return;
        const owner = isCorrect ? team : (team === 'team1' ? 'team2' : 'team1');
        const nextCells = cells.map(c => c.id === activeCell.id ? { ...c, owner } : c);
        setCells(nextCells);
        setActiveCell(null);
        setCurrentQuestion(null);
        setBuzzedTeam(null);
        setBuzzedPlayer(null);
        setAnswerTimer(0);
        setTriedTeams([]);
        setLastAnswer({ text: '', correct: null });
        checkWin(nextCells);
    };

    const selectCell = (cell: HexCellData) => {
        if (cell.owner !== 'none' || winner) return;
        setActiveCell(cell);
        setBuzzedTeam(null);
        setBuzzedPlayer(null);
        setAnswerTimer(0);
        setTriedTeams([]);
        setLastAnswer({ text: '', correct: null });

        const availableQs = LETTER_GAME_QUESTIONS.filter(q => q.letter === cell.letter);
        const randomQ = availableQs[Math.floor(Math.random() * availableQs.length)];
        setCurrentQuestion(randomQ || { id: 999, letter: cell.letter, question: `سؤال صعب لحرف ${cell.letter}؟`, answer: 'الجواب' });
    };

    // Timer Effect
    useEffect(() => {
        if (answerTimer > 0 && buzzedTeam) {
            const t = setInterval(() => {
                setAnswerTimer(prev => {
                    if (prev <= 1) {
                        clearInterval(t);
                        // Show "Time Out" for a brief moment
                        setLastAnswer({ text: 'انتهى الوقت!', correct: false });
                        playSfx('wrong');
                        setTimeout(() => handleWrongAnswer(), 2000);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
            return () => clearInterval(t);
        }
    }, [answerTimer, buzzedTeam]);

    const girls = lobbyPlayers.filter(p => p.team === 'team1');
    const boys = lobbyPlayers.filter(p => p.team === 'team2');

    return (
        <div className="w-full h-full relative overflow-hidden bg-[#0A0A14] select-none text-white font-sans" dir="rtl">

            {/* GLOBAL BACKGROUND - Exact Image Match Quality */}
            <div className="absolute inset-0 z-0">
                <div className="absolute inset-0 z-0 pointer-events-none" style={{ background: 'conic-gradient(from -45deg at 50% 50%, #FF6B52 0deg 90deg, #14b8a6 90deg 180deg, #FF6B52 180deg 270deg, #14b8a6 270deg 360deg)' }} />
                <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"></div>
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:50px_50px]"></div>
            </div>

            {/* STAGE: SETTINGS */}
            {stage === 'settings' && (
                <div className="relative z-20 w-full h-full flex flex-col items-center justify-center p-10 animate-in fade-in duration-700">
                    <div className="max-w-4xl w-full bg-black/60 backdrop-blur-3xl border-4 border-white/10 rounded-[4rem] p-12 shadow-[0_30px_100px_rgba(0,0,0,0.8)] relative overflow-hidden">

                        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-yellow-500 via-pink-500 to-blue-500"></div>

                        <div className="flex items-center justify-between mb-12">
                            <div className="flex items-center gap-6">
                                <div className="w-20 h-20 bg-yellow-500/20 rounded-3xl flex items-center justify-center border-2 border-yellow-500/50 shadow-2xl shadow-yellow-500/20">
                                    <Settings size={40} className="text-yellow-400 animate-spin-slow" />
                                </div>
                                <div>
                                    <h1 className="text-5xl font-black italic tracking-tighter text-white">إعدادات اللعبة</h1>
                                    <p className="text-gray-400 font-bold uppercase tracking-widest mt-1">تجهيز ساحة المعركة</p>
                                </div>
                            </div>
                            <button onClick={onHome} className="p-5 bg-red-600/20 border-2 border-red-600/40 text-red-500 rounded-3xl hover:bg-red-600 hover:text-white transition-all shadow-xl group">
                                <LogOut size={28} className="group-hover:rotate-12 transition-transform" />
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-8 mb-12">
                            <div className="space-y-6">
                                <div className="bg-white/5 p-6 rounded-[2rem] border-2 border-white/5 group hover:border-yellow-500/30 transition-all">
                                    <label className="flex items-center gap-3 text-sm font-black text-gray-400 mb-4 tracking-widest uppercase"><Stars size={18} className="text-yellow-500" /> كلمة دخول المشاركين</label>
                                    <input value={entryKeyword} onChange={e => setEntryKeyword(e.target.value)} className="w-full bg-black/50 border-2 border-white/10 rounded-2xl p-5 text-center text-white font-black text-2xl focus:border-yellow-500 transition-all outline-none shadow-inner" />
                                </div>
                                <div className="bg-white/5 p-6 rounded-[2rem] border-2 border-white/5 group hover:border-pink-500/30 transition-all">
                                    <label className="flex items-center gap-3 text-sm font-black text-gray-400 mb-4 tracking-widest uppercase"><Heart size={18} className="text-pink-500" /> اسم فريق البنات</label>
                                    <input value={team1Name} onChange={e => setTeam1Name(e.target.value)} className="w-full bg-black/50 border-2 border-white/10 rounded-2xl p-5 text-center text-white font-black text-2xl focus:border-pink-500 transition-all outline-none shadow-inner" />
                                </div>
                                <div className="bg-white/5 p-6 rounded-[2rem] border-2 border-white/5 group hover:border-blue-500/30 transition-all">
                                    <label className="flex items-center gap-3 text-sm font-black text-gray-400 mb-4 tracking-widest uppercase"><Sparkles size={18} className="text-blue-500" /> اسم فريق الأولاد</label>
                                    <input value={team2Name} onChange={e => setTeam2Name(e.target.value)} className="w-full bg-black/50 border-2 border-white/10 rounded-2xl p-5 text-center text-white font-black text-2xl focus:border-blue-500 transition-all outline-none shadow-inner" />
                                </div>
                            </div>
                            <div className="space-y-6">
                                <div className="bg-white/5 p-6 rounded-[2rem] border-2 border-white/5">
                                    <label className="flex items-center gap-3 text-sm font-black text-gray-400 mb-4 tracking-widest uppercase"><BellRing size={18} className="text-purple-500" /> نظام اللعب</label>
                                    <div className="bg-purple-600/20 border-2 border-purple-500/50 p-5 rounded-2xl text-center">
                                        <div className="text-xl font-black text-purple-400 italic">نظام الجرس المباشر (شات)</div>
                                        <div className="text-[10px] text-white/40 mt-1 uppercase tracking-widest font-black">اكتب "جرس" في الشات للرن</div>
                                    </div>
                                </div>
                                <div className="bg-white/5 p-6 rounded-[2rem] border-2 border-white/5">
                                    <label className="flex items-center gap-3 text-sm font-black text-gray-400 mb-4 tracking-widest uppercase"><BrainCircuit size={18} className="text-orange-500" /> مستوى الصعوبة</label>
                                    <div className="grid grid-cols-2 gap-4">
                                        <button onClick={() => setDifficulty('normal')} className={`py-5 rounded-2xl text-lg font-black border-2 transition-all ${difficulty === 'normal' ? 'bg-orange-600 border-white text-white shadow-xl' : 'bg-black/50 border-white/10 text-gray-500 opacity-50'}`}>عادي</button>
                                        <button onClick={() => setDifficulty('hard')} className={`py-5 rounded-2xl text-lg font-black border-2 transition-all ${difficulty === 'hard' ? 'bg-orange-600 border-white text-white shadow-xl' : 'bg-black/50 border-white/10 text-gray-500 opacity-50'}`}>صعب جداً</button>
                                    </div>
                                </div>
                                <div className="bg-white/5 p-6 rounded-[2rem] border-2 border-white/5">
                                    <label className="flex items-center justify-between text-sm font-black text-gray-400 mb-4 tracking-widest uppercase">
                                        <span className="flex items-center gap-3"><Clock size={18} className="text-emerald-500" /> وقت السؤال</span>
                                        <span className="text-emerald-400">{timerDuration} ثانية</span>
                                    </label>
                                    <input type="range" min="10" max="60" step="5" value={timerDuration} onChange={e => setTimerDuration(parseInt(e.target.value))} className="w-full h-3 bg-black rounded-full appearance-none accent-emerald-500 shadow-inner" />
                                </div>
                            </div>
                        </div>

                        <button onClick={() => setStage('lobby')} className="w-full bg-gradient-to-r from-emerald-600 to-emerald-400 hover:scale-[1.02] active:scale-95 transition-all py-8 rounded-3xl font-black text-4xl text-white shadow-[0_20px_50px_rgba(16,185,129,0.4)] border-b-8 border-black/20 flex items-center justify-center gap-6 group">
                            فتح قاعة الانتظار <ArrowRight size={48} className="group-hover:translate-x-4 transition-transform" />
                        </button>
                    </div>
                </div>
            )}

            {/* STAGE: LOBBY */}
            {stage === 'lobby' && (
                <div className="relative z-20 w-full h-full flex items-center justify-center p-12 animate-in slide-in-from-bottom duration-700">
                    <div className="w-full max-w-7xl h-full flex flex-col gap-10">
                        <div className="flex items-center justify-between">
                            <button onClick={() => setStage('settings')} className="flex items-center gap-4 bg-white/5 hover:bg-white/10 px-8 py-4 rounded-full border-2 border-white/10 transition-all font-black text-xl italic"><ArrowLeft /> العودة للإعدادات</button>
                            <div className="text-center">
                                <h1 className="text-7xl font-black italic text-white drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)]">بإنتظار المحاربين...</h1>
                                <div className={`inline-block mt-4 px-10 py-3 rounded-full border-4 border-white font-black text-2xl transition-all shadow-xl ${allowJoin ? 'bg-emerald-500 animate-bounce' : 'bg-red-600'}`}>
                                    {allowJoin ? `أكتب [ ${entryKeyword} ] في الشات!` : 'الانضمام مغلق الآن'}
                                </div>
                            </div>
                            <button onClick={() => { setAllowJoin(false); startGame(); }} className="flex items-center gap-6 bg-gradient-to-r from-yellow-500 to-orange-600 px-12 py-6 rounded-[2rem] font-black text-4xl italic text-white shadow-2xl hover:scale-105 active:scale-95 transition-all select-none">بـدء الـتـحـدي <Play fill="currentColor" size={32} /></button>
                        </div>

                        <div className="flex-1 grid grid-cols-2 gap-12 overflow-hidden">
                            {/* Girls Section */}
                            <div className="bg-[#FF6B52]/10 backdrop-blur-2xl border-4 border-[#FF6B52]/50 rounded-[4rem] p-10 flex flex-col items-center relative overflow-hidden shadow-2xl">
                                <div className="absolute top-0 left-0 w-full h-2 bg-[#FF6B52]"></div>
                                <div className="flex items-center gap-4 mb-10 w-full justify-center">
                                    <div className="text-8xl font-black text-[#FF6B52] drop-shadow-lg">{girls.length}</div>
                                    <div className="text-right">
                                        <h3 className="text-4xl font-black text-white">{team1Name}</h3>
                                        <p className="text-[#FF6B52] font-black tracking-widest opacity-60">نخبة البنات</p>
                                    </div>
                                </div>
                                <div className="flex-1 w-full grid grid-cols-6 gap-6 overflow-y-auto content-start custom-scrollbar-pink pr-4 pb-10">
                                    {girls.map(p => (
                                        <div key={p.username} className="flex flex-col items-center gap-2 animate-in zoom-in duration-500">
                                            <ProAvatar username={p.username} url={p.avatar} size="w-20 h-20" />
                                            <span className="text-[10px] font-black text-white/50 truncate w-full text-center">{p.username}</span>
                                        </div>
                                    ))}
                                    {allowJoin && <div className="w-20 h-20 rounded-[1.5rem] border-4 border-dashed border-white/10 flex items-center justify-center text-white/10 animate-pulse"><Users /></div>}
                                </div>
                                <button onClick={() => setAllowJoin(!allowJoin)} className={`mt-auto w-full py-5 rounded-3xl font-black text-xl border-2 transition-all ${allowJoin ? 'bg-red-500/20 border-red-500/50 text-red-500' : 'bg-emerald-500/20 border-emerald-500/50 text-emerald-500'}`}>
                                    {allowJoin ? 'إيقاف استقبال البنات' : 'فتح استقبال البنات'}
                                </button>
                            </div>

                            {/* Boys Section */}
                            <div className="bg-[#14b8a6]/10 backdrop-blur-2xl border-4 border-[#14b8a6]/50 rounded-[4rem] p-10 flex flex-col items-center relative overflow-hidden shadow-2xl">
                                <div className="absolute top-0 left-0 w-full h-2 bg-[#14b8a6]"></div>
                                <div className="flex items-center gap-4 mb-10 w-full justify-center">
                                    <div className="text-8xl font-black text-[#14b8a6] drop-shadow-lg">{boys.length}</div>
                                    <div className="text-right">
                                        <h3 className="text-4xl font-black text-white">{team2Name}</h3>
                                        <p className="text-[#14b8a6] font-black tracking-widest opacity-60">نخبة الأولاد</p>
                                    </div>
                                </div>
                                <div className="flex-1 w-full grid grid-cols-6 gap-6 overflow-y-auto content-start custom-scrollbar-blue pr-4 pb-10">
                                    {boys.map(p => (
                                        <div key={p.username} className="flex flex-col items-center gap-2 animate-in zoom-in duration-500">
                                            <ProAvatar username={p.username} url={p.avatar} size="w-20 h-20" />
                                            <span className="text-[10px] font-black text-white/50 truncate w-full text-center">{p.username}</span>
                                        </div>
                                    ))}
                                    {allowJoin && <div className="w-20 h-20 rounded-[1.5rem] border-4 border-dashed border-white/10 flex items-center justify-center text-white/10 animate-pulse"><Users /></div>}
                                </div>
                                <button onClick={() => setAllowJoin(!allowJoin)} className={`mt-auto w-full py-5 rounded-3xl font-black text-xl border-2 transition-all ${allowJoin ? 'bg-red-500/20 border-red-500/50 text-red-500' : 'bg-emerald-500/20 border-emerald-500/50 text-emerald-500'}`}>
                                    {allowJoin ? 'إيقاف استقبال الأولاد' : 'فتح استقبال الأولاد'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* STAGE: PLAYING (EXACT IMAGE MATCH DESIGN) */}
            {stage === 'playing' && (
                <div className="w-full h-full flex flex-col items-center justify-center relative p-8 animate-in fade-in duration-1000">

                    {/* Background Stage Overlays */}
                    <div className="absolute inset-0 z-0 pointer-events-none" style={{ background: 'conic-gradient(from -45deg at 50% 50%, #FF6B52 0deg 90deg, #14b8a6 90deg 180deg, #FF6B52 180deg 270deg, #14b8a6 270deg 360deg)' }} />

                    {/* Left Panel: Girls */}
                    <div className="absolute top-10 right-10 z-30 flex flex-col items-center">
                        <div className="bg-[#FF6B52] border-4 border-[#5A22A3] rounded-[2rem] px-10 py-5 text-center shadow-[0_12px_0_#5A22A3] transform -rotate-2">
                            <h2 className="text-white font-black text-3xl drop-shadow-md">{team1Name}</h2>
                            <div className="mt-4 flex flex-wrap justify-center gap-1 max-w-[200px]">
                                {girls.slice(0, 15).map(p => <ProAvatar key={p.username} username={p.username} url={p.avatar} size="w-8 h-8" />)}
                            </div>
                        </div>
                    </div>

                    {/* Right Panel: Boys */}
                    <div className="absolute top-10 left-10 z-30 flex flex-col items-center">
                        <div className="bg-[#14b8a6] border-4 border-[#5A22A3] rounded-[2rem] px-10 py-5 text-center shadow-[0_12px_0_#5A22A3] transform rotate-2">
                            <h2 className="text-white font-black text-3xl drop-shadow-md">{team2Name}</h2>
                            <div className="mt-4 flex flex-wrap justify-center gap-1 max-w-[200px]">
                                {boys.slice(0, 15).map(p => <ProAvatar key={p.username} username={p.username} url={p.avatar} size="w-8 h-8" />)}
                            </div>
                        </div>
                    </div>

                    {/* Center Header */}
                    <div className="absolute top-10 left-1/2 transform -translate-x-1/2 z-20 text-center">
                        <h1 className="text-8xl font-black italic text-white drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)]">حروف</h1>
                    </div>

                    {/* BOARD */}
                    <div className="relative z-10 animate-in zoom-in duration-1000" style={{ width: `${boardWidth}px`, height: `${boardHeight}px` }}>
                        {cells.map(cell => {
                            const isOffset = cell.row % 2 !== 0;
                            const left = (cell.col * X_OFFSET) + (isOffset ? X_OFFSET / 2 : 0);
                            const top = cell.row * Y_OFFSET;
                            const isActive = activeCell?.id === cell.id;
                            const isWinning = winningPath.includes(cell.id);

                            let fill = '#FFFFFF';
                            if (cell.owner === 'team1') fill = '#FF6B52';
                            if (cell.owner === 'team2') fill = '#14b8a6';

                            return (
                                <div key={cell.id} onClick={() => selectCell(cell)} className={`absolute flex items-center justify-center cursor-pointer transition-all duration-300 ${isActive ? 'scale-110 z-50 animate-pulse drop-shadow-[0_0_50px_white]' : 'hover:scale-105 hover:z-40 z-10'} ${isWinning ? 'animate-bounce drop-shadow-[0_0_30px_gold]' : ''}`} style={{ left: `${left}px`, top: `${top}px`, width: `${SVG_WIDTH}px`, height: `${SVG_HEIGHT}px`, filter: 'drop-shadow(2px 8px 6px rgba(0,0,0,0.3))' }}>
                                    <svg width={SVG_WIDTH} height={SVG_HEIGHT} className="absolute inset-0 overflow-visible z-0">
                                        <polygon points={hexPoints} fill={fill} stroke="#5A22A3" strokeWidth={STROKE_WIDTH} strokeLinejoin="round" />
                                        {isWinning && <polygon points={hexPoints} fill="none" stroke="gold" strokeWidth="12" strokeOpacity="0.8" />}
                                    </svg>
                                    {cell.owner === 'none' && <span className="relative z-10 text-[3.5rem] font-black text-[#5A22A3] mt-2 select-none">{cell.letter}</span>}
                                </div>
                            );
                        })}
                    </div>

                    {/* QUESTION OVERLAY */}
                    {activeCell && currentQuestion && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center p-10 animate-in zoom-in duration-300">
                            <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setActiveCell(null)}></div>
                            <div className="w-full max-w-4xl bg-[#1a1a2e] border-[10px] border-[#5A22A3] rounded-[4rem] p-16 shadow-[0_40px_100px_rgba(0,0,0,0.9)] relative z-10 text-center animate-in slide-in-from-bottom-20 duration-500">
                                <div className="absolute top-[-40px] left-1/2 transform -translate-x-1/2 bg-white px-12 py-3 rounded-full border-8 border-[#5A22A3] text-[#5A22A3] font-black text-5xl italic shadow-2xl">حرف {activeCell.letter}</div>

                                <p className="text-5xl font-black text-white leading-tight mb-12 mt-6">{currentQuestion.question}</p>

                                <div className="bg-emerald-500/20 border-4 border-emerald-500/40 rounded-3xl p-8 mb-10 group relative">
                                    <span className="text-gray-400 font-bold block mb-2 uppercase tracking-[0.4em] text-xs">إجابة المقدم (مخفي)</span>
                                    <span className="text-4xl font-black text-emerald-100 blur-lg group-hover:blur-0 transition-all duration-300">{currentQuestion.answer}</span>
                                </div>

                                {buzzedTeam ? (
                                    <div className="space-y-8 animate-in zoom-in">
                                        <div className={`p-8 rounded-[2rem] border-8 flex items-center justify-between gap-8 ${buzzedTeam === 'team1' ? 'border-[#FF6B52] bg-[#FF6B52]/10' : 'border-[#14b8a6] bg-[#14b8a6]/10'}`}>
                                            <div className="flex items-center gap-6">
                                                {buzzedPlayer && <ProAvatar username={buzzedPlayer.username} url={buzzedPlayer.avatar} size="w-32 h-32" />}
                                                <div className="text-right">
                                                    <div className="text-white font-black text-5xl italic">{buzzedPlayer?.username}</div>
                                                    <div className={`text-2xl font-black mt-2 ${buzzedTeam === 'team1' ? 'text-[#FF6B52]' : 'text-[#14b8a6]'}`}>{buzzedTeam === 'team1' ? team1Name : team2Name}</div>
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-center gap-2">
                                                <div className="text-7xl font-black text-white italic tracking-tighter tabular-nums drop-shadow-[0_0_20px_rgba(255,255,255,0.4)]">
                                                    {answerTimer}s
                                                </div>
                                                <div className="text-xs font-black text-white/40 uppercase tracking-widest">المتبقي للإجابة</div>
                                            </div>
                                        </div>

                                        {lastAnswer.text ? (
                                            <div className={`p-6 rounded-3xl border-4 text-center animate-in slide-in-from-bottom flex flex-col items-center gap-3 ${lastAnswer.correct === true ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'bg-red-500/20 border-red-500 text-red-400'}`}>
                                                <div className="text-sm font-black uppercase tracking-widest opacity-60">الإجابة المكتوبة:</div>
                                                <div className="text-4xl font-black">{lastAnswer.text}</div>
                                                <div className="p-3 bg-white/10 rounded-full">
                                                    {lastAnswer.correct === true ? <Check size={32} /> : <X size={32} />}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center gap-6 animate-pulse p-10 bg-white/5 rounded-3xl border-2 border-dashed border-white/10">
                                                <BrainCircuit size={64} className="text-purple-500" />
                                                <h4 className="text-3xl font-black text-white italic">اكتب الإجابة في الشات !!</h4>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center gap-8 p-10 bg-white/5 rounded-3xl border-2 border-dashed border-white/10 relative overflow-hidden">
                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-[shimmer_2s_infinite]"></div>

                                        <div className="flex gap-12 items-center">
                                            <div className={`flex flex-col items-center gap-2 transition-opacity ${triedTeams.includes('team1') ? 'opacity-20 grayscale' : 'opacity-100'}`}>
                                                <div className="w-16 h-16 rounded-2xl bg-[#FF6B52] border-4 border-[#5A22A3] flex items-center justify-center text-white shadow-lg">🌸</div>
                                                <span className="text-[10px] font-black text-[#FF6B52] uppercase mt-1">البنات</span>
                                            </div>

                                            <div className="flex flex-col items-center gap-4">
                                                <div className="w-24 h-24 bg-[#5A22A3] rounded-[2rem] flex items-center justify-center shadow-2xl animate-bounce border-4 border-white/20">
                                                    <BellRing size={48} className="text-white" />
                                                </div>
                                                <h4 className="text-4xl font-black text-white italic tracking-tight">أكتب "جرس" للرن!</h4>
                                            </div>

                                            <div className={`flex flex-col items-center gap-2 transition-opacity ${triedTeams.includes('team2') ? 'opacity-20 grayscale' : 'opacity-100'}`}>
                                                <div className="w-16 h-16 rounded-2xl bg-[#14b8a6] border-4 border-[#5A22A3] flex items-center justify-center text-white shadow-lg">🧊</div>
                                                <span className="text-[10px] font-black text-[#14b8a6] uppercase mt-1">الأولاد</span>
                                            </div>
                                        </div>

                                        {triedTeams.length === 1 && (
                                            <div className="bg-red-500/20 text-red-500 px-6 py-2 rounded-full font-black text-sm border border-red-500/30 animate-pulse">
                                                ⚠️ الفريق الأول أخطأ.. الدور للفريق الثاني!
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className="mt-12 pt-8 border-t border-white/5 flex gap-4 opacity-30 hover:opacity-100 transition-opacity">
                                    <button onClick={() => finalizeRound(true, 'team1')} className="flex-1 bg-[#FF6B52]/10 p-5 rounded-2xl border-2 border-[#FF6B52]/30 text-[#FF6B52] font-black text-xl hover:bg-[#FF6B52] hover:text-white transition-all">تخطي للبنات 🌸</button>
                                    <button onClick={() => finalizeRound(true, 'team2')} className="flex-1 bg-[#14b8a6]/10 p-5 rounded-2xl border-2 border-[#14b8a6]/30 text-[#14b8a6] font-black text-xl hover:bg-[#14b8a6] hover:text-white transition-all">تخطي للأولاد 🧊</button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* STAGE: ENDED */}
            {stage === 'ended' && (
                <div className="absolute inset-0 z-[200] flex items-center justify-center p-12 bg-black/90 backdrop-blur-3xl animate-in zoom-in duration-700">
                    <div className="max-w-4xl w-full text-center space-y-12">
                        <div className="relative inline-block scale-150 mb-20 animate-bounce">
                            <Crown size={120} className="text-yellow-400 absolute top-[-80px] left-1/2 transform -translate-x-1/2 drop-shadow-[0_0_50px_rgba(250,204,21,0.8)]" />
                            <div className={`p-16 rounded-[4rem] border-[12px] border-white/20 shadow-2xl transform rotate-3 ${winner === 'team1' ? 'bg-[#FF6B52]' : 'bg-[#14b8a6]'}`}>
                                <h1 className="text-9xl font-black text-white italic drop-shadow-2xl">{winner === 'team1' ? team1Name : team2Name}</h1>
                            </div>
                        </div>

                        <h2 className="text-6xl font-black text-white uppercase tracking-[0.2em] italic drop-shadow-lg">أبطال الإتصال الذهبي! 🏆</h2>
                        <p className="text-2xl text-gray-400 font-bold max-w-2xl mx-auto leading-relaxed italic">لقد تمكنتم من السيطرة على ساحة الحروف وتحقيق الفوز الساحق بهذا الطريق العبقري. كفـوووووويا أبطاااااال!</p>

                        <div className="flex gap-8 justify-center pt-10">
                            <button onClick={() => setStage('settings')} className="flex items-center gap-4 bg-white/10 hover:bg-white text-white hover:text-black px-12 py-6 rounded-3xl font-black text-3xl transition-all border-4 border-white/20 hover:scale-105 active:scale-95"><RefreshCw size={32} /> إعادة التحدي</button>
                            <button onClick={onHome} className="flex items-center gap-4 bg-red-600 hover:bg-red-500 px-12 py-6 rounded-3xl font-black text-3xl text-white transition-all border-4 border-red-400/30 hover:scale-105 active:scale-95"><Home size={32} /> الرئيسية</button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .animate-spin-slow { animation: spin 8s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                .custom-scrollbar-pink::-webkit-scrollbar { width: 6px; }
                .custom-scrollbar-pink::-webkit-scrollbar-track { background: rgba(255,107,82,0.1); border-radius: 4px; }
                .custom-scrollbar-pink::-webkit-scrollbar-thumb { background: #FF6B52; border-radius: 4px; }
                .custom-scrollbar-blue::-webkit-scrollbar { width: 6px; }
                .custom-scrollbar-blue::-webkit-scrollbar-track { background: rgba(20,184,166,0.1); border-radius: 4px; }
                .custom-scrollbar-blue::-webkit-scrollbar-thumb { background: #14b8a6; border-radius: 4px; }
            `}</style>
        </div>
    );
};
