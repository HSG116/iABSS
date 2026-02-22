
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { chatService } from '../services/chatService';
import { BOSS_DATA } from '../constants';
import { Skull, RotateCcw, Shield, Sword, Trophy, Zap, User } from 'lucide-react';
import { ProAvatar } from './ProAvatar';

interface BossRaidProps {
   channelConnected: boolean;
   isOBS?: boolean;
}

const SidebarPortal = ({ children }: { children?: React.ReactNode }) => {
   const [mounted, setMounted] = useState(false);
   useEffect(() => { setMounted(true); return () => setMounted(false); }, []);
   const el = document.getElementById('game-sidebar-portal');
   if (!mounted || !el) return null;
   return createPortal(children, el);
};

export const BossRaid: React.FC<BossRaidProps> = ({ channelConnected, isOBS }) => {
   const [hp, setHp] = useState(BOSS_DATA.initialHP);
   const [maxHp] = useState(BOSS_DATA.initialHP);
   const [isActive, setIsActive] = useState(false);
   const [damageLog, setDamageLog] = useState<{ user: string, dmg: number, id: number, x: number, y: number }[]>([]);
   const [mvpList, setMvpList] = useState<Record<string, { dmg: number, avatar?: string }>>({});
   const [isShielded, setIsShielded] = useState(false);
   const [shake, setShake] = useState(false);
   const [lastHitBy, setLastHitBy] = useState<string | null>(null);

   const isActiveRef = useRef(isActive);
   const isShieldedRef = useRef(isShielded);
   const hpRef = useRef(hp);

   useEffect(() => { isActiveRef.current = isActive; }, [isActive]);
   useEffect(() => { isShieldedRef.current = isShielded; }, [isShielded]);
   useEffect(() => { hpRef.current = hp; }, [hp]);

   useEffect(() => {
      if (!channelConnected) return;
      const cleanup = chatService.onMessage((msg) => {
         if (!isActiveRef.current || hpRef.current <= 0) return;

         const content = msg.content.trim().toLowerCase();
         // Commands: !attack, !هجوم, or sword emoji, or stickers
         const isAttack =
            content.includes('!attack') ||
            content.includes('!هجوم') ||
            content.includes('هجوم') ||
            content.includes('⚔️') ||
            content.includes('🗡️') ||
            content.includes('🔥') ||
            content === 'attack';

         if (isAttack) {
            if (isShieldedRef.current) {
               // Visualize block?
               return;
            }

            const dmg = 8 + Math.floor(Math.random() * 25); // 8-33 DMG

            setHp(prev => Math.max(0, prev - dmg));
            setShake(true);
            setLastHitBy(msg.user.username);
            setTimeout(() => setShake(false), 80);

            // Log visual damage with random spread
            const logId = Date.now() + Math.random();
            const xSpread = (Math.random() - 0.5) * 200;
            const ySpread = (Math.random() - 0.5) * 100;
            setDamageLog(prev => [...prev.slice(-8), { user: msg.user.username, dmg, id: logId, x: xSpread, y: ySpread }]);

            // Track MVP and fetch avatar if missing
            setMvpList(prev => {
               const current = prev[msg.user.username] || { dmg: 0 };
               return {
                  ...prev,
                  [msg.user.username]: { ...current, dmg: current.dmg + dmg }
               };
            });

            // Sync avatar if not present
            if (!mvpList[msg.user.username]?.avatar) {
               chatService.fetchKickAvatar(msg.user.username).then(avatar => {
                  if (avatar) {
                     setMvpList(prev => ({
                        ...prev,
                        [msg.user.username]: { ...prev[msg.user.username], avatar }
                     }));
                  }
               });
            }
         }
      });
      return cleanup;
   }, [channelConnected, mvpList]);

   const resetGame = () => {
      setHp(BOSS_DATA.initialHP);
      setDamageLog([]);
      setMvpList({});
      setIsActive(true);
      setIsShielded(false);
      setLastHitBy(null);
   };

   const toggleShield = () => setIsShielded(!isShielded);


   const sortedMvps = (Object.entries(mvpList) as [string, { dmg: number, avatar?: string }][])
      .sort((a, b) => b[1].dmg - a[1].dmg)
      .slice(0, 5);

   return (
      <>
         {!isOBS && (
            <SidebarPortal>
               <div className="glass-card p-5 rounded-[2rem] space-y-4 animate-in slide-in-from-right-4">
                  <div className="flex items-center justify-between border-b border-red-900/30 pb-3">
                     <h4 className="text-[10px] font-black text-white/50 uppercase tracking-widest flex items-center gap-2">
                        <Skull size={14} className="text-red-500 animate-pulse" /> BOSS CONSOLE
                     </h4>
                     {isActive && hp > 0 && <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping shadow-[0_0_10px_red]"></span>}
                  </div>

                  <div className="grid grid-cols-1 gap-3 pt-2">
                     <button
                        onClick={resetGame}
                        className="w-full bg-gradient-to-r from-red-700 to-red-900 hover:from-red-600 hover:to-red-800 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-95 shadow-[0_0_20px_rgba(220,38,38,0.4)] border border-red-500/30 uppercase tracking-wider text-sm"
                     >
                        <RotateCcw size={18} className="animate-spin-slow" /> {isActive ? 'RESET RAID' : 'SUMMON BOSS'}
                     </button>

                     <button
                        onClick={toggleShield}
                        disabled={!isActive || hp <= 0}
                        className={`w-full font-black py-4 rounded-2xl flex items-center justify-center gap-3 transition-all border-2 active:scale-95 uppercase tracking-wider text-sm ${isShielded ? 'bg-gradient-to-r from-blue-700 to-blue-900 border-blue-400 text-white shadow-[0_0_20px_rgba(59,130,246,0.5)]' : 'bg-black/50 border-white/10 text-gray-500 hover:text-white hover:border-white/30'}`}
                     >
                        <Shield size={18} /> {isShielded ? 'DISABLE SHIELD' : 'ACTIVATE SHIELD'}
                     </button>
                  </div>
               </div>

               <div className="glass-card rounded-[2rem] flex flex-col overflow-hidden h-[450px] mt-6">
                  <div className="p-5 border-b border-red-500/20 bg-gradient-to-r from-red-950/40 to-black/20">
                     <span className="text-xs font-black text-white flex items-center gap-2 uppercase tracking-widest">
                        <Trophy size={16} className="text-yellow-500 drop-shadow-[0_0_10px_yellow]" /> Top Damage Dealers
                     </span>
                  </div>
                  <div className="overflow-y-auto flex-1 p-4 space-y-3 custom-scrollbar">
                     {sortedMvps.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center opacity-30 italic text-sm text-gray-400 font-bold uppercase tracking-widest">
                           <Sword size={48} className="mb-4 text-red-500" />
                           NO DAMAGE YET
                        </div>
                     ) : sortedMvps.map(([name, data], i) => (
                        <div key={name} className="flex items-center justify-between p-4 rounded-2xl bg-black/60 border border-white/5 group hover:bg-red-950/40 hover:border-red-500/30 transition-all">
                           <div className="flex items-center gap-4">
                              <div className="relative">
                                 <ProAvatar
                                    url={data.avatar}
                                    username={name}
                                    size="w-12 h-12"
                                 />
                                 <div className={`absolute -top-2 -left-2 w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black shadow-lg border border-black ${i === 0 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-black shadow-[0_0_15px_yellow]' : 'bg-zinc-800 text-white'}`}>
                                    {i + 1}
                                 </div>
                              </div>
                              <span className="text-base font-black text-white group-hover:text-red-400 transition-colors truncate max-w-[100px]">{name}</span>
                           </div>
                           <div className="flex flex-col items-end">
                              <span className="text-sm font-black text-red-500 drop-shadow-[0_0_10px_rgba(239,68,68,0.8)]">{data.dmg}</span>
                              <span className="text-[9px] text-gray-500 uppercase font-black tracking-widest">DMG</span>
                           </div>
                        </div>
                     ))}
                  </div>
               </div>
            </SidebarPortal>
         )}

         <div className={`w-full h-full flex flex-col items-center justify-center p-6 relative overflow-hidden transition-all duration-75 ${shake ? 'scale-[0.98] -translate-x-2 translate-y-2 bg-red-900/30' : 'scale-100 rotate-0'}`}>

            {/* Atmospheric Effects */}
            <div className="absolute inset-0 pointer-events-none">
               <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-red-600/20 blur-[150px] rounded-full animate-pulse-glow"></div>
               {hp > 0 && hp < maxHp * 0.3 && (
                  <div className="absolute inset-0 bg-red-900/40 backdrop-sepia-[0.3] animate-pulse"></div>
               )}
            </div>

            {/* Boss Visual Area */}
            <div className="relative z-10 text-center flex flex-col items-center">
               {hp > 0 ? (
                  <div className="relative group">
                     {/* Floating Damage Numbers */}
                     {damageLog.map((log) => (
                        <div key={log.id}
                           className="absolute left-1/2 top-1/2 font-black text-white animate-out slide-out-to-top-32 fade-out duration-1000 pointer-events-none whitespace-nowrap z-50 flex flex-col items-center drop-shadow-[0_0_20px_rgba(220,38,38,1)]"
                           style={{
                              marginLeft: `${log.x}px`,
                              marginTop: `${log.y}px`,
                              fontSize: `${20 + (log.dmg / 2)}px`
                           }}
                        >
                           <span className="text-red-500 drop-shadow-[0_0_15px_rgba(239,68,68,0.8)]">-{log.dmg}</span>
                           <span className="text-[10px] text-white/50 bg-black/50 px-2 rounded-full mt-1 uppercase tracking-widest">{log.user}</span>
                        </div>
                     ))}

                     <div className={`text-[120px] md:text-[220px] leading-none transition-all duration-300 transform select-none
                     ${shake ? 'scale-110 blur-[2px]' : 'scale-100 hover:scale-105'} 
                     ${isShielded ? 'opacity-40 grayscale blur-sm' : 'opacity-100'} 
                     filter drop-shadow-[0_20px_50px_rgba(220,38,38,0.8)] animate-bounce-slow`
                     }>
                        {BOSS_DATA.image}
                     </div>

                     {isShielded && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                           <div className="w-[350px] h-[350px] rounded-full border-4 border-blue-500/80 flex items-center justify-center animate-spin-slow bg-blue-500/10 backdrop-blur-[2px] shadow-[0_0_50px_rgba(59,130,246,0.6)]">
                              <Shield size={250} className="text-blue-400 drop-shadow-[0_0_30px_rgba(59,130,246,1)] animate-pulse" />
                           </div>
                        </div>
                     )}

                     {/* Last Hit Indicator */}
                     {lastHitBy && (
                        <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 bg-gradient-to-r from-transparent via-red-950/80 to-transparent backdrop-blur-md px-6 py-2 border-y border-red-500/30 text-xs font-black text-white/60 animate-in fade-in slide-in-from-bottom-2 shadow-[0_0_30px_rgba(220,38,38,0.3)]">
                           LAST HIT BY: <span className="text-red-500 drop-shadow-[0_0_5px_red] ml-2">{lastHitBy}</span>
                        </div>
                     )}
                  </div>
               ) : (
                  <div className="animate-in zoom-in duration-700 flex flex-col items-center">
                     <div className="relative">
                        <div className="text-[200px] filter grayscale opacity-40">💀</div>
                        <div className="absolute inset-0 bg-red-600/40 blur-3xl rounded-full"></div>
                     </div>
                     <h1 className="text-7xl md:text-9xl font-black text-red-600 mt-6 red-neon-text italic tracking-tighter uppercase skew-x-[-10deg]">
                        DEFEATED
                     </h1>
                     <p className="mt-4 text-white/60 font-black tracking-[1em] uppercase text-sm border-b border-red-500/50 pb-2">The territory is safe</p>
                  </div>
               )}

               {/* Cinematic Health Bar */}
               {hp > 0 && (
                  <div className="glass-card w-[90vw] max-w-4xl mx-auto mt-24 p-8 rounded-[3rem] animate-in slide-in-from-bottom border-t-4 border-red-500/50 shadow-[0_0_80px_rgba(220,38,38,0.2)]">
                     <div className="flex justify-between items-end mb-4">
                        <div className="flex items-center gap-4">
                           <Zap size={28} className="text-red-500 animate-pulse drop-shadow-[0_0_15px_red]" />
                           <h2 className="text-4xl md:text-5xl font-black text-white italic tracking-tighter drop-shadow-[0_0_20px_rgba(255,255,255,0.3)] uppercase">{BOSS_DATA.name}</h2>
                        </div>
                        <div className="flex flex-col items-end">
                           <span className="text-3xl font-mono font-black text-red-500 drop-shadow-[0_0_15px_red]">{hp.toLocaleString()} HP</span>
                           <span className="text-sm text-red-400/80 font-black uppercase tracking-widest bg-red-950/40 px-3 py-1 rounded-full border border-red-500/30">{(hp / maxHp * 100).toFixed(1)}%</span>
                        </div>
                     </div>

                     <div className="h-8 bg-black/80 rounded-full p-1.5 border-2 border-white/10 relative overflow-hidden group shadow-[inset_0_0_20px_rgba(0,0,0,0.8)]">
                        <div
                           className={`h-full rounded-full transition-all duration-300 ease-out relative overflow-hidden
                                ${hp < maxHp * 0.2 ? 'bg-gradient-to-r from-red-600 via-red-500 to-red-600 animate-pulse' : 'bg-gradient-to-r from-red-900 via-red-600 to-orange-500'} neon-glow-red`}
                           style={{ width: `${(hp / maxHp) * 100}%` }}
                        >
                           {/* Cinematic Shine effect */}
                           <div className="absolute inset-0 bg-white/40 translate-x-[-150%] group-hover:translate-x-[150%] transition-transform duration-1000 skew-x-[-35deg] pointer-events-none"></div>
                           {/* Inner Top Glow */}
                           <div className="absolute top-0 left-0 w-full h-[30%] bg-gradient-to-b from-white/30 to-transparent"></div>
                        </div>
                     </div>

                     {/* Tick markers */}
                     <div className="flex justify-between px-4 mt-3 opacity-30">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => <div key={i} className="w-0.5 h-3 bg-red-500"></div>)}
                     </div>
                  </div>
               )}

               {hp > 0 && (
                  <div className="mt-10 flex flex-col items-center gap-5">
                     <div className="glass-card px-10 py-4 rounded-full border-t border-red-500/50 flex items-center gap-5 animate-pulse-glow hover:scale-105 transition-transform cursor-pointer">
                        <Sword size={24} className="text-red-500 drop-shadow-[0_0_10px_red]" />
                        <span className="text-white font-black text-xl tracking-wide">
                           اكتب <span className="text-red-500 px-1 underline decoration-2 drop-shadow-[0_0_8px_red]">هجوم</span> أو <span className="text-red-500 px-1 decoration-2 drop-shadow-[0_0_8px_red]">!attack</span> للقتال
                        </span>
                        <Sword size={24} className="text-red-500 scale-x-[-1] drop-shadow-[0_0_10px_red]" />
                     </div>
                     <div className="text-[10px] text-red-500/50 font-black uppercase tracking-[0.8em] flex items-center gap-2">
                        <span className="w-10 h-px bg-gradient-to-r from-transparent to-red-500/50"></span>
                        Battle in Progress
                        <span className="w-10 h-px bg-gradient-to-l from-transparent to-red-500/50"></span>
                     </div>
                  </div>
               )}
            </div>
         </div>
      </>
   );
};
