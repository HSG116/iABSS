import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { ShieldAlert, BellRing, UserCircle2 } from 'lucide-react';

export const BuzzerPad: React.FC = () => {
    const [username, setUsername] = useState('');
    const [team, setTeam] = useState<'team1' | 'team2' | null>(null);
    const [joined, setJoined] = useState(false);
    const [isPressed, setIsPressed] = useState(false);
    const [coolDown, setCoolDown] = useState(false);

    // Simple local cache for fast reload
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

        // We use Realtime Broadcast to achieve sub-100ms latency without database saves.
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

        // Haptic feedback
        if (navigator.vibrate) navigator.vibrate([200]);

        setTimeout(() => setIsPressed(false), 200);
        setTimeout(() => setCoolDown(false), 2000); // Prevent spam
    };

    if (!joined) {
        return (
            <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 select-none font-sans" dir="rtl">
                <div className="w-full max-w-sm bg-zinc-900 border border-white/10 p-8 rounded-[2rem] shadow-2xl space-y-8 animate-in slide-in-from-bottom duration-500">

                    <div className="text-center">
                        <UserCircle2 size={64} className="mx-auto text-blue-500 mb-4 animate-pulse" />
                        <h1 className="text-2xl font-black text-white italic tracking-tighter">جرس الإجابة الذكي</h1>
                        <p className="text-gray-400 text-sm font-bold mt-2">لعبة حروف مع حمودي</p>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="text-xs font-black text-gray-500 uppercase tracking-widest px-2 mb-2 block">اسم المتسابق (أو حساب كيك)</label>
                            <input
                                type="text"
                                value={username}
                                onChange={e => setUsername(e.target.value)}
                                placeholder="أدخل اسمك..."
                                className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-center text-white font-bold text-lg focus:border-blue-500 transition-colors"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-black text-gray-500 uppercase tracking-widest px-2 my-2 block w-full text-right bg-white p-0 m-0 w-0 h-0 overflow-hidden absolute invisible opacity-0 text-transparent hidden">الفريق</label>
                            <label className="text-xs font-black text-gray-500 uppercase tracking-widest px-2 block">اختيار الفريق</label>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => setTeam('team1')}
                                    className={`p-4 rounded-2xl font-black border-2 transition-all ${team === 'team1' ? 'bg-emerald-600 border-white text-white shadow-lg scale-105' : 'bg-emerald-950 text-emerald-500 border-emerald-900 opacity-60'}`}
                                >
                                    الأخضر
                                </button>
                                <button
                                    onClick={() => setTeam('team2')}
                                    className={`p-4 rounded-2xl font-black border-2 transition-all ${team === 'team2' ? 'bg-orange-500 border-white text-white shadow-lg scale-105' : 'bg-orange-950 text-orange-500 border-orange-900 opacity-60'}`}
                                >
                                    البرتقالي
                                </button>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={handleJoin}
                        disabled={!username.trim() || !team}
                        className="w-full py-4 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-black text-lg disabled:opacity-30 transition-all uppercase tracking-widest shadow-[0_0_20px_rgba(37,99,235,0.4)]"
                    >
                        دخـــول
                    </button>

                </div>
            </div>
        );
    }

    return (
        <div className={`min-h-[100dvh] flex flex-col items-center justify-center p-6 select-none transition-colors duration-500 ${!coolDown ? (team === 'team1' ? 'bg-emerald-900' : 'bg-orange-900') : 'bg-zinc-950'}`} dir="rtl">
            <div className="fixed top-6 left-6 right-6 flex items-center justify-between text-white border border-white/10 bg-black/40 backdrop-blur-md px-6 py-4 rounded-full shadow-2xl animate-in slide-in-from-top">
                <div className="flex items-center gap-3">
                    <div className={`w-4 h-4 rounded-full ${team === 'team1' ? 'bg-emerald-500' : 'bg-orange-500'} shadow-[0_0_10px_currentColor] animate-pulse`}></div>
                    <span className="font-black text-lg">{username}</span>
                </div>
                <button onClick={leave} className="text-xs font-bold text-red-400 bg-red-950 px-3 py-1.5 rounded-full border border-red-900">مغادرة</button>
            </div>

            {/* GIANT BUZZER BUTTON */}
            <button
                onPointerDown={buzz}
                disabled={coolDown}
                className={`
               w-[85vw] max-w-[400px] aspect-square rounded-full border-[10px] sm:border-[16px] border-black flex flex-col items-center justify-center shadow-2xl transition-all duration-75 active:scale-95
               ${isPressed ? 'scale-90 bg-red-700 shadow-none' : 'scale-100 bg-red-600'}
               ${coolDown ? 'opacity-30 grayscale cursor-not-allowed border-zinc-900' : 'cursor-pointer animate-in zoom-in'}
            `}
                style={{ WebkitTapHighlightColor: 'transparent', boxShadow: isPressed ? 'inset 0 20px 50px rgba(0,0,0,0.5)' : '0 20px 50px rgba(0,0,0,0.8), inset 0 10px 20px rgba(255,255,255,0.4)' }}
            >
                <BellRing size={80} className={`text-white mb-6 drop-shadow-md ${coolDown ? 'animate-none' : 'animate-bounce'}`} />
                <span className="text-white font-black text-5xl sm:text-7xl italic drop-shadow-[0_5px_10px_rgba(0,0,0,0.5)] tracking-tighter mix-blend-overlay">
                    {coolDown ? 'انتظر' : 'إضغط'}
                </span>
            </button>

            {coolDown && (
                <p className="mt-12 text-zinc-500 font-bold tracking-widest uppercase text-sm animate-pulse flex items-center gap-2">
                    <ShieldAlert size={16} /> جاري تحميل الجرس...
                </p>
            )}

            <style>
                {`
               body, html { margin: 0; padding: 0; overscroll-behavior: none; }
            `}
            </style>
        </div>
    );
};
