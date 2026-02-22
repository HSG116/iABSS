import React, { useEffect, useState } from 'react';
import { Sparkles, Zap, Flame } from 'lucide-react';

interface CartoonIntroProps {
    onComplete: () => void;
}

export const CartoonIntro: React.FC<CartoonIntroProps> = ({ onComplete }) => {
    const [phase, setPhase] = useState<'intro' | 'boom' | 'exit'>('intro');

    useEffect(() => {
        // Sequence of animations
        const timer1 = setTimeout(() => setPhase('boom'), 1500);
        const timer2 = setTimeout(() => setPhase('exit'), 4500);
        const timer3 = setTimeout(() => onComplete(), 5500);

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
                background: 'radial-gradient(circle at center, #FDE047 0%, #EAB308 40%, #A16207 80%, #422006 100%)',
            }}
        >
            {/* Cartoon Speed Lines Background */}
            <div className="absolute inset-0 opacity-30 animate-spin-slow" style={{ background: 'repeating-conic-gradient(from 0deg, transparent 0deg 15deg, #000 15deg 30deg)' }}></div>

            {/* Dynamic Pop-in Container */}
            <div className={`relative flex flex-col items-center z-10 transition-transform duration-700 ease-in-out ${phase === 'intro' ? 'scale-0 translate-y-20' : phase === 'boom' ? 'scale-100 translate-y-0' : 'scale-150 rotate-12 opacity-0'
                }`}>

                {/* Glow behind banana */}
                <div className="absolute inset-0 bg-yellow-400 blur-[100px] scale-150 rounded-full animate-pulse opacity-70"></div>

                {/* Cartoon Banana */}
                <div className="relative group">
                    <div className={`text-[150px] md:text-[250px] leading-none drop-shadow-[0_20px_0_rgba(0,0,0,0.4)] ${phase === 'boom' ? 'animate-bounce' : ''}`} style={{ filter: 'drop-shadow(0px 0px 40px rgba(255, 255, 255, 0.8))' }}>
                        🍌
                    </div>
                    {/* Eyes for the banana to make it a character! */}
                    <div className="absolute top-[40%] left-[30%] flex gap-4">
                        <div className="w-6 h-10 md:w-10 md:h-16 bg-white rounded-full flex items-center justify-center border-4 md:border-8 border-black shadow-inner">
                            <div className="w-3 h-5 md:w-6 md:h-8 bg-black rounded-full animate-ping"></div>
                        </div>
                        <div className="w-6 h-10 md:w-10 md:h-16 bg-white rounded-full flex items-center justify-center border-4 md:border-8 border-black shadow-inner">
                            <div className="w-3 h-5 md:w-6 md:h-8 bg-black rounded-full animate-ping"></div>
                        </div>
                    </div>
                    <div className="absolute top-[60%] left-[40%] w-10 md:w-16 h-4 border-b-8 border-black rounded-full rotate-12"></div>
                </div>

                {/* Floating Sparks */}
                {phase === 'boom' && (
                    <>
                        <Zap className="absolute top-0 -left-20 text-yellow-200 fill-current w-16 h-16 md:w-24 md:h-24 animate-pulse rotate-[-20deg]" />
                        <Sparkles className="absolute top-10 -right-20 text-white w-12 h-12 md:w-20 md:h-20 animate-spin" />
                        <Flame className="absolute bottom-10 -left-16 text-orange-500 fill-orange-500 w-16 h-16 md:w-24 md:h-24 animate-bounce rotate-12" />
                    </>
                )}

                {/* Main Text */}
                <div className="mt-8 flex flex-col items-center">
                    <h1
                        className="text-6xl md:text-9xl font-black italic text-transparent bg-clip-text uppercase tracking-tighter"
                        style={{
                            WebkitTextStroke: '4px black',
                            backgroundImage: 'linear-gradient(to bottom, #FFFFFF, #EAB308, #ca8a04)',
                            filter: 'drop-shadow(0 15px 0 #000)',
                            transform: phase === 'boom' ? 'skewY(-5deg) scale(1.1)' : 'skewY(0deg) scale(1)',
                            transition: 'all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                        }}
                    >
                        NANO
                    </h1>
                    <h1
                        className="text-7xl md:text-[140px] font-black italic text-transparent bg-clip-text uppercase tracking-tighter -mt-4 md:-mt-8"
                        style={{
                            WebkitTextStroke: '5px black',
                            backgroundImage: 'linear-gradient(to bottom, #FEF08A, #FACC15, #A16207)',
                            filter: 'drop-shadow(0 20px 0 #000)',
                            transform: phase === 'boom' ? 'skewY(-5deg) scale(1.1)' : 'skewY(0deg) scale(1)',
                            transition: 'all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) 0.1s'
                        }}
                    >
                        BANANA
                    </h1>

                    {/* 2026 Badge */}
                    <div className="mt-6 md:mt-10 px-8 py-2 md:py-4 bg-black rounded-full border-4 md:border-8 border-white transform rotate-3 shadow-[0_10px_0_rgba(255,255,255,0.5)]">
                        <span className="text-4xl md:text-6xl font-black text-white tracking-widest" style={{ WebkitTextStroke: '2px #ca8a04' }}>
                            2026
                        </span>
                    </div>
                </div>

                {/* Entering Text */}
                <div className="absolute bottom-[-100px] text-white/50 font-black tracking-[0.5em] uppercase text-xl md:text-2xl animate-pulse">
                    Entering Arena...
                </div>
            </div>
        </div>
    );
};
