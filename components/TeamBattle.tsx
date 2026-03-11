
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { chatService } from '../services/chatService';
import { leaderboardService } from '../services/supabase';
import { Swords, RotateCcw, Trophy, LogOut } from 'lucide-react';
import { ProAvatar } from './ProAvatar';

interface TeamBattleProps {
   channelConnected: boolean;
   onHome: () => void;
}

const SidebarPortal = ({ children }: { children?: React.ReactNode }) => {
   const [mounted, setMounted] = useState(false);
   useEffect(() => { setMounted(true); return () => setMounted(false); }, []);
   const el = document.getElementById('game-sidebar-portal');
   if (!mounted || !el) return null;
   return createPortal(children, el);
};

export const TeamBattle: React.FC<TeamBattleProps> = ({ channelConnected, onHome }) => {
   const [isActive, setIsActive] = useState(false);
   const [score, setScore] = useState(50); // 0 = Red Wins, 100 = Green Wins, 50 = Tie
   const [winner, setWinner] = useState<'RED' | 'GREEN' | null>(null);
   const [contributors, setContributors] = useState<Record<string, { points: number, avatar?: string }>>({});

   const scoreRef = useRef(score);
   const isActiveRef = useRef(isActive);
   useEffect(() => { scoreRef.current = score; }, [score]);
   useEffect(() => { isActiveRef.current = isActive; }, [isActive]);

   useEffect(() => {
      if (!channelConnected) return;
      const cleanup = chatService.onMessage(async (msg) => {
         if (!isActiveRef.current) return;
         const content = msg.content.trim();
         const user = msg.user.username;

         // Green Team (Right)
         if (content === '!يمين' || content === '!right' || content === 'يمين') {
            setScore(prev => Math.min(100, prev + 2));
            setContributors(prev => ({ ...prev, [user]: { points: (prev[user]?.points || 0) + 1, avatar: msg.user.avatar } }));

            // Fetch real Kick avatar asynchronously
            chatService.fetchKickAvatar(user).then(avatar => {
               if (avatar) {
                  setContributors(current => ({
                     ...current,
                     [user]: { ...current[user], avatar }
                  }));
               }
            });
         }
         // Red Team (Left)
         else if (content === '!يسار' || content === '!left' || content === 'يسار') {
            setScore(prev => Math.max(0, prev - 2));
            setContributors(prev => ({ ...prev, [user]: { points: (prev[user]?.points || 0) + 1, avatar: msg.user.avatar } }));

            // Fetch real Kick avatar asynchronously
            chatService.fetchKickAvatar(user).then(avatar => {
               if (avatar) {
                  setContributors(current => ({
                     ...current,
                     [user]: { ...current[user], avatar }
                  }));
               }
            });
         }

         // Check Win Condition
         if (scoreRef.current >= 100 && !winner) {
            setWinner('GREEN');
            setIsActive(false);
            // تسجيل فوز لأفضل المساهمين في الفريق الأخضر (25 نقطة لكل مساهم)
            Object.entries(contributors).forEach(async ([u, data]) => {
               await leaderboardService.recordWin(u, (data as any).avatar || '', 25);
            });
         } else if (scoreRef.current <= 0 && !winner) {
            setWinner('RED');
            setIsActive(false);
            // تسجيل فوز لأفضل المساهمين في الفريق الأحمر
            Object.entries(contributors).forEach(async ([u, data]) => {
               await leaderboardService.recordWin(u, (data as any).avatar || '', 25);
            });
         }
      });
      return cleanup;
   }, [channelConnected, contributors, winner]);

   const resetGame = () => {
      setScore(50);
      setWinner(null);
      setContributors({});
      setIsActive(true);
   };

   return (
      <>
         <SidebarPortal>
            <div className="bg-[#141619] p-4 rounded-xl border border-white/5 space-y-3 animate-in slide-in-from-right-4">
               <div className="flex items-center justify-between mb-1">
                  <h4 className="text-xs font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                     <Swords size={12} /> تحكم المعركة
                  </h4>
                  <button onClick={onHome} className="p-1.5 bg-red-600/10 hover:bg-red-600/20 text-red-500 rounded-xl transition-all border border-red-500/20">
                     <LogOut size={14} />
                  </button>
               </div>
               <button
                  onClick={resetGame}
                  className="w-full bg-white/5 hover:bg-white/10 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 border border-white/5"
               >
                  <RotateCcw size={16} /> {isActive ? 'إعادة' : 'بدء معركة جديدة'}
               </button>
            </div>
         </SidebarPortal>

         <div className="w-full h-full flex flex-col items-center justify-center p-6 relative overflow-hidden">
            <div className="absolute inset-0 flex pointer-events-none opacity-20">
               <div className="w-1/2 h-full bg-red-900/40"></div>
               <div className="w-1/2 h-full bg-green-900/40"></div>
            </div>

            {!isActive && !winner ? (
               <div className="text-center z-10">
                  <Swords size={80} className="mx-auto mb-4 text-gray-500" />
                  <h2 className="text-5xl font-black text-white mb-2">حرب الفرق</h2>
                  <button onClick={resetGame} className="mt-6 px-8 py-3 bg-kick-green text-black font-black rounded-xl hover:scale-105 transition-transform">
                     ابدأ الحرب
                  </button>
               </div>
            ) : (
               <div className="w-full max-w-4xl z-10 flex flex-col items-center gap-10">
                  <div className="flex justify-between w-full text-2xl font-black uppercase tracking-widest">
                     <div className={`text-red-500 flex items-center gap-2 ${score < 50 ? 'scale-110' : 'opacity-50'}`}>Team Red {score < 50 && '🔥'}</div>
                     <div className={`text-green-500 flex items-center gap-2 ${score > 50 ? 'scale-110' : 'opacity-50'}`}>{score > 50 && '🔥'} Team Green</div>
                  </div>
                  <div className="w-full h-24 bg-[#1a1d21] rounded-full border-4 border-white/10 relative overflow-hidden shadow-2xl">
                     <div className="absolute left-1/2 top-0 bottom-0 w-1 bg-white/20 z-20"></div>
                     <div className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-red-600 via-transparent to-green-600 transition-all duration-300 ease-out" style={{ width: '100%' }}>
                        <div className="absolute top-0 bottom-0 w-4 bg-white shadow-[0_0_20px_white] z-30 transition-all duration-300 ease-linear" style={{ left: `${score}%` }}>
                           <div className="absolute -top-8 left-1/2 -translate-x-1/2 text-white font-bold">{score}%</div>
                        </div>
                        <div className="absolute inset-0 bg-red-600/50" style={{ width: `${score}%` }}></div>
                        <div className="absolute inset-0 bg-green-600/50 right-0 left-auto" style={{ width: `${100 - score}%` }}></div>
                     </div>
                  </div>
                  {winner && (
                     <div className="text-center animate-in zoom-in duration-500 mt-10">
                        <Trophy size={64} className={`mx-auto mb-4 ${winner === 'RED' ? 'text-red-500' : 'text-green-500'}`} />
                        <h1 className="text-6xl font-black text-white mb-8">{winner === 'RED' ? 'الفريق الأحمر فاز!' : 'الفريق الأخضر فاز!'}</h1>

                        <div className="flex flex-wrap justify-center gap-6">
                           {(Object.entries(contributors) as any)
                              .filter(([_, data]: any) => data.points > 0)
                              .sort((a: any, b: any) => b[1].points - a[1].points)
                              .slice(0, 5)
                              .map(([u, data]: any) => (
                                 <div key={u} className="flex flex-col items-center gap-2">
                                    <ProAvatar
                                       url={data.avatar}
                                       username={u}
                                       size="w-20 h-20"
                                       className={`border-2 overflow-visible ${winner === 'RED' ? 'border-red-500' : 'border-green-500'}`}
                                    />
                                    <span className="text-white text-xs font-bold">{u}</span>
                                    <span className="text-gray-500 text-[10px] font-mono">{data.points} pts</span>
                                 </div>
                              ))}
                        </div>
                     </div>
                  )}
               </div>
            )}
         </div>
      </>
   );
};
