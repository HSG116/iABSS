import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { chatService } from '../services/chatService';
import { supabase } from '../services/supabase';
import { LETTER_GAME_QUESTIONS } from '../data/letter_game_data';
import { HexCellData, LetterQuestion } from '../types';
import { Home, LogOut, Check, X, Shield, Trophy, Smartphone, AlertTriangle } from 'lucide-react';
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

export const LetterHexagonGame: React.FC<LetterHexagonGameProps> = ({ onHome }) => {
    const [cells, setCells] = useState<HexCellData[]>([]);
    const [activeCell, setActiveCell] = useState<HexCellData | null>(null);
    const [currentQuestion, setCurrentQuestion] = useState<LetterQuestion | null>(null);
    const [fastestPlayer, setFastestPlayer] = useState<{ name: string, team: 'team1' | 'team2', time: number, avatar?: string } | null>(null);
    const [team1Name, setTeam1Name] = useState('الفريق الأخضر');
    const [team2Name, setTeam2Name] = useState('الفريق البرتقالي');
    const [gameActive, setGameActive] = useState(false);
    const [winner, setWinner] = useState<'team1' | 'team2' | null>(null);

    const channelRef = useRef<any>(null);

    // Initialize Board
    useEffect(() => {
        // Shuffle letters
        const shuffled = [...ARABIC_LETTERS].sort(() => Math.random() - 0.5);
        let lIdx = 0;
        const initialCells: HexCellData[] = [];

        GRID_LAYOUT.forEach((cols, rowIdx) => {
            for (let colIdx = 0; colIdx < cols; colIdx++) {
                initialCells.push({
                    id: initialCells.length,
                    row: rowIdx,
                    col: colIdx,
                    letter: shuffled[lIdx++],
                    owner: 'none'
                });
            }
        });
        setCells(initialCells);
    }, []);

    // Setup Realtime for Smart Buzzers
    useEffect(() => {
        channelRef.current = supabase.channel('buzzer_channel')
            .on('broadcast', { event: 'BUZZ' }, (payload) => {
                if (!gameActive || !currentQuestion || fastestPlayer) return;

                // Register the first person to buzz
                const { username, team, timestamp, avatar } = payload.payload;

                setFastestPlayer({
                    name: username,
                    team: team,
                    time: timestamp,
                    avatar: avatar
                });

                // Play buzz sound
                try {
                    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
                    audio.volume = 0.8;
                    audio.play();
                } catch (e) { }
            })
            .subscribe();

        return () => {
            if (channelRef.current) {
                supabase.removeChannel(channelRef.current);
            }
        };
    }, [gameActive, currentQuestion, fastestPlayer]);


    const startGame = () => {
        setGameActive(true);
        setWinner(null);
    };

    const selectCell = (cell: HexCellData) => {
        if (cell.owner !== 'none' || winner) return; // Already answered
        setActiveCell(cell);
        setFastestPlayer(null); // Reset buzzer

        // Find question for this letter
        const availableQs = LETTER_GAME_QUESTIONS.filter(q => q.letter === cell.letter);
        const randomQ = availableQs[Math.floor(Math.random() * availableQs.length)];
        setCurrentQuestion(randomQ || { id: 999, letter: cell.letter, question: `سؤال لحرف ${cell.letter}`, answer: 'الجواب' });
    };

    const markAnswer = (isCorrect: boolean) => {
        if (!activeCell || !fastestPlayer) return;

        const winningTeam = isCorrect ? fastestPlayer.team : (fastestPlayer.team === 'team1' ? 'team2' : 'team1');

        setCells(prev => prev.map(c =>
            c.id === activeCell.id ? { ...c, owner: winningTeam } : c
        ));

        setActiveCell(null);
        setCurrentQuestion(null);
        setFastestPlayer(null);
    };

    const assignCellManually = (team: 'team1' | 'team2') => {
        if (!activeCell) return;
        setCells(prev => prev.map(c =>
            c.id === activeCell.id ? { ...c, owner: team } : c
        ));
        setActiveCell(null);
        setCurrentQuestion(null);
        setFastestPlayer(null);
    };


    // Helper for hexagonal styling
    const hexWidth = 90;
    const hexHeight = 104; // w * 1.154
    const rowHeight = hexHeight * 0.75;
    const colWidth = hexWidth;

    const getTeamColor = (owner: string) => {
        if (owner === 'team1') return 'bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.8)]';
        if (owner === 'team2') return 'bg-orange-500 shadow-[0_0_20px_rgba(249,115,22,0.8)]';
        return 'bg-white hover:bg-gray-200';
    };

    const getTeamText = (owner: string) => {
        if (owner === 'none') return 'text-[#6d28d9]'; // the purple color from image
        return 'text-white';
    };

    return (
        <>
            <SidebarPortal>
                <div className="bg-black/80 backdrop-blur-2xl p-6 rounded-[2.5rem] border-2 border-white/5 space-y-6 animate-in slide-in-from-right duration-500 shadow-2xl relative">
                    <div className="flex items-center justify-between">
                        <h4 className="text-[14px] font-black text-white uppercase tracking-widest flex items-center gap-3">
                            <Shield size={18} className="text-blue-500" /> إدارة اللعبة
                        </h4>
                        <button onClick={onHome} className="p-2.5 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-2xl transition-all border border-white/5"><LogOut size={16} /></button>
                    </div>

                    <div className="space-y-4">
                        {/* Team Names Input */}
                        {!gameActive ? (
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs text-emerald-500 font-bold px-1">الفريق الأول (من الأعلى للأسفل)</label>
                                    <input value={team1Name} onChange={e => setTeam1Name(e.target.value)} className="w-full bg-white/5 border border-emerald-500/30 rounded-xl p-3 text-white font-bold" />
                                </div>
                                <div>
                                    <label className="text-xs text-orange-500 font-bold px-1">الفريق الثاني (من اليمين لليسار)</label>
                                    <input value={team2Name} onChange={e => setTeam2Name(e.target.value)} className="w-full bg-white/5 border border-orange-500/30 rounded-xl p-3 text-white font-bold" />
                                </div>

                                <button onClick={startGame} className="w-full bg-green-600 hover:bg-green-500 transition-colors py-4 rounded-xl font-black text-white text-lg mt-4 shadow-lg shadow-green-600/20">
                                    بدء اللعبة
                                </button>
                            </div>
                        ) : (
                            <>
                                <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                                    <Smartphone className="text-red-500 animate-pulse" size={20} />
                                    <span className="text-xs font-bold text-red-500 leading-tight">لينك الأجراس:<br /><span className="text-white select-all font-mono text-sm tracking-widest">iabs-arena.com/?view=BUZZER_PAD</span></span>
                                </div>

                                {activeCell && currentQuestion && (
                                    <div className="bg-white/5 p-4 rounded-2xl border border-white/10 space-y-4 animate-in fade-in zoom-in duration-300">
                                        <div className="flex justify-between items-center text-xs font-black text-gray-400">
                                            <span>حرف: {activeCell.letter}</span>
                                        </div>
                                        <p className="text-white text-lg font-bold leading-relaxed">{currentQuestion.question}</p>

                                        <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-xl text-center">
                                            <span className="text-xs font-bold text-green-500 uppercase block mb-1">الجواب الصحيح</span>
                                            <span className="text-xl font-black text-white">{currentQuestion.answer}</span>
                                        </div>

                                        {!fastestPlayer ? (
                                            <div className="flex items-center justify-center gap-2 p-4 bg-zinc-800 rounded-xl animate-pulse">
                                                <AlertTriangle className="text-yellow-500" />
                                                <span className="text-sm font-bold text-yellow-500">بانتظار جرس اللاعبين...</span>
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                <div className={`p-4 rounded-xl border-2 flex items-center justify-between ${fastestPlayer.team === 'team1' ? 'bg-emerald-500/20 border-emerald-500' : 'bg-orange-500/20 border-orange-500'}`}>
                                                    <div className="flex items-center gap-3">
                                                        {fastestPlayer.avatar && <img src={fastestPlayer.avatar} className="w-10 h-10 rounded-full border-2 border-white/20" />}
                                                        <div>
                                                            <div className="text-white font-black text-lg">{fastestPlayer.name}</div>
                                                            <div className={`text-xs font-bold ${fastestPlayer.team === 'team1' ? 'text-emerald-400' : 'text-orange-400'}`}>{fastestPlayer.team === 'team1' ? team1Name : team2Name}</div>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 gap-2">
                                                    <button onClick={() => markAnswer(true)} className="bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-xl flex justify-center items-center gap-2">
                                                        <Check size={18} /> جواب صحيح
                                                    </button>
                                                    <button onClick={() => markAnswer(false)} className="bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded-xl flex justify-center items-center gap-2">
                                                        <X size={18} /> خاطئ
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {/* Fallback override */}
                                        <div className="pt-4 border-t border-white/10 mt-4">
                                            <p className="text-[10px] text-center text-gray-500 mb-2">تعيين الخلية يدوياً (بدون جرس)</p>
                                            <div className="grid grid-cols-2 gap-2">
                                                <button onClick={() => assignCellManually('team1')} className="bg-emerald-600/30 hover:bg-emerald-600 text-emerald-400 hover:text-white text-[10px] font-bold py-2 rounded-lg border border-emerald-500/50">لصالح الأخضر</button>
                                                <button onClick={() => assignCellManually('team2')} className="bg-orange-600/30 hover:bg-orange-600 text-orange-400 hover:text-white text-[10px] font-bold py-2 rounded-lg border border-orange-500/50">لصالح البرتقالي</button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </SidebarPortal>

            {/* Main Game Area */}
            <div className="w-full h-full flex flex-col items-center justify-center relative p-8 select-none" dir="ltr">

                {/* Background Styling mimicking the image */}
                <div className="absolute inset-0 flex z-0 overflow-hidden">
                    <div className="w-1/2 h-full bg-[#14b8a6]"></div>
                    <div className="w-1/2 h-full bg-[#ff7b54]"></div>
                    {/* Diagonal cuts could be added with clip-path, simple split for now */}
                    <div className="absolute inset-0 bg-black/10 mix-blend-overlay"></div>
                </div>

                <div className="relative z-10 flex flex-col items-center">

                    {/* Header / Title */}
                    <div className="mb-12 text-center animate-in slide-in-from-top-10 duration-700">
                        <h1 className="text-7xl font-black italic drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)]">
                            <span className="text-yellow-400 mr-4">حروف</span>
                            <span className="text-blue-500 mr-4">مع</span>
                            <span className="text-red-600">حمودي</span>
                        </h1>
                    </div>

                    {/* Turn Indicators */}
                    <div className="flex w-full max-w-4xl justify-between mb-8">
                        <div className="bg-emerald-600 border-[3px] border-white px-8 py-3 rounded-full text-white font-black text-2xl shadow-[0_10px_30px_rgba(5,150,105,0.6)] transform -rotate-2">
                            {team1Name} ↓↑
                        </div>
                        <div className="bg-orange-500 border-[3px] border-white px-8 py-3 rounded-full text-white font-black text-2xl shadow-[0_10px_30px_rgba(249,115,22,0.6)] transform rotate-2">
                            ←→ {team2Name}
                        </div>
                    </div>

                    {/* The Hexagon Board */}
                    <div className="relative" style={{ width: `${colWidth * 6 + colWidth / 2}px`, height: `${rowHeight * 5 + hexHeight / 4}px` }}>
                        {cells.map(cell => {
                            const isOffset = cell.row % 2 !== 0; // rows 1 and 3 have 5 cells, offset right

                            // Calculate exact positioning
                            // If row is offset (odd), shift by half a colWidth
                            const left = (cell.col * colWidth) + (isOffset ? colWidth / 2 : 0);
                            const top = cell.row * rowHeight;

                            const isActive = activeCell?.id === cell.id;

                            return (
                                <div
                                    key={cell.id}
                                    onClick={() => gameActive && selectCell(cell)}
                                    className={`absolute flex items-center justify-center cursor-pointer transition-all duration-300
                        ${isActive ? 'scale-110 z-50 animate-pulse' : 'hover:scale-105 z-10'}
                        `}
                                    style={{
                                        left: `${left}px`,
                                        top: `${top}px`,
                                        width: `${hexWidth}px`,
                                        height: `${hexHeight}px`,
                                        clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
                                    }}
                                >
                                    {/* Inner Fill */}
                                    <div className={`w-full h-full flex flex-col items-center justify-center border-4 border-[#6d28d9] ${getTeamColor(cell.owner)} transition-colors duration-500`}>
                                        {cell.owner !== 'none' && (
                                            <div className="absolute inset-0 border-4 border-white opacity-40 mix-blend-overlay"></div>
                                        )}
                                        <span className={`text-4xl font-black drop-shadow-md ${getTeamText(cell.owner)} mt-2`}>
                                            {cell.letter}
                                        </span>
                                    </div>

                                    {/* Stroke simulation (CSS clip-path doesn't support borders well, so we simulate via overlay or shadow in future if needed) */}
                                </div>
                            );
                        })}
                    </div>

                </div>

            </div>
        </>
    );
};
