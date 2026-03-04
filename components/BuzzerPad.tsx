import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { ShieldAlert, BellRing, UserCircle2, LogOut, Smartphone, Sparkles, Heart, Zap } from 'lucide-react';

export const BuzzerPad: React.FC = () => {
    const [username, setUsername] = useState('');
    const [team, setTeam] = useState<'team1' | 'team2' | null>(null);
    const [joined, setJoined] = useState(false);
    const [isPressed, setIsPressed] = useState(false);
    const [coolDown, setCoolDown] = useState(false);

    useEffect(() => {
        const stored = localStorage.getItem('buzzer_user');
        if (stored) {
            const { name, team } = JSON.parse(stored);
            setUsername(name);
            setTeam(team);
            setJoined(true);
        }
    }, []);

    const handleJoin = () => {
        if (username.trim() && team) {
            setJoined(true);
            localStorage.setItem('buzzer_user', JSON.stringify({ name: username, team }));
        }
    };

    const leave = () => {
        setJoined(false);
        localStorage.removeItem('buzzer_user');
        setTeam(null);
        setUsername('');
    };

    const buzz = async () => {
        if (coolDown) return;
        setIsPressed(true);
        setCoolDown(true);

        await supabase.channel('buzzer_channel').send({
            type: 'broadcast',
            event: 'BUZZ',
            payload: {
                username,
                team,
                timestamp: Date.now(),
                avatar: `https://ui-avatars.com/api/?name=${username}&background=random`
            }
        });

        if (navigator.vibrate) navigator.vibrate([150, 50, 150]);

        setTimeout(() => setIsPressed(false), 200);
        setTimeout(() => setCoolDown(false), 3000);
    };

    if (!joined) {
        return (
            <div className="min-h-screen bg-[#0A0A14] flex flex-col items-center justify-center p-6 select-none font-sans overflow-hidden relative" dir="rtl">
                {/* Background Decor */}
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#FF6B52]/10 rounded-full blur-[100px]"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#14b8a6]/10 rounded-full blur-[100px]"></div>

                <div className="w-full max-w-sm bg-white/5 backdrop-blur-3xl border-2 border-white/10 p-10 rounded-[3rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] space-y-8 animate-in zoom-in duration-500 relative z-10">
                    <div className="text-center">
                        <div className="w-24 h-24 bg-gradient-to-tr from-[#5A22A3] to-[#7f39db] rounded-[2rem] mx-auto flex items-center justify-center shadow-2xl mb-6 transform rotate-6 border-4 border-white/20">
                            <Smartphone size={48} className="text-white animate-pulse" />
                        </div>
                        <h1 className="text-3xl font-black text-white italic tracking-tighter">جرس حروف الذكي</h1>
                        <p className="text-[#14b8a6] font-black mt-2 text-sm uppercase tracking-widest">المباراة الكبرى ⚔️</p>
                    </div>

                    <div className="space-y-6">
                        <div>
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2 mb-2 block">إسم البطل (كما في كيك)</label>
                            <input
                                type="text"
                                value={username}
                                onChange={e => setUsername(e.target.value)}
                                placeholder="من أنت؟..."
                                className="w-full bg-black/50 border-2 border-white/5 rounded-2xl p-5 text-center text-white font-black text-xl focus:border-[#5A22A3] transition-all outline-none"
                            />
                        </div>

                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2 block">إختر معسكرك</label>
                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    onClick={() => setTeam('team1')}
                                    className={`relative h-24 rounded-3xl font-black border-4 transition-all overflow-hidden flex flex-col items-center justify-center gap-1 ${team === 'team1' ? 'bg-[#FF6B52] border-white scale-105 shadow-2xl text-white' : 'bg-white/5 border-white/5 text-[#FF6B52]/40 opacity-50'}`}
                                >
                                    <Heart size={20} fill={team === 'team1' ? "white" : "none"} />
                                    <span>البنات 🌸</span>
                                </button>
                                <button
                                    onClick={() => setTeam('team2')}
                                    className={`relative h-24 rounded-3xl font-black border-4 transition-all overflow-hidden flex flex-col items-center justify-center gap-1 ${team === 'team2' ? 'bg-[#14b8a6] border-white scale-105 shadow-2xl text-white' : 'bg-white/5 border-white/5 text-[#14b8a6]/40 opacity-50'}`}
                                >
                                    <Zap size={20} fill={team === 'team2' ? "white" : "none"} />
                                    <span>الأولاد 🧊</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={handleJoin}
                        disabled={!username.trim() || !team}
                        className="w-full py-5 rounded-3xl bg-gradient-to-r from-[#5A22A3] to-[#4b1d8a] text-white font-black text-2xl disabled:opacity-20 transition-all shadow-[0_15px_30px_rgba(90,34,163,0.4)] border-b-8 border-black/20"
                    >
                        جاهز للمباراة ⚡
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className={`min-h-[100dvh] flex flex-col items-center justify-center p-6 select-none transition-all duration-700 relative overflow-hidden font-sans ${team === 'team1' ? 'bg-[#FF6B52]' : 'bg-[#14b8a6]'}`} dir="rtl">
            {/* Glossy Overlay */}
            <div className="absolute top-0 left-0 w-full h-[60%] bg-white/20 rounded-b-[100%] blur-[80px]"></div>

            <div className="fixed top-8 left-6 right-6 flex items-center justify-between text-white border-4 border-white bg-black/20 backdrop-blur-2xl px-8 py-5 rounded-[2rem] shadow-2xl animate-in slide-in-from-top duration-700 z-50">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-2xl border-2 border-white/20">
                        {team === 'team1' ? '🌸' : '🧊'}
                    </div>
                    <div>
                        <div className="font-black text-xl drop-shadow-md leading-none">{username}</div>
                        <div className="text-[10px] font-black text-white/60 tracking-widest mt-1">متصل في الساحة</div>
                    </div>
                </div>
                <button onClick={leave} className="bg-red-600/20 hover:bg-red-600 p-3 rounded-2xl border-2 border-red-600/30 transition-all">
                    <LogOut size={20} />
                </button>
            </div>

            {/* GIANT PREMIUM BUZZER */}
            <div className="relative group perspective-1000">
                <div className="absolute inset-0 bg-black/40 rounded-full blur-3xl transform translate-y-10 group-active:translate-y-4 transition-all"></div>

                <button
                    onPointerDown={buzz}
                    disabled={coolDown}
                    className={`
                        w-[85vw] max-w-[450px] aspect-square rounded-full border-[15px] border-black/90 flex flex-col items-center justify-center shadow-2xl transition-all duration-75 relative overflow-hidden
                        ${isPressed ? 'scale-90 translate-y-4' : 'scale-100 transform -translate-y-4'}
                        ${coolDown ? 'opacity-30 grayscale cursor-not-allowed border-black/40' : 'cursor-pointer animate-in zoom-in'}
                        bg-gradient-to-b from-[#5A22A3] to-[#2e1065]
                    `}
                    style={{ WebkitTapHighlightColor: 'transparent', boxShadow: isPressed ? 'inset 0 20px 100px rgba(0,0,0,0.8)' : '0 30px 100px rgba(0,0,0,0.9), inset 0 10px 30px rgba(255,255,255,0.4)' }}
                >
                    {/* Inner Shine */}
                    {!coolDown && <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/30 to-transparent"></div>}

                    <BellRing size={120} className={`text-white drop-shadow-2xl ${coolDown ? 'animate-none' : 'animate-bounce'}`} />
                    <span className="text-white font-black text-6xl break-words drop-shadow-[0_10px_10px_rgba(0,0,0,0.8)] mt-4">
                        {coolDown ? 'صبر...' : 'إضغط !!!'}
                    </span>

                    {/* Ripple particles could go here if we had more state */}
                </button>
            </div>

            {coolDown ? (
                <div className="mt-20 flex flex-col items-center gap-3 animate-pulse">
                    <div className="w-16 h-2 bg-black/20 rounded-full overflow-hidden">
                        <div className="h-full bg-white/50 animate-[shimmer_1.5s_infinite]"></div>
                    </div>
                    <p className="text-white/40 font-black tracking-[0.5em] text-xs uppercase">جاري تبريد الجرس...</p>
                </div>
            ) : (
                <div className="mt-16 flex items-center gap-3 text-white/50 font-black tracking-widest text-xs uppercase animate-pulse">
                    <Sparkles size={16} /> كن أسرع واحد للإجابة
                </div>
            )}

            <style>
                {`
                    body, html { margin: 0; padding: 0; overscroll-behavior: none; background: #000; }
                    @keyframes shimmer {
                        0% { transform: translateX(-100%); }
                        100% { transform: translateX(100%); }
                    }
                    .perspective-1000 { perspective: 1000px; }
                `}
            </style>
        </div>
    );
};
