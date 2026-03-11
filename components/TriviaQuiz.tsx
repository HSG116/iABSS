
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { chatService } from '../services/chatService';
import { leaderboardService } from '../services/supabase';
import { getQuestions, Question, QuestionCategory } from '../data/questions';
import { BrainCircuit, Play, RotateCcw, Trophy, Clock, CheckCircle, Eye, EyeOff, Trash2, User } from 'lucide-react';
import { ProAvatar } from './ProAvatar';

interface TriviaQuizProps {
   channelConnected: boolean;
}

const SidebarPortal = ({ children }: { children?: React.ReactNode }) => {
   const [mounted, setMounted] = useState(false);
   useEffect(() => { setMounted(true); return () => setMounted(false); }, []);
   const el = document.getElementById('game-sidebar-portal');
   if (!mounted || !el) return null;
   return createPortal(children, el);
};

export const TriviaQuiz: React.FC<TriviaQuizProps> = ({ channelConnected }) => {
   // Game States: SETUP -> PLAYING (Question) -> REVEAL -> END
   const [gameState, setGameState] = useState<'SETUP' | 'PLAYING' | 'REVEAL' | 'END'>('SETUP');

   // Config
   const [selectedCategory, setSelectedCategory] = useState<QuestionCategory | 'ALL'>('ALL');
   const [questionCount, setQuestionCount] = useState(10);
   const [showOptions, setShowOptions] = useState(true); // Toggle for Hard Mode

   // Live Game Data
   const [questions, setQuestions] = useState<Question[]>([]);
   const [currentIndex, setCurrentIndex] = useState(0);
   const [timer, setTimer] = useState(20);
   const [scores, setScores] = useState<Record<string, number>>({});
   const [roundWinnerAvatars, setRoundWinnerAvatars] = useState<Record<string, string>>({}); // User -> Avatar mapping
   const [attemptedUsers, setAttemptedUsers] = useState<Set<string>>(new Set()); // Track who attempted in MC mode

   // History to prevent repeats
   const [usedQuestionIds, setUsedQuestionIds] = useState<number[]>([]);

   // Refs
   const gameStateRef = useRef(gameState);
   const currentQRef = useRef<Question | null>(null);
   const roundWinnersRef = useRef<string[]>([]); // We still need the list for quick lookups
   const attemptedUsersRef = useRef<Set<string>>(new Set());
   const showOptionsRef = useRef(showOptions);

   useEffect(() => { gameStateRef.current = gameState; }, [gameState]);
   useEffect(() => {
      if (questions.length > 0) currentQRef.current = questions[currentIndex];
      else currentQRef.current = null;
   }, [questions, currentIndex]);
   useEffect(() => { roundWinnersRef.current = Object.keys(roundWinnerAvatars); }, [roundWinnerAvatars]);
   useEffect(() => { attemptedUsersRef.current = attemptedUsers; }, [attemptedUsers]);
   useEffect(() => { showOptionsRef.current = showOptions; }, [showOptions]);

   // Timer Logic
   useEffect(() => {
      let interval: number;
      if (gameState === 'PLAYING' && timer > 0) {
         interval = window.setInterval(() => {
            setTimer(prev => prev - 1);
         }, 1000);
      } else if (gameState === 'PLAYING' && timer === 0) {
         // Time's up -> Reveal
         setGameState('REVEAL');
         setTimeout(nextQuestion, 5000); // Show answer for 5s then next
      }
      return () => clearInterval(interval);
   }, [gameState, timer]);

   // Chat Listener
   useEffect(() => {
      if (!channelConnected) return;
      const cleanup = chatService.onMessage((msg) => {
         if (gameStateRef.current !== 'PLAYING' || !currentQRef.current) return;

         const content = msg.content.trim();
         const normalizedContent = content.toUpperCase().replace(/[إأآا]/g, 'ا');
         const user = msg.user.username;

         // If user already won this round, ignore
         if (roundWinnersRef.current.includes(user)) return;

         const q = currentQRef.current;
         const correctIndex = q.correctIndex;
         const correctText = q.options[correctIndex].replace(/[إأآا]/g, 'ا'); // Normalize correct answer

         let isCorrect = false;

         // MODE 1: Show Options (Standard) - Check numbers - SINGLE ATTEMPT ONLY
         if (showOptionsRef.current) {
            // If user already attempted an answer (right or wrong), ignore subsequent messages
            if (attemptedUsersRef.current.has(user)) return;

            let answerIndex = -1;
            if (['1', '!1', 'أ', 'A'].includes(normalizedContent)) answerIndex = 0;
            if (['2', '!2', 'ب', 'B'].includes(normalizedContent)) answerIndex = 1;
            if (['3', '!3', 'ج', 'C'].includes(normalizedContent)) answerIndex = 2;
            if (['4', '!4', 'د', 'D'].includes(normalizedContent)) answerIndex = 3;

            // Only register if it's a valid vote command
            if (answerIndex !== -1) {
               // Mark user as attempted immediately
               setAttemptedUsers(prev => new Set(prev).add(user));

               if (answerIndex === correctIndex) {
                  isCorrect = true;
               }
            }
         }
         // MODE 2: Hide Options (Hard) - Check Text - UNLIMITED ATTEMPTS
         else {
            // Check if message *contains* the correct answer text
            if (normalizedContent.includes(correctText)) {
               isCorrect = true;
            }
         }

         if (isCorrect) {
            // Add to round winners mapping
            setRoundWinnerAvatars(prev => ({ ...prev, [user]: msg.user.avatar || '' }));
            roundWinnersRef.current = [...roundWinnersRef.current, user];

            // Fetch high-res avatar in background
            chatService.fetchKickAvatar(user).then(realPic => {
               if (realPic) {
                  setRoundWinnerAvatars(prev => ({ ...prev, [user]: realPic }));
               }
            });

            // Add Score (Speed Bonus: More time left = more points)
            const basePoints = showOptionsRef.current ? 10 : 20;
            const timeBonus = Math.ceil(timer / 2);
            const points = basePoints + timeBonus;

            setScores(prev => ({
               ...prev,
               [user]: (prev[user] || 0) + points
            }));

            // Global Leaderboard
            leaderboardService.recordWin(user, msg.user.avatar || '', points);
         }
      });
      return cleanup;
   }, [channelConnected, timer]);

   const startGame = () => {
      // Get unique questions
      const qs = getQuestions(selectedCategory, questionCount, usedQuestionIds);

      if (qs.length === 0) {
         alert("انتهت الأسئلة في هذا القسم! يرجى مسح السجل.");
         return;
      }

      // Mark new questions as used
      const newIds = qs.map(q => q.id);
      setUsedQuestionIds(prev => [...prev, ...newIds]);

      setQuestions(qs);
      setScores({});
      setCurrentIndex(0);
      startRound();
   };

   const startRound = () => {
      setRoundWinnerAvatars({});
      roundWinnersRef.current = [];
      setAttemptedUsers(new Set()); // Reset attempts for new round
      setTimer(showOptions ? 20 : 30); // More time for hard mode
      setGameState('PLAYING');
   };

   const nextQuestion = () => {
      if (currentIndex + 1 >= questions.length) {
         setGameState('END');
      } else {
         setCurrentIndex(prev => prev + 1);
         startRound();
      }
   };

   const resetGame = () => {
      setGameState('SETUP');
      setQuestions([]);
      setScores({});
   };

   const clearHistory = () => {
      setUsedQuestionIds([]);
      alert("تم مسح سجل الأسئلة المستخدمة.");
   };

   const sortedScores = Object.entries(scores).sort((a, b) => (b[1] as number) - (a[1] as number));
   const currentQuestion = questions[currentIndex];

   // Helper for option letters
   const getArabicLetter = (i: number) => ['1', '2', '3', '4'][i];

   return (
      <>
         <SidebarPortal>
            <div className="bg-[#141619] p-4 rounded-xl border border-white/5 space-y-4 animate-in slide-in-from-right-4">
               <h4 className="text-xs font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                  <BrainCircuit size={12} /> تحكم المسابقة
               </h4>

               {gameState === 'SETUP' && (
                  <div className="space-y-3">
                     <div>
                        <label className="text-xs text-gray-400 block mb-1">القسم</label>
                        <select
                           value={selectedCategory}
                           onChange={(e) => setSelectedCategory(e.target.value as any)}
                           className="w-full bg-[#0b0e0f] border border-white/10 rounded px-2 py-1 text-sm text-white"
                        >
                           <option value="ALL">منوع (All)</option>
                           <option value="GENERAL">معلومات عامة</option>
                           <option value="HISTORY">تاريخ وجغرافيا</option>
                           <option value="SCIENCE">علوم وتكنولوجيا</option>
                           <option value="SPORTS">رياضة</option>
                           <option value="ISLAMIC">إسلامية وثقافة</option>
                        </select>
                     </div>
                     <div>
                        <label className="text-xs text-gray-400 block mb-1">عدد الأسئلة</label>
                        <select
                           value={questionCount}
                           onChange={(e) => setQuestionCount(Number(e.target.value))}
                           className="w-full bg-[#0b0e0f] border border-white/10 rounded px-2 py-1 text-sm text-white"
                        >
                           <option value={5}>5 أسئلة</option>
                           <option value={10}>10 أسئلة</option>
                           <option value={15}>15 سؤال</option>
                           <option value={20}>20 سؤال</option>
                        </select>
                     </div>

                     <button
                        onClick={() => setShowOptions(!showOptions)}
                        className={`w-full py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-between border ${showOptions ? 'bg-green-900/20 border-green-500/50 text-green-400' : 'bg-red-900/20 border-red-500/50 text-red-400'}`}
                     >
                        <span className="flex items-center gap-2">
                           {showOptions ? <Eye size={14} /> : <EyeOff size={14} />}
                           {showOptions ? 'إظهار الخيارات' : 'إخفاء (وضع صعب)'}
                        </span>
                        <div className={`w-8 h-4 rounded-full relative transition-colors ${showOptions ? 'bg-green-500' : 'bg-gray-600'}`}>
                           <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${showOptions ? 'right-0.5' : 'left-0.5'}`}></div>
                        </div>
                     </button>

                     <button onClick={startGame} className="w-full bg-indigo-600 text-white font-bold py-2 rounded-lg hover:bg-indigo-500 transition-all">
                        <Play size={14} className="inline mr-2" /> بدء المسابقة
                     </button>

                     <div className="pt-2 border-t border-white/5">
                        <div className="flex justify-between items-center text-[10px] text-gray-500 mb-1">
                           <span>الأسئلة المستخدمة: {usedQuestionIds.length}</span>
                        </div>
                        <button onClick={clearHistory} className="w-full bg-white/5 hover:bg-red-500/20 text-gray-400 hover:text-red-400 py-1.5 rounded text-[10px] flex items-center justify-center gap-1 transition-colors">
                           <Trash2 size={10} /> مسح سجل الأسئلة
                        </button>
                     </div>
                  </div>
               )}

               {(gameState === 'PLAYING' || gameState === 'REVEAL') && (
                  <div className="bg-white/5 p-3 rounded-lg text-center">
                     <div className="text-xs text-gray-400">السؤال</div>
                     <div className="text-xl font-black text-white">{currentIndex + 1} / {questions.length}</div>
                  </div>
               )}

               <button onClick={resetGame} className="w-full bg-white/5 py-2 rounded-lg text-xs text-gray-400">
                  <RotateCcw size={12} className="inline mr-1" /> إعادة ضبط
               </button>
            </div>

            <div className="bg-[#141619] rounded-xl border border-white/5 flex flex-col overflow-hidden h-[300px] mt-3">
               <div className="p-3 border-b border-white/5 bg-[#0b0e0f] text-xs font-bold text-gray-400">
                  لوحة الصدارة
               </div>
                <div className="overflow-y-auto flex-1 p-2 space-y-2 custom-scrollbar">
                   {sortedScores.map(([user, score], i) => (
                      <div key={user} className="flex justify-between p-2 bg-white/5 rounded-xl border border-white/5 items-center">
                         <div className="flex items-center gap-2">
                            <span className={`w-4 text-center font-bold ${i === 0 ? 'text-yellow-500' : 'text-gray-400'}`}>{i + 1}</span>
                            <ProAvatar username={user} size="w-10 h-10" />
                            <span className="text-gray-200 font-bold truncate max-w-[80px]">{user}</span>
                         </div>
                         <span className="font-mono text-kick-green font-black">{score}</span>
                      </div>
                   ))}
                </div>
            </div>
         </SidebarPortal>

         <div className="w-full h-full flex flex-col items-center justify-center p-6 relative overflow-hidden bg-[#0b0e0f]">
            {/* Background Decor */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-indigo-900/20 via-[#0b0e0f] to-[#0b0e0f] pointer-events-none"></div>

            {gameState === 'SETUP' && (
               <div className="text-center opacity-70 animate-in zoom-in">
                  <BrainCircuit size={100} className="mx-auto text-indigo-500 mb-6" />
                  <h1 className="text-5xl font-black text-white mb-2">مسابقة المعلومات</h1>
                  <p className="text-xl text-gray-400">أثبت ثقافتك وسرعتك!</p>
               </div>
            )}

            {(gameState === 'PLAYING' || gameState === 'REVEAL') && currentQuestion && (
               <div className="w-full max-w-4xl z-10 flex flex-col gap-6">

                  {/* Question Card */}
                  <div className="bg-[#141619] border border-indigo-500/30 p-8 rounded-3xl shadow-[0_0_40px_rgba(99,102,241,0.15)] relative overflow-hidden">
                     {/* Timer Bar */}
                     <div className="absolute top-0 left-0 w-full h-2 bg-gray-800">
                        <div
                           className={`h-full transition-all duration-1000 linear ${timer < 5 ? 'bg-red-500' : 'bg-indigo-500'}`}
                           style={{ width: `${(timer / (showOptions ? 20 : 30)) * 100}%` }}
                        ></div>
                     </div>

                     <div className="flex justify-between items-start mb-6">
                        <span className="bg-indigo-500/10 text-indigo-400 px-3 py-1 rounded-full text-xs font-bold border border-indigo-500/20">
                           {currentQuestion.category}
                        </span>
                        <div className="flex items-center gap-2 text-gray-400 font-mono">
                           <Clock size={16} /> {timer}s
                        </div>
                     </div>

                     <h2 className="text-2xl md:text-4xl font-black text-white leading-relaxed text-center dir-rtl">
                        {currentQuestion.text}
                     </h2>

                     {!showOptions && gameState === 'PLAYING' && (
                        <div className="mt-8 text-center animate-pulse">
                           <p className="text-red-400 font-bold bg-red-500/10 inline-block px-4 py-2 rounded-lg border border-red-500/20">
                              الخيارات مخفية! اكتب الإجابة في الشات
                           </p>
                           <p className="text-xs text-gray-500 mt-2">
                              (مسموح بأكثر من محاولة)
                           </p>
                        </div>
                     )}

                     {showOptions && gameState === 'PLAYING' && (
                        <div className="mt-8 text-center">
                           <p className="text-xs text-gray-500">
                              مسموح بإجابة واحدة فقط لكل شخص
                           </p>
                        </div>
                     )}
                  </div>

                  {/* Options Grid (Hidden if ShowOptions=false until REVEAL) */}
                  {(showOptions || gameState === 'REVEAL') && (
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {currentQuestion.options.map((opt, idx) => {
                           const isRevealed = gameState === 'REVEAL';
                           const isCorrect = idx === currentQuestion.correctIndex;

                           let bgClass = "bg-[#1a1d21] hover:bg-[#25282e] border-white/5";
                           if (isRevealed) {
                              if (isCorrect) bgClass = "bg-green-600 border-green-400 shadow-[0_0_20px_rgba(22,163,74,0.4)] scale-105";
                              else bgClass = "bg-[#1a1d21] opacity-50";
                           }

                           return (
                              <div
                                 key={idx}
                                 className={`
                                    p-4 rounded-xl border-2 transition-all duration-300 flex items-center gap-4
                                    ${bgClass}
                                 `}
                              >
                                 <div className={`
                                    w-10 h-10 rounded-lg flex items-center justify-center font-black text-lg shrink-0
                                    ${isRevealed && isCorrect ? 'bg-white text-green-600' : 'bg-white/10 text-white'}
                                 `}>
                                    {getArabicLetter(idx)}
                                 </div>
                                 <div className="text-lg md:text-xl font-bold text-gray-200">
                                    {opt}
                                 </div>
                                 {isRevealed && isCorrect && <CheckCircle className="mr-auto text-white" />}
                              </div>
                           )
                        })}
                     </div>
                  )}

                  {gameState === 'REVEAL' && Object.keys(roundWinnerAvatars).length > 0 && (
                     <div className="flex flex-col items-center gap-4 animate-in slide-in-from-bottom-4">
                         <div className="flex -space-x-3">
                            {Object.entries(roundWinnerAvatars).slice(0, 6).map(([u, av], i) => (
                               <ProAvatar
                                  key={i}
                                  url={av}
                                  username={u}
                                  size="w-16 h-16"
                               />
                            ))}
                            {Object.keys(roundWinnerAvatars).length > 6 && (
                               <div className="w-16 h-16 rounded-full border-2 border-indigo-500 bg-indigo-900 text-white flex items-center justify-center font-bold text-xs shadow-lg relative z-10">
                                  +{Object.keys(roundWinnerAvatars).length - 6}
                               </div>
                            )}
                         </div>
                        <span className="text-green-400 font-bold text-sm bg-green-900/20 px-4 py-2 rounded-full border border-green-500/20">
                           {Object.keys(roundWinnerAvatars).length} لاعبين أجابوا بشكل صحيح!
                        </span>
                     </div>
                  )}
               </div>
            )}

            {gameState === 'END' && (
               <div className="text-center animate-in zoom-in duration-500">
                  <Trophy size={100} className="mx-auto text-yellow-400 mb-6 animate-bounce" />
                  <h1 className="text-5xl font-black text-white mb-8">نتائج المسابقة</h1>

                   <div className="flex flex-col gap-4 w-full max-w-md mx-auto">
                      {sortedScores.slice(0, 3).map((p, i) => (
                         <div key={i} className={`flex items-center justify-between p-4 rounded-2xl border ${i === 0 ? 'bg-yellow-500/10 border-yellow-500 text-yellow-500 shadow-[0_0_30px_rgba(234,179,8,0.2)]' : 'bg-[#141619] border-white/10 text-gray-300'}`}>
                            <div className="flex items-center gap-4">
                               <div className="text-2xl font-black">#{i + 1}</div>
                               <ProAvatar username={p[0]} size={i === 0 ? "w-20 h-20" : "w-14 h-14"} />
                               <div className="text-xl font-bold">{p[0]}</div>
                            </div>
                            <div className="text-xl font-mono font-black">{p[1]} pts</div>
                         </div>
                      ))}
                   </div>

                  <button onClick={resetGame} className="mt-8 px-8 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-500">
                     مسابقة جديدة
                  </button>
               </div>
            )}
         </div>
      </>
   );
};
