
import React from 'react';
import { CATEGORIES } from '../constants';
import { Home } from 'lucide-react';

interface CategorySelectProps {
  onSelect: (id: string) => void;
  onBack: () => void;
}

export const CategorySelect: React.FC<CategorySelectProps> = ({ onSelect, onBack }) => {
  return (
    <div className="w-full max-w-6xl mx-auto py-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* --- Top Navigation Header --- */}
      <div className="flex items-center justify-between mb-8">
        <button
          onClick={onBack}
          className="group flex items-center gap-3 bg-white/5 hover:bg-red-600 transition-all p-1.5 pr-4 rounded-xl border border-white/10 text-white font-black italic active:scale-95"
        >
          <span className="text-[10px] uppercase tracking-widest group-hover:text-white text-gray-400">العودة</span>
          <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center transition-colors group-hover:bg-white group-hover:text-red-600">
            <Home size={16} />
          </div>
        </button>

        <div className="text-right flex flex-col items-end">
          <div className="flex items-center gap-3 mb-1">
            <div className="h-1 w-16 bg-red-600 rounded-full shadow-[0_0_10px_red]"></div>
            <h2 className="text-4xl md:text-5xl font-black text-white italic tracking-tighter uppercase leading-none red-neon-text">أقـسـام الـفـوازير</h2>
          </div>
          <p className="text-gray-400 font-black tracking-[0.4em] text-[8px] uppercase opacity-60">iABS Hub v2.5</p>
        </div>
      </div>

      {/* --- Top Banners --- */}
      <div className="w-full mb-8">
        {/* Ramadan Banner */}
        <button
          onClick={() => onSelect('ramadan')}
          className="group relative w-full h-40 md:h-52 rounded-[2.5rem] overflow-hidden border-2 border-white/10 hover:border-red-600 transition-all duration-500 shadow-2xl hover:scale-[1.01] active:scale-95 bg-black"
        >
          <div className="absolute inset-0">
            <img
              src="https://i.ibb.co/k6mHccgc/content.png"
              alt="Ramadan"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000 brightness-[0.5] group-hover:brightness-[0.7]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent"></div>
          </div>

          <div className="absolute inset-0 flex items-center justify-between px-8 md:px-12">
            <div className="flex flex-col items-start text-right">
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-red-600 p-2 rounded-xl shadow-lg shadow-red-600/30">
                  <span className="text-xl">🌙</span>
                </div>
                <div className="bg-white/10 backdrop-blur-md px-4 py-1 rounded-full border border-white/20 text-[8px] font-black text-white uppercase tracking-widest italic">
                  موسم 2026
                </div>
              </div>
              <h2 className="text-3xl md:text-5xl font-black text-white italic tracking-tighter drop-shadow-[0_5px_15px_rgba(0,0,0,1)]">
                فوازير رمضان
              </h2>
            </div>

            <div className="hidden sm:flex flex-col items-center gap-2">
              <div className="w-14 h-14 rounded-full border-2 border-white/20 bg-black/40 backdrop-blur-xl flex items-center justify-center group-hover:bg-white group-hover:text-black group-hover:scale-110 transition-all duration-500 shadow-xl">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="ml-1 rotate-180"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
              </div>
            </div>
          </div>
        </button>
      </div>

      {/* Categories Grid - Optimized columns for size */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
        {CATEGORIES.filter(c => c.id !== 'ramadan').map((cat, i) => (
          <button
            key={cat.id}
            onClick={() => onSelect(cat.id)}
            className="group relative aspect-square rounded-[2rem] overflow-hidden border border-white/5 hover:border-red-600 transition-all duration-500 shadow-xl hover:scale-105 active:scale-95 bg-black"
            style={{ animationDelay: `${i * 20}ms` }}
          >
            <div className="absolute inset-0">
              <img src={Array.isArray(cat.image) ? cat.image[0] : cat.image} className="w-full h-full object-cover grayscale brightness-[0.3] group-hover:grayscale-0 group-hover:brightness-[0.6] transition-all duration-700" />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent"></div>
            </div>
            <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center z-10">
              <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-2xl mb-2 border border-white/10 group-hover:bg-red-600 group-hover:text-white transition-all duration-500 shadow-lg transform group-hover:rotate-6">
                {cat.icon}
              </div>
              <h3 className="text-xs md:text-sm font-black text-white group-hover:text-red-600 transition-colors uppercase italic leading-tight">
                {cat.label}
              </h3>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};