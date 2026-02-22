import React, { useEffect, useState } from 'react';
import { Sparkles, Star, Sun, Shield } from 'lucide-react';

interface CartoonIntroProps {
    onComplete: () => void;
}

export const CartoonIntro: React.FC<CartoonIntroProps> = ({ onComplete }) => {
    const [phase, setPhase] = useState<'intro' | 'boom' | 'exit'>('intro');

    useEffect(() => {
        // Sequence of animations
        const timer1 = setTimeout(() => setPhase('boom'), 1500);
        const timer2 = setTimeout(() => setPhase('exit'), 5500);
        const timer3 = setTimeout(() => onComplete(), 6500);

        return () => {
            clearTimeout(timer1);
            clearTimeout(timer2);
            clearTimeout(timer3);
        };
    }, [onComplete]);

    return (
        <div
            className={`fixed inset-0 z-[999999] flex flex-col items-center justify-center overflow-hidden transition-opacity duration-1000 ${phase === 'exit' ? 'opacity-0 pointer-events-none' : 'opacity-100'
                }`}
            style={{
                background: 'radial-gradient(circle at center, #065F46 0%, #064E3B 40%, #022C22 80%, #000000 100%)',
            }}
        >
            {/* Golden Speed Lines Background */}
            <div className="absolute inset-0 opacity-20 animate-spin-slow" style={{ background: 'repeating-conic-gradient(from 0deg, transparent 0deg 15deg, #FDE047 15deg 30deg)' }}></div>

            {/* Pattern Overlay for a richer look */}
            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_transparent_20%,_#000_150%)]" style={{ backgroundImage: 'linear-gradient(rgba(212,175,55,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(212,175,55,0.1) 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>

            {/* Dynamic Pop-in Container */}
            <div className={`relative flex flex-col items-center z-10 transition-transform duration-1000 ease-in-out ${phase === 'intro' ? 'scale-0 translate-y-32 opacity-0' : phase === 'boom' ? 'scale-100 translate-y-0 opacity-100' : 'scale-150 rotate-[20deg] opacity-0'
                }`}>

                {/* Deep Green/Gold Glow */}
                <div className="absolute inset-0 bg-yellow-500 blur-[150px] scale-150 rounded-full transition-opacity duration-1000 opacity-40"></div>
                <div className="absolute inset-0 bg-green-500 blur-[100px] scale-125 rounded-full transition-opacity duration-1000 opacity-60"></div>

                {/* Saudi Character Icon Representation (CSS Art) */}
                <div className="relative group flex justify-center items-center mb-8">
                    <div className={`relative transition-transform duration-700 ${phase === 'boom' ? 'animate-bounce drop-shadow-[0_20px_40px_rgba(234,179,8,0.5)]' : ''}`}>
                        {/* Ghutra (Headdress) */}
                        <div className="w-48 h-48 md:w-64 md:h-64 bg-white rounded-t-full relative flex justify-center items-start shadow-inner overflow-hidden border-8 border-green-800">
                            {/* Agal (Black cord) */}
                            <div className="absolute top-8 w-40 md:w-56 h-8 md:h-12 bg-black rounded-full shadow-[0_4px_0_rgba(0,0,0,0.5)] z-20"></div>
                            {/* Face */}
                            <div className="absolute top-16 md:top-20 w-32 md:w-44 h-32 md:h-44 bg-[#E8C396] rounded-full z-10 flex flex-col items-center shadow-lg border-b-4 border-black/10">
                                {/* Eyes */}
                                <div className="mt-8 flex gap-6">
                                    <div className="w-6 h-8 md:w-8 md:h-12 bg-white rounded-full flex justify-center items-center overflow-hidden border-2 border-black/20">
                                        <div className="w-4 h-6 md:w-6 md:h-8 bg-black rounded-full animate-pulse-fast"></div>
                                    </div>
                                    <div className="w-6 h-8 md:w-8 md:h-12 bg-white rounded-full flex justify-center items-center overflow-hidden border-2 border-black/20">
                                        <div className="w-4 h-6 md:w-6 md:h-8 bg-black rounded-full animate-pulse-fast"></div>
                                    </div>
                                </div>
                                {/* Smile */}
                                <div className="mt-6 md:mt-8 w-12 md:w-16 h-6 border-b-4 border-black/80 rounded-full"></div>
                            </div>
                        </div>
                    </div>

                    {/* Accents around the character */}
                    {phase === 'boom' && (
                        <>
                            <Shield className="absolute -top-10 -right-16 text-yellow-400 w-16 h-16 md:w-24 md:h-24 animate-pulse rotate-12 drop-shadow-[0_0_20px_rgba(250,204,21,0.5)]" />
                            <Star className="absolute top-10 -left-16 text-white fill-white w-12 h-12 md:w-16 md:h-16 animate-spin-slow drop-shadow-[0_0_20px_white]" />
                            <Sun className="absolute bottom-4 -right-20 text-yellow-500 fill-yellow-500 w-16 h-16 md:w-24 md:h-24 animate-spin-slow drop-shadow-[0_0_20px_rgba(250,204,21,0.5)]" />
                            <Sparkles className="absolute bottom-10 -left-20 text-yellow-200 w-16 h-16 md:w-20 md:h-20 animate-pulse drop-shadow-[0_0_10px_white]" />
                        </>
                    )}
                </div>

                {/* Main Text */}
                <div className="flex flex-col items-center gap-2">
                    <h2 className="text-3xl md:text-5xl font-black text-yellow-500 tracking-[0.5em] uppercase drop-shadow-[0_5px_15px_rgba(0,0,0,0.8)] mb-2" style={{ WebkitTextStroke: '1px #000' }}>
                        يوم بدينا
                    </h2>
                    <h1
                        className="text-7xl md:text-[120px] font-black italic text-transparent bg-clip-text tracking-tighter leading-none"
                        style={{
                            WebkitTextStroke: '3px black',
                            backgroundImage: 'linear-gradient(to bottom, #FFFFFF, #D1D5DB, #9CA3AF)',
                            filter: 'drop-shadow(0 15px 0 #000)',
                            transform: phase === 'boom' ? 'scale(1.05)' : 'scale(1)',
                            transition: 'all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                        }}
                    >
                        يوم التأسيس
                    </h1>

                    <div className="flex items-center gap-4 mt-4">
                        <span className="text-4xl md:text-6xl font-black text-white italic drop-shadow-[0_5px_0_#000]" style={{ WebkitTextStroke: '2px black' }}>1727</span>
                        <div className="h-2 w-16 bg-yellow-500 rounded-full"></div>
                        <span className="text-4xl md:text-6xl font-black text-yellow-500 italic drop-shadow-[0_5px_0_#000]" style={{ WebkitTextStroke: '2px black' }}>2026</span>
                    </div>

                </div>

                {/* Entering Text */}
                <div className="absolute bottom-[-100px] text-green-300 font-bold tracking-[0.3em] uppercase text-xl md:text-2xl animate-pulse bg-black/40 px-6 py-2 rounded-full border border-green-500/30">
                    دخول إلى عام 2026...
                </div>
            </div>
        </div>
    );
};
