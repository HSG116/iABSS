import React, { useState, useEffect, useRef } from 'react';
import { Lock, Unlock, Fingerprint, Sparkles, UserPlus, ArrowRight } from 'lucide-react';
import { supabase } from '../services/supabase';
import { UserAuthPage } from './UserAuthPage';

const hashPassword = async (pin: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(pin + 'iABS_salt_2024');
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

interface GlobalPasswordPageProps {
    onSuccess: (role: 'admin' | 'user') => void;
    storageKey?: string;
    title?: string;
    subtitle?: string;
    newTitle?: string;
    returningTitle?: string;
    configKey?: string;
}

type AuthStep = 'LOADING' | 'PASSWORD' | 'FINGERPRINT' | 'SCANNING' | 'SUCCESS' | 'WELCOME' | 'USER_AUTH';

export const GlobalPasswordPage: React.FC<GlobalPasswordPageProps> = ({
    onSuccess,
    storageKey = 'site_access_granted',
    title,
    subtitle = 'RESTRICTED ACCESS AREA',
    newTitle = 'بروتوكول الأمان',
    returningTitle = 'تسجيل الدخول',
    configKey = 'admin_password'
}) => {
    const [step, setStep] = useState<AuthStep>('LOADING');
    const [pin, setPin] = useState<string[]>([]);
    const [targetPin, setTargetPin] = useState<string | null>(null);
    const [error, setError] = useState(false);
    const [shake, setShake] = useState(false);
    const [role, setRole] = useState<'admin' | 'user'>('admin');
    const inputs = useRef<(HTMLInputElement | null)[]>([]);
    const [userType, setUserType] = useState<'NEW' | 'RETURNING'>('NEW');

    // Sound Refs
    const scanSound = useRef<HTMLAudioElement | null>(null);
    const successSound = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        // Initialize Audio
        scanSound.current = new Audio('https://assets.mixkit.co/active_storage/sfx/228/228-preview.mp3');
        successSound.current = new Audio('https://assets.mixkit.co/active_storage/sfx/1114/1114-preview.mp3');
    }, []);

    useEffect(() => {
        const initAuth = async () => {
            // Check LocalStorage first (Instant)
            const storedSession = localStorage.getItem(storageKey);
            let storedToken: string | null = null;
            let hasStoredSession = false;

            try {
                if (storedSession) {
                    const parsed = JSON.parse(storedSession);
                    if (parsed && parsed.token) {
                        storedToken = parsed.token;
                        if (parsed.role) setRole(parsed.role as 'admin' | 'user');
                        hasStoredSession = true;
                    }
                }
            } catch (e) { }

            // Fail-safe: Always move to PASSWORD screen after 3.5s if still loading
            const failSafe = setTimeout(() => {
                setStep(current => {
                    if (current === 'LOADING') {
                        console.warn("[iABS] Auth init timed out, forcing UI...");
                        return 'PASSWORD';
                    }
                    return current;
                });
            }, 3500);

            // Use a fallback if DB is unreachable
            const fallback = process.env.ADMIN_FALLBACK_PASSWORD || "";

            try {
                // Primary: Fetch Security Protocol from Cloud (Supabase)
                const { data, error } = await Promise.race([
                    supabase.from('app_config').select('value').eq('key', configKey).maybeSingle(),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2500))
                ]) as any;

                clearTimeout(failSafe);

                if (data && data.value) {
                    console.log("[iABS] 🟢 Cloud Security Protocol Loaded");
                    setTargetPin(data.value);
                    const length = data.value.length || 6;
                    setPin(new Array(length).fill(''));
                    inputs.current = inputs.current.slice(0, length);

                    if (hasStoredSession && storedToken === data.value) {
                        setUserType('RETURNING');
                        setStep('FINGERPRINT');
                    } else {
                        if (hasStoredSession) localStorage.removeItem(storageKey);
                        setUserType('NEW');
                        setStep('PASSWORD');
                    }
                } else {
                    // DB is connected but key not found or error occurred
                    console.warn("[iABS] 🟡 Using Local Security Protocol (Key Not Found)");
                    setTargetPin(fallback);
                    const length = fallback.length;
                    setPin(new Array(length).fill(''));
                    inputs.current = inputs.current.slice(0, length);
                    setUserType('NEW');
                    setStep('PASSWORD');
                }
            } catch (e) {
                // Totally offline or timeout
                clearTimeout(failSafe);
                console.warn("[iABS] 🔴 Cloud Connection Failed. Using Emergency Protocol.");
                setTargetPin(fallback);
                const length = fallback.length;
                setPin(new Array(length).fill(''));
                inputs.current = inputs.current.slice(0, length);
                setUserType('NEW');
                setStep('PASSWORD');
            }
        };

        initAuth();
    }, []);

    // Focus effect for password input
    useEffect(() => {
        if (step === 'PASSWORD' && inputs.current[0]) {
            setTimeout(() => inputs.current[0]?.focus(), 100);
        }
    }, [step]);

    const handleInput = (index: number, value: string) => {
        const char = value.slice(-1);
        const newPin = [...pin];
        newPin[index] = char;
        setPin(newPin);

        if (char && index < pin.length - 1) {
            inputs.current[index + 1]?.focus();
        }

        if (newPin.every(d => d !== '') && index === pin.length - 1 && char && targetPin) {
            verifyPin(newPin.join(''));
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === 'Backspace' && !pin[index] && index > 0) {
            inputs.current[index - 1]?.focus();
        }
    };

    const verifyPin = async (enteredPin: string) => {
        // 1. Check admin password first
        if (enteredPin === targetPin) {
            setError(false);
            setRole('admin');
            setStep('FINGERPRINT');
            return;
        }

        // 2. Check if it matches any registered user's password
        try {
            const hashedPin = await hashPassword(enteredPin);
            const { data } = await supabase
                .from('users')
                .select('*')
                .eq('password_hash', hashedPin)
                .limit(1)
                .maybeSingle();

            if (data) {
                // Fetch points from leaderboard
                const { data: lbData } = await supabase
                    .from('leaderboard')
                    .select('score')
                    .eq('username', data.kick_username)
                    .maybeSingle();

                const points = lbData?.score || 0;

                // Found a user! Save rendered data to localStorage
                localStorage.setItem('iabs_user', JSON.stringify({
                    id: data.id,
                    display_name: data.display_name,
                    kick_username: data.kick_username,
                    discord: data.discord || undefined,
                    avatar: data.avatar || undefined,
                    points: points
                }));
                setError(false);
                setRole('user');
                setUserType('RETURNING');
                setStep('FINGERPRINT');
                return;
            }
        } catch (e) {
            console.error('[Auth] User check error:', e);
        }

        // 3. Neither admin nor user — deny
        setError(true);
        setShake(true);
        setTimeout(() => {
            setShake(false);
            setPin(new Array(pin.length).fill(''));
            inputs.current[0]?.focus();
            setError(false);
        }, 600);
    };

    const startScan = () => {
        if (step !== 'FINGERPRINT') return;

        setStep('SCANNING');
        if (scanSound.current) {
            scanSound.current.currentTime = 0;
            scanSound.current.play().catch(() => { });
        }

        // Simulate 5s scan
        setTimeout(() => {
            finishScan();
        }, 5000);
    };

    const finishScan = (roleOverride?: 'admin' | 'user') => {
        const finalRole = roleOverride || role;
        if (successSound.current) {
            successSound.current.play().catch(() => { });
        }
        setStep('SUCCESS');

        // Save persistence now with TOKEN for security validation
        localStorage.setItem(storageKey, JSON.stringify({
            token: targetPin,
            timestamp: Date.now(),
            valid: true,
            role: finalRole
        }));

        // Wait for "Access Granted" / "Welcome Back" message
        setTimeout(() => {
            onSuccess(finalRole);
        }, 2000);
    };

    if (step === 'LOADING') {
        return <div className="fixed inset-0 bg-black z-[9999]" />;
    }

    return (
        <div className="fixed inset-0 z-[9999] bg-black text-white font-sans overflow-hidden flex flex-col items-center justify-center p-0 m-0">
            {/* Dynamic Background */}
            <div className="absolute inset-0 z-0 pointer-events-none">
                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-red-900/10 via-black to-black animate-pulse"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[100vw] h-[100vh] bg-red-600/5 rounded-full blur-[150px] animate-pulse-slow"></div>
                {/* Grid overlay */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(30,0,0,0.2)_1px,transparent_1px),linear-gradient(90deg,rgba(30,0,0,0.2)_1px,transparent_1px)] bg-[size:60px_60px] opacity-10"></div>
            </div>

            {/* Content Container - Perfectly Centered */}
            <div className="relative z-10 w-full flex flex-col items-center justify-center min-h-screen">

                {/* --- PASSWORD STEP --- */}
                {step === 'PASSWORD' && (
                    <div className={`flex flex-col items-center animate-in fade-in zoom-in duration-700 ${shake ? 'animate-shake' : ''}`}>

                        <div className="mb-12 relative group">
                            <div className="absolute inset-0 bg-red-600/40 blur-[50px] rounded-full group-hover:bg-red-600/60 transition-all duration-500 animate-pulse"></div>
                            <Lock size={80} strokeWidth={1.5} className={`relative z-10 transition-all duration-300 ${error ? 'text-red-500 drop-shadow-[0_0_30px_rgba(255,0,0,1)]' : 'text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.5)]'}`} />
                        </div>

                        <h2 className="text-5xl md:text-7xl font-black italic tracking-tighter mb-4 text-center text-transparent bg-clip-text bg-gradient-to-b from-white to-neutral-500 drop-shadow-2xl">
                            {userType === 'NEW' ? (title || newTitle) : (title || returningTitle)}
                        </h2>

                        {/* Security Warning */}
                        <div className="mb-8 bg-red-900/40 border border-red-500/30 px-6 py-2 rounded-full animate-pulse flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-red-500 animate-ping"></div>
                            <p className="text-red-200 font-bold text-sm tracking-wider">يرجى إخفاء الشاشة الآن</p>
                        </div>

                        <p className="text-red-500 font-bold tracking-[0.5em] text-sm md:text-base uppercase mb-16 text-center drop-shadow-[0_0_10px_rgba(255,0,0,0.5)]">
                            {subtitle}
                        </p>

                        <div style={{ direction: 'ltr' }} className="flex flex-wrap items-center justify-center gap-4 md:gap-6 mb-12">
                            {pin.map((digit, i) => (
                                <div key={i} className="relative group">
                                    <div className={`pointer-events-none absolute inset-0 bg-red-600/20 blur-xl rounded-full transition-all duration-300 ${digit ? 'opacity-100 scale-150' : 'opacity-0'}`}></div>
                                    <input
                                        ref={el => inputs.current[i] = el}
                                        type="text"
                                        inputMode="text"
                                        autoComplete="off"
                                        maxLength={1}
                                        value={digit}
                                        onChange={(e) => handleInput(i, e.target.value)}
                                        onKeyDown={(e) => handleKeyDown(i, e)}
                                        className={`
                                            relative z-20
                                            w-14 h-20 md:w-20 md:h-28 
                                            bg-transparent border-b-4 
                                            text-center text-4xl md:text-6xl font-black text-white 
                                            focus:outline-none focus:border-red-500 focus:scale-110
                                            transition-all duration-300 placeholder-transparent
                                            ${error ? 'border-red-600 text-red-500 drop-shadow-[0_0_10px_rgba(255,0,0,0.8)]' : 'border-white/20'}
                                            ${digit ? 'border-white drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]' : 'hover:border-white/50'}
                                        `}
                                    />
                                </div>
                            ))}
                        </div>

                        {error && <div className="text-red-500 font-black tracking-[0.5em] animate-bounce text-lg drop-shadow-[0_0_10px_red]">ACCESS DENIED</div>}

                        {/* Registration Link */}
                        <div className="mt-8 text-center">
                            <p className="text-gray-600 text-sm font-bold mb-2">ليس لديك حساب؟</p>
                            <button
                                onClick={() => setStep('USER_AUTH')}
                                className="inline-flex items-center gap-2 text-red-500 hover:text-red-400 font-black text-sm uppercase tracking-widest transition-colors bg-red-500/5 hover:bg-red-500/10 px-6 py-3 rounded-xl border border-red-500/20 hover:border-red-500/30"
                            >
                                <UserPlus size={16} /> سجّل الآن
                            </button>
                        </div>
                    </div>
                )}


                {/* --- FINGERPRINT / SCANNING STEP --- */}
                {(step === 'FINGERPRINT' || step === 'SCANNING') && (
                    <div className="flex flex-col items-center justify-center w-full min-h-screen bg-black relative overflow-hidden">

                        {/* Return to Password Button */}
                        {step === 'FINGERPRINT' && (
                            <button
                                onClick={() => {
                                    setStep('PASSWORD');
                                    // Reset PIN state
                                    const length = targetPin?.length || 6;
                                    setPin(new Array(length).fill(''));
                                    // Small delay to ensure inputs are rendered
                                    setTimeout(() => inputs.current[0]?.focus(), 100);
                                }}
                                className="absolute top-10 right-10 z-[100] flex items-center gap-2 text-gray-500 hover:text-white transition-all bg-white/5 border border-white/10 px-6 py-3 rounded-2xl font-bold uppercase tracking-widest text-xs group"
                            >
                                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                العودة للوحة الأرقام
                            </button>
                        )}

                        {/* High-Tech Background Grid */}
                        <div className="absolute inset-0 pointer-events-none">
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-red-900/10 via-black to-black"></div>
                            <div className="w-full h-full opacity-20" style={{ backgroundImage: 'linear-gradient(rgba(220,38,38,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(220,38,38,0.1) 1px, transparent 1px)', backgroundSize: '50px 50px' }}></div>
                        </div>

                        {/* Title Section - Moved Up */}
                        <div className="relative z-20 text-center mb-16 animate-in slide-in-from-top-10 duration-700 fade-in">
                            <h2 className="text-4xl md:text-6xl font-black italic tracking-tighter text-white drop-shadow-[0_0_25px_rgba(220,38,38,0.6)] mb-4">
                                {userType === 'NEW' ? (title || newTitle) : (title || returningTitle)}
                            </h2>
                            <div className="flex items-center justify-center gap-4">
                                <div className="h-[1px] w-12 bg-red-600/50"></div>
                                <p className="text-red-500 font-mono tracking-[0.3em] text-sm uppercase animate-pulse font-bold">
                                    {step === 'SCANNING' ? 'SYSTEM ANALYSIS IN PROGRESS' : 'BIOMETRIC VERIFICATION'}
                                </p>
                                <div className="h-[1px] w-12 bg-red-600/50"></div>
                            </div>
                        </div>

                        {/* Main Interaction Area */}
                        <div className="relative z-30 perspective-1000">
                            {/* Holographic Base Plate */}
                            <div className={`absolute bottom-[-100px] left-1/2 -translate-x-1/2 w-[400px] h-[100px] bg-red-600/20 blur-[60px] rounded-[100%] transition-opacity duration-500 ${step === 'SCANNING' ? 'opacity-100' : 'opacity-30'}`}></div>

                            <button
                                onMouseDown={startScan}
                                onTouchStart={startScan}
                                className="relative group cursor-pointer outline-none tap-highlight-transparent p-10"
                                style={{ WebkitTapHighlightColor: 'transparent', transformStyle: 'preserve-3d' }}
                            >
                                {/* ROTATING RINGS - HUD EFFECT */}
                                <div className={`absolute inset-[-60px] border border-red-500/20 rounded-full transition-all duration-1000 ${step === 'SCANNING' ? 'animate-spin-slow opacity-80 border-dashed border-red-400/30' : 'opacity-20 scale-90'}`}></div>
                                <div className={`absolute inset-[-30px] border-2 border-red-500/10 rounded-full transition-all duration-1000 ${step === 'SCANNING' ? 'animate-reverse-spin opacity-80 border-dotted border-red-500/50' : 'opacity-20 scale-95'}`}></div>

                                {/* Static Tech Ring */}
                                <div className="absolute inset-[-10px] border border-red-600/30 rounded-full"></div>

                                {/* Intense Core Glow */}
                                <div className={`absolute inset-0 bg-red-600/10 blur-xl rounded-full transition-all duration-200 ${step === 'SCANNING' ? 'bg-red-500/30 scale-125' : 'group-hover:bg-red-900/40'}`}></div>

                                {/* FINGERPRINT CONTAINER */}
                                <div className={`
                                    relative w-64 h-64 md:w-80 md:h-80 flex items-center justify-center 
                                    rounded-full border-2 border-red-500/20 bg-black/60 backdrop-blur-xl
                                    shadow-[0_0_50px_rgba(220,38,38,0.1)] overflow-hidden
                                    transition-all duration-300
                                    ${step === 'SCANNING' ? 'border-red-500 shadow-[0_0_100px_rgba(220,38,38,0.5)] scale-105' : 'group-hover:border-red-500/60 group-hover:shadow-[0_0_50px_rgba(220,38,38,0.3)]'}
                                `}>
                                    {/* Background Grid inside Scanner */}
                                    <div className="absolute inset-0 bg-[linear-gradient(rgba(255,0,0,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,0,0,0.1)_1px,transparent_1px)] bg-[size:20px_20px] opacity-20"></div>

                                    {/* THE FINGERPRINT */}
                                    <Fingerprint
                                        size={240}
                                        className={`relative z-10 transition-all duration-200 ${step === 'SCANNING'
                                            ? 'text-red-500 drop-shadow-[0_0_30px_rgba(255,50,50,1)] opacity-100 glitch-effect'
                                            : 'text-red-900/50 group-hover:text-red-500/80 transition-colors'
                                            }`}
                                        strokeWidth={1.2}
                                    />

                                    {/* ACTIVE SCANNING EFFECTS */}
                                    {step === 'SCANNING' && (
                                        <>
                                            {/* High Intensity Laser */}
                                            <div className="absolute top-[-10%] w-[120%] h-[5px] bg-white shadow-[0_0_20px_#ff0000,0_0_40px_#ff0000] z-50 animate-scan-line"></div>

                                            {/* Digital Rain / Matrix Effect Overlay */}
                                            <div className="absolute inset-0 z-40 opacity-30 pointer-events-none mix-blend-screen overflow-hidden">
                                                <div className="w-full h-[200%] animate-matrix bg-[repeating-linear-gradient(0deg,transparent,transparent_20px,#ff0000_20px,#ff0000_22px)]"></div>
                                            </div>

                                            {/* Flash Overlay */}
                                            <div className="absolute inset-0 bg-red-500/20 animate-pulse-fast z-30"></div>
                                        </>
                                    )}

                                    {/* Idle Pulse */}
                                    {step !== 'SCANNING' && (
                                        <div className="absolute inset-6 rounded-full border border-red-500/20 animate-ping opacity-30"></div>
                                    )}
                                </div>
                            </button>
                        </div>

                        {/* Instructions - Properly Spaced Below */}
                        <div className="relative z-20 mt-16 h-12 flex items-center justify-center">
                            <div className={`
                                 bg-red-900/20 border border-red-500/20 px-8 py-3 rounded-full 
                                 transition-all duration-300 flex items-center gap-3
                                 ${step === 'SCANNING' ? 'scale-95 opacity-50' : 'animate-bounce'}
                             `}>
                                <div className={`w-2 h-2 rounded-full bg-red-500 ${step === 'SCANNING' ? 'animate-ping' : ''}`}></div>
                                <span className="text-red-400 font-bold tracking-[0.2em] text-xs uppercase">
                                    {step === 'SCANNING' ? 'SCANNING...' : 'اضغط مطولاً للمسح'}
                                </span>
                            </div>
                        </div>

                    </div>
                )}

                {/* --- SUCCESS STEP --- */}
                {step === 'SUCCESS' && (
                    <div className="flex flex-col items-center animate-in zoom-in duration-700 text-center relative z-20">
                        <div className="relative mb-10">
                            <div className="absolute inset-0 bg-green-500/30 blur-[100px] rounded-full animate-pulse"></div>
                            <div className="relative z-10 p-10 bg-green-500/10 rounded-full border border-green-500/30 shadow-[0_0_50px_rgba(34,197,94,0.3)]">
                                <Unlock size={120} className="text-green-500 drop-shadow-[0_0_30px_rgba(34,197,94,0.8)] animate-bounce" />
                            </div>
                        </div>

                        <h2 className="text-6xl md:text-8xl font-black italic text-white mb-6 tracking-tighter drop-shadow-2xl">
                            {userType === 'NEW' ? 'تمت المصادقة' : 'أهلاً بك'}
                        </h2>
                        <p className="text-green-500 font-bold tracking-[0.6em] text-2xl uppercase drop-shadow-[0_0_20px_rgba(34,197,94,0.6)] animate-pulse">
                            ACCESS AUTHORIZED
                        </p>
                    </div>
                )}

                {/* --- USER AUTH / REGISTRATION STEP --- */}
                {step === 'USER_AUTH' && (
                    <UserAuthPage
                        onSuccess={(userData) => {
                            setRole('user');
                            finishScan('user');
                        }}
                        onBack={() => setStep('PASSWORD')}
                    />
                )}

            </div>

            <div className="absolute bottom-10 opacity-30 flex flex-col items-center gap-1 animate-pulse pointer-events-none">
                <div className="flex items-center gap-3">
                    <Sparkles size={20} className="text-white" />
                    <span className="text-sm text-white uppercase tracking-[0.6em] font-bold">SECURED BY iABS CLOUD SYSTEM</span>
                </div>
                <span className="text-[10px] text-zinc-500 font-mono">BUILD_REF: {new Date().toLocaleDateString()} | v2.0.5</span>
            </div>

            <style>{`
        @keyframes scan-line {
          0% { top: 0%; opacity: 0; }
          10% { opacity: 1; box-shadow: 0 0 30px #ef4444; }
          90% { opacity: 1; box-shadow: 0 0 30px #ef4444; }
          100% { top: 100%; opacity: 0; }
        }
        @keyframes scan-fill {
            0% { clip-path: inset(100% 0 0 0); filter: drop-shadow(0 0 2px red); }
            100% { clip-path: inset(0 0 0 0); filter: drop-shadow(0 0 15px red); }
        }
        .animate-scan-line {
          animation: scan-line 1.5s cubic-bezier(0.4, 0, 0.2, 1) infinite; 
        }
        .animate-scan-fill {
            animation: scan-fill 4s linear forwards;
        }
        .glass-scan-effect {
            background: radial-gradient(circle, rgba(220,38,38,0.1) 0%, rgba(0,0,0,0) 70%);
            box-shadow: inset 0 0 40px rgba(220,38,38,0.2), 0 0 20px rgba(220,38,38,0.1);
            border: 1px solid rgba(220,38,38,0.3);
            backdrop-filter: blur(2px);
        }
        .animate-pulse-fast {
          animation: pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        @keyframes hologram-flicker {
            0% { opacity: 0.8; transform: scaleY(1); }
            5% { opacity: 0.9; transform: scaleY(1.02); }
            10% { opacity: 0.8; transform: scaleY(0.98); }
            100% { opacity: 0.8; transform: scaleY(1); }
        }
        .animate-hologram {
            animation: hologram-flicker 0.1s infinite alternate;
        }
        @keyframes matrix-fall {
            0% { transform: translateY(-100%); opacity: 0; }
            50% { opacity: 1; }
            100% { transform: translateY(100%); opacity: 0; }
        }
        .animate-matrix {
            animation: matrix-fall 2s linear infinite;
        }
        .animate-spin-slow { animation: spin 8s linear infinite; }
        .animate-reverse-spin { animation: spin 12s linear infinite reverse; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        
        .glitch-effect {
            animation: glitch 0.3s cubic-bezier(.25, .46, .45, .94) both infinite;
        }
        @keyframes glitch {
            0% { transform: translate(0); }
            20% { transform: translate(-2px, 2px); }
            40% { transform: translate(-2px, -2px); }
            60% { transform: translate(2px, 2px); }
            80% { transform: translate(2px, -2px); }
            100% { transform: translate(0); }
        }
      `}</style>
        </div>
    );
};
