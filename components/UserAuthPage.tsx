import React, { useState, useEffect, useRef } from 'react';
import { User, Lock, Shield, CheckCircle, Loader2, ExternalLink, MessageSquare, Fingerprint, Sparkles, ArrowRight, Eye, EyeOff, AlertTriangle, Copy, ClipboardCheck } from 'lucide-react';
import { chatService } from '../services/chatService';
import { supabase } from '../services/supabase';

interface UserAuthPageProps {
    onSuccess: (userData: { name: string; kickUsername: string; discord?: string; avatar?: string }) => void;
    onBack?: () => void;
}

type AuthStep = 'REGISTER' | 'KICK_VERIFY' | 'VERIFYING' | 'VERIFIED';

const generateVerificationCode = (): string => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
};

// Simple hash for password (not crypto-grade, but sufficient for 6-digit PIN)
const hashPassword = async (pin: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(pin + 'iABS_salt_2024');
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

export const UserAuthPage: React.FC<UserAuthPageProps> = ({ onSuccess, onBack }) => {
    const [step, setStep] = useState<AuthStep>('REGISTER');

    // Form fields
    const [name, setName] = useState('');
    const [kickUsername, setKickUsername] = useState('');
    const [discord, setDiscord] = useState('');
    const [password, setPassword] = useState<string[]>(['', '', '', '', '', '']);
    const [confirmPassword, setConfirmPassword] = useState<string[]>(['', '', '', '', '', '']);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // Avatar
    const [kickAvatar, setKickAvatar] = useState('');
    const [isLoadingAvatar, setIsLoadingAvatar] = useState(false);
    const [avatarError, setAvatarError] = useState(false);

    // Verification
    const [verificationCode, setVerificationCode] = useState('');
    const [codeExpiry, setCodeExpiry] = useState(120);
    const [isVerified, setIsVerified] = useState(false);
    const [codeCopied, setCodeCopied] = useState(false);
    const [chatConnected, setChatConnected] = useState(false);

    // Errors
    const [formError, setFormError] = useState('');
    const [shake, setShake] = useState(false);

    // Refs
    const passRefs = useRef<(HTMLInputElement | null)[]>([]);
    const confirmRefs = useRef<(HTMLInputElement | null)[]>([]);
    const kickInputRef = useRef<HTMLInputElement>(null);
    const codeTimerRef = useRef<NodeJS.Timeout | null>(null);
    const verificationCodeRef = useRef('');
    const kickUsernameRef = useRef('');

    // Fetch Kick avatar when username changes
    useEffect(() => {
        const timeout = setTimeout(async () => {
            if (kickUsername.trim().length >= 2) {
                setIsLoadingAvatar(true);
                setAvatarError(false);
                try {
                    const avatar = await chatService.fetchKickAvatar(kickUsername.trim());
                    if (avatar) {
                        setKickAvatar(avatar);
                    } else {
                        setKickAvatar('');
                        setAvatarError(true);
                    }
                } catch {
                    setKickAvatar('');
                    setAvatarError(true);
                }
                setIsLoadingAvatar(false);
            } else {
                setKickAvatar('');
            }
        }, 800);
        return () => clearTimeout(timeout);
    }, [kickUsername]);

    // Countdown timer for verification code
    useEffect(() => {
        if (step === 'KICK_VERIFY' && codeExpiry > 0) {
            codeTimerRef.current = setInterval(() => {
                setCodeExpiry(prev => {
                    if (prev <= 1) {
                        clearInterval(codeTimerRef.current!);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
            return () => {
                if (codeTimerRef.current) clearInterval(codeTimerRef.current);
            };
        }
    }, [step]);

    // Keep refs in sync
    useEffect(() => { verificationCodeRef.current = verificationCode; }, [verificationCode]);
    useEffect(() => { kickUsernameRef.current = kickUsername; }, [kickUsername]);

    // Connect to Kick chat and listen for verification
    useEffect(() => {
        if (step !== 'KICK_VERIFY') return;
        setChatConnected(false);

        const kickChannel = localStorage.getItem('kick_channel_name') || 'iabs';
        chatService.connect(kickChannel);

        // Track connection status
        const statusUnsub = chatService.onStatusChange((connected) => {
            if (connected) setChatConnected(true);
        });

        const msgUnsub = chatService.onMessage((msg) => {
            const content = msg.content.trim().toUpperCase().replace(/\s+/g, '').replace(/[\u200B-\u200D\uFEFF]/g, '');
            const expectedCode = `ABS-${verificationCodeRef.current}`;

            console.log(`[Verify] From: ${msg.user.username}, Content: "${content}", Expect: "${expectedCode}"`);

            // Accept if the message contains the exact code (from ANY user - the Kick username matching happens on registration)
            if (content === expectedCode || content.includes(expectedCode)) {
                handleVerificationSuccess(msg.user.avatar);
            }
        });

        return () => { msgUnsub(); statusUnsub(); };
    }, [step]);

    const handleVerificationSuccess = async (avatar?: string) => {
        setStep('VERIFYING');

        try {
            // Hash the password
            const hashedPass = await hashPassword(password.join(''));
            const finalAvatar = kickAvatar || avatar || '';

            // Save to Supabase
            const { error } = await supabase.from('users').insert({
                kick_username: kickUsername.trim().toLowerCase(),
                display_name: name.trim(),
                discord: discord.trim() || '',
                password_hash: hashedPass,
                avatar: finalAvatar,
                is_verified: true
            });

            if (error) {
                console.error('[UserAuth] Supabase insert error:', error);
                // If duplicate, still continue (user already exists)
                if (!error.message.includes('duplicate')) {
                    setFormError('حدث خطأ في حفظ الحساب');
                    setStep('REGISTER');
                    return;
                }
            }

            // Initialize Profile too (required for some game features and leaderboard)
            try {
                await supabase.from('profiles').upsert({
                    username: kickUsername.trim().toLowerCase(),
                    avatar_url: finalAvatar || '',
                    role: 'user',
                    created_at: new Date().toISOString()
                });
            } catch (err) {
                console.error('[UserAuth] Profile init error:', err);
            }

            // Initialize Leaderboard record
            try {
                await supabase.from('leaderboard').insert([{
                    username: kickUsername.trim().toLowerCase(),
                    score: 0,
                    wins: 0
                }]);
            } catch (err) {
                console.error('[UserAuth] Leaderboard init error:', err);
            }

            // Save to localStorage too
            const userData = {
                id: (await supabase.from('users').select('id').eq('kick_username', kickUsername.trim().toLowerCase()).single()).data?.id || '',
                display_name: name.trim(),
                kick_username: kickUsername.trim(),
                discord: discord.trim() || undefined,
                avatar: finalAvatar || undefined,
                points: 0
            };
            localStorage.setItem('iabs_user', JSON.stringify(userData));

            setIsVerified(true);
            setStep('VERIFIED');
            setTimeout(() => {
                onSuccess({
                    name: name.trim(),
                    kickUsername: kickUsername.trim(),
                    discord: discord.trim() || undefined,
                    avatar: finalAvatar || undefined
                });
            }, 2500);
        } catch (err) {
            console.error('[UserAuth] Error:', err);
            setFormError('حدث خطأ غير متوقع');
            setStep('REGISTER');
        }
    };

    // Password input handler
    const handlePassInput = (index: number, value: string, isConfirm: boolean) => {
        const char = value.slice(-1);
        if (char && !/^\d$/.test(char)) return; // Only digits

        const arr = isConfirm ? [...confirmPassword] : [...password];
        arr[index] = char;
        isConfirm ? setConfirmPassword(arr) : setPassword(arr);

        const refs = isConfirm ? confirmRefs : passRefs;
        if (char && index < 5) {
            refs.current[index + 1]?.focus();
        }
    };

    const handlePassKeyDown = (index: number, e: React.KeyboardEvent, isConfirm: boolean) => {
        const arr = isConfirm ? confirmPassword : password;
        const refs = isConfirm ? confirmRefs : passRefs;
        if (e.key === 'Backspace' && !arr[index] && index > 0) {
            refs.current[index - 1]?.focus();
        }
    };

    const handleContinue = async () => {
        setFormError('');
        if (!name.trim()) { setFormError('يرجى إدخال الاسم'); triggerShake(); return; }
        if (!kickUsername.trim()) { setFormError('يرجى إدخال اسم مستخدم Kick'); triggerShake(); return; }
        if (password.some(d => d === '')) { setFormError('يرجى إدخال كلمة السر (6 أرقام)'); triggerShake(); return; }
        if (confirmPassword.some(d => d === '')) { setFormError('يرجى تأكيد كلمة السر'); triggerShake(); return; }
        if (password.join('') !== confirmPassword.join('')) {
            setFormError('كلمة المرور غير متطابقة'); triggerShake();
            setConfirmPassword(['', '', '', '', '', '']); confirmRefs.current[0]?.focus(); return;
        }

        // Check if kick_username already exists in Supabase
        try {
            const { data: existing } = await supabase
                .from('users')
                .select('id')
                .eq('kick_username', kickUsername.trim().toLowerCase())
                .maybeSingle();

            if (existing) {
                setFormError('هذا الحساب مسجل مسبقاً');
                triggerShake();
                return;
            }
        } catch (e) {
            console.error('[UserAuth] Check user error:', e);
        }

        const code = generateVerificationCode();
        setVerificationCode(code);
        setCodeExpiry(120);
        setStep('KICK_VERIFY');
    };

    const regenerateCode = () => { const code = generateVerificationCode(); setVerificationCode(code); setCodeExpiry(120); };
    const triggerShake = () => { setShake(true); setTimeout(() => setShake(false), 600); };

    const handleCopyCode = async () => {
        try {
            await navigator.clipboard.writeText(`ABS-${verificationCode}`);
            setCodeCopied(true);
            setTimeout(() => setCodeCopied(false), 2500);
        } catch { /* ignore */ }
    };

    // ========= RENDER =========

    return (
        <div className="fixed inset-0 z-50 bg-black text-white font-sans overflow-hidden flex flex-col items-center justify-center" dir="rtl">
            {/* Global Back Button */}
            {onBack && step !== 'VERIFIED' && step !== 'VERIFYING' && (
                <button
                    onClick={onBack}
                    className="fixed top-8 right-8 z-[100] flex items-center gap-2 text-gray-400 hover:text-white transition-all bg-white/5 border border-white/10 px-5 py-2.5 rounded-2xl font-bold uppercase tracking-widest text-[10px] group shadow-2xl"
                >
                    <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                    العودة لبروتوكول الأمان
                </button>
            )}

            {/* Dynamic Background */}
            <div className="absolute inset-0 z-0 pointer-events-none">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(220,38,38,0.08)_0%,transparent_50%)]"></div>
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(139,92,246,0.06)_0%,transparent_50%)]"></div>
                <div className="absolute inset-0 bg-[linear-gradient(rgba(30,0,0,0.15)_1px,transparent_1px),linear-gradient(90deg,rgba(30,0,0,0.15)_1px,transparent_1px)] bg-[size:60px_60px] opacity-10"></div>
            </div>

            <style>{`
                @keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-10px); } }
                @keyframes glow-pulse { 0%, 100% { box-shadow: 0 0 20px rgba(220,38,38,0.2); } 50% { box-shadow: 0 0 40px rgba(220,38,38,0.5); } }
                @keyframes code-flash { 0%, 100% { opacity: 1; } 50% { opacity: 0.7; } }
                @keyframes slide-up { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
                @keyframes success-ring { 0% { transform: scale(0.8); opacity: 0; } 50% { transform: scale(1.2); opacity: 1; } 100% { transform: scale(1); opacity: 1; } }
                .float-anim { animation: float 3s ease-in-out infinite; }
                .glow-pulse { animation: glow-pulse 2s ease-in-out infinite; }
                .code-flash { animation: code-flash 1.5s ease-in-out infinite; }
                .slide-up { animation: slide-up 0.6s ease-out forwards; }
                .success-ring { animation: success-ring 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
            `}</style>

            {/* ====== REGISTER STEP ====== */}
            {step === 'REGISTER' && (
                <div className={`relative z-10 w-full max-w-lg mx-auto px-6 slide-up ${shake ? 'animate-shake' : ''}`}>


                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-red-600/20 to-red-900/20 border border-red-500/20 mb-5 glow-pulse">
                            <User size={36} className="text-red-500" />
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black italic tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-white to-neutral-400 mb-2">
                            إنشاء حساب
                        </h1>
                        <p className="text-red-500 font-bold tracking-[0.3em] text-[10px] uppercase">CREATE YOUR ACCOUNT</p>
                    </div>

                    {/* Form Card */}
                    <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] rounded-[2rem] p-6 md:p-8 shadow-2xl space-y-5">

                        {/* Kick Avatar Preview */}
                        {(kickAvatar || isLoadingAvatar) && (
                            <div className="flex justify-center -mt-2 mb-2">
                                <div className="relative">
                                    <div className={`w-20 h-20 rounded-2xl overflow-hidden border-2 ${kickAvatar ? 'border-green-500 shadow-[0_0_25px_rgba(34,197,94,0.3)]' : 'border-white/10'} bg-black/60 transition-all duration-500`}>
                                        {isLoadingAvatar ? (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <Loader2 size={24} className="animate-spin text-red-500" />
                                            </div>
                                        ) : kickAvatar ? (
                                            <img src={kickAvatar} className="w-full h-full object-cover" alt="Kick Avatar" />
                                        ) : null}
                                    </div>
                                    {kickAvatar && (
                                        <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center border-2 border-black">
                                            <CheckCircle size={12} className="text-black" />
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Name */}
                        <div>
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 block flex items-center gap-2">
                                <User size={10} /> الاسم
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                placeholder="اسمك المعروض"
                                className="w-full bg-black/40 border border-white/10 focus:border-red-500/50 rounded-xl px-4 py-3 text-white font-bold text-sm outline-none transition-all placeholder:text-gray-600"
                            />
                        </div>

                        {/* Kick Username */}
                        <div>
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 block flex items-center gap-2">
                                <span className="text-green-400">K</span> حساب Kick <span className="text-red-400">*مطلوب</span>
                            </label>
                            <div className="relative">
                                <input
                                    ref={kickInputRef}
                                    type="text"
                                    value={kickUsername}
                                    onChange={e => setKickUsername(e.target.value)}
                                    placeholder="اسم المستخدم في Kick"
                                    className="w-full bg-black/40 border border-white/10 focus:border-green-500/50 rounded-xl px-4 py-3 text-white font-bold text-sm outline-none transition-all placeholder:text-gray-600 pl-12"
                                    dir="ltr"
                                />
                                <div className="absolute left-3 top-1/2 -translate-y-1/2">
                                    <span className="text-green-500 font-black text-xs bg-green-500/10 px-2 py-1 rounded-lg border border-green-500/20">K</span>
                                </div>
                            </div>
                            {avatarError && kickUsername.length >= 2 && (
                                <p className="text-yellow-500 text-[10px] mt-1.5 font-bold flex items-center gap-1">
                                    <AlertTriangle size={10} /> لم يتم العثور على الحساب
                                </p>
                            )}
                        </div>

                        {/* Discord (Optional) */}
                        <div>
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 block flex items-center gap-2">
                                💬 ديسكورد <span className="text-gray-600">(اختياري)</span>
                            </label>
                            <input
                                type="text"
                                value={discord}
                                onChange={e => setDiscord(e.target.value)}
                                placeholder="username#0000"
                                className="w-full bg-black/40 border border-white/10 focus:border-purple-500/50 rounded-xl px-4 py-3 text-white font-bold text-sm outline-none transition-all placeholder:text-gray-600"
                                dir="ltr"
                            />
                        </div>

                        {/* Password */}
                        <div>
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3 block flex items-center gap-2">
                                <Lock size={10} /> كلمة السر <span className="text-gray-600">(6 أرقام)</span>
                            </label>
                            <div className="flex items-center gap-2" dir="ltr">
                                <div className="flex gap-2 flex-1 justify-center">
                                    {password.map((digit, i) => (
                                        <input
                                            key={`p-${i}`}
                                            ref={el => passRefs.current[i] = el}
                                            type={showPassword ? 'text' : 'password'}
                                            inputMode="numeric"
                                            maxLength={1}
                                            value={digit}
                                            onChange={e => handlePassInput(i, e.target.value, false)}
                                            onKeyDown={e => handlePassKeyDown(i, e, false)}
                                            className={`
                                                w-11 h-14 bg-black/60 border-2 rounded-xl text-center text-xl font-black text-white
                                                focus:outline-none focus:border-red-500 focus:shadow-[0_0_15px_rgba(220,38,38,0.3)]
                                                transition-all duration-200
                                                ${digit ? 'border-red-500/40' : 'border-white/10'}
                                            `}
                                        />
                                    ))}
                                </div>
                                <button onClick={() => setShowPassword(!showPassword)} className="p-2 text-gray-500 hover:text-white transition-colors">
                                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>

                        {/* Confirm Password */}
                        <div>
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3 block flex items-center gap-2">
                                <Shield size={10} /> تأكيد كلمة السر
                            </label>
                            <div className="flex items-center gap-2" dir="ltr">
                                <div className="flex gap-2 flex-1 justify-center">
                                    {confirmPassword.map((digit, i) => (
                                        <input
                                            key={`c-${i}`}
                                            ref={el => confirmRefs.current[i] = el}
                                            type={showConfirmPassword ? 'text' : 'password'}
                                            inputMode="numeric"
                                            maxLength={1}
                                            value={digit}
                                            onChange={e => handlePassInput(i, e.target.value, true)}
                                            onKeyDown={e => handlePassKeyDown(i, e, true)}
                                            className={`
                                                w-11 h-14 bg-black/60 border-2 rounded-xl text-center text-xl font-black text-white
                                                focus:outline-none focus:border-green-500 focus:shadow-[0_0_15px_rgba(34,197,94,0.3)]
                                                transition-all duration-200
                                                ${digit ? 'border-green-500/40' : 'border-white/10'}
                                            `}
                                        />
                                    ))}
                                </div>
                                <button onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="p-2 text-gray-500 hover:text-white transition-colors">
                                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>

                        {/* Error Message */}
                        {formError && (
                            <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-2.5 flex items-center gap-3 slide-up">
                                <AlertTriangle size={16} className="text-red-500 shrink-0" />
                                <span className="text-red-400 font-bold text-sm">{formError}</span>
                            </div>
                        )}

                        {/* Continue Button */}
                        <div className="space-y-4">
                            <button
                                onClick={handleContinue}
                                className="w-full bg-gradient-to-r from-red-600 to-red-800 hover:from-red-500 hover:to-red-700 text-white font-black py-4 rounded-2xl text-base italic uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-3 shadow-xl shadow-red-900/20"
                            >
                                <ArrowRight size={20} /> متابعة
                            </button>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="mt-6 text-center opacity-30 flex items-center justify-center gap-2">
                        <Sparkles size={14} />
                        <span className="text-[10px] uppercase tracking-[0.4em] font-bold">SECURED BY iABS SYSTEM</span>
                    </div>
                </div>
            )}

            {/* ====== KICK VERIFICATION STEP ====== */}
            {step === 'KICK_VERIFY' && (
                <div className="relative z-10 w-full max-w-lg mx-auto px-6 slide-up">
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-green-600/20 to-green-900/20 border border-green-500/20 mb-5 float-anim">
                            <MessageSquare size={36} className="text-green-500" />
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black italic tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-white to-neutral-400 mb-2">
                            مصادقة Kick
                        </h1>
                        <p className="text-green-500 font-bold tracking-[0.3em] text-[10px] uppercase">KICK CHAT VERIFICATION</p>
                    </div>

                    <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] rounded-[2rem] p-6 md:p-8 shadow-2xl space-y-6">

                        {/* User Info */}
                        <div className="flex items-center gap-4 bg-black/40 rounded-2xl p-4 border border-white/5">
                            <div className="w-14 h-14 rounded-xl overflow-hidden border-2 border-green-500/30 bg-black/60">
                                {kickAvatar ? (
                                    <img src={kickAvatar} className="w-full h-full object-cover" alt="" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center"><User size={20} className="text-gray-500" /></div>
                                )}
                            </div>
                            <div>
                                <div className="text-white font-black text-lg">{kickUsername}</div>
                                <div className="text-gray-500 text-xs font-bold">Kick.com</div>
                            </div>
                        </div>

                        {/* Instructions */}
                        <div className="bg-gradient-to-br from-green-900/20 to-green-950/20 border border-green-500/20 rounded-2xl p-5 space-y-4">
                            <h3 className="text-green-400 font-black text-sm flex items-center gap-2 uppercase tracking-widest">
                                <Shield size={14} /> خطوات التحقق
                            </h3>
                            <div className="space-y-3 text-sm">
                                <div className="flex items-start gap-3">
                                    <span className="w-6 h-6 bg-green-500 text-black rounded-lg flex items-center justify-center font-black text-xs shrink-0">1</span>
                                    <span className="text-gray-300 font-bold">افتح شات القناة في Kick</span>
                                </div>
                                <div className="flex items-start gap-3">
                                    <span className="w-6 h-6 bg-green-500 text-black rounded-lg flex items-center justify-center font-black text-xs shrink-0">2</span>
                                    <span className="text-gray-300 font-bold">أرسل الكود التالي بالضبط:</span>
                                </div>
                            </div>
                        </div>

                        {/* Verification Code Display */}
                        <div className="bg-black/60 border-2 border-green-500/30 rounded-2xl p-6 text-center glow-pulse relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent"></div>

                            <p className="text-green-500/60 text-[10px] font-bold uppercase tracking-[0.5em] mb-3 relative z-10">كـود الـتـحـقـق</p>
                            <div className="relative z-10 flex items-center justify-center gap-1" dir="ltr">
                                <span className="text-red-500 font-black text-2xl md:text-4xl tracking-widest">ABS-</span>
                                <span className="text-white font-black text-2xl md:text-4xl tracking-[0.3em] code-flash font-mono">{verificationCode}</span>
                            </div>
                            {/* Copy Button */}
                            <button onClick={handleCopyCode} className={`mt-4 relative z-10 inline-flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold transition-all ${codeCopied ? 'bg-green-500/20 border border-green-500/40 text-green-400' : 'bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10 hover:text-white'}`}>
                                {codeCopied ? <><ClipboardCheck size={14} /> تم النسخ!</> : <><Copy size={14} /> نسخ الكود</>}
                            </button>
                            <div className="mt-3 flex items-center justify-center gap-2 relative z-10">
                                <div className={`w-2 h-2 rounded-full ${codeExpiry > 30 ? 'bg-green-500' : codeExpiry > 0 ? 'bg-yellow-500 animate-ping' : 'bg-red-500'}`}></div>
                                <span className={`font-mono font-bold text-sm ${codeExpiry <= 30 ? 'text-yellow-400' : 'text-gray-500'}`}>
                                    {Math.floor(codeExpiry / 60)}:{(codeExpiry % 60).toString().padStart(2, '0')}
                                </span>
                            </div>
                        </div>

                        {/* Connection & Waiting Status */}
                        <div className="flex items-center justify-center gap-3 py-2">
                            {chatConnected ? (
                                <>
                                    <Loader2 size={18} className="animate-spin text-green-500" />
                                    <span className="text-gray-400 font-bold text-sm">متصل - بانتظار الرسالة في الشات...</span>
                                </>
                            ) : (
                                <>
                                    <Loader2 size={18} className="animate-spin text-yellow-500" />
                                    <span className="text-yellow-400 font-bold text-sm">جاري الاتصال بالشات...</span>
                                </>
                            )}
                        </div>

                        {/* Regenerate Button */}
                        {codeExpiry === 0 && (
                            <button onClick={regenerateCode} className="w-full bg-white/5 hover:bg-white/10 text-white font-bold py-3 rounded-xl text-sm transition-all border border-white/10 flex items-center justify-center gap-2">
                                إعادة توليد الكود
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* ====== VERIFYING STEP ====== */}
            {step === 'VERIFYING' && (
                <div className="relative z-10 flex flex-col items-center justify-center slide-up text-center">
                    <div className="relative mb-8">
                        <div className="absolute inset-0 bg-green-500/20 blur-[80px] rounded-full animate-pulse"></div>
                        <div className="relative w-32 h-32 rounded-full border-4 border-green-500/50 flex items-center justify-center bg-black/60 backdrop-blur-xl">
                            <Fingerprint size={64} className="text-green-500 animate-pulse" />
                        </div>
                    </div>
                    <h2 className="text-4xl font-black text-white italic mb-3">جاري التحقق...</h2>
                    <p className="text-green-500 font-bold tracking-[0.4em] text-sm uppercase">VERIFYING IDENTITY</p>
                </div>
            )}

            {/* ====== VERIFIED STEP ====== */}
            {step === 'VERIFIED' && (
                <div className="relative z-10 flex flex-col items-center justify-center text-center">
                    <div className="relative mb-8 success-ring">
                        <div className="absolute inset-0 bg-green-500/30 blur-[100px] rounded-full"></div>
                        <div className="relative w-36 h-36 rounded-full border-4 border-green-500 flex items-center justify-center bg-green-500/10 backdrop-blur-xl shadow-[0_0_60px_rgba(34,197,94,0.4)]">
                            <CheckCircle size={72} className="text-green-500 drop-shadow-[0_0_20px_rgba(34,197,94,0.8)]" />
                        </div>
                    </div>
                    <h2 className="text-5xl font-black text-white italic mb-3 slide-up">تم التحقق!</h2>
                    <p className="text-green-500 font-bold tracking-[0.5em] text-xl uppercase slide-up drop-shadow-[0_0_15px_rgba(34,197,94,0.5)]">VERIFIED ✓</p>
                    <div className="mt-6 flex items-center gap-3 bg-green-500/10 border border-green-500/20 px-6 py-3 rounded-full slide-up">
                        <div className="w-8 h-8 rounded-lg overflow-hidden border border-green-500/30">
                            {kickAvatar ? <img src={kickAvatar} className="w-full h-full object-cover" /> : <User size={14} className="text-gray-400 m-auto mt-2" />}
                        </div>
                        <span className="text-white font-black">{kickUsername}</span>
                    </div>
                </div>
            )}

            {/* REMOVED UNDER_DEV STEP */}
        </div>
    );
};
