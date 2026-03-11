
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { ChatUser } from '../types';
import { chatService } from '../services/chatService';
import { leaderboardService } from '../services/supabase';
import {
   Gift, Play, Crown, Zap, Users, Sparkles,
   RotateCcw, Home, Settings, Rocket, Star,
   Trophy, Flame, Shield, Target, Cpu, User
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { ProAvatar } from './ProAvatar';

interface RaffleProps {
   channelConnected: boolean;
   onHome: () => void;
}

type RafflePhase = 'SETUP' | 'LOBBY' | 'DRAWING' | 'WINNER';

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

export const Raffle: React.FC<RaffleProps> = ({ channelConnected, onHome }) => {
   const [phase, setPhase] = useState<RafflePhase>('SETUP');
   const [keyword, setKeyword] = useState('!دخول');
   const [duration, setDuration] = useState(60);
   const [participants, setParticipants] = useState<ChatUser[]>([]);
   const [timeLeft, setTimeLeft] = useState(0);
   const [winner, setWinner] = useState<ChatUser | null>(null);
   const [scrollPosition, setScrollPosition] = useState(0);
   const [reelParticipants, setReelParticipants] = useState<ChatUser[]>([]);
   const [isSpinning, setIsSpinning] = useState(false);
   const [recentMessages, setRecentMessages] = useState<{ user: string, content: string, color?: string }[]>([]);

   const phaseRef = useRef(phase);
   const keywordRef = useRef(keyword);
   const participantsRef = useRef(participants);
   useEffect(() => {
      phaseRef.current = phase;
      keywordRef.current = keyword;
      participantsRef.current = participants;
   }, [phase, keyword, participants]);

   useEffect(() => {
      let timer: number;
      if (phase === 'LOBBY' && timeLeft > 0) {
         timer = window.setInterval(() => setTimeLeft(prev => prev - 1), 1000);
      }
      return () => clearInterval(timer);
   }, [phase, timeLeft]);

   useEffect(() => {
      if (!channelConnected) return;
      const cleanup = chatService.onMessage((msg) => {
         if (phaseRef.current !== 'LOBBY') return;
         const lowerContent = msg.content.toLowerCase().trim();
         const rawContent = msg.content;
         const targetKeyword = keywordRef.current.toLowerCase().trim();
         const targetStickerId = STICKERS_IABS_MAPPING[targetKeyword];
         const isKeywordMatch = targetKeyword && lowerContent.includes(targetKeyword);
         const isStickerIdMatch = targetStickerId && rawContent.includes(targetStickerId);
         const isStickerTagMatch = targetStickerId && lowerContent.includes(`emote:${targetStickerId}:`);
         setRecentMessages(prev => [{
            user: msg.user.username,
            content: msg.content,
            color: msg.user.color
         }, ...prev].slice(0, 5));

         if (isKeywordMatch || isStickerIdMatch || isStickerTagMatch) {
            setParticipants(prev => {
               if (prev.find(p => p.username.toLowerCase() === msg.user.username.toLowerCase())) return prev;
               return [...prev, msg.user];
            });
         }
      });
      return cleanup;
   }, [channelConnected]);

   const fetchRealAvatar = async (username: string) => {
      try {
         // Try multiple proxies to bypass CORS and get user info
         const proxies = [
            `https://corsproxy.io/?${encodeURIComponent(`https://kick.com/api/v2/channels/${username}`)}`,
            `https://api.allorigins.win/get?url=${encodeURIComponent(`https://kick.com/api/v2/channels/${username}`)}`
         ];

         for (const url of proxies) {
            try {
               const res = await fetch(url);
               if (!res.ok) continue;
               const raw = await res.json();
               const data = url.includes('allorigins') ? JSON.parse(raw.contents) : raw;
               if (data?.user?.profile_pic) return data.user.profile_pic;
            } catch (e) { }
         }
      } catch (e) { }
      return null;
   };

   const startRaffle = () => {
      if (participants.length < 1) return;
      const winnerIndex = Math.floor(Math.random() * participants.length);
      const winUser = { ...participants[winnerIndex] };
      const reps = 15;
      const fullList = [];
      for (let i = 0; i < reps; i++) {
         fullList.push(...[...participants].sort(() => Math.random() - 0.5));
      }
      const targetRep = reps - 3;
      const targetIdxInRep = Math.floor(participants.length / 2);
      const finalTargetIdx = (targetRep * participants.length) + targetIdxInRep;
      fullList[finalTargetIdx] = winUser;

      setReelParticipants(fullList);
      setPhase('DRAWING');
      setIsSpinning(true);
      setWinner(null);
      setScrollPosition(0);

      const itemWidth = 400;
      const containerWidth = 1600;
      const centerOffset = (containerWidth / 2) - (itemWidth / 2);
      const finalScroll = (finalTargetIdx * itemWidth) - centerOffset;

      setTimeout(() => { setScrollPosition(-finalScroll); }, 100);

      setTimeout(async () => {
         // THE SECRET SAUCE: Fetch the REAL High-Res Avatar from Kick API right before revealing
         const realPic = await chatService.fetchKickAvatar(winUser.username);
         if (realPic) winUser.avatar = realPic;

         setWinner(winUser);
         setPhase('WINNER');
         setIsSpinning(false);

         confetti({
            particleCount: 500,
            spread: 120,
            origin: { y: 0.4 },
            colors: ['#ff0000', '#ffffff', '#ffd700', '#00ff00', '#ff00ff']
         });
         await leaderboardService.recordWin(winUser.username, winUser.avatar || '', 200);
      }, 11000);
   };

   const resetGame = () => {
      setPhase('SETUP');
      setParticipants([]);
      setWinner(null);
      setScrollPosition(0);
      setReelParticipants([]);
   };

   const selectedSticker = useMemo(() => {
      const s = STICKERS_IABS.find(x => x.name.toLowerCase().trim() === keyword.toLowerCase().trim());
      return s ? `https://files.kick.com/emotes/${s.id}/full` : null;
   }, [keyword]);

   return (
      <>
         <SidebarPortal>
            <div className="space-y-6 animate-in slide-in-from-right duration-500">
               {/* Control Panel */}
               <div className="glass-card p-8 rounded-[3rem] border-2 border-white/5 space-y-8 shadow-2xl relative overflow-hidden bg-black/80 backdrop-blur-3xl">
                  <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-red-600 via-white to-red-600 animate-shimmer"></div>
                  <div className="flex items-center justify-between">
                     <h4 className="text-[12px] font-black text-white uppercase tracking-widest flex items-center gap-3">
                        <Cpu size={16} className="text-red-600" /> مـنـظـومة الـسـحب
                     </h4>
                     <button onClick={resetGame} className="p-2.5 bg-white/5 hover:bg-white/10 rounded-2xl transition-all border border-white/5"><RotateCcw size={18} /></button>
                  </div>

                  {phase === 'SETUP' ? (
                     <div className="space-y-6">
                        <div className="space-y-4">
                           <label className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em]">كـلمة الـدخـول</label>
                           <div className="relative group">
                              <input
                                 value={keyword}
                                 onChange={e => setKeyword(e.target.value)}
                                 className="w-full bg-black/60 border-2 border-white/10 rounded-[2rem] py-6 px-10 text-white font-black text-2xl outline-none focus:border-red-600 transition-all shadow-[inset_0_4px_12px_rgba(0,0,0,1)] text-center italic"
                              />
                              <div className="absolute left-6 top-1/2 -translate-y-1/2 text-red-600 group-hover:scale-125 transition-transform">
                                 {selectedSticker ? <img src={selectedSticker} className="w-12 h-12 object-contain" /> : <Zap size={28} fill="currentColor" />}
                              </div>
                           </div>
                        </div>
                        <div className="space-y-4">
                           <label className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em]">الـمـدة الـزمـنية</label>
                           <div className="grid grid-cols-3 gap-3">
                              {[30, 60, 120].map(s => (
                                 <button key={s} onClick={() => setDuration(s)} className={`py-5 rounded-[1.5rem] text-[16px] font-black border-2 transition-all ${duration === s ? 'bg-red-600 border-red-600 text-white shadow-[0_0_20px_rgba(220,38,38,0.6)] scale-105' : 'bg-white/5 border-transparent text-gray-500 hover:text-white'}`}>{s}s</button>
                              ))}
                           </div>
                        </div>
                        <button onClick={() => { setTimeLeft(duration); setPhase('LOBBY'); }} className="w-full bg-white text-black font-black py-8 rounded-[2.5rem] text-sm hover:scale-[1.03] active:scale-95 transition-all italic border-t-8 border-red-600 shadow-[0_30px_60px_rgba(0,0,0,0.5)] uppercase tracking-widest">تـفـعـيل غـرفة الـسحب</button>
                     </div>
                  ) : (
                     <div className="space-y-6">
                        <div className="bg-gradient-to-br from-black to-zinc-900 border-2 border-red-600/50 p-8 rounded-[3rem] flex items-center justify-between shadow-2xl relative overflow-hidden">
                           <div className="absolute top-0 right-0 w-32 h-32 bg-red-600 blur-[80px] opacity-10"></div>
                           <div>
                              <p className="text-[10px] font-black text-red-600 uppercase mb-3 tracking-widest">مـفـتاح</p>
                              <p className="text-4xl font-black text-white italic drop-shadow-lg">{keyword}</p>
                           </div>
                           <div className="text-right">
                              <p className="text-[10px] font-black text-red-600 uppercase mb-3 tracking-widest">زمـن</p>
                              <p className="text-4xl font-black text-white font-mono">{timeLeft}s</p>
                           </div>
                        </div>

                        {phase === 'LOBBY' && (
                           <button
                              onClick={startRaffle}
                              disabled={participants.length === 0}
                              className="w-full bg-red-600 text-white font-black py-8 rounded-[2.5rem] text-sm shadow-[0_20px_60px_rgba(220,38,38,0.5)] hover:scale-105 transition-all flex items-center justify-center gap-6 border-t-2 border-white/20 disabled:opacity-20 relative overflow-hidden group"
                           >
                              <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                              <Rocket size={32} fill="currentColor" /> بـدء الـسحـب الـعـملاق
                           </button>
                        )}
                     </div>
                  )}
               </div>

               {/* Participants Stream */}
               <div className="glass-card rounded-[3.5rem] border-2 border-white/5 flex flex-col h-[450px] shadow-2xl relative overflow-hidden bg-black/60">
                  <div className="p-7 border-b-2 border-white/5 bg-white/5 flex justify-between items-center bg-gradient-to-l from-red-600/30 to-transparent">
                     <span className="text-[12px] font-black text-white uppercase tracking-[0.3em] flex items-center gap-3">
                        <Users size={20} className="text-red-600 animate-pulse" /> قـائمـة الأبطـال
                     </span>
                     <span className="bg-white text-red-600 px-6 py-2.5 rounded-[1.2rem] text-[20px] font-black italic shadow-2xl border-b-4 border-red-600">
                        {participants.length}
                     </span>
                  </div>
                  <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4">
                     {participants.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center opacity-10">
                           <Star size={80} className="mb-8 animate-spin-slow opacity-20" />
                           <p className="text-lg font-black tracking-[0.2em] uppercase italic text-center">بانتظار وصول <br />المنافسين...</p>
                        </div>
                     ) : (
                        [...participants].reverse().map((p, i) => (
                           <div key={i} className="flex items-center gap-6 p-5 rounded-[2.2rem] border-2 border-white/5 bg-gradient-to-r from-white/5 to-transparent hover:border-red-600/50 hover:from-white/10 transition-all animate-in slide-in-from-right duration-700 group">
                              <ProAvatar
                                 url={p.avatar}
                                 username={p.username}
                                 size="w-16 h-16"
                                 className="overflow-visible"
                              />
                              <div className="flex flex-col">
                                 <span className="text-sm font-black text-white group-hover:text-red-500 transition-colors">{p.username}</span>
                                 <span className="text-[8px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">Participant Verified</span>
                              </div>
                              <Sparkles size={20} className="text-amber-500 ml-auto opacity-0 group-hover:opacity-100 group-hover:scale-150 transition-all duration-500" />
                           </div>
                        ))
                     )}
                  </div>
               </div>
            </div>
         </SidebarPortal>

         <div className="w-full h-full flex flex-col items-center justify-center p-12 bg-transparent relative overflow-hidden select-none font-display text-white" dir="ltr">

            <div className="absolute inset-0 z-0 pointer-events-none">
               <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-red-600/50 to-transparent"></div>
               <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-red-600/50 to-transparent"></div>
               <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%] bg-[radial-gradient(circle,rgba(220,38,38,0.05)_0%,transparent_70%)] opacity-30"></div>
               <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>
            </div>

            {/* LOBBY / SETUP VIEW */}
            {(phase === 'SETUP' || phase === 'LOBBY') && (
               <div className="text-center animate-in zoom-in duration-1000 flex flex-col items-center z-10 w-full max-w-[90vw]">
                  <div className="relative mb-8 transform-gpu hover:scale-105 transition-all duration-700">
                     <div className="absolute inset-[-50px] bg-red-600 blur-[150px] opacity-30 animate-pulse"></div>
                     <div className="w-48 h-48 bg-gradient-to-br from-red-600 to-black rounded-[4rem] flex items-center justify-center shadow-[0_0_100px_rgba(255,0,0,0.8)] relative border-[10px] border-white/10 rotate-[15deg] group overflow-hidden">
                        <Gift size={100} className="text-white drop-shadow-[0_20px_40px_rgba(0,0,0,0.8)]" />
                     </div>
                  </div>

                  {phase === 'SETUP' ? (
                     <div className="space-y-12" dir="rtl">
                        <h1 className="text-[16rem] font-black text-white italic tracking-tighter uppercase leading-[0.8] drop-shadow-[0_40px_100px_rgba(220,38,38,0.5)] select-none">سـحـب بـريـمـيو</h1>
                        <div className="flex items-center justify-center gap-20">
                           <div className="h-2 w-56 bg-gradient-to-l from-transparent via-red-600 to-transparent shadow-[0_0_30px_red]"></div>
                           <p className="text-white font-black tracking-[1.8em] text-xl uppercase italic drop-shadow-[0_0_10px_white]">iABS GAMING ENGINE</p>
                           <div className="h-2 w-56 bg-gradient-to-r from-transparent via-red-600 to-transparent shadow-[0_0_30px_red]"></div>
                        </div>
                        <button
                           onClick={onHome}
                           className="mt-20 px-16 py-6 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-[2rem] border border-white/10 transition-all font-black text-xl italic flex items-center gap-4 uppercase tracking-widest"
                        >
                           <Home size={28} /> الـعودة للـقائمة
                        </button>
                     </div>
                  ) : (
                     <div className="flex flex-col items-center gap-10 w-full" dir="rtl">
                        <div className="text-[32rem] font-black text-white italic tracking-tighter leading-none font-mono drop-shadow-[0_0_180px_rgba(255,0,0,0.9)] transition-transform duration-500 hover:scale-105 select-none relative z-0">
                           {timeLeft}
                        </div>
                        <div className="relative z-10 transform -translate-y-12">
                           <div className="bg-white text-black px-32 py-10 rounded-[4rem] font-black italic text-[5rem] shadow-[0_40px_100px_rgba(0,0,0,0.8)] border-b-[20px] border-red-600 animate-float transition-all hover:rotate-[-2deg] select-none">
                              انـضـم لـنـا الان!
                           </div>
                        </div>
                        <div className="bg-[#050505]/95 backdrop-blur-3xl border-[6px] border-white/5 py-12 px-36 rounded-[6rem] shadow-[0_80px_150px_rgba(0,0,0,0.8)] flex flex-col items-center gap-6 relative overflow-hidden group mt-4">
                           <div className="absolute inset-0 bg-gradient-to-t from-red-600/10 via-transparent to-transparent"></div>
                           <div className="text-red-600 text-[2rem] font-black uppercase tracking-[1.5em] mb-6 animate-pulse z-10 italic">الـكـلمة الـمـفـتاحية</div>
                           <div className="flex items-center gap-15 relative z-10 transition-all duration-700 group-hover:scale-110">
                              <span className="text-[14rem] font-black text-white italic tracking-tighter drop-shadow-[0_20px_60px_rgba(255,255,255,0.2)] leading-none">{keyword}</span>
                              {selectedSticker && <img src={selectedSticker} className="w-56 h-56 object-contain animate-bounce drop-shadow-[0_0_60px_rgba(255,255,255,0.4)]" alt="s" />}
                           </div>
                        </div>

                        {/* Live Chat Overlay */}
                        <div className="fixed top-32 right-12 flex flex-col gap-4 w-96 pointer-events-none z-[100]">
                           {recentMessages.map((m, i) => (
                              <div key={i} className="bg-black/40 backdrop-blur-md border border-white/5 rounded-3xl p-5 animate-in slide-in-from-right duration-500 flex flex-col items-end shadow-2xl">
                                 <span className="text-xs font-black italic mb-2" style={{ color: m.color || '#ef4444' }}>{m.user}</span>
                                 <span className="text-xl font-bold text-white text-right leading-relaxed">{m.content}</span>
                              </div>
                           ))}
                        </div>

                        {/* Sleek Bottom HUD Bar */}
                        <div className="fixed bottom-0 inset-x-0 bg-gradient-to-t from-black via-black/80 to-transparent p-12 flex items-end justify-between z-[100] w-full">
                           <div className="flex gap-10">
                              <div className="glass-card bg-white/5 border border-white/10 px-12 py-6 rounded-[2.5rem] flex flex-col items-center shadow-2xl">
                                 <span className="text-xs text-gray-500 font-black uppercase mb-2">الـمشاركين</span>
                                 <span className="text-5xl font-black text-white font-mono">{participants.length}</span>
                              </div>
                              <div className="glass-card bg-white/5 border border-white/10 px-12 py-6 rounded-[2.5rem] flex flex-col items-center shadow-2xl">
                                 <span className="text-xs text-gray-500 font-black uppercase mb-2">مـفـتاح الـدخـول</span>
                                 <span className="text-4xl font-black text-red-600 italic">{keyword}</span>
                              </div>
                           </div>

                           <div className="flex gap-6">
                              <button onClick={onHome} className="bg-white/5 hover:bg-red-600 text-gray-400 hover:text-white px-12 py-7 rounded-[2.5rem] border border-white/10 transition-all font-black text-2xl italic flex items-center gap-4 shadow-2xl">
                                 <Home size={32} /> خـروج
                              </button>
                              <button onClick={resetGame} className="bg-white/5 hover:bg-white/10 text-white px-12 py-7 rounded-[2.5rem] border border-white/10 transition-all font-black text-2xl italic flex items-center gap-4 shadow-2xl">
                                 <RotateCcw size={32} /> إعادة وتصفير
                              </button>
                           </div>
                        </div>
                     </div>
                  )}
               </div>
            )}

            {/* DRAWING MODE */}
            {phase === 'DRAWING' && (
               <div className="w-full h-full flex flex-col items-center justify-center gap-24 animate-in fade-in duration-2000 z-10">
                  <div className="text-center relative">
                     <div className="absolute -inset-40 bg-red-600 blur-[200px] opacity-30 animate-pulse"></div>
                     <div className="flex items-center justify-center gap-8 mb-6">
                        <Flame size={40} className="text-red-500 animate-bounce" />
                        <div className="text-red-600 font-black uppercase tracking-[1.5em] text-[2.5rem] italic relative z-10 drop-shadow-[0_0_20px_red]">الـسـحـب الـعـظـيم</div>
                        <Flame size={40} className="text-red-500 animate-bounce" />
                     </div>
                     <h2 className="text-[10rem] font-black text-white italic tracking-tighter relative z-10 drop-shadow-[0_30px_100px_black] uppercase leading-none px-4">مـن سـيـحـمـل الـتـاج؟</h2>
                  </div>

                  {/* Live Chat Overlay during Spin */}
                  <div className="fixed top-32 right-12 flex flex-col gap-4 w-96 pointer-events-none z-[100]">
                     {recentMessages.map((m, i) => (
                        <div key={i} className="bg-black/40 backdrop-blur-md border border-white/5 rounded-3xl p-5 animate-in slide-in-from-right duration-500 flex flex-col items-end shadow-2xl">
                           <span className="text-xs font-black italic mb-2" style={{ color: m.color || '#ef4444' }}>{m.user}</span>
                           <span className="text-xl font-bold text-white text-right leading-relaxed">{m.content}</span>
                        </div>
                     ))}
                  </div>

                  <div className="relative w-full max-w-[1700px] h-[600px] flex items-center justify-center">
                     <div className="absolute inset-y-[-100px] w-[450px] left-1/2 -translate-x-1/2 z-[60] pointer-events-none">
                        <div className="absolute inset-x-0 h-full bg-gradient-to-b from-transparent via-red-600/30 to-transparent border-x-[10px] border-red-600 shadow-[0_0_150px_rgba(220,38,38,0.8)] animate-pulse rounded-full"></div>
                        <div className="absolute -top-12 left-1/2 -translate-x-1/2 flex flex-col items-center">
                           <div className="w-20 h-20 rounded-full bg-white shadow-[0_0_80px_white] z-50 flex items-center justify-center">
                              <div className="w-10 h-10 rounded-full bg-red-600 animate-ping"></div>
                           </div>
                           <div className="w-0 h-0 border-l-[60px] border-l-transparent border-r-[60px] border-r-transparent border-t-[100px] border-t-red-600 -translate-y-6 shadow-2xl"></div>
                        </div>
                        <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center">
                           <div className="w-0 h-0 border-l-[60px] border-l-transparent border-r-[60px] border-r-transparent border-b-[100px] border-b-red-600 translate-y-6 shadow-2xl"></div>
                           <div className="w-20 h-20 rounded-full bg-white shadow-[0_0_80px_white] z-50 flex items-center justify-center">
                              <div className="w-10 h-10 rounded-full bg-red-600 animate-ping"></div>
                           </div>
                        </div>
                     </div>

                     <div className="absolute inset-0 border-[40px] border-[#16161a] rounded-[8rem] shadow-[0_0_300px_rgba(0,0,0,1)] bg-[#030303] z-[10] overflow-hidden outline outline-[15px] outline-white/5 relative">
                        <div className="absolute inset-y-0 left-0 w-[500px] bg-gradient-to-r from-black via-black/95 to-transparent z-[25]"></div>
                        <div className="absolute inset-y-0 right-0 w-[500px] bg-gradient-to-l from-black via-black/95 to-transparent z-[25]"></div>
                        <div
                           className="h-full flex items-center"
                           style={{
                              transform: `translateX(${scrollPosition}px)`,
                              transition: isSpinning ? 'transform 10.5s cubic-bezier(0.05, 0, 0, 1)' : 'none'
                           }}
                        >
                           {reelParticipants.map((p, i) => (
                              <div key={i} className="w-[400px] h-[550px] shrink-0 p-10 flex items-center justify-center">
                                 <div className="w-full h-full bg-gradient-to-tr from-white/10 to-transparent border-[6px] border-white/10 rounded-[6rem] flex flex-col items-center justify-center gap-14 shadow-[inset_0_4px_30px_rgba(255,255,255,0.05)] relative group transition-all duration-700 hover:border-red-600">
                                    <ProAvatar
                                       url={p.avatar}
                                       username={p.username}
                                       size="w-64 h-64"
                                       className="overflow-visible"
                                    />
                                    <div className="text-5xl font-black text-white truncate max-w-[320px] italic drop-shadow-[0_10px_20px_black] tracking-tighter uppercase">{p.username}</div>
                                 </div>
                              </div>
                           ))}
                        </div>
                     </div>
                  </div>
               </div>
            )}

            {/* WINNER SCREEN - REAL PIC FETCHING */}
            {phase === 'WINNER' && winner && (
               <div className="text-center animate-in zoom-in-up duration-1000 z-50 p-10 flex flex-col items-center max-w-full">
                  <div className="relative mb-32 group">
                     <div className="absolute inset-[-100px] bg-red-600 blur-[250px] opacity-40 animate-pulse"></div>
                     <Trophy size={450} className="text-[#FFD700] animate-bounce drop-shadow-[0_0_200px_rgba(255,215,0,1)] relative z-10" fill="currentColor" />
                     <Crown size={180} className="absolute -top-15 left-1/2 -translate-x-1/2 text-white drop-shadow-[0_0_60px_white] animate-pulse z-20" />
                  </div>

                  <div className="bg-[#050505] p-40 rounded-[12rem] border-[20px] border-red-600 shadow-[0_0_400px_rgba(255,0,0,0.8)] relative overflow-hidden min-w-[1400px] max-w-full group">
                     <div className="absolute top-0 left-0 w-full h-8 bg-gradient-to-r from-transparent via-white/80 to-transparent animate-shimmer"></div>
                     <div className="absolute inset-0 bg-gradient-to-t from-red-600/10 via-transparent to-transparent"></div>

                     <div className="text-red-600 font-black uppercase tracking-[2em] text-[2.5rem] mb-24 italic flex items-center justify-center gap-24 drop-shadow-[0_0_10px_red]">
                        <span className="w-56 h-2 bg-red-600 shadow-[0_0_30px_red]"></span> الـبـطـل الأسـطـوري <span className="w-56 h-2 bg-red-600 shadow-[0_0_30px_red]"></span>
                     </div>

                     <div className="flex flex-col items-center gap-20 relative z-10">
                        {/* AVATAR BOX - FETCHED FROM KICK */}
                        <ProAvatar
                           url={winner.avatar}
                           username={winner.username}
                           size="w-[600px] h-[600px]"
                           className="overflow-visible"
                        />
                        <div className="text-[20rem] font-black text-white italic tracking-tighter uppercase drop-shadow-[0_60px_120px_black] leading-[0.7] mb-20 select-all">{winner.username}</div>
                     </div>

                     <div className="flex gap-24 justify-center mt-20 relative z-20" dir="rtl">
                        <button onClick={resetGame} className="px-36 py-12 bg-white text-black font-black text-6xl rounded-[5rem] hover:scale-110 active:scale-95 transition-all italic shadow-2xl flex items-center gap-12 border-b-[25px] border-gray-300">
                           <RotateCcw size={80} className="text-red-600" /> جـولة جـديـدة
                        </button>
                        <button onClick={onHome} className="px-36 py-12 bg-black/60 border-[10px] border-red-600 text-red-600 font-black text-6xl rounded-[5rem] hover:bg-red-600 hover:text-white transition-all italic shadow-2xl border-b-[25px] border-red-800">
                           <Home size={80} /> الرئيسية
                        </button>
                     </div>
                  </div>
               </div>
            )}
         </div>

         <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 14px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(220, 38, 38, 0.4); border-radius: 20px; border: 4px solid transparent; background-clip: content-box; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(220, 38, 38, 1); }

        @keyframes shimmer {
          0% { transform: translateX(-150%) skewX(-30deg); }
          100% { transform: translateX(150%) skewX(-30deg); }
        }
        .animate-shimmer { animation: shimmer 3s infinite linear; }
        
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-20px); }
        }
        .animate-float { animation: float 3s ease-in-out infinite; }
      `}</style>
      </>
   );
};
