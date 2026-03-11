
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChatUser } from '../types';
import { chatService } from '../services/chatService';
import { leaderboardService } from '../services/supabase';
import {
   Trophy, Users, Play, RotateCcw, Lock, Unlock,
   Trash2, LogOut, Home, Settings, Zap, Clock,
   Sparkles, Volume2, VolumeX, History, Palette,
   ChevronRight, Check, ShieldCheck, UserPlus, Image as ImageIcon,
   UserMinus, RefreshCcw, Loader2, User
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { ProAvatar } from './ProAvatar';

interface SpinWheelProps {
   channelConnected: boolean;
   onHome: () => void;
}

type GamePhase = 'SETUP' | 'PLAYING';

interface WheelConfig {
   joinKeyword: string;
   spinDuration: number;
   soundEnabled: boolean;
   autoReopen: boolean;
   neonGlow: boolean;
   showAvatars: boolean;
   minParticipants: number;
   removeWinner: boolean;
}

// Sticker mapping replicated from MusicalChairsGame for consistency
const STICKERS_IABS_MAPPING: Record<string, string | null> = {
   'iabs324244': '3544675', 'iabsdance': '4428507', 'iabsddddddd': '3109207', 'iabshhhh': '3689146',
   'iabsKSA1': '2942650', 'iabst79eer': '4338825', 'iabst7yyhhh': '3989626', 'iabsw6nn': '4428504',
   'iabs235235': '3329508', 'iabs3': '1014969', 'iabs3oooo': '3989709', 'iabs4': '1014975',
   'iabs505': '3823817', 'iabs66': '1056550', 'iabs7': '1015210', 'iabs7son': '2893352',
   'iabs8': '1015225', 'iabs8rd': '2893346', 'iabsa': '1078051', 'iabsa4lfi': '3329257',
   'iabsashhhhhhhi': '3989578', 'iabsb6666666h': '4937186', 'iabsbatman': '3989610', 'iabsboo': '3330599',
   'iabsdaaaaaaaaaaaanc': '4937181', 'iabsdaaance': '3823818', 'iabsdaaanceee': '3989569',
   'iabsdaaannnccee3434': '4937184', 'iabsdanceee': '3500550', 'iabsddddd': '3109209',
   'iabseat': '3109204', 'iabsewwwwwwwwwww': '3989594', 'iabsfloss': '3989597', 'iabsgoooo': '3330629',
   'iabsgraa7': '3989577', 'iabshaaaaaaaaaahhaa': '3329484', 'iabshhh44': '3689147', 'iabshmmmmmi': '2893345',
   'iabshootee': '3329485', 'iabshuu': '3109190', 'iabsjhj': '3330238', 'iabsknslh': '4953422',
   'iabskoksal': '3989580', 'iabslm': '3329260', 'iabsloooove': '4937189', 'iabsm39bbb': '3329530',
   'iabsm9dom': '3989615', 'iabsmusaeed': '3989609', 'iabsnashb': '2893344', 'iabsqqq': '3330234',
   'iabsqwqw': '3330235', 'iabsr3333333b': '4937191', 'iabsrbbee3': '3989591', 'iabsshhhhhhhhhhh': '3330619',
   'iabssmallcup': '2607940', 'iabsswalllffff': '4937179', 'iabst777yh': '3989623', 'iabsw3lykmm': '3544674'
};
const STICKERS_IABS = Object.keys(STICKERS_IABS_MAPPING).map(s => ({ name: s, id: STICKERS_IABS_MAPPING[s] }));

const SidebarPortal = ({ children }: { children?: React.ReactNode }) => {
   const [mounted, setMounted] = useState(false);
   useEffect(() => { setMounted(true); return () => setMounted(false); }, []);
   const el = document.getElementById('game-sidebar-portal');
   if (!mounted || !el) return null;
   return createPortal(children, el);
};

export const SpinWheel: React.FC<SpinWheelProps> = ({ channelConnected, onHome }) => {
   const [phase, setPhase] = useState<GamePhase>('SETUP');
   const [config, setConfig] = useState<WheelConfig>({
      joinKeyword: '!دخول',
      spinDuration: 5,
      soundEnabled: true,
      autoReopen: false,
      neonGlow: true,
      showAvatars: true,
      minParticipants: 1,
      removeWinner: false
   });

   const [participants, setParticipants] = useState<ChatUser[]>([]);
   const [isSpinning, setIsSpinning] = useState(false);
   const [isOpen, setIsOpen] = useState(false);
   const [winner, setWinner] = useState<ChatUser | null>(null);
   const [rotation, setRotation] = useState(0);
   const [history, setHistory] = useState<ChatUser[]>([]);

   const canvasRef = useRef<HTMLCanvasElement>(null);
   const isOpenRef = useRef(isOpen);
   const participantsRef = useRef(participants);
   const configRef = useRef(config);

   useEffect(() => { isOpenRef.current = isOpen; }, [isOpen]);
   useEffect(() => { participantsRef.current = participants; }, [participants]);
   useEffect(() => { configRef.current = config; }, [config]);

   const wheelColors = useMemo(() => [
      '#ff0000', '#22c55e', '#3b82f6', '#eab308', '#a855f7',
      '#ec4899', '#f97316', '#06b6d4', '#8b5cf6', '#ef4444'
   ], []);

   // Chat integration with sticker support
   useEffect(() => {
      if (!channelConnected) return;
      const cleanup = chatService.onMessage((msg) => {
         if (phase !== 'PLAYING' || !isOpenRef.current) return;

         const lower = msg.content.toLowerCase();
         const raw = msg.content;
         const keyword = configRef.current.joinKeyword.toLowerCase();

         // Sticker logic
         const targetStickerId = STICKERS_IABS_MAPPING[keyword];
         const isKeywordMatch = keyword && lower.includes(keyword);
         const isStickerIdMatch = targetStickerId && raw.includes(targetStickerId);
         const isStickerTagMatch = targetStickerId && lower.includes(`emote:${targetStickerId}:`);

         if (isKeywordMatch || isStickerIdMatch || isStickerTagMatch) {
            setParticipants(prev => {
               if (prev.length >= 500) return prev;

               const newUserLower = msg.user.username.toLowerCase().trim();
               const exists = prev.some(p => p.username.toLowerCase().trim() === newUserLower);

               if (exists) {
                  return prev;
               }

               // Fetch real Kick avatar asynchronously
               chatService.fetchKickAvatar(msg.user.username).then(avatar => {
                  if (avatar) {
                     setParticipants(current => current.map(p =>
                        p.username === msg.user.username ? { ...p, avatar } : p
                     ));
                  }
               });

               return [...prev, msg.user];
            });
         }
      });
      return cleanup;
   }, [channelConnected, phase]);

   const drawWheel = useCallback(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const size = canvas.width;
      const centerX = size / 2;
      const centerY = size / 2;
      const radius = size / 2 - 20;

      ctx.clearRect(0, 0, size, size);

      const count = participants.length;
      if (count === 0) {
         // Draw premium empty state
         const grad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
         grad.addColorStop(0, '#16161a');
         grad.addColorStop(1, '#0c0c0e');
         ctx.beginPath();
         ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
         ctx.fillStyle = grad;
         ctx.fill();
         ctx.strokeStyle = '#333';
         ctx.lineWidth = 10;
         ctx.stroke();

         ctx.fillStyle = '#444';
         ctx.font = 'black 60px "Outfit", sans-serif';
         ctx.textAlign = 'center';
         ctx.fillText('ARENA EMPTY', centerX, centerY);
         return;
      }

      const angleStep = (Math.PI * 2) / count;

      participants.forEach((p, i) => {
         const startAngle = i * angleStep;
         const endAngle = (i + 1) * angleStep;

         // Draw segment
         ctx.beginPath();
         ctx.moveTo(centerX, centerY);
         ctx.arc(centerX, centerY, radius, startAngle, endAngle);

         // Gradient for each segment
         const segmentGrad = ctx.createRadialGradient(centerX, centerY, radius * 0.5, centerX, centerY, radius);
         const color = wheelColors[i % wheelColors.length];
         segmentGrad.addColorStop(0, color);
         // darken the edge
         segmentGrad.addColorStop(1, 'rgba(0,0,0,0.3)');

         ctx.fillStyle = segmentGrad;
         ctx.fill();

         // Separator line
         ctx.strokeStyle = 'rgba(255,255,255,0.05)';
         ctx.lineWidth = 1;
         ctx.stroke();

         // Draw text
         ctx.save();
         ctx.translate(centerX, centerY);
         ctx.rotate(startAngle + angleStep / 2);

         ctx.textAlign = 'right';
         ctx.fillStyle = '#ffffff';

         let fontSize = 38;
         if (count > 20) fontSize = 28;
         if (count > 50) fontSize = 18;
         if (count > 100) fontSize = 12;
         if (count > 200) fontSize = 8;
         if (count > 350) fontSize = 5;

         ctx.font = `black ${fontSize}px "Outfit", sans-serif`;
         ctx.shadowColor = 'rgba(0,0,0,1)';
         ctx.shadowBlur = 6;

         // Offset names from center to make them visible
         const textOffset = count > 100 ? 10 : 40;
         const truncatedName = p.username.length > 15 ? p.username.substring(0, 12) + '..' : p.username;

         if (count < 450 || i % 2 === 0) { // On extreme counts, skip every 2nd name to avoid overlap if needed, but here we try all
            ctx.fillText(truncatedName, radius - textOffset, fontSize / 3);
         }

         ctx.restore();
      });

      // Outer premium ring
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius + 5, 0, Math.PI * 2);
      ctx.strokeStyle = '#1a1a1e';
      ctx.lineWidth = 20;
      ctx.stroke();

      // Secondary ring border
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius - 5, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,255,255,0.1)';
      ctx.lineWidth = 4;
      ctx.stroke();

      // Inner hub
      ctx.beginPath();
      ctx.arc(centerX, centerY, 80, 0, Math.PI * 2);
      ctx.fillStyle = '#0a0a0c';
      ctx.fill();
      ctx.strokeStyle = '#222';
      ctx.lineWidth = 10;
      ctx.stroke();
   }, [participants, wheelColors]);

   useEffect(() => { drawWheel(); }, [drawWheel]);

   const spinTheWheel = () => {
      if (participants.length < config.minParticipants || isSpinning) return;

      setIsSpinning(true);
      setIsOpen(false);
      setWinner(null);

      const winIndex = Math.floor(Math.random() * participants.length);
      const angleStep = 360 / participants.length;

      // We want the winner to land at the top (270 degrees)
      // Canvas draw starts at 0 (3 o'clock).
      // Current rotation + dynamic spins + target offset
      const extraSpins = 360 * (12 + Math.floor(Math.random() * 8));
      const targetOffset = (270 - (winIndex * angleStep) - (angleStep / 2));
      const finalRotation = rotation - (rotation % 360) + extraSpins + targetOffset;

      setRotation(finalRotation);

      setTimeout(async () => {
         const winUser = participants[winIndex];
         setIsSpinning(false);
         setWinner(winUser);
         setHistory(prev => [winUser, ...prev].slice(0, 15));

         confetti({
            particleCount: 200,
            spread: 90,
            origin: { y: 0.6 },
            colors: ['#ff0000', '#ffffff', '#ffd700', '#3b82f6']
         });

         await leaderboardService.recordWin(winUser.username, winUser.avatar || '', 100);

         if (config.removeWinner) {
            setTimeout(() => {
               setParticipants(prev => prev.filter((_, idx) => idx !== winIndex));
            }, 3000);
         }

         if (config.autoReopen) {
            setTimeout(() => setIsOpen(true), 4000);
         }
      }, config.spinDuration * 1000);
   };

   const resetGame = () => {
      setParticipants([]);
      setWinner(null);
      setRotation(0);
      setIsOpen(false);
      setHistory([]);
   };

   const selectedSticker = useMemo(() => {
      const s = STICKERS_IABS.find(x => x.name.toLowerCase() === config.joinKeyword.toLowerCase());
      return s ? `https://files.kick.com/emotes/${s.id}/full` : null;
   }, [config.joinKeyword]);

   return (
      <>
         <SidebarPortal>
            {phase === 'PLAYING' && (
               <div className="space-y-4 animate-in slide-in-from-right duration-500">
                  {/* Control Panel */}
                  <div className="glass-card p-5 rounded-[2.5rem] border border-white/5 space-y-4 shadow-2xl relative overflow-hidden">
                     <div className="absolute top-0 left-0 w-full h-1 bg-red-600"></div>
                     <div className="flex items-center justify-between">
                        <h4 className="text-[10px] font-black text-white uppercase tracking-widest flex items-center gap-2">
                           <Settings size={14} className="text-red-600" /> مـيدان الـعجلة
                        </h4>
                        <button onClick={() => setPhase('SETUP')} className="text-gray-500 hover:text-white transition-colors">
                           <RotateCcw size={16} />
                        </button>
                     </div>

                     <div className="grid grid-cols-2 gap-2">
                        {!isOpen ? (
                           <button onClick={() => setIsOpen(true)} className="bg-white/5 text-green-500 border border-green-500/20 font-black py-4 rounded-2xl text-[10px] hover:bg-green-500/10 transition-all flex flex-col items-center justify-center gap-2 uppercase italic">
                              <Unlock size={18} /> فتح الانضمام
                           </button>
                        ) : (
                           <button onClick={() => setIsOpen(false)} className="bg-red-600 text-white font-black py-4 rounded-2xl text-[10px] shadow-lg shadow-red-600/20 flex flex-col items-center justify-center gap-2 uppercase italic animate-pulse">
                              <Lock size={18} /> إغلاق الانضمام
                           </button>
                        )}
                        <button onClick={resetGame} className="bg-white/5 text-gray-400 font-black py-4 rounded-2xl text-[10px] border border-white/5 hover:text-white transition-all italic uppercase flex flex-col items-center justify-center gap-2">
                           <Trash2 size={18} /> تصفير
                        </button>
                     </div>

                     <button
                        onClick={spinTheWheel}
                        disabled={isSpinning || participants.length < config.minParticipants}
                        className="w-full bg-gradient-to-r from-red-600 to-red-700 text-white font-black py-5 rounded-3xl text-sm shadow-[0_10px_30px_rgba(220,38,38,0.3)] hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-4 italic border-t-2 border-white/20 disabled:opacity-30"
                     >
                        {isSpinning ? <Loader2 className="animate-spin" size={20} /> : <Play fill="currentColor" size={20} />} تـدوير الـعـجـلـة
                     </button>
                  </div>

                  {/* Participants List */}
                  <div className="glass-card rounded-[2rem] border border-white/5 flex flex-col overflow-hidden h-[300px] shadow-2xl">
                     <div className="p-4 border-b border-white/5 bg-white/5 flex justify-between items-center">
                        <div className="flex flex-col">
                           <span className="text-[10px] font-black text-white uppercase tracking-widest flex items-center gap-2">
                              <Users size={14} className="text-red-600" /> المتواجدون
                           </span>
                        </div>
                        <span className="bg-red-600 text-white px-3 py-1 rounded-xl text-[12px] font-black italic shadow-lg">{participants.length}</span>
                     </div>
                     <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
                        {participants.length === 0 ? (
                           <div className="h-full flex flex-col items-center justify-center opacity-20 italic">
                              <UserPlus size={40} className="mb-2 text-gray-400" />
                              <p className="text-[10px] font-black text-gray-500">في انتظار الأبطال...</p>
                           </div>
                        ) : (
                           [...participants].reverse().map((p, i) => (
                              <div key={i} className="flex items-center gap-3 p-2.5 rounded-2xl transition-all border border-white/5 bg-black/20 hover:bg-white/5 group animate-in slide-in-from-right duration-300">
                                 <ProAvatar
                                    url={p.avatar || ''}
                                    username={p.username}
                                    size="w-10 h-10"
                                 />
                                 <span className="text-[11px] font-black text-white truncate">{p.username}</span>
                              </div>
                           ))
                        )}
                     </div>
                  </div>

                  {/* Winner History Mini */}
                  {history.length > 0 && (
                     <div className="glass-card p-4 rounded-[2rem] border border-white/5 shadow-2xl">
                        <h4 className="text-[9px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2 mb-3">
                           <History size={12} className="text-amber-500" /> السجل الأخير
                        </h4>
                        <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-1">
                           {history.map((h, i) => (
                              <div key={i} className="w-12 h-12 rounded-xl border border-amber-500/30 shrink-0 shadow-lg flex items-center justify-center bg-black/40 overflow-visible" title={h.username}>
                                 <ProAvatar
                                    url={h.avatar || ''}
                                    username={h.username}
                                    size="w-12 h-12"
                                 />
                              </div>
                           ))}
                        </div>
                     </div>
                  )}
               </div>
            )}
         </SidebarPortal>

         <div className="w-full h-full flex flex-col items-center justify-center bg-transparent relative font-display select-none overflow-hidden" dir="rtl">

            {phase === 'SETUP' ? (
               <div className="w-full max-w-5xl animate-in fade-in zoom-in duration-700 p-8">
                  <div className="flex flex-col items-center text-center mb-12">
                     <div className="relative group p-4">
                        <div className="absolute inset-0 bg-red-600 blur-[60px] opacity-20 group-hover:opacity-40 transition-opacity"></div>
                        <div className="w-24 h-24 bg-gradient-to-br from-red-500 to-red-800 rounded-[2rem] flex items-center justify-center shadow-[0_0_50px_rgba(255,0,0,0.4)] mb-8 transform group-hover:scale-110 transition-transform duration-500 border-2 border-white/20">
                           <Zap size={48} className="text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.8)]" fill="white" />
                        </div>
                     </div>
                     <h1 className="text-9xl font-black text-white italic tracking-tighter uppercase mb-2 drop-shadow-[0_0_40px_rgba(255,255,255,0.1)]">عـجلة الـحظ</h1>
                     <div className="flex items-center gap-4">
                        <span className="h-px w-12 bg-red-600/40"></span>
                        <p className="text-red-500 font-black tracking-[0.6em] text-xs uppercase italic">Premium Arena Hub</p>
                        <span className="h-px w-12 bg-red-600/40"></span>
                     </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     {/* Left Column: Basic Settings */}
                     <div className="glass-card p-10 rounded-[3.5rem] border border-white/10 shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 left-0 w-1 h-full bg-red-600 group-hover:w-2 transition-all"></div>
                        <h3 className="text-2xl font-black text-white flex items-center gap-4 mb-10"><Zap className="text-red-600" /> إعـدادات الـدخول</h3>

                        <div className="space-y-10">
                           <div className="space-y-4">
                              <label className="text-xs font-black text-gray-400 uppercase tracking-widest flex justify-between">
                                 كلمة الانضمام <span className="text-red-500 font-bold">{selectedSticker ? 'ملصق مكتشف' : 'نص'}</span>
                              </label>
                              <div className="relative">
                                 <input
                                    value={config.joinKeyword}
                                    onChange={e => setConfig({ ...config, joinKeyword: e.target.value })}
                                    className="w-full bg-black/60 border-2 border-white/5 focus:border-red-600 rounded-[1.5rem] py-6 px-8 text-white font-black text-3xl outline-none transition-all shadow-inner"
                                    placeholder="!دخول أو اسم الملصق"
                                 />
                                 <div className="absolute left-6 top-1/2 -translate-y-1/2">
                                    {selectedSticker ? (
                                       <img src={selectedSticker} className="w-12 h-12 object-contain animate-bounce" alt="sticker" />
                                    ) : (
                                       <UserPlus className="text-gray-500" size={32} />
                                    )}
                                 </div>
                              </div>
                           </div>

                           <div className="grid grid-cols-2 gap-4">
                              <div className="bg-black/30 p-6 rounded-[2rem] border border-white/5 space-y-4">
                                 <label className="text-[10px] font-black text-gray-500 uppercase flex items-center gap-2"><Clock size={12} /> مـدة الـدوران</label>
                                 <div className="flex items-center justify-between">
                                    <button onClick={() => setConfig({ ...config, spinDuration: Math.max(3, config.spinDuration - 1) })} className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 text-white font-black transition-all">-</button>
                                    <span className="text-2xl font-black text-white font-mono">{config.spinDuration}s</span>
                                    <button onClick={() => setConfig({ ...config, spinDuration: Math.min(20, config.spinDuration + 1) })} className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 text-white font-black transition-all">+</button>
                                 </div>
                              </div>
                              <div className="bg-black/30 p-6 rounded-[2rem] border border-white/5 space-y-4">
                                 <label className="text-[10px] font-black text-gray-500 uppercase flex items-center gap-2"><Users size={12} /> الـحد الأدنى</label>
                                 <div className="flex items-center justify-between">
                                    <button onClick={() => setConfig({ ...config, minParticipants: Math.max(1, config.minParticipants - 1) })} className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 text-white font-black transition-all">-</button>
                                    <span className="text-2xl font-black text-white font-mono">{config.minParticipants}</span>
                                    <button onClick={() => setConfig({ ...config, minParticipants: Math.min(50, config.minParticipants + 1) })} className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 text-white font-black transition-all">+</button>
                                 </div>
                              </div>
                           </div>
                        </div>
                     </div>

                     {/* Right Column: Visuals & Logic */}
                     <div className="glass-card p-10 rounded-[3.5rem] border border-white/10 shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-1 h-full bg-red-600 group-hover:w-2 transition-all"></div>
                        <h3 className="text-2xl font-black text-white flex items-center gap-4 mb-10"><Palette className="text-red-600" /> إضـافات مـتقدمة</h3>

                        <div className="grid grid-cols-2 gap-4">
                           <button onClick={() => setConfig({ ...config, soundEnabled: !config.soundEnabled })} className={`p-5 rounded-[2.2rem] border-2 transition-all flex flex-col items-center gap-3 ${config.soundEnabled ? 'bg-red-600/20 border-red-600 text-white shadow-lg' : 'bg-white/5 border-transparent text-gray-500 grayscale'}`}>
                              {config.soundEnabled ? <Volume2 size={32} /> : <VolumeX size={32} />}
                              <span className="text-[10px] font-black uppercase tracking-wider">سـاوند إفـكت</span>
                           </button>
                           <button onClick={() => setConfig({ ...config, neonGlow: !config.neonGlow })} className={`p-5 rounded-[2.2rem] border-2 transition-all flex flex-col items-center gap-3 ${config.neonGlow ? 'bg-red-600/20 border-red-600 text-white shadow-lg' : 'bg-white/5 border-transparent text-gray-500 grayscale'}`}>
                              <Sparkles size={32} />
                              <span className="text-[10px] font-black uppercase tracking-wider">تـوهج نـيون</span>
                           </button>
                           <button onClick={() => setConfig({ ...config, removeWinner: !config.removeWinner })} className={`p-5 rounded-[2.2rem] border-2 transition-all flex flex-col items-center gap-3 ${config.removeWinner ? 'bg-red-600/20 border-red-600 text-white shadow-lg' : 'bg-white/5 border-transparent text-gray-500 grayscale'}`}>
                              <UserMinus size={32} />
                              <span className="text-[10px] font-black uppercase tracking-wider">استبعاد الـفائز</span>
                           </button>
                           <button onClick={() => setConfig({ ...config, showAvatars: !config.showAvatars })} className={`p-5 rounded-[2.2rem] border-2 transition-all flex flex-col items-center gap-3 ${config.showAvatars ? 'bg-red-600/20 border-red-600 text-white shadow-lg' : 'bg-white/5 border-transparent text-gray-500 grayscale'}`}>
                              <ImageIcon size={32} />
                              <span className="text-[10px] font-black uppercase tracking-wider">عـرض الـصور</span>
                           </button>
                        </div>

                        <button
                           onClick={() => setPhase('PLAYING')}
                           className="w-full mt-10 bg-white text-black font-black py-7 rounded-[2.5rem] text-4xl hover:scale-[1.03] active:scale-95 transition-all flex items-center justify-center gap-6 shadow-[0_20px_60px_rgba(255,255,255,0.15)] italic border-t-4 border-red-600"
                        >
                           بـدء الـمواجهة <ChevronRight size={40} className="rotate-180" />
                        </button>
                     </div>
                  </div>

                  <div className="flex justify-center mt-12 gap-8">
                     <button onClick={onHome} className="p-6 bg-white/5 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-all border border-white/5 shadow-xl">
                        <Home size={36} />
                     </button>
                  </div>
               </div>
            ) : (
               <div className="w-full h-full flex flex-col items-center justify-center relative p-8">
                  {winner && (
                     <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/98 backdrop-blur-3xl animate-in zoom-in duration-500">
                        <div className="bg-[#050505] p-10 rounded-[3rem] border-[3px] border-red-600 shadow-[0_0_150px_rgba(255,0,0,0.4)] text-center relative max-w-lg w-full mx-4 overflow-hidden group">
                           <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-transparent via-red-600 to-transparent"></div>

                           <div className="w-32 h-32 rounded-[2rem] border-4 border-red-600 mx-auto mb-6 overflow-hidden shadow-[0_0_60px_rgba(255,0,0,0.5)] relative transform hover:scale-110 transition-transform">
                              <ProAvatar
                                 url={winner.avatar || ''}
                                 username={winner.username}
                                 size="w-full h-full"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                           </div>


                           <div className="text-red-600 font-black uppercase tracking-[0.5em] text-[10px] mb-6 italic flex items-center justify-center gap-4">
                              <span className="w-10 h-px bg-red-600/40"></span> بـطل الـساحة <span className="w-10 h-px bg-red-600/40"></span>
                           </div>
                           <div className="text-5xl font-black text-white mb-8 italic tracking-tighter uppercase drop-shadow-[0_10px_20px_rgba(0,0,0,1)]">{winner.username}</div>

                           <div className="flex gap-4 justify-center">
                              <button onClick={() => setWinner(null)} className="flex-1 max-w-[160px] py-4 bg-white/10 border border-white/10 text-white font-black text-xl rounded-[1.5rem] hover:bg-white/20 transition-all italic">إغلاق</button>
                              <button onClick={onHome} className="flex-1 max-w-[160px] py-4 bg-red-600 text-white font-black text-xl rounded-[1.5rem] hover:scale-105 transition-all italic shadow-xl shadow-red-600/30 border-t-2 border-white/20">الرئيسية</button>
                           </div>
                        </div>
                     </div>
                  )}

                  <div className="relative w-[600px] h-[600px] flex items-center justify-center mx-auto my-auto">
                     {/* Pointer - Enhanced */}
                     <div className="absolute -top-8 left-1/2 -translate-x-1/2 z-[60]">
                        <div className="relative">
                           <div className="w-0 h-0 border-l-[25px] border-l-transparent border-r-[25px] border-r-transparent border-t-[45px] border-t-red-600 drop-shadow-[0_10px_20px_rgba(255,0,0,0.8)] filter"></div>
                           <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-white shadow-[0_0_20px_white] animate-pulse"></div>
                           <div className="absolute top-1 w-px h-10 bg-red-600/50 blur-[1px] left-1/2 -translate-x-1/2"></div>
                        </div>
                     </div>

                     {/* The Wheel */}
                     <div className={`relative w-[500px] h-[500px] rounded-full p-4 bg-[#0a0a0c] border-[15px] border-[#16161a] shadow-[0_0_80px_rgba(0,0,0,1)] overflow-hidden transition-all ease-out ${config.neonGlow ? 'premium-neon' : ''}`} style={{ transform: `rotate(${rotation}deg)`, transitionDuration: isSpinning ? `${config.spinDuration}s` : '0s', transitionTimingFunction: 'cubic-bezier(0.1, 0, 0.1, 1)' }}>
                        <canvas
                           ref={canvasRef}
                           width={1000}
                           height={1000}
                           className="w-full h-full"
                        />
                     </div>

                     {/* Center Hub Premium */}
                     <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-36 h-36 bg-[#0a0a0c] rounded-full z-[70] border-[10px] border-[#16161a] flex items-center justify-center shadow-[0_0_50px_black]">
                        <div className="w-24 h-24 bg-gradient-to-br from-red-500 to-red-800 rounded-[2rem] flex items-center justify-center shadow-[0_0_40px_rgba(255,0,0,0.6)] relative overflow-hidden transform rotate-45 border-2 border-white/20 hover:scale-110 transition-transform cursor-pointer group" onClick={() => !isSpinning && participants.length >= config.minParticipants && spinTheWheel()}>
                           <div className="text-white font-black text-2xl -rotate-45 italic tracking-tighter drop-shadow-xl">iABS</div>
                           <div className="absolute inset-0 bg-white/30 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 skew-x-30"></div>
                        </div>
                        {/* Static indicator for top pointer */}
                        <div className="absolute top-[-20px] w-3 h-3 rounded-full bg-red-600/20 blur-[3px]"></div>
                     </div>

                     {/* Advanced Decorative Outer Rings */}
                     <div className="absolute inset-[-40px] border-[2px] border-white/5 rounded-full pointer-events-none opacity-20"></div>
                     <div className="absolute inset-[-80px] border-[1px] border-red-600/5 rounded-full pointer-events-none opacity-10 animate-spin-slow"></div>
                     <div className="absolute inset-[-120px] border-[1px] border-white/5 rounded-full pointer-events-none opacity-5 animate-reverse-slow"></div>

                     {/* Outer floating particles decorative */}
                     <div className="absolute -top-[5%] -left-[5%] w-48 h-48 bg-red-600/5 blur-[80px] rounded-full"></div>
                     <div className="absolute -bottom-[5%] -right-[5%] w-48 h-48 bg-blue-600/5 blur-[80px] rounded-full"></div>
                  </div>

                  {/* Bottom Giant Info Bar */}
                  <div className="mt-4 bg-black/60 backdrop-blur-3xl border border-white/5 px-8 py-4 rounded-[2.5rem] flex items-center gap-8 shadow-[0_15px_60px_rgba(0,0,0,0.8)] animate-in slide-in-from-bottom-10 duration-1000">
                     <div className="flex flex-col items-center px-6 border-l border-white/10">
                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1 flex items-center gap-1">
                           <Users size={12} /> الـمقاتـلون
                        </span>
                        <span className="text-2xl font-black text-white italic font-mono leading-none">{participants.length}</span>
                     </div>
                     <div className="flex flex-col items-center px-6 border-l border-white/10">
                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1 flex items-center gap-1">
                           <Zap size={12} /> كـلمة الـدخول
                        </span>
                        <div className="flex items-center gap-3">
                           <span className="text-2xl font-black text-red-500 italic uppercase leading-none">{config.joinKeyword}</span>
                           {selectedSticker && <img src={selectedSticker} className="w-8 h-8 object-contain" alt="s" />}
                        </div>
                     </div>
                     <div className="flex flex-col items-center px-6">
                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">الـحالة الـحالية</span>
                        <div className={`px-4 py-1.5 rounded-xl flex items-center gap-2 border ${isOpen ? 'bg-green-600/10 border-green-500 text-green-500' : 'bg-red-600/10 border-red-600 text-red-600'}`}>
                           {isOpen ? <Unlock size={16} className="animate-bounce" /> : <Lock size={16} />}
                           <span className="text-xl font-black italic uppercase">
                              {isOpen ? 'مـفـتوح' : 'مـغـلق'}
                           </span>
                        </div>
                     </div>
                  </div>
               </div>
            )}
         </div>

         <style>{`
        .premium-neon {
          box-shadow: 0 0 50px rgba(220, 38, 38, 0.3), inset 0 0 50px rgba(220, 38, 38, 0.3);
          border-color: rgba(220, 38, 38, 0.4) !important;
        }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes reverse-slow {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }
        .animate-spin-slow { animation: spin-slow 80s linear infinite; }
        .animate-reverse-slow { animation: reverse-slow 120s linear infinite; }
        
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(220, 38, 38, 0.5); }

        @media screen and (max-height: 900px) {
           .scale-90 { transform: scale(0.8); }
        }
      `}</style>
      </>
   );
};
