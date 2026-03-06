import React, { useState, useEffect, useRef } from 'react';
import { chatService } from '../services/chatService';
import { supabase } from '../services/supabase';
import { LETTER_GAME_QUESTIONS, getQuestionsForLevel, getWorldForLevel } from '../data/letter_game_data';
import { HexCellData, LetterQuestion } from '../types';
import { Home, LogOut, Check, X, Shield, Trophy, Smartphone, AlertTriangle, Users, Play, Settings, Paintbrush, Clock, ListOrdered, BrainCircuit, PartyPopper, RefreshCw, ArrowLeft, ArrowRight, Stars, Sparkles, Crown, Heart, BellRing, Volume2, ChevronDown, Link, Video } from 'lucide-react';
import { ProAvatar } from './ProAvatar';

interface LetterHexagonGameProps {
    onHome: () => void;
    isOBS?: boolean;
    onToggleOBSPreview?: () => void;
    obsPreviewActive?: boolean;
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

type Stage = 'settings' | 'levelSelect' | 'lobby' | 'playing' | 'ended';

export const LetterHexagonGame: React.FC<LetterHexagonGameProps> = ({ onHome, isOBS, onToggleOBSPreview, obsPreviewActive }) => {
    // Stage Management
    const [stage, setStage] = useState<Stage>(isOBS ? 'lobby' : 'settings');

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

    // Progressive Levels
    const [currentLevel, setCurrentLevel] = useState<number>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('iabs_letter_game_level');
            return saved ? parseInt(saved) : 1;
        }
        return 1;
    });

    useEffect(() => {
        localStorage.setItem('iabs_letter_game_level', currentLevel.toString());
    }, [currentLevel]);

    // Highest unlocked level (saves progress lock)
    const [highestUnlocked, setHighestUnlocked] = useState<number>(() => {
        if (typeof window !== 'undefined') {
            return parseInt(localStorage.getItem('iabs_letter_game_highest') || '1');
        }
        return 1;
    });
    useEffect(() => { localStorage.setItem('iabs_letter_game_highest', highestUnlocked.toString()); }, [highestUnlocked]);

    // Chat Bell Game Logic
    const [buzzedTeam, setBuzzedTeam] = useState<'team1' | 'team2' | null>(null);
    const [buzzedPlayer, setBuzzedPlayer] = useState<Player | null>(null);
    const [answerTimer, setAnswerTimer] = useState<number>(0);
    const [triedTeams, setTriedTeams] = useState<('team1' | 'team2')[]>([]);
    const [lastAnswer, setLastAnswer] = useState<{ text: string, correct: boolean | null }>({ text: '', correct: null });
    const [linkCopied, setLinkCopied] = useState(false);

    const channelRef = useRef<any>(null);
    const broadcastRef = useRef<any>(null);

    // Board Geometry (Matching image-match quality)
    const HEX_SIZE = isOBS ? 75 : 55; // Increased for OBS to fit large letters
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

    // Use a ref to store the latest broadcast function to avoid stale closures in listeners
    const broadcastFullStateRef = useRef<any>(null);

    // OBS SYNC - Broadcast state if manager
    useEffect(() => {
        if (isOBS) {
            const channel = supabase.channel('letter_game_sync')
                .on('broadcast', { event: 'STATE_UPDATE' }, (payload) => {
                    const data = payload.payload;
                    if (!data) return;
                    if (data.cells) setCells(data.cells);
                    if (data.stage) setStage(data.stage);
                    if (data.activeCell !== undefined) setActiveCell(data.activeCell);
                    if (data.currentQuestion !== undefined) setCurrentQuestion(data.currentQuestion);
                    if (data.buzzedTeam !== undefined) setBuzzedTeam(data.buzzedTeam);
                    if (data.buzzedPlayer !== undefined) setBuzzedPlayer(data.buzzedPlayer);
                    if (data.answerTimer !== undefined) setAnswerTimer(data.answerTimer);
                    if (data.lastAnswer !== undefined) setLastAnswer(data.lastAnswer);
                    if (data.triedTeams !== undefined) setTriedTeams(data.triedTeams);
                    if (data.winner !== undefined) setWinner(data.winner);
                    if (data.winningPath !== undefined) setWinningPath(data.winningPath);
                    if (data.lobbyPlayers !== undefined) setLobbyPlayers(data.lobbyPlayers);
                    if (data.team1Name !== undefined) setTeam1Name(data.team1Name);
                    if (data.team2Name !== undefined) setTeam2Name(data.team2Name);
                    if (data.entryKeyword !== undefined) setEntryKeyword(data.entryKeyword);
                    if (data.allowJoin !== undefined) setAllowJoin(data.allowJoin);
                    if (data.timerDuration !== undefined) setTimerDuration(data.timerDuration);
                    if (data.difficulty !== undefined) setDifficulty(data.difficulty);
                    if (data.currentLevel !== undefined) setCurrentLevel(data.currentLevel);
                })
                .subscribe((status) => {
                    if (status === 'SUBSCRIBED') {
                        // Small delay before requesting initial sync to ensure manager is ready
                        setTimeout(() => {
                            channel.send({ type: 'broadcast', event: 'SYNC_REQUEST', payload: {} });
                        }, 1000);
                    }
                });
            return () => { supabase.removeChannel(channel); };
        } else {
            // Manager: setup channel and handle sync requests
            const channel = supabase.channel('letter_game_sync')
                .on('broadcast', { event: 'SYNC_REQUEST' }, () => {
                    // Send full state to joining OBS using the LATEST broadcast function
                    if (broadcastFullStateRef.current) {
                        broadcastFullStateRef.current(channel);
                    }
                })
                .subscribe();
            broadcastRef.current = channel;
            return () => { supabase.removeChannel(channel); };
        }
    }, [isOBS]);

    const broadcastFullState = (channelOverride?: any) => {
        const chan = channelOverride || broadcastRef.current;
        if (!isOBS && chan) {
            chan.send({
                type: 'broadcast',
                event: 'STATE_UPDATE',
                payload: {
                    cells, stage, activeCell, currentQuestion,
                    buzzedTeam, buzzedPlayer, answerTimer,
                    lastAnswer, triedTeams, winner, winningPath,
                    lobbyPlayers, team1Name, team2Name, entryKeyword, allowJoin,
                    timerDuration, difficulty, currentLevel
                }
            });
        }
    };

    // Update the ref to the latest broadcast function every render
    useEffect(() => {
        broadcastFullStateRef.current = broadcastFullState;
    });

    useEffect(() => {
        if (!isOBS && broadcastRef.current) {
            broadcastFullState();
        }
    }, [cells, stage, activeCell, currentQuestion, buzzedTeam, buzzedPlayer, answerTimer, lastAnswer, triedTeams, winner, winningPath, lobbyPlayers, team1Name, team2Name, entryKeyword, allowJoin, isOBS, currentLevel]);

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

            if (stage === 'playing' && activeCell) {
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
                        if (triedTeams.length === 1 && triedTeams[0] === player.team) return;
                        setBuzzedTeam(player.team);
                        setBuzzedPlayer(player);
                        setAnswerTimer(timerDuration);
                        setLastAnswer({ text: '', correct: null });
                        playSfx('buzz');
                        return;
                    }
                }

                // Phase 2: Wait for answer from the buzzed player/team
                // NEW LOGIC: Accept any answer that starts with the cell's letter
                if (buzzedTeam && player.team === buzzedTeam) {
                    const normAns = normalize(content);
                    const targetLetter = normalize(activeCell.letter)[0];

                    if (normAns.length > 0 && normAns[0] === targetLetter) {
                        // Correct! Any word starting with the letter
                        setLastAnswer({ text: content, correct: true });
                        playSfx('correct');
                        setTimeout(() => finalizeRound(true, buzzedTeam), 1500);
                    } else if (content !== 'جرس') {
                        // Wrong! (And ignore accidental double-bells)
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
        if (!val) return '';
        return val.trim().toLowerCase()
            .replace(/[\u064B-\u0652]/g, '') // Remove Harakat (Fatha, Damma, Kasra, etc.)
            .replace(/[أإآ]/g, 'ا')        // Normalize Alif forms
            .replace(/ة/g, 'ه')           // Normalize Ta Marbuta to Ha
            .replace(/ى/g, 'ي')           // Normalize Alef Maksura to Ya
            .replace(/[ؤئ]/g, 'ء')        // Normalize Hamza forms
            .replace(/\s+/g, ' ')         // Normalize extra spaces
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
        // Use currentLevel to create a level-specific shuffle if desired, 
        // or just shuffle normally. Here we shuffle normally but track the level.
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

        // Immediate and direct broadcast
        if (!isOBS && broadcastRef.current) {
            broadcastRef.current.send({
                type: 'broadcast',
                event: 'STATE_UPDATE',
                payload: {
                    cells: initialCells,
                    stage: 'playing',
                    winner: null,
                    winningPath: [],
                    allowJoin: false,
                    lobbyPlayers, team1Name, team2Name, entryKeyword, timerDuration, difficulty, currentLevel
                }
            });
        }
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
        if (path1) {
            setWinner('team1');
            setWinningPath(path1);
            setStage('ended');
            playSfx('win');
            if (currentLevel < 100) {
                const next = currentLevel + 1;
                setCurrentLevel(next);
                if (next > highestUnlocked) setHighestUnlocked(next);
            }
            return;
        }

        // Team 2 (Boys): Left to Right
        const team2Cells = updatedCells.filter(c => c.owner === 'team2').map(c => c.id);
        const leftColIndices = [0, 6, 11, 17, 22];
        const rightColIndices = [5, 10, 16, 21, 27];
        const start2 = updatedCells.filter(c => leftColIndices.includes(c.id) && c.owner === 'team2').map(c => c.id);
        const end2 = updatedCells.filter(c => rightColIndices.includes(c.id) && c.owner === 'team2').map(c => c.id);

        const path2 = findPath(start2, end2, team2Cells);
        if (path2) {
            setWinner('team2');
            setWinningPath(path2);
            setStage('ended');
            playSfx('win');
            if (currentLevel < 100) {
                const next = currentLevel + 1;
                setCurrentLevel(next);
                if (next > highestUnlocked) setHighestUnlocked(next);
            }
            return;
        }
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
        // Load a question specific to current level
        const levelQs = getQuestionsForLevel(cell.letter, currentLevel);
        if (levelQs.length > 0) {
            setCurrentQuestion(levelQs[Math.floor(Math.random() * levelQs.length)]);
        } else {
            setCurrentQuestion(null);
        }
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
        <div className={`w-full h-full relative overflow-hidden select-none text-white font-sans ${isOBS ? 'bg-transparent' : 'bg-[#0A0A14]'}`} dir="rtl">

            {/* GLOBAL BACKGROUND - Exact Image Match Quality */}
            {!isOBS && (
                <div className="absolute inset-0 z-0">
                    <div className="absolute inset-0 z-0 pointer-events-none" style={{ background: 'conic-gradient(from -45deg at 50% 50%, #FF6B52 0deg 90deg, #14b8a6 90deg 180deg, #FF6B52 180deg 270deg, #14b8a6 270deg 360deg)' }} />
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"></div>
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:50px_50px]"></div>
                </div>
            )}

            {/* ONLINE BADGE FOR OBS (And Level Indicator) */}
            {isOBS && (
                <div className="absolute top-10 left-10 z-[300] flex flex-col gap-2 animate-in slide-in-from-left-10 duration-500">
                    <div className="flex items-center gap-3 bg-black/40 px-6 py-2.5 rounded-full border border-emerald-500/30 backdrop-blur-md">
                        <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_15px_#10b981]"></div>
                        <span className="text-emerald-400 font-black text-[10px] uppercase tracking-[0.3em] italic">Live Online</span>
                    </div>
                    <div className="flex items-center gap-3 bg-indigo-600/60 px-6 py-2.5 rounded-full border border-white/20 backdrop-blur-md shadow-2xl">
                        <Trophy className="text-yellow-400" size={16} />
                        <span className="text-white font-black text-xs italic">المرحلة {currentLevel} / 100</span>
                    </div>
                </div>
            )}

            {/* SPECIALIZED OBS LOBBY/WAITING VIEW */}
            {isOBS && (stage === 'settings' || stage === 'lobby') && (
                <div className="relative z-50 w-full h-full flex flex-col items-center justify-center animate-in fade-in duration-1000 scale-[0.6] overflow-visible">
                    {/* Background Letters Design Grid (Prominent) */}
                    <div className="absolute inset-0 z-0 opacity-[0.15] flex items-center justify-center scale-150 transform rotate-12 grayscale">
                        <div className="relative" style={{ width: `${boardWidth}px`, height: `${boardHeight}px` }}>
                            {ARABIC_LETTERS.map((letter, idx) => {
                                const row = [0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4][idx];
                                const col = [0, 1, 2, 3, 4, 5, 0, 1, 2, 3, 4, 0, 1, 2, 3, 4, 5, 0, 1, 2, 3, 4, 0, 1, 2, 3, 4, 5][idx];
                                const isOffset = row % 2 !== 0;
                                const left = (col * X_OFFSET) + (isOffset ? X_OFFSET / 2 : 0);
                                const top = row * Y_OFFSET;
                                return (
                                    <div key={idx} className="absolute" style={{ left: `${left}px`, top: `${top}px`, width: `${SVG_WIDTH}px`, height: `${SVG_HEIGHT}px` }}>
                                        <svg width={SVG_WIDTH} height={SVG_HEIGHT} className="absolute inset-0">
                                            <polygon points={hexPoints} fill="none" stroke="white" strokeWidth="2" />
                                        </svg>
                                        <div className="absolute inset-0 flex items-center justify-center text-white text-4xl font-black opacity-20">{letter}</div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="relative z-10 flex flex-col items-center gap-12 w-full max-w-7xl">
                        {/* THE LOGO */}
                        <div className="relative group">
                            {!isOBS && <div className="absolute -inset-10 bg-white/5 blur-3xl rounded-full scale-150 animate-pulse"></div>}
                            <div className="flex items-center gap-8 mb-4 relative z-10">
                                <span className="text-[12rem] font-black italic tracking-tighter text-yellow-400 drop-shadow-[0_15px_40px_rgba(234,179,8,0.6)] animate-bounce">حروف</span>
                                <span className="text-6xl font-black italic tracking-tighter text-blue-400 mt-12">مع</span>
                                <span className="text-[12rem] font-black italic tracking-tighter text-red-500 drop-shadow-[0_15px_40px_rgba(239,68,68,0.6)]">حمودي</span>
                            </div>
                            <div className="h-2 w-full bg-gradient-to-r from-transparent via-white/40 to-transparent rounded-full"></div>
                        </div>

                        {/* STATUS AREA */}
                        <div className="flex flex-col items-center gap-6">
                            {stage === 'settings' ? (
                                <div className="flex flex-col items-center gap-4">
                                    <div className={`px-12 py-4 border-2 rounded-full flex items-center gap-4 text-white font-black text-3xl italic shadow-2xl ${isOBS ? 'bg-black/60 border-white/10' : 'bg-white/10 backdrop-blur-xl border-white/20'}`}>
                                        <Clock className="text-yellow-400 animate-spin-slow" size={32} />
                                        <span>بإنتظار تحضير الساحة...</span>
                                    </div>
                                    <p className="text-white/40 font-black text-sm uppercase tracking-[0.5em] animate-pulse">SETTING UP THE BATTLEFIELD</p>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center gap-6">
                                    <div className={`px-16 py-6 rounded-[3rem] border-8 shadow-2xl transition-all duration-500 transform scale-110 flex flex-col items-center gap-3 ${allowJoin ? 'bg-kick-green border-white animate-bounce' : 'bg-red-600 border-white/20 opacity-50'}`}>
                                        <div className="flex items-center gap-4">
                                            {allowJoin && <Volume2 className="text-black animate-pulse" size={40} />}
                                            <span className="text-black font-black text-5xl italic tracking-tighter">
                                                {allowJoin ? `أكتب [ ${entryKeyword} ] للدخول!` : 'بإنتظار إشارة البداية'}
                                            </span>
                                        </div>
                                        {allowJoin && <div className="text-[12px] font-black text-black/40 uppercase tracking-widest">JOIN THE BATTLE NOW</div>}
                                    </div>

                                    {/* TEAMS PREVIEW */}
                                    <div className="grid grid-cols-2 gap-20 mt-10 w-full">
                                        {/* Team Girls */}
                                        <div className="flex flex-col items-center gap-6 group">
                                            <div className="relative">
                                                <div className="absolute -inset-6 bg-[#FF6B52]/30 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                                <div className="w-40 h-40 bg-[#FF6B52] border-8 border-white rounded-[3rem] flex items-center justify-center text-7xl shadow-2xl relative z-10 transform -rotate-3 group-hover:rotate-0 transition-transform">🌸</div>
                                            </div>
                                            <div className="text-center">
                                                <h3 className="text-4xl font-black text-[#FF6B52] italic drop-shadow-lg">{team1Name}</h3>
                                                <div className="text-white/40 font-bold text-xs uppercase tracking-widest mt-1">THE QUEEN WARRIORS</div>
                                                <div className="mt-6 flex flex-wrap justify-center gap-2 max-w-sm">
                                                    {girls.map(p => (
                                                        <div key={p.username} className="animate-in zoom-in">
                                                            <ProAvatar username={p.username} url={p.avatar} size="w-12 h-12" className="border-2 border-[#FF6B52]" />
                                                        </div>
                                                    ))}
                                                    {girls.length === 0 && <div className="w-12 h-12 rounded-full border-2 border-dashed border-white/10 flex items-center justify-center text-white/10 uppercase text-[8px] font-black">Empty</div>}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Team Boys */}
                                        <div className="flex flex-col items-center gap-6 group">
                                            <div className="relative">
                                                <div className="absolute -inset-6 bg-[#14b8a6]/30 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                                <div className="w-40 h-40 bg-[#14b8a6] border-8 border-white rounded-[3rem] flex items-center justify-center text-7xl shadow-2xl relative z-10 transform rotate-3 group-hover:rotate-0 transition-transform">🧊</div>
                                            </div>
                                            <div className="text-center">
                                                <h3 className="text-4xl font-black text-[#14b8a6] italic drop-shadow-lg">{team2Name}</h3>
                                                <div className="text-white/40 font-bold text-xs uppercase tracking-widest mt-1">THE TITAN KINGS</div>
                                                <div className="mt-6 flex flex-wrap justify-center gap-2 max-w-sm">
                                                    {boys.map(p => (
                                                        <div key={p.username} className="animate-in zoom-in">
                                                            <ProAvatar username={p.username} url={p.avatar} size="w-12 h-12" className="border-2 border-[#14b8a6]" />
                                                        </div>
                                                    ))}
                                                    {boys.length === 0 && <div className="w-12 h-12 rounded-full border-2 border-dashed border-white/10 flex items-center justify-center text-white/10 uppercase text-[8px] font-black">Empty</div>}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* BOTTOM HIGHLIGHT */}
                        <div className="absolute bottom-20 flex flex-col items-center animate-bounce">
                            <ChevronDown className="text-white/20" size={60} />
                            <span className="text-[10px] font-black text-white/10 uppercase tracking-[1em]">Get Ready For Battle</span>
                        </div>
                    </div>
                </div>
            )}

            {/* STAGE: SETTINGS (HIDDEN IN OBS) */}
            {!isOBS && stage === 'settings' && (
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
                                <div className="bg-indigo-600/10 p-6 rounded-[2rem] border-2 border-indigo-500/30 shadow-2xl">
                                    <label className="flex items-center justify-between text-sm font-black text-indigo-400 mb-2 tracking-widest uppercase">
                                        <span className="flex items-center gap-3"><Trophy size={18} /> أعلى مرحلة وصلتها</span>
                                        <span className="text-white text-xl">{highestUnlocked} / 100</span>
                                    </label>
                                    <div className="h-3 bg-black/50 rounded-full overflow-hidden border border-indigo-500/20">
                                        <div className="h-full bg-gradient-to-r from-indigo-600 to-purple-500 rounded-full transition-all duration-1000" style={{ width: `${highestUnlocked}%` }}></div>
                                    </div>
                                    <p className="text-white/30 text-xs mt-2 font-bold italic">الانتقال للمراحل يتم من خريطة المراحل</p>
                                </div>
                            </div>
                        </div>

                        <button onClick={() => setStage('levelSelect')} className="w-full bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 hover:scale-[1.02] active:scale-95 transition-all py-8 rounded-3xl font-black text-4xl text-white shadow-[0_20px_50px_rgba(99,102,241,0.4)] border-b-8 border-black/20 flex items-center justify-center gap-6 group">
                            <Trophy size={40} className="group-hover:rotate-12 transition-transform" /> اختر مرحلتك <ArrowRight size={48} className="group-hover:translate-x-4 transition-transform" />
                        </button>
                    </div>
                </div>
            )}

            {/* STAGE: LEVEL SELECT MAP */}
            {!isOBS && stage === 'levelSelect' && (() => {
                const worlds = [
                    { id: 1, name: 'عالم المبتدئين', range: [1, 20] as [number, number], color: '#22c55e', glow: 'rgba(34,197,94,0.4)', emoji: '🟢', desc: 'أسئلة سهلة ومرحة للجميع' },
                    { id: 2, name: 'عالم المتمرن', range: [21, 40] as [number, number], color: '#3b82f6', glow: 'rgba(59,130,246,0.4)', emoji: '🔵', desc: 'أسئلة متوسطة للمتحدين' },
                    { id: 3, name: 'عالم المحترف', range: [41, 60] as [number, number], color: '#f97316', glow: 'rgba(249,115,22,0.4)', emoji: '🟠', desc: 'أسئلة صعبة للمحترفين' },
                    { id: 4, name: 'عالم الأبطال', range: [61, 80] as [number, number], color: '#ef4444', glow: 'rgba(239,68,68,0.4)', emoji: '🔴', desc: 'أسئلة صعبة جداً للأبطال' },
                    { id: 5, name: 'عالم الأساطير', range: [81, 100] as [number, number], color: '#a855f7', glow: 'rgba(168,85,247,0.4)', emoji: '🟣', desc: 'أسئلة للخبراء فقط' },
                ];
                return (
                    <div className="relative z-20 w-full h-full flex flex-col items-center overflow-hidden animate-in fade-in duration-500">
                        {/* Header */}
                        <div className="flex w-full max-w-7xl items-center justify-between px-10 pt-8 pb-4 z-10">
                            <button onClick={() => setStage('settings')} className="flex items-center gap-3 bg-white/5 hover:bg-white/10 px-6 py-3 rounded-full border border-white/10 text-white font-black italic transition-all">
                                <ArrowLeft size={20} /> الإعدادات
                            </button>
                            <div className="text-center">
                                <h1 className="text-5xl font-black italic text-white">🗺️ خريطة المراحل</h1>
                                <p className="text-white/40 font-bold text-sm uppercase tracking-widest mt-1">اختر مرحلتك للانطلاق</p>
                            </div>
                            <div className="px-6 py-3 bg-indigo-600/20 border border-indigo-500/30 rounded-full text-indigo-400 font-black text-sm">
                                أعلى مرحلة: {highestUnlocked}
                            </div>
                        </div>

                        {/* Worlds */}
                        <div className="flex-1 w-full max-w-7xl px-8 pb-8 overflow-y-auto">
                            {worlds.map(world => (
                                <div key={world.id} className="mb-8">
                                    {/* World Header */}
                                    <div className="flex items-center gap-4 mb-4">
                                        <span className="text-4xl">{world.emoji}</span>
                                        <div>
                                            <h2 className="text-2xl font-black italic" style={{ color: world.color }}>{world.name}</h2>
                                            <p className="text-white/40 text-sm font-bold">{world.desc}</p>
                                        </div>
                                        <div className="mr-auto h-px flex-1" style={{ background: `linear-gradient(to right, ${world.color}60, transparent)` }}></div>
                                        <div className="text-white/30 text-xs font-bold">
                                            {world.range[0]} - {world.range[1]}
                                        </div>
                                    </div>

                                    {/* Level Grid */}
                                    <div className="grid grid-cols-10 gap-2">
                                        {Array.from({ length: 20 }, (_, i) => world.range[0] + i).map(lvl => {
                                            const isCompleted = lvl < currentLevel;
                                            const isCurrent = lvl === currentLevel;
                                            return (
                                                <button
                                                    key={lvl}
                                                    onClick={() => { setCurrentLevel(lvl); setStage('lobby'); }}
                                                    className={`relative h-16 rounded-2xl font-black text-lg transition-all duration-200 border-2 flex flex-col items-center justify-center gap-0.5 hover:scale-110 active:scale-95 ${isCurrent ? 'scale-110' : ''}`}
                                                    style={{
                                                        backgroundColor: isCompleted ? `${world.color}30` : isCurrent ? world.color : `${world.color}10`,
                                                        borderColor: isCurrent ? 'white' : `${world.color}50`,
                                                        color: isCurrent ? 'white' : world.color,
                                                        boxShadow: isCurrent ? `0 0 25px ${world.glow}, 0 0 50px ${world.glow}` : isCompleted ? `0 4px 12px ${world.glow}` : undefined,
                                                        animation: isCurrent ? 'pulse 2s infinite' : undefined,
                                                    }}
                                                >
                                                    <span>{isCompleted ? '✓' : lvl}</span>
                                                    {isCurrent && <span className="text-[8px] font-black uppercase tracking-widest opacity-80">الآن</span>}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            })()}

            {/* STAGE: LOBBY (HIDDEN IN OBS) */}
            {!isOBS && stage === 'lobby' && (
                <div className="relative z-20 w-full h-full flex items-center justify-center p-12 animate-in slide-in-from-bottom duration-700">
                    <div className="w-full max-w-7xl h-full flex flex-col gap-10">
                        <div className="flex items-center justify-between">
                            <button onClick={() => setStage('settings')} className="flex items-center gap-4 bg-white/5 hover:bg-white/10 px-8 py-4 rounded-full border-2 border-white/10 transition-all font-black text-xl italic"><ArrowLeft /> العودة للإعدادات</button>
                            <div className="text-center">
                                <h1 className="text-7xl font-black italic text-white drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)]">بإنتظار المحاربين...</h1>
                                <div className="flex items-center justify-center gap-4 mt-4">
                                    <div className={`px-10 py-3 rounded-full border-4 border-white font-black text-2xl transition-all shadow-xl ${allowJoin ? 'bg-emerald-500 animate-bounce' : 'bg-red-600'}`}>
                                        {allowJoin ? `أكتب [ ${entryKeyword} ] في الشات!` : 'الانضمام مغلق الآن'}
                                    </div>
                                    <button onClick={() => broadcastFullState()} title="تحديث OBS يدوياً" className="p-3 bg-white/10 hover:bg-white/20 rounded-full border-2 border-white/20 text-white transition-all active:scale-95">
                                        <RefreshCw size={24} />
                                    </button>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={() => {
                                        const url = `${window.location.origin}/?obs=true&view=LETTER_GAME&transparent=true`;
                                        navigator.clipboard.writeText(url);
                                        setLinkCopied(true);
                                        setTimeout(() => setLinkCopied(false), 2000);
                                    }}
                                    className={`flex items-center gap-3 px-8 py-5 rounded-[1.5rem] font-black transition-all border-2 shadow-lg ${linkCopied ? 'bg-emerald-500 border-white text-white' : 'bg-indigo-600/10 border-indigo-500/30 text-indigo-400 hover:bg-indigo-600 hover:text-white'}`}
                                >
                                    {linkCopied ? <Check size={24} /> : <Link size={24} />}
                                    <span className="text-xl italic">{linkCopied ? 'تم النسخ' : 'نسخ رابط OBS'}</span>
                                </button>

                                <button
                                    onClick={onToggleOBSPreview}
                                    className={`flex items-center gap-3 px-8 py-5 rounded-[1.5rem] font-black transition-all border-2 shadow-lg ${obsPreviewActive ? 'bg-emerald-500 border-white text-white' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500 hover:text-white'}`}
                                >
                                    <Video size={24} />
                                    <span className="text-xl italic">{obsPreviewActive ? 'إخفاء المعاينة' : 'معاينة البث'}</span>
                                </button>

                                <button onClick={() => { setAllowJoin(false); startGame(); }} className="flex items-center gap-6 bg-gradient-to-r from-yellow-500 to-orange-600 px-12 py-6 rounded-[2rem] font-black text-4xl italic text-white shadow-2xl hover:scale-105 active:scale-95 transition-all select-none">بـدء الـتـحـدي <Play fill="currentColor" size={32} /></button>
                            </div>
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
                <div className={`relative w-full h-full flex flex-col items-center justify-center transition-all duration-1000 ${isOBS ? 'bg-transparent overflow-visible' : 'bg-[#0f0f1b] overflow-hidden'}`}>
                    {/* Background elements - Explicitly hidden in OBS */}
                    {!isOBS && (
                        <>
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,#5A22A322,transparent)] pointer-events-none"></div>
                            <div className="absolute inset-0 z-0 pointer-events-none" style={{ background: 'conic-gradient(from -45deg at 50% 50%, #FF6B52 0deg 90deg, #14b8a6 90deg 180deg, #FF6B52 180deg 270deg, #14b8a6 270deg 360deg)' }} />
                        </>
                    )}

                    {/* OBS Specific Background Glow Grid */}
                    {isOBS && (
                        <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(90,34,163,0.1),transparent)]"></div>
                            <style>{`
                                @keyframes boardFloat { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-20px); } }
                                @keyframes neonPulse { 0%, 100% { opacity: 0.4; filter: brightness(1); } 50% { opacity: 0.8; filter: brightness(2); } }
                                @keyframes letterGlow { 0%, 100% { text-shadow: 0 0 10px rgba(255,255,255,0.5); } 50% { text-shadow: 0 0 30px rgba(255,255,255,1), 0 0 50px rgba(90,34,163,0.5); } }
                            `}</style>
                        </div>
                    )}

                    {/* Scale Wrapper for OBS - Hide board elements when a cell is active in OBS */}
                    <div className={`w-full h-full flex flex-col items-center justify-center transition-all duration-700 ${isOBS ? 'scale-[0.5] overflow-visible' : ''} ${isOBS && activeCell ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>

                        {/* Left Panel: Girls (Repositioned to corner for OBS) */}
                        <div className={`absolute z-30 flex flex-col items-center transition-all ${isOBS ? 'top-[-80px] right-10 scale-90' : 'top-10 right-10'}`}>
                            <div className={`${isOBS ? 'bg-[#FF6B52]/90 backdrop-blur-xl border-white/30' : 'bg-[#FF6B52] border-[#5A22A3]'} border-4 rounded-[2.5rem] px-8 py-4 text-center shadow-[0_12px_24px_rgba(0,0,0,0.3)] transform -rotate-1`}>
                                <h2 className="text-white font-black text-2xl drop-shadow-md">{team1Name}</h2>
                                <div className="mt-3 flex flex-wrap justify-center gap-1 max-w-[150px]">
                                    {girls.slice(0, 10).map(p => <ProAvatar key={p.username} username={p.username} url={p.avatar} size="w-7 h-7" />)}
                                </div>
                            </div>
                        </div>

                        {/* Right Panel: Boys (Repositioned to corner for OBS) */}
                        <div className={`absolute z-30 flex flex-col items-center transition-all ${isOBS ? 'top-[-80px] left-10 scale-90' : 'top-10 left-10'}`}>
                            <div className={`${isOBS ? 'bg-[#14b8a6]/90 backdrop-blur-xl border-white/30' : 'bg-[#14b8a6] border-[#5A22A3]'} border-4 rounded-[2.5rem] px-8 py-4 text-center shadow-[0_12px_24px_rgba(0,0,0,0.3)] transform rotate-1`}>
                                <h2 className="text-white font-black text-2xl drop-shadow-md">{team2Name}</h2>
                                <div className="mt-3 flex flex-wrap justify-center gap-1 max-w-[150px]">
                                    {boys.slice(0, 10).map(p => <ProAvatar key={p.username} username={p.username} url={p.avatar} size="w-7 h-7" />)}
                                </div>
                            </div>
                        </div>

                        {/* Center Header (With Level Indicator) */}
                        <div className={`absolute ${isOBS ? 'top-[-180px]' : 'top-10'} left-1/2 transform -translate-x-1/2 z-20 text-center`}>
                            <h1 className={`${isOBS ? 'text-7xl' : 'text-8xl'} font-black italic text-white drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)]`}>حروف</h1>
                            {!isOBS && (
                                <div className="mt-4 inline-flex items-center gap-3 bg-indigo-600 px-6 py-2 rounded-full border-2 border-white/20 shadow-xl">
                                    <Trophy size={20} className="text-yellow-400" />
                                    <span className="font-black text-xl italic uppercase">المرحلة {currentLevel}</span>
                                </div>
                            )}
                        </div>

                        {/* BOARD */}
                        <div className={`relative z-10 animate-in zoom-in slide-in-from-bottom-20 duration-1000 ${isOBS ? 'animate-[boardFloat_10s_ease-in-out_infinite]' : ''}`} style={{ width: `${boardWidth}px`, height: `${boardHeight}px` }}>
                            {/* SVG Filters and Gradients Definitions - Reusable for all cells */}
                            <svg className="absolute w-0 h-0 overflow-hidden">
                                <defs>
                                    <linearGradient id="grad-neutral" x1="0%" y1="0%" x2="100%" y2="100%">
                                        <stop offset="0%" style={{ stopColor: '#ffffff' }} />
                                        <stop offset="100%" style={{ stopColor: '#e2e8f0' }} />
                                    </linearGradient>
                                    <linearGradient id="grad-team1" x1="0%" y1="0%" x2="0%" y2="100%">
                                        <stop offset="0%" style={{ stopColor: '#FF8A75' }} />
                                        <stop offset="100%" style={{ stopColor: '#FF6B52' }} />
                                    </linearGradient>
                                    <linearGradient id="grad-team2" x1="0%" y1="0%" x2="0%" y2="100%">
                                        <stop offset="0%" style={{ stopColor: '#2DD4BF' }} />
                                        <stop offset="100%" style={{ stopColor: '#14b8a6' }} />
                                    </linearGradient>
                                    <linearGradient id="grad-winning" x1="0%" y1="0%" x2="100%" y2="100%">
                                        <stop offset="0%" style={{ stopColor: '#FDE047' }} />
                                        <stop offset="100%" style={{ stopColor: '#EAB308' }} />
                                    </linearGradient>
                                    <linearGradient id="grad-obs-empty" x1="0%" y1="0%" x2="100%" y2="100%">
                                        <stop offset="0%" style={{ stopColor: 'rgba(255,255,255,0.1)' }} />
                                        <stop offset="100%" style={{ stopColor: 'rgba(255,255,255,0.02)' }} />
                                    </linearGradient>
                                    <filter id="ultra-glow" x="-50%" y="-50%" width="200%" height="200%">
                                        <feGaussianBlur stdDeviation="8" result="blur" />
                                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                                    </filter>
                                </defs>
                            </svg>
                            {cells.map(cell => {
                                const isOffset = cell.row % 2 !== 0;
                                const left = (cell.col * X_OFFSET) + (isOffset ? X_OFFSET / 2 : 0);
                                const top = cell.row * Y_OFFSET;
                                const isActive = activeCell?.id === cell.id;
                                const isWinning = winningPath.includes(cell.id);

                                let fillId = isOBS ? 'url(#grad-obs-empty)' : 'url(#grad-neutral)';
                                // Fix: Add solid background for active cell in OBS
                                if (isOBS && isActive && cell.owner === 'none') fillId = 'url(#grad-neutral)';

                                let strokeColor = isOBS ? 'rgba(255,255,255,0.3)' : '#5A22A3';
                                let letterColor = isOBS ? 'white' : '#5A22A3';

                                if (cell.owner === 'team1') {
                                    fillId = 'url(#grad-team1)';
                                    strokeColor = '#5A22A3';
                                    letterColor = 'white';
                                } else if (cell.owner === 'team2') {
                                    fillId = 'url(#grad-team2)';
                                    strokeColor = '#5A22A3';
                                    letterColor = 'white';
                                }

                                return (
                                    <div key={cell.id} onClick={() => selectCell(cell)} className={`absolute flex items-center justify-center cursor-pointer transition-all duration-300 ${isActive ? 'scale-110 z-50 drop-shadow-[0_0_60px_rgba(255,255,255,0.9)]' : 'hover:scale-105 hover:z-40 z-10'} ${isWinning ? 'animate-bounce' : ''}`} style={{ left: `${left}px`, top: `${top}px`, width: `${SVG_WIDTH}px`, height: `${SVG_HEIGHT}px` }}>
                                        <svg width={SVG_WIDTH} height={SVG_HEIGHT} className="absolute inset-0 overflow-visible z-0">
                                            {/* Main Hex Body with Sci-Fi Borders */}
                                            <polygon points={hexPoints} fill={fillId} stroke={strokeColor} strokeWidth={isOBS ? 4 : STROKE_WIDTH} strokeLinejoin="round" className={isOBS && cell.owner === 'none' ? 'animate-[neonPulse_4s_infinite]' : ''} />

                                            {/* Inner Neon Line for OBS */}
                                            {isOBS && cell.owner === 'none' && (
                                                <polygon points={hexPoints} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1" strokeLinejoin="round" style={{ transform: 'scale(0.85)', transformOrigin: 'center' }} />
                                            )}

                                            {/* Glass/Gloss Overlay - Enhanced */}
                                            <polygon
                                                points={hexPoints}
                                                fill="white"
                                                style={{ opacity: isOBS ? 0.05 : 0.2, transform: 'scale(0.95)', transformOrigin: 'center' }}
                                                className="pointer-events-none"
                                            />

                                            {isWinning && (
                                                <polygon points={hexPoints} fill="none" stroke="url(#grad-winning)" strokeWidth="15" strokeLinejoin="round" style={{ filter: 'url(#ultra-glow)' }} />
                                            )}
                                        </svg>

                                        {/* Stylized Letter - High Impact Typography */}
                                        <div className={`relative z-10 font-black mt-2 select-none transition-all duration-500 italic ${isOBS ? 'text-[4.5rem] animate-[letterGlow_5s_infinite]' : 'text-[3.5rem]'} ${cell.owner !== 'none' ? 'scale-75 opacity-30 blur-[1px]' : 'scale-100'}`} style={{ color: letterColor, textShadow: isOBS ? '0 10px 40px rgba(0,0,0,0.9), 0 0 10px rgba(255,255,255,0.4)' : '0 4px 8px rgba(0,0,0,0.2)' }}>
                                            {cell.letter}
                                        </div>

                                        {/* Selection FX - Multi-layer Heavy Duty */}
                                        {isActive && (
                                            <>
                                                <div className="absolute inset-[-25px] border-[6px] border-dashed border-white/60 rounded-full animate-[spin_4s_linear_infinite] z-[-1]"></div>
                                                <div className="absolute inset-[-35px] border-[2px] border-white/20 rounded-full animate-[spin_10s_linear_reverse_infinite] z-[-2]"></div>
                                            </>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* QUESTION OVERLAY (NOW PRESET-FREE) */}
                    {activeCell && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center p-10 animate-in zoom-in duration-300">
                            {/* In OBS, use a solid black background for the modal area when active */}
                            {isOBS && <div className="absolute inset-0 bg-black/90 backdrop-blur-3xl animate-in fade-in duration-500"></div>}
                            {!isOBS && <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setActiveCell(null)}></div>}

                            <div className={`w-full max-w-5xl bg-[#0a0a1a] border-[12px] border-[#5A22A3] rounded-[5rem] p-20 shadow-[0_0_100px_rgba(0,0,0,1)] relative z-10 text-center transition-all duration-500 ${isOBS ? 'scale-[0.6] ring-[20px] ring-white/10' : ''}`}>
                                <div className="flex flex-col items-center gap-12">
                                    <div className="relative">
                                        <div className="absolute inset-0 bg-white/20 blur-3xl rounded-full scale-150 animate-pulse"></div>
                                        <div className={`px-20 py-8 rounded-[3rem] bg-white border-8 border-[#5A22A3] text-black font-black text-[12rem] italic shadow-2xl relative z-10 leading-none`}>
                                            {activeCell.letter}
                                        </div>
                                    </div>

                                    <div className="space-y-6">
                                        {currentQuestion ? (
                                            <>
                                                <h2 className="text-5xl font-black text-white leading-tight drop-shadow-lg">{currentQuestion.question}</h2>
                                                <div className="bg-emerald-500/10 border-2 border-emerald-500/30 rounded-3xl p-6 group relative">
                                                    <span className="text-gray-400 font-bold block mb-1 uppercase tracking-widest text-xs">الإجابة المتوقعة (مخفية - تبدأ بحرف {activeCell.letter})</span>
                                                    <span className="text-3xl font-black text-emerald-200 blur-md group-hover:blur-0 transition-all duration-500">{currentQuestion.answer}</span>
                                                </div>
                                                <p className="text-xl font-bold text-white/40 italic">أي إجابة تبدأ بحرف ( {activeCell.letter} ) تُعتبر صحيحة</p>
                                            </>
                                        ) : (
                                            <>
                                                <h2 className="text-6xl font-black text-white italic drop-shadow-lg">تحدي الحرف!</h2>
                                                <p className="text-3xl font-bold text-white/60">اكتب كلمة تبدأ بحرف <span className="text-white font-black">{activeCell.letter}</span></p>
                                            </>
                                        )}
                                    </div>
                                </div>

                                <div className="mt-16">
                                    {/* Buzzer Area remains here */}
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

                                {!isOBS && (
                                    <div className="mt-12 pt-8 border-t border-white/5 flex gap-4 opacity-30 hover:opacity-100 transition-opacity">
                                        <button onClick={() => finalizeRound(true, 'team1')} className="flex-1 bg-[#FF6B52]/10 p-5 rounded-2xl border-2 border-[#FF6B52]/30 text-[#FF6B52] font-black text-xl hover:bg-[#FF6B52] hover:text-white transition-all">تخطي للبنات 🌸</button>
                                        <button onClick={() => finalizeRound(true, 'team2')} className="flex-1 bg-[#14b8a6]/10 p-5 rounded-2xl border-2 border-[#14b8a6]/30 text-[#14b8a6] font-black text-xl hover:bg-[#14b8a6] hover:text-white transition-all">تخطي للأولاد 🧊</button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Home button - Hidden in OBS */}
            {!isOBS && (
                <button onClick={onHome} className="absolute top-10 right-10 z-[200] w-16 h-16 bg-white/10 hover:bg-white/20 rounded-2xl flex items-center justify-center text-white transition-all backdrop-blur-md border border-white/10">
                    <Home size={32} />
                </button>
            )}

            {/* STAGE: ENDED - ULTRA PREMIUM LEVEL COMPLETE SCREEN */}
            {stage === 'ended' && (
                <div className={`absolute inset-0 z-[200] flex items-center justify-center overflow-hidden ${isOBS ? 'bg-transparent' : 'bg-[#030310]'}`}>

                    {/* Animated Particle Background */}
                    {!isOBS && (
                        <div className="absolute inset-0 overflow-hidden">
                            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(90,34,163,0.4)_0%,transparent_70%)]"></div>
                            {/* Horizontal scan lines */}
                            <div className="absolute inset-0" style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.015) 2px, rgba(255,255,255,0.015) 4px)' }}></div>
                            {/* Stars */}
                            {Array.from({ length: 40 }).map((_, i) => (
                                <div key={i} className="absolute rounded-full bg-white animate-[levelStar_3s_ease-in-out_infinite]"
                                    style={{ width: `${Math.random() * 4 + 1}px`, height: `${Math.random() * 4 + 1}px`, top: `${Math.random() * 100}%`, left: `${Math.random() * 100}%`, animationDelay: `${Math.random() * 3}s`, animationDuration: `${Math.random() * 2 + 2}s`, opacity: Math.random() * 0.8 + 0.2 }} />
                            ))}
                            {/* Corner light rays */}
                            <div className={`absolute top-0 left-0 w-full h-full opacity-30 ${winner === 'team1' ? 'bg-[radial-gradient(ellipse_at_top_right,rgba(255,107,82,0.4),transparent_50%)]' : 'bg-[radial-gradient(ellipse_at_top_right,rgba(20,184,166,0.4),transparent_50%)]'}`}></div>
                            <div className={`absolute top-0 left-0 w-full h-full opacity-20 ${winner === 'team1' ? 'bg-[radial-gradient(ellipse_at_bottom_left,rgba(255,107,82,0.4),transparent_50%)]' : 'bg-[radial-gradient(ellipse_at_bottom_left,rgba(20,184,166,0.4),transparent_50%)]'}`}></div>
                        </div>
                    )}

                    {/* Main Content */}
                    <div className={`relative z-10 flex flex-col items-center gap-10 max-w-5xl w-full px-12 text-center animate-in zoom-in slide-in-from-bottom-20 duration-700 ${isOBS ? 'scale-[0.5]' : ''}`}>

                        {/* LEVEL COMPLETE Header */}
                        <div className="flex flex-col items-center gap-3 animate-in slide-in-from-top-10 duration-500">
                            <div className="flex items-center gap-4 px-8 py-3 bg-white/5 border border-white/10 rounded-full">
                                <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                                <span className="text-yellow-400 font-black text-sm uppercase tracking-[0.5em]">Level Complete!</span>
                                <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                            </div>
                            <h1 className="text-[7rem] font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white via-white to-white/30 leading-none drop-shadow-[0_0_80px_rgba(255,255,255,0.3)]">المرحلة<br /><span className={winner === 'team1' ? 'text-[#FF8A75]' : 'text-[#2DD4BF]'}>{currentLevel - 1 > 0 ? currentLevel - 1 : 1}</span></h1>
                        </div>

                        {/* Stage Progress Bar */}
                        <div className="w-full max-w-3xl animate-in slide-in-from-bottom-10 duration-700 delay-200">
                            <div className="flex justify-between items-center mb-4">
                                <span className="text-white/40 font-black text-sm uppercase tracking-widest">المرحلة السابقة</span>
                                <span className="text-white/40 font-black text-sm uppercase tracking-widest">الجارية</span>
                            </div>
                            <div className="relative h-6 bg-white/5 rounded-full border border-white/10 overflow-hidden shadow-inner">
                                <div
                                    className={`h-full rounded-full transition-all duration-2000 ease-out shadow-lg ${winner === 'team1' ? 'bg-gradient-to-r from-[#FF6B52] to-[#FF8A75] shadow-[#FF6B52]/50' : 'bg-gradient-to-r from-[#14b8a6] to-[#2DD4BF] shadow-[#14b8a6]/50'}`}
                                    style={{ width: `${Math.min(currentLevel, 100)}%`, boxShadow: winner === 'team1' ? '0 0 20px rgba(255,107,82,0.8)' : '0 0 20px rgba(20,184,166,0.8)' }}
                                ></div>
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-[shimmer_2s_infinite]"></div>
                            </div>
                            <div className="flex justify-between items-center mt-3">
                                <span className="text-white/30 font-bold text-xs">مرحلة 1</span>
                                <div className={`px-5 py-1.5 rounded-full font-black text-sm ${winner === 'team1' ? 'bg-[#FF6B52]/20 text-[#FF8A75] border border-[#FF6B52]/30' : 'bg-[#14b8a6]/20 text-[#2DD4BF] border border-[#14b8a6]/30'}`}>
                                    {currentLevel} / 100
                                </div>
                                <span className="text-white/30 font-bold text-xs">مرحلة 100</span>
                            </div>
                        </div>

                        {/* Winner Card */}
                        <div className={`relative w-full max-w-2xl rounded-[4rem] border-4 p-10 flex items-center gap-10 animate-in zoom-in duration-500 delay-300 shadow-2xl ${winner === 'team1' ? 'bg-[#FF6B52]/10 border-[#FF6B52]/50 shadow-[#FF6B52]/20' : 'bg-[#14b8a6]/10 border-[#14b8a6]/50 shadow-[#14b8a6]/20'}`}>
                            {/* Glow effect */}
                            <div className={`absolute inset-0 rounded-[4rem] blur-xl opacity-20 ${winner === 'team1' ? 'bg-[#FF6B52]' : 'bg-[#14b8a6]'}`}></div>

                            {/* Trophy */}
                            <div className="relative shrink-0">
                                <div className={`w-32 h-32 rounded-[2.5rem] flex items-center justify-center text-6xl border-8 shadow-2xl ${winner === 'team1' ? 'bg-[#FF6B52] border-white/20' : 'bg-[#14b8a6] border-white/20'}`}>
                                    {winner === 'team1' ? '🌸' : '🧊'}
                                </div>
                                <Crown size={40} className="absolute -top-5 -right-3 text-yellow-400 drop-shadow-[0_0_20px_rgba(250,204,21,0.8)] animate-bounce" />
                            </div>

                            <div className="text-right flex-1 relative z-10">
                                <div className="text-white/50 font-black text-sm uppercase tracking-[0.4em] mb-2">الفائز بهذه المرحلة</div>
                                <h2 className="text-5xl font-black text-white italic drop-shadow-lg">{winner === 'team1' ? team1Name : team2Name}</h2>
                                <div className={`mt-3 inline-flex items-center gap-2 px-5 py-2 rounded-full text-sm font-black ${winner === 'team1' ? 'bg-[#FF6B52]/30 text-[#FF8A75]' : 'bg-[#14b8a6]/30 text-[#2DD4BF]'}`}>
                                    <Trophy size={16} /> بطل المرحلة {currentLevel - 1 > 0 ? currentLevel - 1 : 1}
                                </div>
                            </div>
                        </div>

                        {/* Next Level teaser */}
                        {currentLevel <= 100 && !isOBS && (
                            <div className="flex items-center gap-4 animate-in fade-in duration-500 delay-500">
                                <div className="h-px w-20 bg-gradient-to-r from-transparent to-white/20"></div>
                                <div className="flex items-center gap-3 px-6 py-3 bg-white/5 border border-white/10 rounded-full">
                                    <Sparkles size={16} className="text-indigo-400 animate-pulse" />
                                    <span className="text-white/60 font-black text-sm italic">المرحلة التالية: {currentLevel}</span>
                                    <ArrowRight size={16} className="text-indigo-400" />
                                </div>
                                <div className="h-px w-20 bg-gradient-to-l from-transparent to-white/20"></div>
                            </div>
                        )}

                        {/* Action Buttons */}
                        {!isOBS && (
                            <div className="flex gap-6 animate-in slide-in-from-bottom-10 duration-500 delay-500">
                                <button
                                    onClick={() => { startGame(); }}
                                    className={`flex items-center gap-4 px-14 py-7 rounded-[2rem] font-black text-3xl text-white transition-all hover:scale-105 active:scale-95 shadow-2xl border-b-8 border-black/20 ${winner === 'team1' ? 'bg-gradient-to-r from-[#FF6B52] to-[#FF8A75] shadow-[#FF6B52]/30' : 'bg-gradient-to-r from-[#14b8a6] to-[#2DD4BF] shadow-[#14b8a6]/30'}`}
                                >
                                    <Play fill="currentColor" size={32} /> المرحلة {currentLevel}
                                </button>
                                <button
                                    onClick={() => setStage('settings')}
                                    className="flex items-center gap-4 bg-white/10 hover:bg-white/20 text-white px-10 py-7 rounded-[2rem] font-black text-2xl transition-all border-2 border-white/10 hover:scale-105 active:scale-95"
                                >
                                    <Settings size={28} /> إعدادات
                                </button>
                                <button
                                    onClick={onHome}
                                    className="flex items-center gap-4 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white px-10 py-7 rounded-[2rem] font-black text-2xl transition-all border-2 border-red-600/30 hover:scale-105 active:scale-95"
                                >
                                    <Home size={28} />
                                </button>
                            </div>
                        )}
                    </div>

                    <style>{`
                        @keyframes levelStar { 0%, 100% { opacity: 0.2; transform: scale(1); } 50% { opacity: 1; transform: scale(1.5); } }
                        @keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
                    `}</style>
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
