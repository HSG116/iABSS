
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
               <div className="bg-[#0a0a0c]/90 backdrop-blur-md p-5 rounded-[2rem] border border-white/10 space-y-4 animate-in slide-in-from-right-4 shadow-2xl">
                  <div className="flex items-center justify-between">
                     <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                        <Skull size={12} className="text-red-500" /> BOSS CONSOLE
                     </h4>
                     {isActive && hp > 0 && <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>}
                  </div>

                  <div className="grid grid-cols-1 gap-2">
                     <button
                        onClick={resetGame}
                        className="w-full bg-red-600 hover:bg-red-500 text-white font-black py-3 rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-95 shadow-lg shadow-red-900/20"
                     >
                        <RotateCcw size={18} /> {isActive ? 'RESET RAID' : 'SUMMON BOSS'}
                     </button>

                     <button
                        onClick={toggleShield}
                        disabled={!isActive || hp <= 0}
                        className={`w-full font-black py-3 rounded-2xl flex items-center justify-center gap-3 transition-all border-2 active:scale-95 ${isShielded ? 'bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-900/30' : 'bg-white/5 border-white/5 text-gray-400 hover:bg-white/10'}`}
                     >
                        <Shield size={18} /> {isShielded ? 'DISABLE SHIELD' : 'ACTIVATE SHIELD'}
                     </button>
                  </div>
               </div>

               <div className="bg-[#0a0a0c]/90 backdrop-blur-md rounded-[2rem] border border-white/10 flex flex-col overflow-hidden h-[400px] mt-4 shadow-2xl">
                  <div className="p-4 border-b border-white/5 bg-gradient-to-r from-red-600/20 to-transparent">
                     <span className="text-[10px] font-black text-white flex items-center gap-2 uppercase tracking-tighter">
                        <Trophy size={14} className="text-yellow-500" /> Top Damage Dealers
                     </span>
                  </div>
                  <div className="overflow-y-auto flex-1 p-3 space-y-2 custom-scrollbar">
                     {sortedMvps.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center opacity-20 italic text-xs grayscale">
                           <Sword size={40} className="mb-2" />
                           NO DAMAGE YET
                        </div>
                     ) : sortedMvps.map(([name, data], i) => (
                        <div key={name} className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/5 group hover:bg-white/10 transition-all">
                           <div className="flex items-center gap-3">
                              <div className="relative">
                                 <ProAvatar
                                    url={data.avatar}
                                    username={name}
                                    size="w-12 h-12"
                                 />
                                 <div className={`absolute -top-2 -left-2 w-5 h-5 rounded-lg flex items-center justify-center text-[10px] font-black shadow-lg ${i === 0 ? 'bg-yellow-500 text-black' : 'bg-zinc-800 text-white'}`}>
                                    {i + 1}
                                 </div>
                              </div>
                              <span className="text-sm font-black text-white group-hover:text-red-400 transition-colors truncate w-24">{name}</span>
                           </div>
                           <div className="flex flex-col items-end">
                              <span className="text-xs font-black text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.4)]">{data.dmg}</span>
                              <span className="text-[8px] text-gray-500 uppercase font-bold">DMG</span>
                           </div>
                        </div>
                     ))}
                  </div>
               </div>
            </SidebarPortal>
         )}

         <div className={`w-full h-full flex flex-col items-center justify-center p-6 relative overflow-hidden transition-all duration-75 ${shake ? 'scale-98 rotate-1 bg-red-900/10' : 'scale-100 rotate-0'}`}>

            {/* Atmospheric Effects */}
            <div className="absolute inset-0 pointer-events-none">
               <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-red-600/10 blur-[150px] rounded-full animate-pulse"></div>
               {hp > 0 && hp < maxHp * 0.3 && (
                  <div className="absolute inset-0 bg-red-900/20 backdrop-sepia-[0.2] animate-pulse"></div>
               )}
            </div>

            {/* Boss Visual Area */}
            <div className="relative z-10 text-center flex flex-col items-center">
               {hp > 0 ? (
                  <div className="relative group">
                     {/* Floating Damage Numbers */}
                     {damageLog.map((log) => (
                        <div key={log.id}
                           className="absolute left-1/2 top-1/2 font-black text-red-500 animate-out slide-out-to-top fade-out duration-1000 pointer-events-none whitespace-nowrap z-50 flex flex-col items-center"
                           style={{
                              marginLeft: `${log.x}px`,
                              marginTop: `${log.y}px`,
                              fontSize: `${20 + (log.dmg / 2)}px`
                           }}
                        >
                           <span className="drop-shadow-[0_0_15px_rgba(239,68,68,0.8)]">-{log.dmg}</span>
                           <span className="text-[10px] text-white/40 uppercase tracking-widest">{log.user}</span>
                        </div>
                     ))}

                     <div className={`text-[180px] md:text-[300px] leading-none transition-all duration-300 transform select-none
                     ${shake ? 'scale-110 blur-[1px]' : 'scale-100 hover:scale-105'} 
                     ${isShielded ? 'opacity-40 grayscale blur-sm' : 'opacity-100'} 
                     filter drop-shadow-[0_0_60px_rgba(220,38,38,0.6)] animate-float`
                     }>
                        {BOSS_DATA.image}
                     </div>

                     {isShielded && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                           <div className="w-[350px] h-[350px] rounded-full border-4 border-blue-500/50 flex items-center justify-center animate-spin-slow">
                              <Shield size={200} className="text-blue-500/80 drop-shadow-[0_0_30px_rgba(59,130,246,0.8)]" />
                           </div>
                           <div className="absolute inset-0 bg-blue-500/10 rounded-full blur-2xl animate-pulse"></div>
                        </div>
                     )}

                     {/* Last Hit Indicator */}
                     {lastHitBy && (
                        <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-md px-4 py-1 rounded-full border border-white/10 text-[10px] font-bold text-white/60 animate-in fade-in slide-in-from-bottom-2">
                           LAST HIT BY: <span className="text-red-400">{lastHitBy}</span>
                        </div>
                     )}
                  </div>
               ) : (
                  <div className="animate-in zoom-in duration-700 flex flex-col items-center">
                     {sortedMvps[0] && (
                        <div className="mb-8 relative z-10">
                           <div className="absolute -inset-4 bg-red-600/20 blur-2xl rounded-full animate-pulse" />
                           <ProAvatar
                              url={sortedMvps[0][1].avatar}
                              username={sortedMvps[0][0]}
                              size="w-40 h-40"
                              className="shadow-[0_0_50px_rgba(239,68,68,0.5)] transition-transform hover:scale-110"
                           />
                           <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-yellow-500 text-black px-6 py-1 rounded-xl font-black text-sm shadow-xl italic whitespace-nowrap z-20">MVP: {sortedMvps[0][0]}</div>
                        </div>
                     )}
                     <div className="relative">
                        <div className="text-[180px] filter grayscale opacity-40">💀</div>
                        <div className="absolute inset-0 bg-red-600/20 blur-3xl rounded-full"></div>
                     </div>
                     <h1 className="text-7xl md:text-9xl font-black text-red-600 mt-6 red-neon-text italic tracking-tighter uppercase skew-x-[-10deg]">
                        DEFEATED
                     </h1>
                     <p className="mt-4 text-white/40 font-black tracking-[1em] uppercase text-xs">The territory is safe</p>
                  </div>
               )}

               {/* Cinematic Health Bar */}
               {hp > 0 && (
                  <div className="w-[90vw] max-w-4xl mx-auto mt-20 relative px-10">
                     <div className="absolute -top-10 left-10 flex items-center gap-2 text-white/40 font-black uppercase tracking-widest text-[10px]">
                        <Zap size={12} className="text-yellow-500" /> Raid Boss Health
                     </div>

                     <div className="flex justify-between items-end mb-3">
                        <h2 className="text-5xl font-black text-white italic tracking-tighter drop-shadow-lg uppercase">{BOSS_DATA.name}</h2>
                        <div className="flex flex-col items-end">
                           <span className="text-2xl font-mono font-black text-red-500">{hp.toLocaleString()} HP</span>
                           <span className="text-[10px] text-white/30 font-bold uppercase">{(hp / maxHp * 100).toFixed(1)}%</span>
                        </div>
                     </div>

                     <div className="h-6 bg-black/60 rounded-full p-1 border-2 border-white/10 relative overflow-hidden group shadow-[0_0_50px_rgba(0,0,0,0.5)]">
                        <div
                           className={`h-full rounded-full transition-all duration-300 ease-out relative overflow-hidden
                                ${hp < maxHp * 0.2 ? 'bg-gradient-to-r from-red-600 via-red-500 to-red-600 animate-pulse' : 'bg-gradient-to-r from-red-800 via-red-600 to-orange-500'}`}
                           style={{ width: `${(hp / maxHp) * 100}%` }}
                        >
                           {/* Shine effect */}
                           <div className="absolute inset-0 bg-white/30 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 skew-x-[-45deg] pointer-events-none"></div>
                           {/* Glow */}
                           <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent"></div>
                        </div>
                     </div>

                     {/* Tick markers */}
                     <div className="flex justify-between px-2 mt-2 opacity-20">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => <div key={i} className="w-[1px] h-2 bg-white"></div>)}
                     </div>
                  </div>
               )}

               {hp > 0 && (
                  <div className="mt-12 flex flex-col items-center gap-4">
                     <div className="px-8 py-3 bg-white/5 backdrop-blur-md rounded-full border border-white/10 flex items-center gap-4 animate-bounce">
                        <Sword size={20} className="text-red-500" />
                        <span className="text-white font-black text-xl tracking-tight">
                           اكتب <span className="text-red-500 px-1 underline decoration-2">هجوم</span> أو <span className="text-red-500 px-1 decoration-2">!attack</span> للقتال
                        </span>
                        <Sword size={20} className="text-red-500 scale-x-[-1]" />
                     </div>
                     <div className="text-[10px] text-white/20 font-bold uppercase tracking-[0.5em]">Battle in Progress</div>
                  </div>
               )}
            </div>
         </div>
      </>
   );
};
