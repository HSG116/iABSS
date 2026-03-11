import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    Settings, Play, Users, Trophy, Clock, ChevronLeft, User, Trash2,
    Sparkles, Loader2, Palette, Undo2, Redo2, Download, Grid3X3,
    Ruler, ZoomIn, ZoomOut, RotateCcw, FileImage, FileText,
    Image as ImageIcon, FlipHorizontal, FlipVertical, Home, Lock,
    ChevronDown, ChevronUp, Wand2, Eye, EyeOff, Scissors, Maximize2,
    Minimize2, Monitor, Layout, Crown, PaintBucket, Square, Circle,
    Triangle, Pentagon, Star
} from 'lucide-react';
import { ProAvatar } from './ProAvatar';
import { ChatUser } from '../types';
import { chatService } from '../services/chatService';
import { supabase } from '../services/supabase';
import { DrawingEngine, ToolType, BrushSettings, Layer } from './drawing/DrawingEngine';
import { DrawingToolbar } from './drawing/DrawingToolbar';
import { LayersPanel } from './drawing/LayersPanel';
import './drawing/DrawingStudio.css';

interface DrawingChallengeProps { onHome: () => void; isOBS?: boolean; }
interface GameConfig { joinKeyword: string; maxPlayers: number; roundDuration: number; autoProgress: boolean; pointsForWinner: number; totalRounds: number; }
type GamePhase = 'SETUP' | 'LOBBY' | 'OBS_CONNECTION' | 'SELECT_WORD' | 'DRAWING' | 'RESULTS' | 'FINALE';
interface PlayerScore { user: ChatUser; score: number; wins: number; }

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";

const WORDS_TO_DRAW = [
    'سيارة', 'بيت', 'شجرة', 'شمس', 'قمر', 'بحر', 'كتاب', 'قلم', 'تفاحة', 'موزة',
    'قطة', 'كلب', 'اسد', 'فيل', 'طائرة', 'هاتف', 'كمبيوتر', 'كرسي', 'طاولة', 'خبز',
    'جامع', 'برج', 'سفينة', 'صحراء', 'جبل', 'بركان', 'نظارة', 'ساعة', 'مطر', 'ثلج',
    'وردة', 'فراشة', 'سمكة', 'نجمة', 'سحابة', 'نار', 'ثلج', 'برتقال', 'عنب', 'بطيخ',
    'كرز', 'فراولة', 'أناناس', 'فأر', 'زرافة', 'قرد', 'نحلة', 'عنكبوت', 'سلحفاة', 'أرنب',
    'دراجة', 'موتوسيكل', 'شاحنة', 'صاروخ', 'خيمة', 'منارة', 'قلعة', 'هرم', 'بيتزا', 'همبرغر',
    'آيس كريم', 'كيك', 'دونات', 'قهوة', 'شاي', 'عصير', 'بيتزا', 'ساندوتش', 'جبنة', 'بيض',
    'مطرقة', 'مفتاح', 'سيف', 'درع', 'تاج', 'خاتم', 'حقيبة', 'مظلة', 'نظارة شمسية', 'ساعة يد',
    'بيانو', 'جيتار', 'طبلة', 'كاميرا', 'تلفزيون', 'راديو', 'مصباح', 'مروحة', 'مكيف', 'ثلاجة',
    'سرير', 'أريكة', 'فرشاة أسنان', 'صابون', 'مرآة', 'سجادة', 'منشفة', 'حذاء', 'قميص', 'قبعة',
    'كمشة', 'مسمار', 'برغي', 'مفك', 'منشار', 'فأس', 'مقدح', 'ميزان', 'بوصلة', 'خارطة',
    'عدسة', 'مجهر', 'تلسكوب', 'بوصلة', 'ساعة رملية', 'تقويم', 'مفكرة', 'قاموس', 'مظلة', 'حقيبة ظهر',
    'محفظة', 'نظارات', 'سماعات', 'خوذة', 'قفازات', 'وشاح', 'حزام', 'ربطة عنق', 'جاكيت', 'فستان',
    'تنورة', 'قميص نوم', 'ملابس رياضة', 'مايوه', 'قبعة صوف', 'بوت', 'صندل', 'شبشب', 'جورب', 'خاتم',
    'سوار', 'قلادة', 'قرط', 'تاج', 'عصا سحرية', 'سيف', 'درع', 'سهم', 'قوس', 'خوذة قتال',
    'بندقية', 'دبابة', 'طائرة حربية', 'سفينة فضائية', 'صاروخ', 'قنبلة', 'لغم', 'رادار', 'قمر صناعي', 'محطة فضاء',
    'لوحة مفاتيح', 'فأرة', 'شاشة', 'طابعة', 'ماسح ضوئي', 'قرص صلب', 'ذاكرة', 'معالج', 'كابل', 'شاحن',
    'بطارية', 'مقبس', 'لمبة', 'مفتاح ضوء', 'جرس', 'كاميرا مراقبة', 'إنذار', 'قفل', 'مفتاح', 'خزنة',
    'فرن', 'ميكروويف', 'غسالة', 'جلاية', 'خلاط', 'محضرة طعام', 'غلاية', 'توستر', 'مطحنة قهوة', 'ماكينة خياطة',
    'مكواة', 'مكنسة كهربائية', 'ميزان حرارة', 'بوصلة', 'صافرة', 'ميدالية', 'كأس', 'درع تكريم', 'راية', 'علم',
    'بالون', 'طائرة ورقية', 'أرجوحة', 'سليسة', 'لعبة مكعبات', 'قطار لعب', 'دمية', 'كرة سلة', 'كرة قدم', 'مضرب تنس',
    'طاولة بلياردو', 'سهام', 'بولينج', 'شطرنج', 'طاولة زهر', 'ورق لعب', 'بينغو', 'لغز', 'مكعب روبيك', 'تزلج',
    'خشب', 'حديد', 'حجر', 'رمل', 'زجاج', 'بلاستيك', 'مطاط', 'جلد', 'قماش', 'قطن',
    'صوف', 'حرير', 'ورق', 'كرتون', 'ذهب', 'فضة', 'نحاس', 'الماس', 'ياقوت', 'زمرد',
    'بنزين', 'زيت', 'غاز', 'فحم', 'كهرباء', 'طاقة شمسية', 'مفاعل', 'بركان', 'شلال', 'نهر',
    'بحيرة', 'ماء', 'ثلج', 'برد', 'مطر', 'سحاب', 'ضباب', 'إعصار', 'زلزال', 'برق',
    'رعد', 'شمس', 'قمر', 'نجم', 'كوكب', 'مجرة', 'فضاء', 'ثقب أسود', 'مذنب', 'نيزك',
    'شجرة أرز', 'نخلة', 'غابة', 'بستان', 'حقل', 'مزرعة', 'حديقة', 'زهور', 'نباتات', 'عشب',
    'صبار', 'فطر', 'طحالب', 'سمك قرش', 'حوت', 'دلفين', 'أخطبوط', 'سرطان', 'جمبري', 'صدفة'
];

const COLORS = ['#ffffff', '#000000', '#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#78716c', '#1e3a5f', '#f472b6', '#a3e635'];

export const DrawingChallenge: React.FC<DrawingChallengeProps> = ({ onHome, isOBS }) => {
    const [config, setConfig] = useState<GameConfig>({ joinKeyword: 'رسم', maxPlayers: 100, roundDuration: 120, autoProgress: true, pointsForWinner: 100, totalRounds: 10 });
    const [phase, setPhase] = useState<GamePhase>('SETUP');
    const [participants, setParticipants] = useState<ChatUser[]>([]);
    const [scores, setScores] = useState<Record<string, PlayerScore>>({});
    const [timer, setTimer] = useState(0);
    const [targetWord, setTargetWord] = useState('');
    const [suggestedWords, setSuggestedWords] = useState<string[]>([]);
    const [round, setRound] = useState(1);
    const [winner, setWinner] = useState<ChatUser | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);

    // Drawing state
    const [activeTool, setActiveTool] = useState<ToolType>('pencil');
    const [brush, setBrush] = useState<BrushSettings>({
        color: '#000000', size: 5, opacity: 1, hardness: 1, fillShape: false, stabilizer: 5
    });
    const [zoom, setZoom] = useState(100);
    const [showGrid, setShowGrid] = useState(false);
    const [showUI, setShowUI] = useState(true);
    const [showExport, setShowExport] = useState(false);
    const [showFilters, setShowFilters] = useState(false);
    const [layers, setLayers] = useState<Layer[]>([]);
    const [activeLayerId, setActiveLayerId] = useState('');
    const [isDrawing, setIsDrawing] = useState(false);
    const [startPoint, setStartPoint] = useState({ x: 0, y: 0 });
    const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
    const [isPanning, setIsPanning] = useState(false);
    const [panStart, setPanStart] = useState({ x: 0, y: 0 });
    const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
    const [mirrorMode, setMirrorMode] = useState(false);

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const previewCanvasRef = useRef<HTMLCanvasElement>(null);
    const engineRef = useRef<DrawingEngine | null>(null);
    const phaseRef = useRef(phase);
    const configRef = useRef(config);
    const targetWordRef = useRef(targetWord);
    const participantsRef = useRef(participants);
    const [broadcastChannel, setBroadcastChannel] = useState<any>(null);

    // Sync refs
    useEffect(() => {
        phaseRef.current = phase; configRef.current = config;
        targetWordRef.current = targetWord; participantsRef.current = participants;
        if (broadcastChannel && !isOBS) {
            broadcastChannel.send({ type: 'broadcast', event: 'state_sync', payload: { phase, timer, targetWord, round, score: scores, winner } });
        }
    }, [phase, config, targetWord, participants, timer, scores, round, winner]);

    // Init engine
    useEffect(() => {
        if (phase === 'DRAWING' && canvasRef.current) {
            // Re-initialize engine because the canvas element is unmounted/remounted when phase changes
            const engine = new DrawingEngine(canvasRef.current, 1920, 1080);
            engineRef.current = engine;
            setLayers([...engine.layers]);
            setActiveLayerId(engine.activeLayerId);
        }
    }, [phase]);

    // Update engine properties when state changes
    useEffect(() => {
        if (engineRef.current) {
            engineRef.current.mirrorMode = mirrorMode;
        }
    }, [mirrorMode]);

    // Broadcast channel
    useEffect(() => {
        const channel = supabase.channel('drawing_sync', { config: { broadcast: { self: true } } });
        channel
            .on('broadcast', { event: 'state_sync' }, ({ payload }) => {
                if (isOBS) {
                    setPhase(payload.phase);
                    setTimer(payload.timer);
                    setTargetWord(payload.targetWord);
                    setRound(payload.round);
                    setScores(payload.score);
                    setWinner(payload.winner);
                }
            })
            .on('broadcast', { event: 'canvas_data' }, ({ payload }) => {
                if (isOBS && canvasRef.current) {
                    const img = new window.Image();
                    img.src = payload.data;
                    img.onload = () => {
                        const ctx = canvasRef.current?.getContext('2d');
                        if (ctx) { ctx.clearRect(0, 0, 1920, 1080); ctx.drawImage(img, 0, 0); }
                    };
                }
            })
            .subscribe((status) => { if (status === 'SUBSCRIBED') setBroadcastChannel(channel); });
        return () => { channel.unsubscribe(); };
    }, [isOBS]);

    // Sync canvas to OBS
    useEffect(() => {
        if (isOBS || phase !== 'DRAWING' || !broadcastChannel) return;
        const iv = setInterval(() => {
            if (canvasRef.current) {
                broadcastChannel.send({ type: 'broadcast', event: 'canvas_data', payload: { data: canvasRef.current.toDataURL('image/jpeg', 0.5) } });
            }
        }, 1000);
        return () => clearInterval(iv);
    }, [phase, broadcastChannel, isOBS]);

    // Chat listener
    useEffect(() => {
        const unsub = chatService.onMessage((msg) => {
            const content = msg.content.trim();
            const username = msg.user.username;
            if (phaseRef.current === 'LOBBY' && content.toLowerCase() === configRef.current.joinKeyword.toLowerCase()) {
                setParticipants(prev => {
                    if (prev.length >= configRef.current.maxPlayers || prev.some(p => p.username === username)) return prev;
                    chatService.fetchKickAvatar(username).then(avatar => {
                        if (avatar) setParticipants(c => c.map(p => p.username === username ? { ...p, avatar } : p));
                    });
                    return [...prev, msg.user];
                });
            }
            if (phaseRef.current === 'DRAWING') {
                if (!participantsRef.current.some(p => p.username === username)) return;
                if (content === targetWordRef.current) handleCorrectGuess(msg.user);
            }
        });
        return () => unsub();
    }, []);

    const handleCorrectGuess = (user: ChatUser) => {
        setWinner(user);
        setScores(prev => {
            const c = prev[user.username] || { user, score: 0, wins: 0 };
            return { ...prev, [user.username]: { ...c, score: c.score + configRef.current.pointsForWinner, wins: c.wins + 1 } };
        });
        setPhase('RESULTS');
        if (config.autoProgress) {
            setTimeout(() => {
                if (round >= config.totalRounds) setPhase('FINALE');
                else { setRound(r => r + 1); prepareNextRound(); }
            }, 6000);
        }
    };

    // Timer
    useEffect(() => {
        let iv: number;
        if (phase === 'DRAWING' && timer > 0) iv = window.setInterval(() => setTimer(p => p - 1), 1000);
        else if (phase === 'DRAWING' && timer === 0) {
            setPhase('RESULTS');
            if (config.autoProgress) {
                setTimeout(() => {
                    if (round >= config.totalRounds) setPhase('FINALE');
                    else { setRound(r => r + 1); prepareNextRound(); }
                }, 5000);
            }
        }
        return () => clearInterval(iv!);
    }, [phase, timer]);

    const prepareNextRound = async () => {
        setIsGenerating(true);
        setPhase('SELECT_WORD');
        setWinner(null);
        engineRef.current?.clearLayer(engineRef.current.layers[1]?.id || '');
        engineRef.current?.composite();

        try {
            const prompt = `Generate 3 distinct, concrete, and easy-to-draw physical objects (nouns) for a Pictionary game in Arabic.
            Examples: "Lion", "Pizza", "Pyramid", "Bicycle", "Headphones".
            AVOID abstract concepts, feelings, or verbs.
            Output STRICTLY valid JSON array of strings: ["ArabicWord1", "ArabicWord2", "ArabicWord3"].`;

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
            if (jsonText) {
                const words = JSON.parse(jsonText.replace(/```json/g, '').replace(/```/g, '').trim());
                if (Array.isArray(words) && words.length === 3) {
                    setSuggestedWords(words);
                    setIsGenerating(false);
                    return;
                }
            }
        } catch (e) {
            console.error("AI Generation Failed", e);
        }

        // Fallback
        setSuggestedWords(WORDS_TO_DRAW.sort(() => Math.random() - 0.5).slice(0, 3));
        setIsGenerating(false);
    };
    const startRound = () => prepareNextRound();
    const selectWord = (w: string) => { setTargetWord(w); setTimer(config.roundDuration); setPhase('DRAWING'); };
    const resetGame = () => { setPhase('SETUP'); setParticipants([]); setScores({}); setRound(1); };

    const handleHardReset = () => {
        if (window.confirm('هل تريد مسح اللوحة بالكامل والبدء من جديد؟')) {
            engineRef.current?.hardReset();
            syncLayers();
        }
    };

    const syncLayers = () => {
        const e = engineRef.current;
        if (!e) return;
        setLayers([...e.layers]);
        setActiveLayerId(e.activeLayerId);
    };

    // Canvas coordinates
    const getCanvasCoords = (e: React.MouseEvent | React.TouchEvent) => {
        const canvas = canvasRef.current!;
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        if ('touches' in e) {
            return { x: (e.touches[0].clientX - rect.left) * scaleX, y: (e.touches[0].clientY - rect.top) * scaleY };
        }
        return { x: ((e as React.MouseEvent).clientX - rect.left) * scaleX, y: ((e as React.MouseEvent).clientY - rect.top) * scaleY };
    };

    const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
        if (isOBS) return;
        const { x, y } = getCanvasCoords(e);
        const engine = engineRef.current;
        if (!engine) return;
        const layer = engine.getActiveLayer();
        if (!layer || layer.locked) return;

        if (activeTool === 'hand') {
            setIsPanning(true);
            const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
            const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
            setPanStart({ x: clientX - panOffset.x, y: clientY - panOffset.y });
            return;
        }
        if (activeTool === 'eyedropper') {
            const px = layer.ctx.getImageData(Math.floor(x), Math.floor(y), 1, 1).data;
            const hex = '#' + [px[0], px[1], px[2]].map(v => v.toString(16).padStart(2, '0')).join('');
            setBrush(prev => ({ ...prev, color: hex }));
            setActiveTool('pencil');
            return;
        }
        if (activeTool === 'fill') {
            engine.saveToHistory();
            engine.fillBucket(x, y, brush.color);
            syncLayers();
            return;
        }

        setIsDrawing(true);
        setStartPoint({ x, y });
        const isSpecialShape = ['line', 'rect', 'circle', 'triangle', 'pentagon', 'hexagon', 'star', 'arrow', 'heart', 'diamond'].includes(activeTool);

        if (!isSpecialShape) {
            engine.saveToHistory();
            engine.beginStroke(x, y, brush, activeTool);
        }
    };

    const handlePointerMove = (e: React.MouseEvent | React.TouchEvent) => {
        if (isOBS) return;
        const { x, y } = getCanvasCoords(e);
        setCursorPos({ x: Math.round(x), y: Math.round(y) });

        if (isPanning && activeTool === 'hand') {
            const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
            const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
            setPanOffset({ x: clientX - panStart.x, y: clientY - panStart.y });
            return;
        }

        const engine = engineRef.current;
        if (!engine) return;

        if (isDrawing) {
            const isSpecialShape = ['line', 'rect', 'circle', 'triangle', 'pentagon', 'hexagon', 'star', 'arrow', 'heart', 'diamond'].includes(activeTool);
            if (isSpecialShape) {
                if (previewCanvasRef.current) {
                    engine.previewShape(previewCanvasRef.current, activeTool, startPoint.x, startPoint.y, x, y, brush);
                }
            } else {
                engine.continueStroke(x, y, brush, activeTool);
            }
        }
    };

    const handlePointerUp = (e: React.MouseEvent | React.TouchEvent) => {
        if (isPanning) { setIsPanning(false); return; }
        if (!isDrawing || isOBS) return;
        setIsDrawing(false);
        const engine = engineRef.current;
        if (!engine) return;

        const { x, y } = getCanvasCoords(e);
        const isSpecialShape = ['line', 'rect', 'circle', 'triangle', 'pentagon', 'hexagon', 'star', 'arrow', 'heart', 'diamond'].includes(activeTool);

        if (isSpecialShape) {
            engine.saveToHistory();
            engine.drawShape(activeTool, startPoint.x, startPoint.y, x, y, brush);
            if (previewCanvasRef.current) previewCanvasRef.current.getContext('2d')?.clearRect(0, 0, 1920, 1080);
        } else {
            engine.endStroke();
        }
        syncLayers();
    };

    const handleUndo = () => { engineRef.current?.undo(); syncLayers(); };
    const handleRedo = () => { engineRef.current?.redo(); syncLayers(); };

    const handleAddLayer = () => { engineRef.current?.addLayer(); syncLayers(); };
    const handleDeleteLayer = (id: string) => { engineRef.current?.deleteLayer(id); syncLayers(); };
    const handleToggleVis = (id: string) => {
        const e = engineRef.current; if (!e) return;
        const l = e.layers.find(x => x.id === id); if (l) l.visible = !l.visible;
        e.composite(); syncLayers();
    };
    const handleToggleLock = (id: string) => {
        const e = engineRef.current; if (!e) return;
        const l = e.layers.find(x => x.id === id); if (l) l.locked = !l.locked;
        syncLayers();
    };
    const handleSelectLayer = (id: string) => { if (engineRef.current) engineRef.current.activeLayerId = id; setActiveLayerId(id); };
    const handleReorder = (from: number, to: number) => { engineRef.current?.reorderLayers(from, to); syncLayers(); };
    const handleOpacity = (id: string, val: number) => {
        const e = engineRef.current; if (!e) return;
        const l = e.layers.find(x => x.id === id); if (l) l.opacity = val;
        e.composite(); syncLayers();
    };
    const handleDuplicate = (id: string) => { engineRef.current?.duplicateLayer(id); syncLayers(); };
    const handleMerge = (id: string) => { engineRef.current?.mergeDown(id); syncLayers(); };
    const handleClear = (id: string) => { engineRef.current?.clearLayer(id); syncLayers(); };
    const handleBlend = (id: string, mode: GlobalCompositeOperation) => {
        const e = engineRef.current; if (!e) return;
        const l = e.layers.find(x => x.id === id); if (l) l.blendMode = mode;
        e.composite(); syncLayers();
    };

    const handleFilter = (f: string) => {
        const e = engineRef.current; if (!e) return;
        if (f === 'blur') e.applyBlur();
        else if (f === 'sharpen') e.applySharpen();
        else e.applyFilter(f);
        syncLayers();
    };

    const handleFlip = (dir: 'h' | 'v') => { engineRef.current?.flipLayer(dir); syncLayers(); };

    const handleExport = (format: string) => {
        const e = engineRef.current; if (!e) return;
        let data: string; let filename: string;
        const date = new Date().toISOString().slice(0, 10);
        if (format === 'png') { data = e.exportPNG(); filename = `iABS-Studio-${date}.png`; }
        else if (format === 'jpeg') { data = e.exportJPEG(); filename = `iABS-Studio-${date}.jpg`; }
        else if (format === 'svg') {
            const svgData = e.exportSVG();
            data = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgData);
            filename = `iABS-Studio-${date}.svg`;
        } else return;
        const a = document.createElement('a'); a.href = data; a.download = filename; a.click();
        setShowExport(false);
    };

    const setBackground = (color: string) => { engineRef.current?.setBackgroundColor(color); syncLayers(); };

    // Keyboard shortcuts
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement) return;
            if (e.ctrlKey && e.key === 'z') { e.preventDefault(); handleUndo(); }
            if (e.ctrlKey && e.key === 'y') { e.preventDefault(); handleRedo(); }
            if (e.key === 'b') setActiveTool('brush');
            if (e.key === 'p') setActiveTool('pencil');
            if (e.key === 'e') setActiveTool('eraser');
            if (e.key === 'g') setActiveTool('fill');
            if (e.key === 'v') setActiveTool('move');
            if (e.key === 'h') setActiveTool('hand');
            if (e.key === 'z') setActiveTool('zoom');
            if (e.key === 'i') setActiveTool('eyedropper');
            if (e.key === 'Tab') { e.preventDefault(); setShowUI(prev => !prev); }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, []);

    // UI Components
    const SetupPhase = () => (
        <div className="w-full h-full flex flex-col items-center bg-[#0d0d12] text-right select-none overflow-hidden" dir="rtl">
            <div className="absolute inset-0 opacity-20 pointer-events-none">
                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_30%_30%,#7c3aed_0%,transparent_50%)]" />
                <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(circle_at_70%_70%,#ef4444_0%,transparent_50%)]" />
            </div>
            <div className="w-full max-w-5xl mt-16 z-10 animate-in fade-in zoom-in duration-1000">
                <div className="text-center mb-16">
                    <div className="w-24 h-24 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 shadow-[0_0_60px_rgba(124,58,237,0.4)]">
                        <Palette size={56} className="text-white" />
                    </div>
                    <h1 className="text-8xl font-black text-white italic tracking-tighter mb-4">iABS Studio Pro</h1>
                    <div className="flex items-center justify-center gap-4 text-white/30 uppercase tracking-[1em] text-[10px] font-black">
                        <div className="h-px w-12 bg-white/10" /> Professional Grade Mersem <div className="h-px w-12 bg-white/10" />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 px-6">
                    <div className="glass-panel p-10 rounded-[3rem] border border-white/5 bg-white/5 backdrop-blur-3xl space-y-10">
                        <h3 className="text-3xl font-black text-white flex items-center gap-4"><Settings className="text-violet-400" /> إعـدادات المـرسـم</h3>
                        <div className="space-y-8">
                            <div className="space-y-3">
                                <label className="text-sm font-black text-white/40 uppercase tracking-widest">كـلـمة الانضمام</label>
                                <input value={config.joinKeyword} onChange={e => setConfig({ ...config, joinKeyword: e.target.value })} className="w-full bg-black/40 border-2 border-white/5 focus:border-violet-500 rounded-2xl py-5 px-6 text-2xl font-black text-white outline-none transition-all shadow-inner" />
                            </div>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center mb-2">
                                    <label className="text-sm font-black text-white/40 uppercase tracking-widest">عدد الجولات</label>
                                    <span className="text-3xl font-black text-violet-400 italic">{config.totalRounds}</span>
                                </div>
                                <input type="range" min="5" max="500" step="5" value={config.totalRounds} onChange={e => setConfig({ ...config, totalRounds: +e.target.value })} className="brush-slider w-full" />
                            </div>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center mb-2">
                                    <label className="text-sm font-black text-white/40 uppercase tracking-widest">وقـت الـرسم</label>
                                    <span className="text-3xl font-black text-violet-400 italic">{config.roundDuration}ث</span>
                                </div>
                                <input type="range" min="30" max="600" step="30" value={config.roundDuration} onChange={e => setConfig({ ...config, roundDuration: +e.target.value })} className="brush-slider w-full" />
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-8">
                        <div className="glass-panel p-10 rounded-[3rem] border border-white/5 bg-white/5 backdrop-blur-3xl flex-1 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-600/10 blur-3xl group-hover:bg-indigo-600/20 transition-all" />
                            <Sparkles size={60} className="text-yellow-500 mb-6 drop-shadow-[0_0_20px_rgba(234,179,8,0.3)]" />
                            <h4 className="text-2xl font-black text-white mb-4 italic">نظام التحدي الاحترافي</h4>
                            <p className="text-white/40 text-lg font-bold leading-relaxed">المذيع يختار كلمة ويبدأ برسمها بدقة عالية باستخدام محرك الرسم السلس. الجمهور يخمّن في الشات والسيستم يحسب النقاط آلياً.</p>
                        </div>
                        <button onClick={() => setPhase('LOBBY')} className="w-full bg-violet-600 hover:bg-violet-500 text-white font-black py-10 rounded-[3rem] text-4xl shadow-[0_25px_60px_rgba(124,58,237,0.4)] transition-all flex items-center justify-center gap-6 group scale-100 hover:scale-[1.03] active:scale-95">
                            افـتـح المـرسـم <Play size={40} className="group-hover:translate-x-[-10px] transition-transform" fill="currentColor" />
                        </button>
                    </div>
                </div>
                <button onClick={onHome} className="mt-12 mx-auto flex items-center gap-3 text-white/20 hover:text-white font-black transition-all text-sm uppercase tracking-widest"><ChevronLeft /> العودة للرئيسية</button>
            </div>
        </div>
    );

    const LobbyPhase = () => (
        <div className="w-full h-full flex flex-col items-center bg-[#0d0d12] text-right select-none overflow-hidden" dir="rtl">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#1a1033_0%,transparent_70%)] opacity-50" />
            <div className="w-full max-w-6xl mt-20 z-10 animate-in fade-in duration-700 flex flex-col items-center">
                <h1 className="text-[120px] font-black text-white italic tracking-tighter leading-none mb-4 opacity-10 absolute top-10 select-none">WAITING_ROOM</h1>
                <div className="text-center mb-16 relative">
                    <h2 className="text-8xl font-black text-white italic tracking-tighter mb-8">انتظار المبدعين</h2>
                    <div className="flex items-center justify-center gap-6 bg-white/5 p-8 rounded-[3.5rem] border border-white/5 backdrop-blur-3xl shadow-2xl">
                        <span className="text-3xl font-bold text-white/40 italic">أكتب في الشات:</span>
                        <span className="text-7xl font-black text-violet-400 bg-violet-500/10 px-12 py-4 rounded-[2.5rem] border-2 border-violet-500/30 shadow-[0_0_50px_rgba(124,58,237,0.2)]">{config.joinKeyword}</span>
                    </div>
                </div>
                <div className="w-full grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-8 px-12 mb-24 overflow-y-auto max-h-[550px] custom-scrollbar">
                    {participants.map((p, i) => (
                        <div key={p.username} className="p-6 rounded-[2.5rem] border border-white/5 flex flex-col items-center gap-5 animate-in zoom-in bg-white/5 backdrop-blur-2xl hover:bg-white/10 transition-all group" style={{ animationDelay: `${i * 30}ms` }}>
                            <ProAvatar url={p.avatar} username={p.username} size="w-28 h-28" className="overflow-visible" />
                            <span className="font-black text-white text-lg truncate w-full text-center">{p.username}</span>
                        </div>
                    ))}
                    {participants.length === 0 && (
                        <div className="col-span-full py-20 flex flex-col items-center opacity-10">
                            <Users size={120} strokeWidth={1} />
                            <p className="text-3xl font-black mt-4">لا يوجد أحد حالياً</p>
                        </div>
                    )}
                </div>
                <div className="fixed bottom-16 flex gap-8">
                    <button onClick={resetGame} className="px-12 py-8 bg-white/5 hover:bg-white/10 rounded-[2.5rem] text-white/40 font-black border border-white/5 transition-all flex items-center gap-4 text-xl"><Trash2 size={24} /> إلغاء</button>
                    <button onClick={() => setPhase('OBS_CONNECTION')} disabled={participants.length < 1} className="px-32 py-8 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-30 disabled:grayscale rounded-[2.5rem] text-white font-black text-4xl shadow-[0_25px_60px_rgba(124,58,237,0.3)] transition-all flex items-center gap-6 group">
                        <Play size={40} className="group-hover:scale-125 transition-transform" fill="currentColor" /> ابـدأ الآن ({participants.length})
                    </button>
                </div>
            </div>
        </div>
    );

    const ResultPhase = () => (
        <div className="w-full h-full flex flex-col items-center justify-center bg-[#0d0d12] p-8 select-none overflow-hidden" dir="rtl">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#1a1033_0%,transparent_70%)] opacity-30" />
            {winner ? (
                <div className="text-center z-10 animate-in zoom-in duration-700">
                    <div className="relative inline-block mb-8">
                        <div className="absolute -inset-6 bg-yellow-500/20 blur-[60px] animate-pulse rounded-full" />
                        <Trophy size={100} className="text-yellow-400 drop-shadow-[0_0_30px_rgba(234,179,8,0.5)] animate-bounce" />
                    </div>
                    <h1 className="text-7xl font-black text-white italic tracking-tighter leading-none mb-6 drop-shadow-2xl">تـخمـين صحـيـح!</h1>
                    <div className="flex flex-col items-center gap-6 bg-white/5 p-10 rounded-[3rem] border-2 border-white/10 backdrop-blur-3xl shadow-[0_20px_80px_rgba(0,0,0,0.5)]">
                        <ProAvatar url={winner.avatar} username={winner.username} size="w-48 h-48" className="overflow-visible" />
                        <div className="text-4xl font-black text-white italic">{winner.username}</div>
                        <div className="text-xl font-black text-white/40 uppercase tracking-[0.3em] mt-2">
                            الكلمة: <span className="text-yellow-400 text-5xl mx-4 tracking-normal">{targetWord}</span>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="text-center z-10 animate-in fade-in duration-1000">
                    <h1 className="text-6xl font-black text-white/20 italic mb-6">انـتهى الـوقت!</h1>
                    <div className="bg-white/5 p-10 rounded-[2.5rem] border border-white/5 backdrop-blur-2xl">
                        <p className="text-3xl text-white/40 font-black">الكلمة كانت: <span className="text-white text-6xl mx-6 italic">{targetWord}</span></p>
                    </div>
                </div>
            )}
            {!config.autoProgress && (
                <button
                    onClick={() => {
                        if (round >= config.totalRounds) setPhase('FINALE');
                        else { setRound(r => r + 1); prepareNextRound(); }
                    }}
                    className="mt-20 px-32 py-10 bg-violet-600 text-white font-black rounded-[3rem] text-4xl hover:scale-105 transition-all shadow-2xl z-20"
                >
                    الـجولـة الـتـالـيـة
                </button>
            )}
        </div>
    );

    // Main Render Logic
    const OBS_Token = process.env.OBS_STUDIO_TOKEN || "";

    const OBSLayout = () => {
        if (!isOBS) return null;

        const CompactHUD = () => (
            <div className="p-8 bg-black/40 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] shadow-2xl flex flex-col items-center gap-4 animate-in zoom-in duration-700 min-w-[400px]">
                <div className="w-16 h-16 bg-violet-600/20 rounded-2xl flex items-center justify-center border-2 border-violet-500/40 shadow-[0_0_30px_rgba(124,58,237,0.3)] mb-2">
                    <PaintBucket className="text-violet-500 animate-bounce" size={32} />
                </div>

                {phase === 'LOBBY' && (
                    <>
                        <h2 className="text-3xl font-black text-white italic">انـتـظـار الـمبدعيـن...</h2>
                        <div className="flex flex-col items-center gap-2">
                            <span className="text-white/40 font-bold text-sm">أرسل في الشات بالانضمام:</span>
                            <span className="text-5xl font-black text-violet-400">!draw</span>
                        </div>
                        <div className="h-px w-full bg-white/5 my-2" />
                        <div className="flex items-center gap-3 text-white/30 font-black">
                            <Users size={18} /> <span>{participants.length} مشـارك</span>
                        </div>
                    </>
                )}

                {phase === 'SELECT_WORD' && (
                    <>
                        <h2 className="text-3xl font-black text-white italic">قـيـد الاختيـار</h2>
                        <div className="flex flex-col items-center gap-4">
                            <Loader2 className="animate-spin text-violet-500" size={40} />
                            <p className="text-white/40 font-bold text-center">يتم اختيار التحدي السري من قبل المذيع...</p>
                        </div>
                    </>
                )}

                {phase === 'DRAWING' && (
                    <div className="flex items-center gap-8 py-2">
                        <div className="flex flex-col items-center gap-1">
                            <span className="text-[10px] text-white/30 font-black uppercase tracking-widest">الـوقـت</span>
                            <div className={`text-4xl font-black italic ${timer < 10 ? 'text-red-500 animate-pulse' : 'text-violet-400'}`}>
                                {timer}s
                            </div>
                        </div>
                        <div className="h-10 w-[2px] bg-white/5" />
                        <div className="flex flex-col items-center gap-1">
                            <span className="text-[10px] text-white/30 font-black uppercase tracking-widest">الـمشـاركون</span>
                            <div className="text-4xl font-black text-white italic">
                                {participants.length}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );

        if (phase === 'RESULTS') return <ResultPhase />;

        return (
            <div className="w-full h-full flex items-center justify-center bg-transparent pointer-events-none select-none overflow-hidden">
                {phase === 'DRAWING' ? (
                    <div className="absolute top-10 right-10 pointer-events-none">
                        <CompactHUD />
                    </div>
                ) : (
                    <CompactHUD />
                )}
            </div>
        );
    };

    const OBSConnectionPhase = () => (
        <div className="w-full h-full flex flex-col items-center justify-center bg-[#0d0d12] text-right select-none" dir="rtl">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#201044_0%,transparent_70%)] opacity-30" />
            <div className="z-10 bg-white/5 p-16 rounded-[4rem] border-2 border-white/10 backdrop-blur-3xl shadow-2xl max-w-4xl w-full flex flex-col items-center">
                <div className="w-32 h-32 bg-violet-600 rounded-[2.5rem] flex items-center justify-center mb-8 shadow-[0_0_50px_rgba(124,58,237,0.4)]">
                    <Monitor size={64} className="text-white" />
                </div>
                <h2 className="text-6xl font-black text-white mb-4 italic">ربـط بـرنـامـج OBS</h2>
                <p className="text-white/40 text-xl font-bold mb-10 text-center">قم بنسخ الرابط التالي وإضافته كمصدر متصفح (Browser Source) في OBS</p>

                <div className="w-full bg-black/40 p-6 rounded-3xl border border-white/5 flex items-center gap-4 mb-12">
                    <input readOnly value="************************" className="bg-transparent flex-1 text-violet-400 font-mono text-xl outline-none" />
                    <button onClick={() => navigator.clipboard.writeText(`${window.location.origin}/?t=${OBS_Token}`)} className="px-10 py-4 bg-violet-600 rounded-2xl text-white font-black hover:bg-violet-500 transition-all shadow-lg active:scale-95">نـسـخ الـرابـط الـمـشـفـر</button>
                </div>

                <div className="grid grid-cols-2 gap-6 w-full mb-10">
                    <div className="p-6 bg-white/5 rounded-3xl border border-white/5">
                        <h4 className="font-black text-white mb-2 italic">الإعدادات الموصى بها:</h4>
                        <ul className="text-white/40 text-sm space-y-2 font-bold">
                            <li>• العرض: 1920 (Width)</li>
                            <li>• الطول: 1080 (Height)</li>
                            <li>• تفعيل: Control audio via OBS</li>
                        </ul>
                    </div>
                    <div className="p-6 bg-white/5 rounded-3xl border border-white/5">
                        <h4 className="font-black text-white mb-2 italic">ملاحظة:</h4>
                        <p className="text-white/40 text-sm font-bold leading-relaxed">ستظهر لوحة الرسم فقط بدون أي أدوات تحكم لضمان مظهر احترافي للبث.</p>
                    </div>
                </div>

                <button onClick={startRound} className="w-full py-8 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-[2.5rem] text-white font-black text-3xl shadow-xl hover:scale-[1.02] transition-all flex items-center justify-center gap-4">
                    تـم الـربـط، ابـدأ الـتـحدي <Play fill="currentColor" />
                </button>
            </div>
        </div>
    );

    const SelectPhase = () => (
        <div className="w-full h-full flex flex-col items-center justify-center bg-[#0d0d12] text-right select-none" dir="rtl">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#201044_0%,transparent_70%)] opacity-30" />
            <div className="z-10 w-full max-w-5xl flex flex-col items-center animate-in zoom-in duration-500">
                <h2 className="text-6xl font-black text-white mb-12 italic drop-shadow-2xl">اخـتـر الـتـحـدي</h2>

                {isGenerating ? (
                    <div className="flex flex-col items-center gap-6">
                        <Loader2 className="animate-spin text-violet-500" size={64} />
                        <p className="text-white/40 text-xl font-bold animate-pulse">جاري استحضار الأفكار...</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full px-8">
                        {suggestedWords.map((word, i) => (
                            <button
                                key={i}
                                onClick={() => selectWord(word)}
                                className="group relative h-64 bg-white/5 hover:bg-violet-600/20 rounded-[2.5rem] border border-white/10 hover:border-violet-500/50 transition-all hover:scale-105 active:scale-95 flex flex-col items-center justify-center gap-6 overflow-hidden"
                            >
                                <div className="absolute inset-0 bg-gradient-to-br from-violet-600/0 to-violet-600/0 group-hover:from-violet-600/10 group-hover:to-indigo-600/10 transition-all" />
                                <div className="w-20 h-20 rounded-2xl bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg border border-white/5">
                                    <span className="text-3xl font-black text-white/20 group-hover:text-white transition-colors">{i + 1}</span>
                                </div>
                                <span className="text-3xl font-black text-white italic z-10 group-hover:text-violet-300 transition-colors drop-shadow-md">{word}</span>
                            </button>
                        ))}
                    </div>
                )}
                <p className="mt-12 text-white/20 font-bold text-sm uppercase tracking-widest">اختر كلمة للبدء في الرسم</p>
            </div>
        </div>
    );

    if (phase === 'SETUP') return <SetupPhase />;
    if (phase === 'LOBBY') return <LobbyPhase />;
    if (phase === 'SELECT_WORD') return <SelectPhase />;
    if (phase === 'OBS_CONNECTION') return <OBSConnectionPhase />;
    if (phase === 'RESULTS') return <ResultPhase />;
    if (isOBS) {
        return (
            <div className="w-full h-full bg-transparent overflow-hidden">
                <div className="canvas-container w-full h-full">
                    <div
                        className="canvas-wrapper"
                        style={{
                            transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom / 100})`,
                            width: 1920, height: 1080
                        }}
                    >
                        <canvas ref={canvasRef} className="drawing-canvas" />
                        <canvas ref={previewCanvasRef} className="preview-canvas" width={1920} height={1080} />
                    </div>
                </div>
                <OBSLayout />
            </div>
        );
    }

    return (
        <div className={`drawing-studio ${!showUI ? 'minimal' : ''}`}>
            {/* TOP BAR */}
            {!isOBS && (
                <div className="drawing-topbar" style={{ display: showUI ? 'flex' : 'none' }}>
                    <div className="topbar-section">
                        <button onClick={onHome} className="topbar-btn"><Home size={15} /> الرئيسية</button>
                        <div className="topbar-divider" />
                        <button onClick={handleUndo} className="topbar-btn" title="تراجع (Ctrl+Z)"><Undo2 size={15} /></button>
                        <button onClick={handleRedo} className="topbar-btn" title="إعادة (Ctrl+Y)"><Redo2 size={15} /></button>
                        <div className="topbar-divider" />
                        <button onClick={() => handleFlip('h')} className="topbar-btn" title="قلب أفقي"><FlipHorizontal size={15} /></button>
                        <button onClick={() => handleFlip('v')} className="topbar-btn" title="قلب رأسي"><FlipVertical size={15} /></button>
                        <div className="topbar-divider" />
                        <button onClick={() => { setMirrorMode(!mirrorMode); }} className={`topbar-btn ${mirrorMode ? 'accent' : ''}`} title="التناظر (Mirror Mode)"><RotateCcw size={15} /></button>
                        <button onClick={() => setShowGrid(!showGrid)} className={`topbar-btn ${showGrid ? 'accent' : ''}`} title="الشبكة"><Grid3X3 size={15} /></button>
                    </div>

                    <div className="premium-title">iABS STUDIO PRO v2</div>

                    <div className="topbar-section">
                        <button onClick={() => setShowUI(false)} className="topbar-btn" title="إخفاء الأدوات (Tab)"><EyeOff size={15} /></button>
                        <button onClick={() => setShowExport(true)} className="topbar-btn magic-btn"><Sparkles size={15} /> تصدير سحري</button>
                        <button onClick={handleHardReset} className="topbar-btn danger"><Trash2 size={15} /> مسح الكل</button>
                    </div>
                </div>
            )}

            <div className="studio-body">
                {/* LEFT TOOLBAR */}
                {showUI && !isOBS && <DrawingToolbar activeTool={activeTool} onToolSelect={setActiveTool} />}

                {/* MAIN CANVAS AREA */}
                <div className="canvas-container">
                    <div
                        className="canvas-wrapper"
                        style={{
                            transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom / 100})`,
                            width: 1920, height: 1080
                        }}
                    >
                        <canvas
                            ref={canvasRef}
                            className="drawing-canvas"
                            onPointerDown={handlePointerDown}
                            onPointerMove={handlePointerMove}
                            onPointerUp={handlePointerUp}
                            onPointerLeave={handlePointerUp}
                            style={{ cursor: activeTool === 'hand' ? 'grab' : activeTool === 'move' ? 'move' : 'crosshair' }}
                        />
                        <canvas ref={previewCanvasRef} className="preview-canvas" width={1920} height={1080} />
                        {showGrid && <div className="grid-overlay" style={{ pointerEvents: 'none' }} />}
                    </div>

                    {/* FLOAT INFO FOR OBS / MINIMAL */}
                    {!isOBS && (
                        <div className="game-bar" style={{ top: showUI ? 12 : 24, right: 30, left: 'auto', transform: 'none' }}>
                            <div className={`game-badge timer ${timer < 10 ? 'warning' : ''}`}>
                                <Clock size={16} strokeWidth={3} /> <span>{timer}s</span>
                            </div>
                            <div className="game-badge players"><Users size={16} strokeWidth={3} /> {participants.length}</div>
                            <div className="game-badge pro-only"><Crown size={14} /> PRO</div>
                        </div>
                    )}

                    {/* CENTRAL WORD BANNER - Streamer Only */}
                    {!isOBS && (
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-top-10 duration-700 pointer-events-none">
                            <div className="px-10 py-3 bg-black/60 backdrop-blur-xl rounded-b-[2rem] border-x border-b border-white/10 flex items-center gap-6 shadow-2xl">
                                <div className="flex flex-col items-end">
                                    <span className="text-[10px] text-violet-400 font-black uppercase tracking-[0.2em] leading-none mb-1">الـمطلوب رسـمه</span>
                                    <span className="text-white/30 text-[10px] font-bold">بانتظار تخمين المشاهدين...</span>
                                </div>
                                <div className="h-10 w-[2px] bg-white/10" />
                                <span className="text-white font-black text-5xl italic tracking-tighter drop-shadow-[0_0_20px_rgba(255,255,255,0.3)]">{targetWord}</span>
                            </div>
                        </div>
                    )}

                    {/* PROPERTY BAR - Bottom Center */}
                    {showUI && !isOBS && (
                        <div className="property-bar animate-in slide-in-from-bottom duration-500">
                            <div className="prop-group">
                                <div className="prop-label">اللـون</div>
                                <input type="color" value={brush.color} onChange={e => setBrush({ ...brush, color: e.target.value })} className="hidden" id="main-color" />
                                <label htmlFor="main-color" className="color-swatch" style={{ backgroundColor: brush.color }} />
                                <div className="topbar-divider" />
                                {COLORS.slice(0, 6).map(c => (
                                    <div key={c} className={`color-swatch ${brush.color === c ? 'active' : ''}`} style={{ backgroundColor: c, width: 18, height: 18 }} onClick={() => setBrush({ ...brush, color: c })} />
                                ))}
                                <div className="topbar-divider" />
                                <div className="flex items-center gap-1 bg-white/5 p-1 rounded-lg">
                                    <button onClick={() => setActiveTool('rect')} className={`p-1.5 rounded-md hover:bg-white/10 ${activeTool === 'rect' ? 'text-violet-400 bg-violet-400/20' : 'text-white/40'}`} title="مربع"><Square size={14} /></button>
                                    <button onClick={() => setActiveTool('circle')} className={`p-1.5 rounded-md hover:bg-white/10 ${activeTool === 'circle' ? 'text-violet-400 bg-violet-400/20' : 'text-white/40'}`} title="دائرة"><Circle size={14} /></button>
                                    <button onClick={() => setActiveTool('triangle')} className={`p-1.5 rounded-md hover:bg-white/10 ${activeTool === 'triangle' ? 'text-violet-400 bg-violet-400/20' : 'text-white/40'}`} title="مثلت"><Triangle size={14} /></button>
                                    <button onClick={() => setActiveTool('pentagon')} className={`p-1.5 rounded-md hover:bg-white/10 ${activeTool === 'pentagon' ? 'text-violet-400 bg-violet-400/20' : 'text-white/40'}`} title="خماسي"><Pentagon size={14} /></button>
                                    <button onClick={() => setActiveTool('star')} className={`p-1.5 rounded-md hover:bg-white/10 ${activeTool === 'star' ? 'text-violet-400 bg-violet-400/20' : 'text-white/40'}`} title="نجمة"><Star size={14} /></button>
                                </div>
                            </div>

                            <div className="topbar-divider" />

                            <div className="prop-group">
                                <div className="prop-label">نعومة</div>
                                <input type="range" min="0" max="10" value={brush.stabilizer} onChange={e => setBrush({ ...brush, stabilizer: +e.target.value })} className="brush-slider" style={{ width: 60 }} />
                                <span style={{ fontSize: 9, fontWeight: 900 }}>{brush.stabilizer}</span>
                            </div>

                            <div className="topbar-divider" />

                            <div className="prop-group">
                                <div className="prop-label">حجم</div>
                                <input type="range" min="1" max="150" value={brush.size} onChange={e => setBrush({ ...brush, size: +e.target.value })} className="brush-slider" style={{ width: 60 }} />
                                <span style={{ fontSize: 9, fontWeight: 900 }}>{brush.size}</span>
                            </div>

                            <div className="topbar-divider" />

                            <div className="prop-group">
                                <button onClick={() => setBrush({ ...brush, glow: !brush.glow })} className={`toggle-pro glow ${brush.glow ? 'active' : ''}`}>
                                    <Sparkles size={14} /> {brush.glow ? 'توهج سحري' : 'توهج'}
                                </button>
                                <button onClick={() => setBrush({ ...brush, fillShape: !brush.fillShape })} className={`toggle-pro ${brush.fillShape ? 'active' : ''}`}>
                                    <PaintBucket size={14} /> {brush.fillShape ? 'تعبئة' : 'تحديد'}
                                </button>
                                <button onClick={() => setBackground(brush.color)} className="toggle-pro" title="تغيير لون الخلفية">
                                    <Monitor size={14} /> خلفية
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ZOOM CONTROLS */}
                    {!isOBS && (
                        <div className="zoom-indicator" style={{ bottom: 24, right: 30 }}>
                            <button className="zoom-btn" onClick={() => setZoom(z => Math.max(25, z - 25))}><ZoomOut size={14} /></button>
                            <span className="zoom-val">{zoom}%</span>
                            <button className="zoom-btn" onClick={() => setZoom(z => Math.min(600, z + 25))}><ZoomIn size={14} /></button>
                            <button className="zoom-btn" onClick={() => { setZoom(100); setPanOffset({ x: 0, y: 0 }); }}><RotateCcw size={14} /></button>
                        </div>
                    )}

                    {/* SHOW UI BUTTON - When hidden */}
                    {!showUI && !isOBS && (
                        <button onClick={() => setShowUI(true)} className="fixed bottom-6 left-6 w-12 h-12 rounded-2xl bg-violet-600/80 backdrop-blur-xl flex items-center justify-center text-white shadow-2xl z-[5000]">
                            <Eye size={24} />
                        </button>
                    )}
                </div>

                {/* RIGHT PANEL - Layers & Filters */}
                {showUI && !isOBS && (
                    <div className="layers-panel">
                        <LayersPanel
                            layers={layers}
                            activeLayerId={activeLayerId}
                            onSelectLayer={handleSelectLayer}
                            onAddLayer={handleAddLayer}
                            onDeleteLayer={handleDeleteLayer}
                            onToggleVisibility={handleToggleVis}
                            onToggleLock={handleToggleLock}
                            onReorder={handleReorder}
                            onOpacityChange={handleOpacity}
                            onDuplicate={handleDuplicate}
                            onMergeDown={handleMerge}
                            onClearLayer={handleClear}
                            onBlendModeChange={handleBlend}
                        />

                        <div className="filters-panel" style={{ padding: 12, borderTop: '1px solid var(--border)' }}>
                            <div className="filters-header" onClick={() => setShowFilters(!showFilters)} style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: showFilters ? 12 : 0 }}>
                                <span className="text-xs font-black"><Wand2 size={12} style={{ marginLeft: 6 }} /> مؤثرات سحرية</span>
                                {showFilters ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            </div>
                            {showFilters && (
                                <div className="filters-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                                    {[
                                        { id: 'grayscale', label: 'أبيض وأسود' }, { id: 'invert', label: 'سلبي' },
                                        { id: 'sepia', label: 'قديم' }, { id: 'warm', label: 'دافئ' },
                                        { id: 'cool', label: 'بارد' }, { id: 'saturate', label: 'مشبع' },
                                        { id: 'blur', label: 'ضبابي' }, { id: 'sharpen', label: 'حاد' }
                                    ].map(f => (
                                        <button key={f.id} className="filter-btn" onClick={() => handleFilter(f.id)} style={{ padding: '8px 4px', fontSize: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: 8, color: 'white', fontWeight: 700 }}>{f.label}</button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* STATUS BAR */}
            {!isOBS && showUI && (
                <div className="status-bar">
                    <div className="status-section">
                        <span>X: {cursorPos.x} Y: {cursorPos.y}</span>
                        <span className="opacity-20">|</span>
                        <span>1920 × 1080 PX</span>
                    </div>
                    <div className="status-section">
                        <div className="pro-badge"><Crown size={10} /> STUDIO PRO MODE</div>
                        <span className="opacity-20">|</span>
                        <span>{activeTool.toUpperCase()}</span>
                        <span className="opacity-20">|</span>
                        <span>{layers.length} LEVELS</span>
                    </div>
                </div>
            )}

            {/* EXPORT MODAL */}
            {showExport && (
                <div className="modal-overlay" onClick={() => setShowExport(false)}>
                    <div className="modal-content animate-in zoom-in duration-300" onClick={e => e.stopPropagation()}>
                        <div className="modal-title">📦 تصدير العمل الفني</div>
                        <p className="text-center text-white/40 text-sm font-bold mb-4">اختر الصيغة المناسبة لحفظ الرسمة بأعلى جودة</p>
                        <div className="space-y-3">
                            <button className="export-btn" onClick={() => handleExport('png')}>
                                <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center text-blue-400"><FileImage size={24} /></div>
                                <div className="text-right">
                                    <div className="font-black">صيغة PNG</div>
                                    <div className="text-[10px] opacity-40">خلفية شفافة - دقة عالية</div>
                                </div>
                            </button>
                            <button className="export-btn" onClick={() => handleExport('jpeg')}>
                                <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-400"><ImageIcon size={24} /></div>
                                <div className="text-right">
                                    <div className="font-black">صيغة JPEG</div>
                                    <div className="text-[10px] opacity-40">أقل حجم - جودة ممتازة</div>
                                </div>
                            </button>
                            <button className="export-btn" onClick={() => handleExport('svg')}>
                                <div className="w-10 h-10 bg-orange-500/20 rounded-xl flex items-center justify-center text-orange-400"><FileText size={24} /></div>
                                <div className="text-right">
                                    <div className="font-black">صيغة SVG</div>
                                    <div className="text-[10px] opacity-40">ناقلات برمجية - قابلة للتكبير</div>
                                </div>
                            </button>
                        </div>
                        <button className="mt-4 py-4 text-white/30 font-black hover:text-white transition-all" onClick={() => setShowExport(false)}>إلغاء التصدير</button>
                    </div>
                </div>
            )}
        </div>
    );
};
