
import React, { useState, useEffect, useRef } from 'react';
import { chatService } from '../services/chatService';
import { leaderboardService, supabase } from '../services/supabase';
import { ProAvatar } from './ProAvatar';
import { ChatUser } from '../types';
import { Type, Play, Settings, Users, Trophy, Clock, LogOut, RotateCcw, User, Zap, Crown, Star, Award, Sparkles, ChevronRight, RefreshCw } from 'lucide-react';

interface WordBuilderProps {
    onHome: () => void;
    isOBS?: boolean;
}

interface GameConfig {
    joinKeyword: string;
    maxPlayers: number;
    roundDuration: number;
    letterCount: number;
    totalRounds: number;
    minWordLength: number;
}

interface PlayerScore {
    user: ChatUser;
    score: number;
    wordsFound: string[];
    roundScore: number;
}

type GamePhase = 'SETUP' | 'LOBBY' | 'PLAYING' | 'ROUND_RESULTS' | 'FINALE';

const ARABIC_LETTERS = ['ا', 'ب', 'ت', 'ث', 'ج', 'ح', 'خ', 'د', 'ذ', 'ر', 'ز', 'س', 'ش', 'ص', 'ض', 'ط', 'ظ', 'ع', 'غ', 'ف', 'ق', 'ك', 'ل', 'م', 'ن', 'ه', 'و', 'ي'];
const FREQUENT_LETTERS = ['ا', 'ب', 'ت', 'ر', 'س', 'ل', 'م', 'ن', 'ه', 'و', 'ي', 'ع', 'ف', 'ق', 'ك', 'د', 'ج', 'ح', 'خ'];

const normalizeArabic = (text: string) => {
    if (!text) return '';
    return text
        .replace(/[\u064B-\u065F]/g, '') // Remove diacritics (Tashkeel)
        .replace(/[إأآء]/g, 'ا')        // Normalize variants of Alif/Hamza to bare Alif
        .replace(/ؤ/g, 'و')             // Waw Hamza -> Waw
        .replace(/ئ/g, 'ي')             // Ya Hamza -> Ya
        .replace(/ة/g, 'ت')             // Taa Marbuta -> Taa (Common in games)
        .replace(/ى/g, 'ي')             // Alif Maqsura -> Ya
        .replace(/[^\u0621-\u064A]/g, '') // Strip everything except Arabic letters (No spaces, no dots)
        .trim();
};

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";

const validateWithAI = async (word: string): Promise<boolean> => {
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: `Check if "${word}" is a valid Arabic word/phrase. Return ONLY "Y" or "N". Be very fast.`
                    }]
                }],
                generationConfig: {
                    temperature: 0.1,
                    maxOutputTokens: 2
                }
            })
        });

        if (!response.ok) return false;

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.toUpperCase() || "";
        return text.includes("Y");
    } catch (e) {
        console.error("AI Validation Error:", e);
        return false;
    }
};

// Comprehensive Arabic Dictionary Construction
const COMMON_WORDS_STR = `
اب ام اخ اخت عم عمة خال خالة جد جدة حب ود رب بر سر حر زر بر يد فم دم سن في من عن على الى لا ما لو كم هو هي هم هن انا انت نحن
اكل شرب لعب نام قام صام صلى حج طار عام سبح
بيت باب دار جار سقف جدار غرف شقة قصر كوخ
عين اذن انف راس شعر بطن ظهر رجل يد وجه
كتب ركب ذهب خرج دخل جلس وقف نزل صعد
جبل بحر نهر ارض سماء ريح مطر ثلج غيم برق رعد
شمس قمر نجم ليل نهار فجر ظهر عصر مغرب عشاء
وقت زمن يوم شهر سنة اسبوع ساعة دقيقة ثانية
علم قلم درس فصل مدرسة جامعة طالب معلم كتاب
قلب عقل روح نفس جسد دم عظم جلد
رجل ولد بنت امراة طفل شيخ عجوز
فرح حزن غضب ضحك بكاء حب كره
خير شر حق باطل صدق كذب عدل ظلم
ملك عبد امير وزير سلطان رئيس قائد
قطة كلب اسد نمر ذئب دب فيل جمل حصان حمار بقرة شاة غزال ارنب
بطة دجاج طير نسر صقر حمام غراب عصفور
لحم خبز تمر ماء لبن عسل زيت سمن ارز سكر ملح
ثوب قميص بنطلون حذاء طاقية عمامة
ذهب فضة حديد نحاس خشب زجاج بلاستيك
نار نور ظلام شمعة مصباح
كتاب دفتر ورقة حقيبة قلم مسطرة
سيارة طيارة سفينة قطار دراجة حافلة
مسجد جامع كنيسة معبد صومعة
طاولة كرسي سرير دولاب كنبة سجادة ستارة
ملعب حديقة شارع طريق جسر نفق
تفاح عنب تين رمان زيتون نخل موز خوخ مشمش
سعيد حزين كبير صغير طويل قصير جديد قديم غني فقير
جميل قبيح قوي ضعيف ذكي غبي سريع بطيء
احمر اخضر اصفر ازرق ابيض اسود بني رمادي
واحد اثنين ثلاثة اربعة خمسة ستة سبعة ثمانية تسعة عشرة
سبت احد اثنين ثلاثاء اربعاء خميس جمعة
مكتب مطبخ حمام صالة غرفة مخزن
صديق عدو قريب بعيد جار غريب
شموع زهور عطور بخور مسك
تلفاز حاسوب جوال هاتف راديو شاشة
برتقال موز بطيخ يوسفي ليمون
مسلم مؤمن كافر منافق مشرك ملحد
عالم جاهل فقيه اديب شاعر كاتب
طبيب مهندس معلم عامل نجار حداد خياط
سوق دكان متجر مول بيع شراء
جيش شرطة امن حرس سجن
حرب سلم قتال جهاد دفاع هجوم
حياة موت ميلاد وفاة زواج طلاق
صندوق مفتاح قفل باب شباك
صورة لوحة رسمة تمثال
كعك حلوى شيكولاتة بسكويت
قهوة شاي عصير ماء ثلج
ملعقة شوكة سكين طبق كوب
فرشاة معجون صابون فوطة
مشط مراة عطر مكياج
نظارة ساعة خاتم عقد
كرة شبكة مرمى هدف حكم
فريق مدرب لاعب جمهور
كاس ميدالية جائزة
بحر شاطئ رمل صدف موج
غابة صحراء جبل وادي
شجر ورد عشب زهر
سمك حوت قرش دلفين
نمل نحل ذباب بعوض
عنكبوت عقرب ثعبان تمساح
فراشة دودة حلزون
غزال زرافة وحيد قرن
فهد ضبع قرد غوريلا
وطواط بومة طاووس
بغبغاء نعامة بطريق
قمح شعير ذرة عدس فول
بصل ثوم خيار جزر
طماطم بطاطس كوسة
باذنجان فلفل خس
نعناع بقدونس كزبرة
كمون فلفل ملح بهار
سكر شاي بن قهوة
حليب زبدة جبن قشطة
بيض دجاج سمك لحم
شواء قلي سلق طبخ
فطور غداء عشاء سحور
صيام صلاة زكاة حج
قران حديث دعاء ذكر
مسجد قبلة سجادة وضوء
اذان اقامة افطار امساك
عيد رمضان شعبان رجب
محرم صفر ربيع جمادى
شوال ذو القعدة ذو الحجة
مكة مدينة قدس مصر شام
عراق يمن خليج مغرب
سودان صومال ليبيا تونس
جزائر اردن لبنان سوريا
فلسطين كويت قطر بحرين
امارات عمان سعودية
هند صين يابان روسيا
امريكا اوروبا افريقيا اسيا
شمال جنوب شرق غرب
يمين يسار فوق تحت
امام خلف وسط بين
داخل خارج هنا هناك
متى اين كيف لماذا
من ما ماذا هل
نعم لا بلى كلا
شكرا عفوا اهلا سهلا
صباح مساء ليلة سعيدة
سلام تحية وداع لقاء
اسرة عائلة ابناء احفاد
جدة خالة عمة جارة
زميل رفيق صاحب حبيب
زوج زوجة خطيب عريس
فرح عرس حفلة وليمة
هدية عيد ميلاد نجاح
تخرج عمل وظيفة راتب
مال نقود دينار درهم
ريال دولار جنيه يورو
بنك مصرف صراف الي
سعر غالي رخيص مجاني
خصم عرض تنزيلات
فاتورة حساب ايصال
عقد توقيع ختم بصمة
ورقة قلم حبر ممحاة
سبورة طباشير فصل حصة
واجب امتحان اختبار
نتيجة شهادة درجة
ناجح راسب متفوق
ذكي عبقري موهوب
غبي كسول نشيط مهمل
سريع متهور حذر
شجاع جبان بطل خائن
كريم بخيل صادق كاذب
امين خائن وفي غدار
متواضع مغرور متكبر
يحب يكره يريد يرفض
ياكل يشرب ينام يصحو
يجري يمشي يقف يجلس
يضحك يبكي يصرخ يهمس
يتكلم يصمت يستمع ينظر
يشم يذوق يلمس يحس
يفهم يعلم يجهل ينسى
يتذكر يفكر يقرر يختار
يشتري يبيع يدفع ياخذ
يعطي يمسك يترك يرمي
يفتح يغلق يكسر يصلح
يبني يهدم يزرع يحصد
يرسم يكتب يقرا يمسح
يسبح يغوص يطير يقفز
يسافر يعود يهاجر
يحج يعتمرة يصوم يصلي
يؤمن يكفر يسلم يشرك
يحمد يشكر يسبح يستغفر
يدعو يرجو يخاف يامن
يحزن يفرح يغضب يرضى
يتعب يستريح يمرض يشفى
يموت يحيى يولد يدفن
قبر كفن جنازة عزاء
جنة نار حساب عقاب
ثواب اجر حسنات سيئات
يوم قيامة حشر نشر
ميزان صراط حوض شفاعة
نبي رسول ولي صالح
ملك جن شيطان ابليس
ادم حواء نوح ابراهيم
موسى عيسى محمد يوسف
يونس ايوب داود سليمان
زكريا يحيى ادريس هود
صالح شعيب لوط اسماعيل
اسحاق يعقوب هارون
مريم اسية خديجة عائشة
فاطمة زينب حفصة
ابو بكر عمر عثمان علي
طلحة زبير سعد سعيد
عبد الرحمن ابو عبيدة
خالد عمرو معاذ بلال
`;

// Clean up and create dictionary set
const VALID_ARABIC_WORDS = new Set(
    COMMON_WORDS_STR.split(/\s+/).filter(w => w.length > 0).map(w => normalizeArabic(w))
);


export const WordBuilder: React.FC<WordBuilderProps> = ({ onHome, isOBS }) => {
    const [config, setConfig] = useState<GameConfig>({
        joinKeyword: 'كلمة',
        maxPlayers: 100,
        roundDuration: 60,
        letterCount: 6,
        totalRounds: 3,
        minWordLength: 2,
    });

    const [phase, setPhase] = useState<GamePhase>('SETUP');
    const [participants, setParticipants] = useState<ChatUser[]>([]);
    const [playerScores, setPlayerScores] = useState<Record<string, PlayerScore>>({});
    const [currentLetters, setCurrentLetters] = useState<string[]>([]);
    const [timeLeft, setTimeLeft] = useState(0);
    const [currentRound, setCurrentRound] = useState(0);
    const [recentWords, setRecentWords] = useState<{ username: string; word: string; points: number }[]>([]);
    const [usedWordsThisRound, setUsedWordsThisRound] = useState<Set<string>>(new Set());
    const [pendingWords, setPendingWords] = useState<Set<string>>(new Set());
    const [letterAnimations, setLetterAnimations] = useState<boolean[]>([]);
    const [lastMsg, setLastMsg] = useState<string>('');
    const [isConnected, setIsConnected] = useState(false);

    const phaseRef = useRef(phase);
    const configRef = useRef(config);
    const participantsRef = useRef(participants);
    const currentLettersRef = useRef(currentLetters);
    const usedWordsRef = useRef(usedWordsThisRound);
    const playerScoresRef = useRef(playerScores);

    useEffect(() => { phaseRef.current = phase; }, [phase]);
    useEffect(() => { configRef.current = config; }, [config]);
    useEffect(() => { participantsRef.current = participants; }, [participants]);
    useEffect(() => { currentLettersRef.current = currentLetters; }, [currentLetters]);
    useEffect(() => { usedWordsRef.current = usedWordsThisRound; }, [usedWordsThisRound]);
    useEffect(() => { playerScoresRef.current = playerScores; }, [playerScores]);

    // Chat Status
    useEffect(() => {
        const unbind = chatService.onStatusChange((connected) => setIsConnected(connected));
        return () => unbind();
    }, []);

    // Chat listener
    useEffect(() => {
        const unsubscribe = chatService.onMessage(async (msg) => {
            const content = msg.content.trim();
            setLastMsg(`${msg.user.username}: ${content}`);

            // Join
            if (phaseRef.current === 'LOBBY') {
                const keyword = configRef.current.joinKeyword;
                const normalizedKeyword = normalizeArabic(keyword).toLowerCase();
                const normalizedContent = normalizeArabic(content).toLowerCase();

                if (normalizedContent.includes(normalizedKeyword)) {
                    setParticipants(prev => {
                        if (prev.length >= configRef.current.maxPlayers) return prev;
                        if (prev.some(p => p.username.toLowerCase() === msg.user.username.toLowerCase())) return prev;

                        console.log(`[WordBuilder] User joined: ${msg.user.username}`);
                        const newUser = { ...msg.user };
                        chatService.fetchKickAvatar(newUser.username).then(avatar => {
                            if (avatar) setParticipants(curr => curr.map(p => p.username.toLowerCase() === newUser.username.toLowerCase() ? { ...p, avatar } : p));
                        }).catch(() => { });
                        return [...prev, newUser];
                    });
                }
            }

            // Word submission
            if (phaseRef.current === 'PLAYING') {
                const word = content.trim();
                const normalizedWord = normalizeArabic(word);

                // 1. Basic Eligibility Check (Length & Letters) - Sync & Fast
                if (normalizedWord.length >= configRef.current.minWordLength && isValidLetters(normalizedWord, currentLettersRef.current)) {
                    console.log(`[WordBuilder] Processing word: ${word}`);
                    const wordKey = normalizedWord.toLowerCase();

                    // Prevent duplicate words or words currently being checked
                    if (!usedWordsRef.current.has(wordKey)) {

                        // Use a local ref-like check for pending to be thread-safe in async
                        if ((window as any)._pendingWords?.has(wordKey)) {
                            console.log(`[WordBuilder] Word already pending AI check: ${word}`);
                            return;
                        }
                        if (!(window as any)._pendingWords) (window as any)._pendingWords = new Set();
                        (window as any)._pendingWords.add(wordKey);

                        // 2. Dictionary Validation
                        console.log(`[WordBuilder] Validating: ${word}`);
                        let isValid = false;

                        // Step 2a: Check Local Dictionary (Instant)
                        if (VALID_ARABIC_WORDS.has(normalizedWord)) {
                            console.log(`[WordBuilder] Found in Local Dictionary: ${word}`);
                            isValid = true;
                        } else {
                            // Step 2b: Request AI validation (High-speed fallback)
                            console.log(`[WordBuilder] Not in dictionary, requesting AI: ${word}`);
                            isValid = await validateWithAI(word);
                            console.log(`[WordBuilder] AI Result for "${word}": ${isValid ? 'VALID' : 'INVALID'}`);
                        }

                        (window as any)._pendingWords.delete(wordKey);

                        if (isValid && !usedWordsRef.current.has(wordKey)) {
                            const points = calculatePoints(word);
                            setUsedWordsThisRound(prev => new Set([...prev, wordKey]));
                            console.log(`[WordBuilder] Word accepted! Points: ${points}`);

                            // Record win in leaderboard immediately
                            leaderboardService.recordWin(msg.user.username, msg.user.avatar || '', points);

                            // Update player score
                            setPlayerScores(prev => {
                                const key = msg.user.username.toLowerCase();
                                const existing = prev[key] || { user: msg.user, score: 0, wordsFound: [], roundScore: 0 };
                                return {
                                    ...prev,
                                    [key]: {
                                        ...existing,
                                        user: msg.user,
                                        score: existing.score + points,
                                        wordsFound: [...existing.wordsFound, word],
                                        roundScore: existing.roundScore + points,
                                    }
                                };
                            });

                            setRecentWords(prev => [{ username: msg.user.username, word, points }, ...prev].slice(0, 8));
                        }
                    } else {
                        console.log(`[WordBuilder] Word already used: ${word}`);
                    }
                } else {
                    if (normalizedWord.length < configRef.current.minWordLength) {
                        console.log(`[WordBuilder] Word too short: ${word}`);
                    } else {
                        console.log(`[WordBuilder] Word uses invalid letters: ${word}`);
                    }
                }
            }
        });
        return () => unsubscribe();
    }, []);

    // Timer
    useEffect(() => {
        if (phase === 'PLAYING' && timeLeft > 0) {
            const timer = window.setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 1) {
                        endRound();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
            return () => clearInterval(timer);
        }
    }, [phase, timeLeft]);

    const isValidLetters = (normalizedWord: string, letters: string[]): boolean => {
        // Normalize the pool too to ensure consistent check
        const letterPool = letters.map(l => normalizeArabic(l));
        for (const char of normalizedWord) {
            const idx = letterPool.indexOf(char);
            if (idx === -1) {
                return false;
            } else {
                letterPool.splice(idx, 1);
            }
        }
        return true;
    };

    const calculatePoints = (word: string): number => {
        if (word.length <= 2) return 1;
        if (word.length === 3) return 3;
        if (word.length === 4) return 5;
        if (word.length === 5) return 8;
        return 12;
    };

    const generateLetters = () => {
        const count = config.letterCount;
        const letters: string[] = [];
        // Mix frequent and random letters
        for (let i = 0; i < count; i++) {
            if (i < Math.ceil(count * 0.6)) {
                letters.push(FREQUENT_LETTERS[Math.floor(Math.random() * FREQUENT_LETTERS.length)]);
            } else {
                letters.push(ARABIC_LETTERS[Math.floor(Math.random() * ARABIC_LETTERS.length)]);
            }
        }
        return letters;
    };

    const startGame = () => {
        if (participants.length < 1) return;
        const initialScores: Record<string, PlayerScore> = {};
        participants.forEach(p => {
            initialScores[p.username.toLowerCase()] = { user: p, score: 0, wordsFound: [], roundScore: 0 };
        });
        setPlayerScores(initialScores);
        setCurrentRound(1);
        startRound();
    };

    const startRound = () => {
        const letters = generateLetters();
        setCurrentLetters(letters);
        setTimeLeft(config.roundDuration);
        setRecentWords([]);
        setUsedWordsThisRound(new Set());
        setLetterAnimations(letters.map(() => false));
        console.log(`[WordBuilder] Round started with letters: ${letters.join(', ')}`);

        // Reset round scores
        setPlayerScores(prev => {
            const updated = { ...prev };
            Object.keys(updated).forEach(k => updated[k] = { ...updated[k], roundScore: 0 });
            return updated;
        });

        // Staggered letter animations
        letters.forEach((_, i) => {
            setTimeout(() => setLetterAnimations(prev => { const n = [...prev]; n[i] = true; return n; }), i * 200);
        });

        setPhase('PLAYING');
    };

    const endRound = () => {
        if (currentRound >= config.totalRounds) {
            setPhase('FINALE');
        } else {
            setPhase('ROUND_RESULTS');
        }
    };

    const nextRound = () => {
        setCurrentRound(prev => prev + 1);
        startRound();
    };

    const resetGame = () => {
        setPhase('SETUP');
        setParticipants([]);
        setPlayerScores({});
        setCurrentLetters([]);
        setTimeLeft(0);
        setCurrentRound(0);
        setRecentWords([]);
        setUsedWordsThisRound(new Set());
    };

    const getSortedPlayers = (): PlayerScore[] =>
        (Object.values(playerScores) as PlayerScore[]).sort((a, b) => b.score - a.score);

    const getRoundPlayers = (): PlayerScore[] =>
        (Object.values(playerScores) as PlayerScore[]).filter(p => p.roundScore > 0).sort((a, b) => b.roundScore - a.roundScore);

    return (
        <div className={`w-full h-full flex flex-col items-center bg-transparent text-right font-display select-none ${isOBS ? 'overflow-hidden' : ''}`} dir="rtl">
            <style>{`
            @keyframes letter-drop {
               0% { transform: translateY(-100px) rotate(-20deg); opacity: 0; }
               60% { transform: translateY(10px) rotate(5deg); opacity: 1; }
               100% { transform: translateY(0) rotate(0deg); opacity: 1; }
            }
            @keyframes word-pop {
               0% { transform: scale(0) rotate(-10deg); opacity: 0; }
               70% { transform: scale(1.2) rotate(3deg); }
               100% { transform: scale(1) rotate(0); opacity: 1; }
            }
            @keyframes score-fly {
               0% { transform: translateY(0); opacity: 1; }
               100% { transform: translateY(-60px); opacity: 0; }
            }
            .letter-enter { animation: letter-drop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
            .word-pop { animation: word-pop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
         `}</style>

            {/* --- SETUP --- */}
            {phase === 'SETUP' && (
                <div className="w-full max-w-5xl animate-in fade-in zoom-in duration-700 py-6 px-4 pb-20 overflow-y-auto custom-scrollbar h-full">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-6">
                            <div className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all ${isConnected ? 'bg-kick-green/10 border-kick-green/30 text-kick-green' : 'bg-red-500/10 border-red-500/30 text-red-500'}`}>
                                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-kick-green shadow-[0_0_8px_#53fc18]' : 'bg-red-500 animate-pulse'}`}></div>
                                <span className="text-[10px] font-black uppercase tracking-widest">{isConnected ? 'LIVE_CHAT' : 'DISCONNECTED'}</span>
                            </div>

                            {lastMsg && (
                                <div className="bg-white/5 border border-white/10 px-4 py-2 rounded-xl flex items-center gap-2 animate-in fade-in zoom-in h-10">
                                    <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">LAST:</span>
                                    <span className="text-[10px] font-bold text-zinc-300 truncate max-w-[150px]">{lastMsg}</span>
                                </div>
                            )}

                            <button onClick={onHome} className="p-3 bg-white/5 rounded-2xl hover:bg-white/10 transition-all text-zinc-400">
                                <LogOut size={24} />
                            </button>
                        </div>
                        <div className="text-center">
                            <h1 className="text-6xl font-black text-white italic tracking-tighter uppercase">السكرابل السريع</h1>
                            <p className="text-emerald-600 font-black tracking-[0.4em] text-[10px] uppercase">WORD BUILDER • iABS</p>
                        </div>
                        <div className="w-14"></div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="glass-card p-6 rounded-[2.5rem] border border-white/5 shadow-2xl relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-500"></div>
                            <h3 className="text-lg font-black text-white flex items-center gap-3 mb-6"><Settings size={18} className="text-emerald-500" /> إعدادات اللعبة</h3>
                            <div className="space-y-5">
                                <div className="bg-black/30 p-4 rounded-3xl border border-white/5">
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">عدد الحروف</label>
                                        <span className="text-2xl font-black text-emerald-500 font-mono">{config.letterCount}</span>
                                    </div>
                                    <input type="range" min="4" max="10" value={config.letterCount} onChange={e => setConfig({ ...config, letterCount: +e.target.value })} className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-emerald-600" />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-black/30 p-4 rounded-3xl border border-white/5 text-center space-y-2">
                                        <label className="text-[9px] font-bold text-gray-500 uppercase">مدة الجولة</label>
                                        <div className="flex items-center justify-center gap-2">
                                            <button onClick={() => setConfig({ ...config, roundDuration: Math.max(15, config.roundDuration - 15) })} className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 text-white text-sm">-</button>
                                            <span className="text-xl font-black text-white font-mono">{config.roundDuration}s</span>
                                            <button onClick={() => setConfig({ ...config, roundDuration: config.roundDuration + 15 })} className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 text-white text-sm">+</button>
                                        </div>
                                    </div>
                                    <div className="bg-black/30 p-4 rounded-3xl border border-white/5 text-center space-y-2">
                                        <label className="text-[9px] font-bold text-gray-500 uppercase">عدد الجولات</label>
                                        <div className="flex items-center justify-center gap-2">
                                            <button onClick={() => setConfig({ ...config, totalRounds: Math.max(1, config.totalRounds - 1) })} className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 text-white text-sm">-</button>
                                            <span className="text-xl font-black text-white font-mono">{config.totalRounds}</span>
                                            <button onClick={() => setConfig({ ...config, totalRounds: config.totalRounds + 1 })} className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 text-white text-sm">+</button>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-black/30 p-4 rounded-3xl border border-white/5">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">كلمة الانضمام</label>
                                    <input value={config.joinKeyword} onChange={e => setConfig({ ...config, joinKeyword: e.target.value })} className="w-full bg-black border-2 border-white/10 focus:border-emerald-600 rounded-xl p-3 text-white font-bold text-sm text-center outline-none transition-all" />
                                </div>
                            </div>
                        </div>

                        <div className="glass-card p-6 rounded-[2.5rem] border border-white/5 shadow-2xl flex flex-col items-center justify-center relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/20 via-transparent to-teal-900/20"></div>
                            <div className="relative z-10 text-center">
                                <div className="flex gap-3 mb-8 justify-center">
                                    {['ك', 'ل', 'م', 'ا', 'ت'].map((l, i) => (
                                        <div key={i} className="w-16 h-16 bg-emerald-500/20 border-2 border-emerald-500/50 rounded-2xl flex items-center justify-center text-3xl font-black text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)]" style={{ animationDelay: `${i * 0.1}s` }}>
                                            {l}
                                        </div>
                                    ))}
                                </div>
                                <h2 className="text-3xl font-black text-white mb-3">كيف تلعب؟</h2>
                                <div className="space-y-3 text-gray-400 text-sm font-bold max-w-sm">
                                    <p className="flex items-center gap-3"><span className="w-8 h-8 bg-emerald-600 text-white rounded-xl flex items-center justify-center font-black text-xs">1</span> حروف عشوائية تظهر على الشاشة</p>
                                    <p className="flex items-center gap-3"><span className="w-8 h-8 bg-emerald-600 text-white rounded-xl flex items-center justify-center font-black text-xs">2</span> كون كلمات من الحروف المتاحة</p>
                                    <p className="flex items-center gap-3"><span className="w-8 h-8 bg-teal-600 text-white rounded-xl flex items-center justify-center font-black text-xs">3</span> كلمات أطول = نقاط أكثر!</p>
                                </div>
                            </div>
                            <button onClick={() => setPhase('LOBBY')} className="mt-8 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-black py-5 px-16 rounded-3xl text-3xl hover:scale-[1.05] active:scale-95 transition-all flex items-center justify-center gap-4 shadow-[0_15px_40px_rgba(16,185,129,0.4)] italic relative z-10 border-t border-white/20">
                                بـدء التحدي <Play fill="currentColor" size={28} />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- LOBBY --- */}
            {phase === 'LOBBY' && (
                <div className="w-full h-full flex flex-col items-center justify-center p-10 animate-in fade-in duration-1000 relative overflow-hidden">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-emerald-900/20 via-transparent to-transparent"></div>
                    <div className="text-center mb-10 z-10">
                        <Type size={80} className="text-emerald-500 mx-auto mb-6 drop-shadow-[0_0_40px_rgba(16,185,129,1)] animate-bounce" strokeWidth={1.5} />
                        <h1 className="text-7xl font-black text-white italic tracking-tighter mb-6 uppercase">في انتظار اللاعبين</h1>
                        <div className="flex items-center justify-center gap-4 text-2xl text-gray-400 font-bold bg-black/40 backdrop-blur-xl px-10 py-6 rounded-[3rem] border-2 border-white/5 shadow-2xl">
                            أرسل <span className="bg-emerald-600 text-white px-6 py-2 rounded-2xl font-black italic shadow-lg">{config.joinKeyword}</span> للمشاركة
                        </div>
                    </div>
                    <div className="flex-1 w-full max-w-4xl overflow-y-auto custom-scrollbar px-6 mb-6">
                        <div className="flex flex-wrap justify-center gap-3 max-w-3xl mx-auto">
                            {participants.map(p => (
                                <div key={p.id} className="animate-in zoom-in duration-300 bg-black/40 border border-white/10 rounded-2xl px-4 py-2 flex items-center gap-3">
                                    <ProAvatar
                                        url={p.avatar}
                                        username={p.username}
                                        size="w-20 h-20"
                                        className="overflow-visible"
                                    />
                                    <span className="font-black text-white text-base">{p.username}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="w-full max-w-4xl bg-black/60 backdrop-blur-[40px] p-8 rounded-[3rem] border border-white/10 shadow-2xl flex items-center justify-between z-20">
                        <div className="text-5xl font-black text-white font-mono italic">{participants.length}<span className="text-lg text-emerald-500 opacity-40"> / {config.maxPlayers}</span></div>
                        <div className="flex gap-4">
                            <button onClick={resetGame} className="px-8 py-5 rounded-2xl bg-white/5 text-gray-500 font-black hover:text-white transition-all text-lg border border-white/10">تراجع</button>
                            <button onClick={startGame} disabled={participants.length < 1} className="px-12 py-5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-black text-2xl rounded-2xl shadow-2xl hover:scale-105 transition-all disabled:opacity-20 italic flex items-center gap-3">
                                ابدأ! <Type size={28} />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- PLAYING --- */}
            {phase === 'PLAYING' && (
                <div className="w-full h-full flex flex-col items-center justify-center p-8 animate-in fade-in duration-500 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-950/40 via-black to-teal-950/40"></div>

                    <div className="relative z-10 flex flex-col items-center w-full max-w-5xl">
                        {/* Timer bar */}
                        <div className="w-full max-w-3xl mb-6">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-emerald-500 font-black text-sm uppercase tracking-[0.5em]">الجولة {currentRound} / {config.totalRounds}</span>
                                <span className={`text-4xl font-black font-mono ${timeLeft <= 10 ? 'text-red-500 animate-pulse' : 'text-white'}`}>{timeLeft}s</span>
                            </div>
                            <div className="w-full h-3 bg-black/60 rounded-full overflow-hidden border border-white/10">
                                <div className={`h-full rounded-full transition-all duration-1000 ${timeLeft <= 10 ? 'bg-red-500' : 'bg-gradient-to-r from-emerald-500 to-teal-500'}`} style={{ width: `${(timeLeft / config.roundDuration) * 100}%` }} />
                            </div>
                        </div>

                        {/* Letters */}
                        <div className="flex gap-4 justify-center mb-10 flex-wrap">
                            {currentLetters.map((letter, i) => (
                                <div key={i} className={`${letterAnimations[i] ? 'letter-enter' : 'opacity-0'} w-24 h-24 bg-gradient-to-br from-emerald-500/30 to-teal-500/30 border-4 border-emerald-500/60 rounded-[2rem] flex items-center justify-center text-5xl font-black text-white shadow-[0_0_30px_rgba(16,185,129,0.4)] hover:scale-110 transition-transform`}>
                                    {letter}
                                </div>
                            ))}
                        </div>

                        {/* Scoring guide */}
                        <div className="flex gap-4 mb-8 text-xs font-bold text-gray-500 bg-black/30 px-6 py-3 rounded-2xl border border-white/5">
                            <span>2 حروف = <span className="text-emerald-400">1pt</span></span>
                            <span>3 حروف = <span className="text-emerald-400">3pt</span></span>
                            <span>4 حروف = <span className="text-emerald-400">5pt</span></span>
                            <span>5+ حروف = <span className="text-emerald-400">8-12pt</span></span>
                        </div>

                        {/* Recent words */}
                        <div className="flex flex-wrap justify-center gap-3 mb-8 max-w-3xl min-h-[80px]">
                            {recentWords.map((w, i) => (
                                <div key={`${w.word}-${i}`} className="word-pop bg-emerald-500/20 border border-emerald-500/40 px-5 py-3 rounded-[2rem] flex items-center gap-4 shadow-lg min-w-[200px]">
                                    <ProAvatar username={w.username} size="w-16 h-16" className="overflow-visible" />
                                    <div className="flex flex-col flex-1">
                                        <div className="flex items-center gap-2">
                                            <span className="text-white font-black text-xl">{w.word}</span>
                                            <span className="bg-emerald-500 text-white font-black text-[10px] px-2 py-0.5 rounded-lg">+{w.points}</span>
                                        </div>
                                        <span className="text-emerald-400 font-bold text-sm tracking-tight">{w.username}</span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Leaderboard mini */}
                        <div className="w-full max-w-lg bg-black/60 backdrop-blur-xl rounded-[2rem] border border-white/10 p-4">
                            <h4 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2"><Trophy size={14} className="text-yellow-500" /> الترتيب</h4>
                            <div className="space-y-2 max-h-[200px] overflow-y-auto custom-scrollbar">
                                {getSortedPlayers().slice(0, 10).map((p, i) => (
                                    <div key={p.user.username} className="flex items-center justify-between bg-white/5 rounded-xl px-4 py-2">
                                        <div className="flex items-center gap-3">
                                            <span className={`font-mono font-black text-sm ${i < 3 ? 'text-yellow-400' : 'text-gray-600'}`}>#{i + 1}</span>
                                            <ProAvatar
                                                url={p.user.avatar}
                                                username={p.user.username}
                                                size="w-12 h-12"
                                                className="overflow-visible"
                                            />
                                            <span className="text-sm font-bold text-gray-300">{p.user.username}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-gray-500">{p.wordsFound.length} كلمات</span>
                                            <span className="font-black text-emerald-400 font-mono">{p.score}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- ROUND RESULTS --- */}
            {phase === 'ROUND_RESULTS' && (
                <div className="w-full h-full flex flex-col items-center justify-center p-8 animate-in fade-in duration-500 relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-950/30 via-black to-teal-950/20"></div>
                    <div className="relative z-10 text-center max-w-2xl w-full">
                        <h2 className="text-6xl font-black text-white italic mb-2">نتائج الجولة {currentRound}</h2>
                        <p className="text-emerald-500 font-bold mb-8 text-sm uppercase tracking-widest">ROUND RESULTS</p>

                        <div className="bg-black/40 rounded-[2.5rem] border border-white/10 p-6 mb-8">
                            {getRoundPlayers().slice(0, 5).map((p, i) => (
                                <div key={p.user.username} className="flex justify-between items-center py-3 border-b border-white/5 last:border-0 animate-in slide-in-from-right" style={{ animationDelay: `${i * 100}ms` }}>
                                    <div className="flex items-center gap-4">
                                        <span className={`text-xl font-black ${i === 0 ? 'text-yellow-400' : i === 1 ? 'text-gray-400' : 'text-orange-700'}`}>#{i + 1}</span>
                                        <ProAvatar
                                            url={p.user.avatar}
                                            username={p.user.username}
                                            size="w-20 h-20"
                                            className="overflow-visible"
                                        />
                                        <span className="text-lg font-black text-white">{p.user.username}</span>
                                    </div>
                                    <span className="text-2xl font-black text-emerald-400 font-mono">+{p.roundScore}</span>
                                </div>
                            ))}
                        </div>

                        <button onClick={nextRound} className="px-16 py-6 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-black text-3xl rounded-[2.5rem] hover:scale-105 active:scale-95 transition-all italic shadow-[0_0_40px_rgba(16,185,129,0.4)]">
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

                    <div className="relative z-10 text-center w-full max-w-2xl">
                        <Crown size={80} className="text-yellow-400 mx-auto mb-6 drop-shadow-[0_0_40px_rgba(251,191,36,1)] animate-bounce" />
                        <h2 className="text-7xl font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-yellow-600 italic uppercase mb-8">النتائج النهائية!</h2>

                        <div className="bg-black/40 rounded-[2.5rem] border border-yellow-500/20 p-6 mb-8 shadow-2xl">
                            {getSortedPlayers().slice(0, 10).map((p, i) => (
                                <div key={p.user.username} className={`flex justify-between items-center py-4 border-b border-white/5 last:border-0 animate-in slide-in-from-right ${i === 0 ? 'bg-yellow-500/10 rounded-2xl px-4 -mx-2' : ''}`} style={{ animationDelay: `${i * 150}ms` }}>
                                    <div className="flex items-center gap-4">
                                        <span className={`text-2xl font-black ${i === 0 ? 'text-yellow-400' : i === 1 ? 'text-gray-400' : i === 2 ? 'text-orange-700' : 'text-gray-600'}`}>#{i + 1}</span>
                                        <ProAvatar
                                            url={p.user.avatar}
                                            username={p.user.username}
                                            size={i === 0 ? "w-32 h-32" : "w-20 h-20"}
                                            className="overflow-visible"
                                        />
                                        <div>
                                            <span className={`${i === 0 ? 'text-xl' : 'text-lg'} font-black text-white`}>{p.user.username}</span>
                                            <span className="text-xs text-gray-500 block">{p.wordsFound.length} كلمة</span>
                                        </div>
                                    </div>
                                    <span className={`${i === 0 ? 'text-3xl text-yellow-400' : 'text-xl text-emerald-400'} font-black font-mono`}>{p.score}</span>
                                </div>
                            ))}
                        </div>

                        <div className="flex gap-4 justify-center">
                            <button onClick={resetGame} className="px-12 py-5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-black text-2xl rounded-2xl hover:scale-105 transition-all italic shadow-lg">لعبة جديدة</button>
                            <button onClick={onHome} className="px-8 py-5 bg-white/5 text-gray-500 font-black text-xl rounded-2xl border border-white/10 hover:text-white transition-all">الرئيسية</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
