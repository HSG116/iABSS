
import React, { useState, useEffect, useRef } from 'react';
import { Settings, Play, Music, Users, Armchair, Skull, Trophy, Clock, Volume2, ChevronLeft, User, Trash2, Sparkles, CheckCircle2, Loader2, Gauge, Zap, Ghost, Target, FastForward, Map as MapIcon, LogOut, Home, Check } from 'lucide-react';
import { ChatUser } from '../types';
import { chatService } from '../services/chatService';
import { SONGS_DB } from '../constants';
import { ARENA_MAPS, ArenaMap } from '../data/maps';
import { leaderboardService } from '../services/supabase';
import { ProAvatar } from './ProAvatar';

interface MusicalChairsGameProps {
   onHome: () => void;
   isOBS?: boolean;
}

type Difficulty = 'EASY' | 'MEDIUM' | 'HARD' | 'RANDOM';

interface GameConfig {
   joinKeyword: string;
   maxPlayers: number;
   musicDuration: number;
   selectionDuration: number;
   volume: number;
   hideNumbers: boolean;
   selectedSongs: string[];
   selectedMap: ArenaMap;
   autoProgress: boolean;
   eliminationCount: number;
   difficulty: Difficulty;
   neonGlow: boolean;
   fastResults: boolean;
   luckyChair: boolean;
   ghostMode: boolean;
}

type GamePhase = 'SETUP' | 'LOBBY' | 'ROUND_START' | 'MUSIC_ON' | 'MUSIC_OFF' | 'RESULTS' | 'DRAW' | 'FINALE';

const STICKERS_IABS_MAPPING: Record<string, string | null> = {
   'iabs324244': '3544675',
   'iabsdance': '4428507',
   'iabsddddddd': '3109207',
   'iabshhhh': '3689146',
   'iabsKSA1': '2942650',
   'iabst79eer': '4338825',
   'iabst7yyhhh': '3989626',
   'iabsw6nn': '4428504',
   'iabs235235': '3329508',
   'iabs3': '1014969',
   'iabs3oooo': '3989709',
   'iabs4': '1014975',
   'iabs505': '3823817',
   'iabs66': '1056550',
   'iabs7': '1015210',
   'iabs7son': '2893352',
   'iabs8': '1015225',
   'iabs8rd': '2893346',
   'iabsa': '1078051',
   'iabsa4lfi': '3329257',
   'iabsashhhhhhhi': '3989578',
   'iabsb6666666h': '4937186',
   'iabsbatman': '3989610',
   'iabsboo': '3330599',
   'iabsdaaaaaaaaaaaanc': '4937181',
   'iabsdaaance': '3823818',
   'iabsdaaanceee': '3989569',
   'iabsdaaannnccee3434': '4937184',
   'iabsdanceee': '3500550',
   'iabsddddd': '3109209',
   'iabseat': '3109204',
   'iabsewwwwwwwwwww': '3989594',
   'iabsfloss': '3989597',
   'iabsgoooo': '3330629',
   'iabsgraa7': '3989577',
   'iabshaaaaaaaaaahhaa': '3329484',
   'iabshhh44': '3689147',
   'iabshmmmmmi': '2893345',
   'iabshootee': '3329485',
   'iabshuu': '3109190',
   'iabsjhj': '3330238',
   'iabsknslh': '4953422',
   'iabskoksal': '3989580',
   'iabslm': '3329260',
   'iabsloooove': '4937189',
   'iabsm39bbb': '3329530',
   'iabsm9dom': '3989615',
   'iabsmusaeed': '3989609',
   'iabsnashb': '2893344',
   'iabsqqq': '3330234',
   'iabsqwqw': '3330235',
   'iabsr3333333b': '4937191',
   'iabsrbbee3': '3989591',
   'iabsshhhhhhhhhhh': '3330619',
   'iabssmallcup': '2607940',
   'iabsswalllffff': '4937179',
   'iabst777yh': '3989623',
   'iabsw3lykmm': '3544674'
};

const STICKERS_IABS = Object.keys(STICKERS_IABS_MAPPING).map(s => ({
   name: s,
   id: STICKERS_IABS_MAPPING[s]
}));

const STICKERS_GENERAL = [
   { name: 'KEKW', id: '37226' }, { name: 'LULW', id: '37227' }, { name: 'AYAYA', id: '37215' },
   { name: 'PogU', id: '37233' }, { name: 'Sadge', id: '4148081' }, { name: 'catblobDance', id: '4148144' },
   { name: 'catKISS', id: '4147900' }, { name: 'Clap', id: '37218' }, { name: 'coffinPls', id: '4147909' },
   { name: 'DanceDance', id: '39260' }, { name: 'DonoWall', id: '37220' }, { name: 'duckPls', id: '4147914' },
   { name: 'EDDIE', id: '3645850' }, { name: 'EDMusiC', id: '39265' }, { name: 'EZ', id: '37221' },
   { name: 'FLASHBANG', id: '3645852' }, { name: 'Flowie', id: '39402' }, { name: 'gachiGASM', id: '37243' },
   { name: 'GIGACHAD', id: '37224' }, { name: 'GnomeDisco', id: '4055795' }, { name: 'HaHaa', id: '4148076' },
   { name: 'HYPERCLAP', id: '4148074' }, { name: 'Kappa', id: '305040' }, { name: 'KEKBye', id: '4147902' },
   { name: 'KEKLEO', id: '37225' }, { name: 'kkHuh', id: '39261' }, { name: 'LetMeIn', id: '39272' },
   { name: 'mericCat', id: '4148128' }, { name: 'modCheck', id: '37244' }, { name: 'MuteD', id: '39273' },
   { name: 'NODDERS', id: '37228' }, { name: 'NugTime', id: '28631' }, { name: 'ODAJAM', id: '4055796' },
   { name: 'OOOO', id: '37229' }, { name: 'OuttaPocket', id: '4147814' }, { name: 'PatrickBoo', id: '4147892' },
   { name: 'PeepoClap', id: '37232' }, { name: 'peepoDJ', id: '37245' }, { name: 'peepoRiot', id: '37246' },
   { name: 'peepoShy', id: '39275' }, { name: 'POLICE', id: '37230' }, { name: 'politeCat', id: '39277' },
   { name: 'ppJedi', id: '4147888' }, { name: 'Prayge', id: '37234' }, { name: 'ratJAM', id: '37248' },
   { name: 'SaltT', id: '4147869' }, { name: 'SenpaiWhoo', id: '28633' }, { name: 'SIT', id: '4055801' },
   { name: 'SUSSY', id: '4148085' }, { name: 'ThisIsFine', id: '37236' }, { name: 'TOXIC', id: '4147896' },
   { name: 'TriKool', id: '37237' }, { name: 'TRUEING', id: '3645849' }, { name: 'vibePls', id: '4147884' },
   { name: 'WeirdChamp', id: '37240' }, { name: 'WeSmart', id: '37239' }, { name: 'YouTried', id: '4147873' }
];

const STICKERS_EMOJI = [
   'emojiAngel', 'emojiAngry', 'emojiAstonished', 'emojiAwake', 'emojiBlowKiss', 'emojiBubbly', 'emojiCheerful',
   'emojiClown', 'emojiCool', 'emojiCrave', 'emojiCry', 'emojiCrying', 'emojiCurious', 'emojiCute', 'emojiDead',
   'emojiDevil', 'emojiDisappoint', 'emojiDisguise', 'emojiDJ', 'emojiDown', 'emojiEnraged', 'emojiExcited',
   'emojiEyeRoll', 'emojiFire', 'emojiGamer', 'emojiGlass', 'emojiGoofy', 'emojiGramps', 'emojiGrimacing',
   'emojiGrin', 'emojiGrumpy', 'emojiHappy', 'emojiHeartEyes', 'emojiHmm', 'emojiHydrate', 'emojiKing', 'emojiKiss',
   'emojiLady', 'emojiLaughing', 'emojiLoading', 'emojiLol', 'emojiMan', 'emojiMoneyEyes', 'emojiNo', 'emojiOof',
   'emojiOooh', 'emojiOuch', 'emojiPleading', 'emojiRich', 'emojiShocked', 'emojiSleep', 'emojiSmart', 'emojiSmerking',
   'emojiSmiling', 'emojiSorry', 'emojiStare', 'emojiStarEyes', 'emojiSwearing', 'emojiUnamused', 'emojiVomiting',
   'emojiWink', 'emojiXEyes', 'emojiYay', 'emojiYes', 'emojiYuh', 'emojiYum'
].map(s => ({ name: s, id: null }));

const ALL_STICKERS = [...STICKERS_IABS, ...STICKERS_GENERAL, ...STICKERS_EMOJI];
const ALL_JOIN_STICKERS = ALL_STICKERS.map(s => s.name.toLowerCase());

export const MusicalChairsGame: React.FC<MusicalChairsGameProps> = ({ onHome, isOBS }) => {
   const [config, setConfig] = useState<GameConfig>({
      joinKeyword: 'دخول',
      maxPlayers: 100,
      musicDuration: 10,
      selectionDuration: 12,
      volume: 0.6,
      hideNumbers: false,
      selectedSongs: SONGS_DB.map(s => s.id),
      selectedMap: ARENA_MAPS[0],
      autoProgress: false,
      eliminationCount: 1,
      difficulty: 'MEDIUM',
      neonGlow: true,
      fastResults: false,
      luckyChair: false,
      ghostMode: false
   });

   const [phase, setPhase] = useState<GamePhase>('SETUP');
   const [participants, setParticipants] = useState<ChatUser[]>([]);
   const [currentRound, setCurrentRound] = useState(0);
   const [chairs, setChairs] = useState<{ id: string, occupiedBy: string | null, isLucky?: boolean, x: number, y: number }[]>([]);
   const [timer, setTimer] = useState(0);
   const [winner, setWinner] = useState<ChatUser | null>(null);
   const [lastEliminated, setLastEliminated] = useState<ChatUser[]>([]);
   const [rotationAngle, setRotationAngle] = useState(0);
   const [walkingOffset, setWalkingOffset] = useState(0);
   const [lastPlayedSongId, setLastPlayedSongId] = useState<string | null>(null);
   const [playlist, setPlaylist] = useState<string[]>([]);
   const [playlistIndex, setPlaylistIndex] = useState(0);

   // Zoom & Pan State
   const [zoom, setZoom] = useState(1);
   const [pan, setPan] = useState({ x: 0, y: 0 });
   const [isDragging, setIsDragging] = useState(false);
   const lastMousePos = useRef({ x: 0, y: 0 });

   const audioRef = useRef<HTMLAudioElement | null>(null);
   const phaseRef = useRef(phase);
   const configRef = useRef(config);
   const participantsRef = useRef(participants);

   useEffect(() => {
      phaseRef.current = phase;
      configRef.current = config;
      participantsRef.current = participants;
   }, [phase, config, participants]);

   const getUniqueChairIds = (count: number, survivorsCount: number): string[] => {
      // Logic: Default 1-100. If more players (e.g. 300), expand just enough to fit them (1-300).
      // This ensures numbers are as small/readable as possible while remaining unique.
      const maxRange = Math.max(100, survivorsCount);
      const pool = Array.from({ length: maxRange }, (_, i) => (i + 1).toString());

      const result = [...pool];
      for (let i = result.length - 1; i > 0; i--) {
         const j = Math.floor(Math.random() * (i + 1));
         [result[i], result[j]] = [result[j], result[i]];
      }
      return result.slice(0, count);
   };



   useEffect(() => {
      const unsubscribe = chatService.onMessage(async (msg) => {
         const content = msg.content.trim().toLowerCase();

         if (phaseRef.current === 'LOBBY') {
            const raw = msg.content || "";
            const lower = raw.toLowerCase();
            const keyword = (configRef.current.joinKeyword || "").toLowerCase().trim();

            // Find target sticker data
            const target = ALL_STICKERS.find(s => s.name.toLowerCase() === keyword);
            const tid = target?.id ? String(target.id) : null;



            // Matching Logic:
            // 1. Keyword match (anywhere)
            const keywordMatch = keyword && lower.includes(keyword);
            // 2. ID match (anywhere)
            const idMatch = tid && raw.includes(tid);
            // 3. Fallback for Kick Emote tags [emote:ID:NAME]
            const tagMatch = tid && lower.includes(`emote:${tid}:`);

            const isJoin = keywordMatch || idMatch || tagMatch;

            if (isJoin) {
               setParticipants(prev => {
                  if (prev.length >= configRef.current.maxPlayers) return prev;
                  const username = msg.user.username;
                  if (prev.some(p => p.username.toLowerCase() === username.toLowerCase())) return prev;

                  const newUser: ChatUser = { ...msg.user };
                  chatService.fetchKickAvatar(newUser.username).then(avatar => {
                     if (avatar) {
                        setParticipants(current => current.map(p =>
                           p.username.toLowerCase() === username.toLowerCase() ? { ...p, avatar } : p
                        ));
                     }
                  }).catch(() => { });

                  return [...prev, newUser];
               });
            }
         }

         if (phaseRef.current === 'MUSIC_OFF') {
            // CRITICAL FIX: Only allow registered participants to sit
            // prevents "snipers" from taking chairs and then disappearing because they aren't in the participants list
            const isParticipant = participantsRef.current.some(p =>
               p.username.toLowerCase() === msg.user.username.toLowerCase()
            );

            if (!isParticipant) return;

            setChairs(prev => {
               const index = prev.findIndex(c => c.id.toLowerCase() === content);
               if (index !== -1 && !prev[index].occupiedBy) {
                  const alreadySeated = prev.some(c => c.occupiedBy?.toLowerCase() === msg.user.username.toLowerCase());
                  if (!alreadySeated) {
                     const newChairs = [...prev];
                     newChairs[index] = { ...newChairs[index], occupiedBy: msg.user.username };
                     return newChairs;
                  }
               }
               return prev;
            });
         }
      });
      return () => unsubscribe();
   }, []);

   // --- Animation Loop for Circular Movement ---
   useEffect(() => {
      let frameId: number;
      const animate = () => {
         if (phaseRef.current === 'MUSIC_ON') {
            // Faster rotation for more dynamic movement
            setRotationAngle(prev => (prev + 2.5) % 360);
            setWalkingOffset(prev => (prev + 0.2) % (Math.PI * 2));
         }
         frameId = requestAnimationFrame(animate);
      };
      frameId = requestAnimationFrame(animate);
      return () => cancelAnimationFrame(frameId);
   }, []);

   useEffect(() => {
      let interval: number;
      if (phase === 'MUSIC_ON' || phase === 'MUSIC_OFF') {
         interval = window.setInterval(() => {
            setTimer(prev => Math.max(0, prev - 1));
         }, 1000);
      }
      return () => clearInterval(interval);
   }, [phase]);

   useEffect(() => {
      if (timer === 0) {
         if (phase === 'MUSIC_ON') stopMusic();
         else if (phase === 'MUSIC_OFF') resolveRound();
      }
   }, [timer, phase]);

   const startMusic = () => {
      if (participants.length <= 1) return;
      const survivorsCount = participants.length;

      // نظام الاستبعاد الديناميكي: 5% من اللاعبين أو العدد المحدد يدوياً (أيهما أكبر)
      const dynamicElimination = Math.max(config.eliminationCount, Math.ceil(survivorsCount * 0.05));
      let chairsCount = survivorsCount - dynamicElimination;

      if (chairsCount < 1) chairsCount = 1;
      // التأكد من استبعاد شخص واحد على الأقل إذا كان هناك أكثر من متسابق
      if (survivorsCount > 1 && chairsCount >= survivorsCount) chairsCount = survivorsCount - 1;

      const chairIds = getUniqueChairIds(chairsCount, survivorsCount);
      const luckyIndex = config.luckyChair ? Math.floor(Math.random() * chairsCount) : -1;
      const newChairs: { id: string, occupiedBy: string | null, isLucky?: boolean, x: number, y: number }[] = [];
      // Dynamic minimum distance based on player count to ensure packing
      const minDistance = chairsCount > 200 ? 30 : chairsCount > 100 ? 40 : 55;

      for (let i = 0; i < chairIds.length; i++) {
         let bestPos = { x: 0, y: 0 };
         let maxDist = -1;

         // Attempt to find a position that is far from existing chairs
         // Try 12 times per chair - balances performance and distribution quality
         for (let attempt = 0; attempt < 12; attempt++) {
            const angle = Math.random() * 2 * Math.PI;
            // Expanded radius range: 120px to 520px to fill the larger 1100px map
            const r = 100 + Math.random() * 420;
            const x = Math.cos(angle) * r;
            const y = Math.sin(angle) * r;

            let minDist = 10000;
            if (newChairs.length === 0) {
               minDist = 999;
            } else {
               for (const other of newChairs) {
                  const d = Math.sqrt((other.x - x) ** 2 + (other.y - y) ** 2);
                  if (d < minDist) minDist = d;
               }
            }

            if (minDist > maxDist) {
               maxDist = minDist;
               bestPos = { x, y };
            }
            // Optimization: if we found a spot with good enough distance, take it immediately
            if (minDist > minDistance) break;
         }

         newChairs.push({
            id: chairIds[i],
            occupiedBy: null,
            isLucky: i === luckyIndex,
            x: bestPos.x,
            y: bestPos.y
         });
      }

      setChairs(newChairs);
      setCurrentRound(r => r + 1);
      setTimer(config.musicDuration);
      setPhase('MUSIC_ON');

      if (audioRef.current) {
         const songsInDb = SONGS_DB.filter(s => config.selectedSongs.includes(s.id));
         if (songsInDb.length === 0) return;

         let currentPlaylist = [...playlist];
         let currentIndex = playlistIndex;

         // إعادة بناء القائمة إذا كانت فارغة أو انتهت الأغاني
         if (currentRound === 0 || currentIndex >= currentPlaylist.length) {
            // خلط الأغاني
            let shuffled = [...songsInDb].sort(() => Math.random() - 0.5);

            // إذا كانت أغنية "حميد" موجودة، نجعلها في المركز الأول أو الثاني دائماً كما طلب المستخدم
            const hamidIdx = shuffled.findIndex(s => s.id === 'song_13');
            if (hamidIdx !== -1) {
               const hamid = shuffled.splice(hamidIdx, 1)[0];
               // اختيار عشوائي بين المركز الأول أو الثاني
               const targetIdx = Math.random() > 0.5 ? 0 : Math.min(1, shuffled.length);
               shuffled.splice(targetIdx, 0, hamid);
            }

            currentPlaylist = shuffled.map(s => s.id);
            currentIndex = 0;
            setPlaylist(currentPlaylist);
         }

         const selectedSongId = currentPlaylist[currentIndex];
         const selectedSong = SONGS_DB.find(s => s.id === selectedSongId) || songsInDb[0];

         setPlaylistIndex(currentIndex + 1);
         setLastPlayedSongId(selectedSong.id);

         // تشغيل الأغنية مع معالجة الأخطاء
         audioRef.current.src = selectedSong.url;
         audioRef.current.volume = config.volume;

         audioRef.current.onerror = () => {
            console.error('فشل تحميل الأغنية:', selectedSong.title);
            // محاولة تلقائية للانتقال للأغنية التالية في القائمة
            if (currentPlaylist.length > 1) {
               const nextIdx = (currentIndex + 1) % currentPlaylist.length;
               const nextSong = SONGS_DB.find(s => s.id === currentPlaylist[nextIdx]);
               if (nextSong && audioRef.current) {
                  audioRef.current.src = nextSong.url;
                  audioRef.current.play().catch(e => console.error(e));
               }
            }
         };

         audioRef.current.play().catch((err) => {
            console.error('فشل تشغيل الصوت:', err);
         });
      }
   };

   const stopMusic = () => {
      if (audioRef.current) audioRef.current.pause();
      setTimer(config.selectionDuration);
      setPhase('MUSIC_OFF');
   };

   const resolveRound = () => {
      // Normalize to lowercase for reliable matching
      const winnersNames = chairs
         .filter(c => c.occupiedBy)
         .map(c => c.occupiedBy!.toLowerCase());

      const losers = participants.filter(p => !winnersNames.includes(p.username.toLowerCase()));
      const winners = participants.filter(p => winnersNames.includes(p.username.toLowerCase()));

      setLastEliminated(losers);
      setParticipants(winners);

      // حالة التعادل: إذا لم يجلس أحد على الكراسي (تم إقصاء الجميع)
      if (winners.length === 0) {
         setPhase('DRAW');
         return;
      }

      if (winners.length === 1) {
         setWinner(winners[0]);
         setPhase('FINALE');
         leaderboardService.recordWin(winners[0].username, winners[0].avatar || '', 500);
      } else {
         setPhase('RESULTS');
         if (config.autoProgress) setTimeout(startMusic, config.fastResults ? 1500 : 4000);
      }
   };

   const addBots = () => {
      const botCount = 50;
      const newBots: ChatUser[] = Array.from({ length: botCount }).map((_, i) => ({
         id: `bot-${Date.now()}-${i}`,
         username: `Bot_${Math.floor(Math.random() * 9999)}`,
         color: '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0'),
         isBot: true
      }));

      setParticipants(prev => {
         const combined = [...prev, ...newBots];
         return combined.slice(0, config.maxPlayers);
      });
   };

   const resetGame = () => {
      setPhase('SETUP');
      setParticipants([]);
      setWinner(null);
      setCurrentRound(0);
      setChairs([]);
      setRotationAngle(0);
      setLastPlayedSongId(null);
      setPlaylist([]);
      setPlaylistIndex(0);
      if (audioRef.current) audioRef.current.pause();
   };

   const getDynamicSize = (count: number) => {
      if (count < 12) return { box: 'w-16 h-16', icon: 50, text: 'text-xl', chair: 'w-12 h-12', chairIcon: 65 };
      if (count < 30) return { box: 'w-14 h-14', icon: 40, text: 'text-lg', chair: 'w-10 h-10', chairIcon: 55 };
      if (count < 60) return { box: 'w-12 h-12', icon: 35, text: 'text-base', chair: 'w-8 h-8', chairIcon: 45 };
      if (count < 150) return { box: 'w-10 h-10', icon: 30, text: 'text-sm', chair: 'w-6 h-6', chairIcon: 35 };
      if (count < 300) return { box: 'w-8 h-8', icon: 20, text: 'text-[10px]', chair: 'w-5 h-5', chairIcon: 25 };
      if (count < 600) return { box: 'w-6 h-6', icon: 16, text: 'text-[8px]', chair: 'w-4 h-4', chairIcon: 20 };
      return { box: 'w-5 h-5', icon: 14, text: 'text-[7px]', chair: 'w-3 h-3', chairIcon: 16 };
   };

   // Improved coordinate math to ensure players orbit exactly around the center
   const getPlayerOrbitPos = (index: number, total: number, radius: number) => {
      const angleOffset = (rotationAngle * Math.PI / 180);
      const angle = (index / total) * 2 * Math.PI + angleOffset;
      return {
         x: Math.cos(angle) * radius,
         y: Math.sin(angle) * radius,
         angle: angle
      };
   };

   const getArenaShapeClass = (shape: ArenaMap['shape']) => {
      switch (shape) {
         case 'square': return 'rounded-[3rem]';
         case 'hexagon': return 'clip-path-hexagon';
         case 'triangle': return 'clip-path-triangle';
         case 'star': return 'clip-path-star';
         case 'octagon': return 'clip-path-octagon';
         case 'spiral': return 'rounded-full';
         case 'circle':
         default: return 'rounded-full';
      }
   };

   useEffect(() => {
      if (isOBS && phase === 'SETUP') {
         setPhase('LOBBY');
      }
   }, [isOBS, phase]);

   return (
      <div className={`w-full h-full flex flex-col items-center bg-transparent text-right font-display select-none ${isOBS ? 'overflow-hidden' : ''}`} dir="rtl">
         <audio ref={audioRef} crossOrigin="anonymous" preload="auto" />

         <style>{`
        .clip-path-hexagon { clip-path: polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%); }
        .clip-path-triangle { clip-path: polygon(50% 0%, 0% 100%, 100% 100%); }
        .clip-path-star { clip-path: polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%); }
        .clip-path-octagon { clip-path: polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%); }
        
        @keyframes particle-float {
          0%, 100% { transform: translateY(0px) rotate(0deg) scale(1); opacity: 0.4; }
          50% { transform: translateY(-30px) rotate(180deg) scale(1.3); opacity: 1; }
        }
        @keyframes pulse-ring {
          0% { transform: scale(1); opacity: 0.8; }
          50% { transform: scale(1.15); opacity: 0.4; }
          100% { transform: scale(1); opacity: 0.8; }
        }
        @keyframes rotate-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes rotate-reverse {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }
        @keyframes shimmer {
          0% { background-position: -1500px 0; }
          100% { background-position: 1500px 0; }
        }
        @keyframes glow-pulse {
          0%, 100% { box-shadow: 0 0 20px var(--glow-color), 0 0 40px var(--glow-color), inset 0 0 20px var(--glow-color); }
          50% { box-shadow: 0 0 40px var(--glow-color), 0 0 80px var(--glow-color), inset 0 0 40px var(--glow-color); }
        }
        @keyframes border-flow {
          0% { border-image-source: linear-gradient(0deg, var(--accent), var(--secondary), var(--accent)); }
          33% { border-image-source: linear-gradient(120deg, var(--secondary), var(--accent), var(--secondary)); }
          66% { border-image-source: linear-gradient(240deg, var(--accent), var(--secondary), var(--accent)); }
          100% { border-image-source: linear-gradient(360deg, var(--secondary), var(--accent), var(--secondary)); }
        }
        .animate-particle { animation: particle-float 4s ease-in-out infinite; }
        .animate-pulse-ring { animation: pulse-ring 3s ease-in-out infinite; }
        .animate-rotate-slow { animation: rotate-slow 30s linear infinite; }
        .animate-rotate-reverse { animation: rotate-reverse 25s linear infinite; }
        .animate-bounce-slow { animation: bounce-slow 4s ease-in-out infinite; }
        .text-shadow-glow { text-shadow: 0 0 20px rgba(251, 191, 36, 0.8), 0 0 40px rgba(251, 191, 36, 0.4); }

        @keyframes bounce-slow {
          0%, 100% { transform: translateY(-5%); animation-timing-function: cubic-bezier(0.8,0,1,1); }
          50% { transform: none; animation-timing-function: cubic-bezier(0,0,0.2,1); }
        }
        .animate-shimmer { 
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent);
          background-size: 1500px 100%;
          animation: shimmer 4s infinite;
        }
        .animate-glow { animation: glow-pulse 3s ease-in-out infinite; }
        .animate-border-flow { animation: border-flow 5s linear infinite; }

        .broken-image img { display: none; }
        .broken-image::before {
          content: '⚠️';
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 100%;
          font-size: 20px;
          background: rgba(255,255,255,0.05);
          border-radius: 8px;
        }
      `}</style>

         {/* --- PHASE: SETUP --- */}
         {phase === 'SETUP' && (
            <div className="w-full max-w-7xl animate-in fade-in zoom-in duration-700 py-6 px-4 pb-20 overflow-y-auto custom-scrollbar h-full">
               <div className="flex items-center justify-between mb-8">
                  <button onClick={onHome} className="p-4 bg-red-600/10 rounded-3xl hover:bg-red-600/20 text-red-500 transition-all border border-red-500/20 shadow-xl group">
                     <LogOut size={24} className="group-hover:scale-110" />
                  </button>
                  <div className="text-center">
                     <div className="flex items-center justify-center gap-3 mb-1">
                        <h1 className="text-6xl font-black text-white italic tracking-tighter uppercase">إعدادات الحلبة</h1>
                     </div>
                     <p className="text-red-600 font-black tracking-[0.4em] text-[10px] uppercase">iABS Musical Chairs Premium</p>
                  </div>
                  <div className="w-14"></div>
               </div>

               <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  <div className="lg:col-span-4 space-y-6">
                     <div className="glass-card p-6 rounded-[2.5rem] border border-white/5 shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-red-600"></div>
                        <h3 className="text-lg font-black text-white flex items-center gap-3 mb-6">
                           <Settings size={18} className="text-red-600" /> الإعدادات الأساسية
                        </h3>

                        <div className="space-y-6">
                           <div className="bg-black/30 p-5 rounded-3xl border border-white/5 group hover:border-red-600/30 transition-all">
                              <div className="flex justify-between items-center mb-3">
                                 <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">الحد الأقصى للمتسابقين</label>
                                 <span className="text-2xl font-black text-red-600 font-mono">{config.maxPlayers}</span>
                              </div>
                              <input type="range" min="2" max="2000" step="1" value={config.maxPlayers} onChange={e => setConfig({ ...config, maxPlayers: +e.target.value })} className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-red-600" />
                           </div>



                           <div className="space-y-4">
                              <div className="flex items-center justify-between">
                                 <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">كلمة الانضمام</label>
                                 <div className="flex items-center gap-2 text-[9px] font-bold text-amber-500 animate-pulse">
                                    <Zap size={12} fill="currentColor" /> اختر سـتـكـر iABS
                                 </div>
                              </div>

                              <div className="relative group">
                                 <input
                                    value={config.joinKeyword}
                                    onChange={e => setConfig({ ...config, joinKeyword: e.target.value })}
                                    placeholder="اكتب كلمة أو اختر ستكر..."
                                    className={`w-full bg-black border-2 border-white/10 focus:border-red-600 rounded-xl p-3 text-white font-bold text-sm text-center outline-none transition-all ${[...STICKERS_IABS, ...STICKERS_GENERAL].find(s => s.name === config.joinKeyword) ? 'pr-14' : ''}`}
                                 />
                                 <div className="absolute left-3 top-1/2 -translate-y-1/2 opacity-30 group-focus-within:opacity-100 transition-opacity">
                                    <Zap size={16} className="text-red-500" />
                                 </div>
                                 {[...STICKERS_IABS, ...STICKERS_GENERAL].find(s => s.name === config.joinKeyword) && (
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 pointer-events-none">
                                       <img
                                          src={`https://files.kick.com/emotes/${[...STICKERS_IABS, ...STICKERS_GENERAL].find(s => s.name === config.joinKeyword)?.id}/fullsize`}
                                          className="w-full h-full object-contain"
                                          alt="preview"
                                       />
                                    </div>
                                 )}
                              </div>

                              {/* Sticker Quick Pick - Visual Mode */}
                              <div className="bg-black/40 rounded-xl p-4 border border-white/5 max-h-[320px] overflow-y-auto custom-scrollbar">
                                 <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
                                    {(() => {
                                       const filtered = STICKERS_IABS.filter(s => s.name.toLowerCase().includes(config.joinKeyword.toLowerCase()));
                                       const list = filtered.length > 0 ? filtered : STICKERS_IABS;
                                       return list.map((sticker, idx) => {
                                          const stickerId = sticker.id;
                                          const isSelected = config.joinKeyword === sticker.name;

                                          return (
                                             <button
                                                key={idx}
                                                onClick={() => setConfig({ ...config, joinKeyword: sticker.name })}
                                                className={`relative flex flex-col items-center gap-1 p-2 rounded-xl transition-all duration-300 group ${isSelected
                                                   ? 'bg-red-600/20 border-2 border-red-600 scale-110 z-10'
                                                   : 'bg-white/5 border-2 border-transparent hover:bg-white/10'
                                                   }`}
                                             >
                                                <div className="w-12 h-12 flex items-center justify-center relative">
                                                   {stickerId ? (
                                                      <img
                                                         src={`https://files.kick.com/emotes/${stickerId}/fullsize`}
                                                         alt={sticker.name}
                                                         className="w-full h-full object-contain drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)] group-hover:scale-110 transition-transform"
                                                         onError={(e) => {
                                                            (e.target as HTMLImageElement).parentElement?.classList.add('broken-image');
                                                         }}
                                                      />
                                                   ) : (
                                                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-900 rounded-lg shadow-inner">
                                                         <Zap size={16} className="text-white/20" />
                                                      </div>
                                                   )}
                                                </div>
                                                {isSelected && (
                                                   <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center border-2 border-black">
                                                      <Check size={8} className="text-white font-black" />
                                                   </div>
                                                )}
                                             </button>
                                          );
                                       });
                                    })()}

                                    {/* Add Divider for General Emotes */}
                                    <div className="col-span-full py-2 flex items-center gap-4">
                                       <div className="h-px flex-1 bg-white/5" />
                                       <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest">ملصقات عامة</span>
                                       <div className="h-px flex-1 bg-white/5" />
                                    </div>

                                    {STICKERS_GENERAL.map((sticker, idx) => {
                                       const isSelected = config.joinKeyword === sticker.name;
                                       return (
                                          <button
                                             key={`gen-${idx}`}
                                             onClick={() => setConfig({ ...config, joinKeyword: sticker.name })}
                                             className={`relative flex flex-col items-center gap-1 p-2 rounded-xl transition-all duration-300 group ${isSelected
                                                ? 'bg-red-600/20 border-2 border-red-600 scale-110 z-10'
                                                : 'bg-white/5 border-2 border-transparent hover:bg-white/10'
                                                }`}
                                          >
                                             <div className="w-12 h-12 flex items-center justify-center relative">
                                                <img
                                                   src={`https://files.kick.com/emotes/${sticker.id}/fullsize`}
                                                   alt={sticker.name}
                                                   className="w-full h-full object-contain drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)] group-hover:scale-110 transition-transform"
                                                />
                                             </div>
                                             {isSelected && (
                                                <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center border-2 border-black">
                                                   <Check size={8} className="text-white font-black" />
                                                </div>
                                             )}
                                          </button>
                                       );
                                    })}
                                 </div>
                              </div>
                           </div>
                        </div>
                     </div>

                     <div className="glass-card p-6 rounded-[2.5rem] border border-white/5 shadow-2xl">
                        <h3 className="text-lg font-black text-white flex items-center gap-3 mb-6">
                           <MapIcon size={18} className="text-red-600" /> اختيار الخريطة
                        </h3>
                        <div className="grid grid-cols-1 gap-3 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                           {ARENA_MAPS.map(m => (
                              <button
                                 key={m.id}
                                 onClick={() => setConfig({ ...config, selectedMap: m })}
                                 className={`group p-4 rounded-2xl border-2 flex items-center gap-4 transition-all duration-300 relative overflow-hidden ${config.selectedMap.id === m.id
                                    ? 'bg-black/40 border-white/40 scale-[1.02] shadow-xl'
                                    : 'bg-black/20 border-white/5 hover:bg-black/30 hover:border-white/20 opacity-70 hover:opacity-100'
                                    }`}
                                 style={{
                                    boxShadow: config.selectedMap.id === m.id ? `0 0 30px ${m.glowColor}` : undefined
                                 }}
                              >
                                 {/* Mini Preview Shape */}
                                 <div className="relative w-14 h-14 flex items-center justify-center">
                                    <div
                                       className={`w-12 h-12 border-2 transition-all duration-300 ${m.shape === 'square' ? 'rounded-lg' :
                                          m.shape === 'hexagon' ? 'clip-path-hexagon' :
                                             m.shape === 'triangle' ? 'clip-path-triangle' :
                                                m.shape === 'star' ? 'clip-path-star' :
                                                   m.shape === 'octagon' ? 'clip-path-octagon' :
                                                      'rounded-full'
                                          }`}
                                       style={{
                                          borderColor: m.borderColor,
                                          background: `radial-gradient(circle at center, ${m.glowColor}30 0%, transparent 70%)`,
                                          boxShadow: `0 0 20px ${m.glowColor}, inset 0 0 10px ${m.pulseColor}`
                                       }}
                                    >
                                       <div className="absolute inset-0 flex items-center justify-center text-lg">
                                          {m.icon}
                                       </div>
                                    </div>
                                 </div>

                                 {/* Map Info */}
                                 <div className="text-right flex-1">
                                    <div className={`text-sm font-black mb-1 transition-colors ${config.selectedMap.id === m.id ? 'text-white' : 'text-gray-400 group-hover:text-gray-200'
                                       }`}>
                                       {m.name}
                                    </div>
                                    <div className="text-[9px] text-gray-500 font-medium">
                                       {m.description}
                                    </div>
                                 </div>

                                 {/* Selected Indicator */}
                                 {config.selectedMap.id === m.id && (
                                    <div
                                       className="w-3 h-3 rounded-full animate-pulse"
                                       style={{
                                          backgroundColor: m.accentColor,
                                          boxShadow: `0 0 15px ${m.accentColor}`
                                       }}
                                    />
                                 )}

                                 {/* Glow Effect Background */}
                                 {config.selectedMap.id === m.id && (
                                    <div
                                       className="absolute inset-0 opacity-10 blur-2xl pointer-events-none"
                                       style={{ backgroundColor: m.accentColor }}
                                    />
                                 )}
                              </button>
                           ))}
                        </div>
                     </div>
                  </div>

                  <div className="lg:col-span-8 space-y-6">
                     <div className="glass-card p-6 rounded-[2.5rem] border border-white/5 flex flex-col shadow-2xl">
                        <div className="flex items-center justify-between mb-6">
                           <h3 className="text-xl font-black text-white flex items-center gap-4"><Music size={22} className="text-red-600" /> قائمة الموسيقى</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto custom-scrollbar pr-2 mb-6">
                           {SONGS_DB.map(song => (
                              <div key={song.id} onClick={() => setConfig({ ...config, selectedSongs: config.selectedSongs.includes(song.id) ? config.selectedSongs.filter(id => id !== song.id) : [...config.selectedSongs, song.id] })} className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between ${config.selectedSongs.includes(song.id) ? 'bg-red-600/10 border-red-600' : 'bg-white/5 border-transparent hover:bg-white/10'}`}>
                                 <div className="flex items-center gap-3">
                                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${config.selectedSongs.includes(song.id) ? 'bg-red-600 text-white' : 'bg-white/10 text-gray-500'}`}><Music size={16} /></div>
                                    <span className={`font-bold text-xs ${config.selectedSongs.includes(song.id) ? 'text-white' : 'text-gray-400'}`}>{song.title}</span>
                                 </div>
                                 {config.selectedSongs.includes(song.id) && <CheckCircle2 size={18} className="text-red-600" />}
                              </div>
                           ))}
                        </div>

                        <div className="grid grid-cols-3 gap-4 mb-8">
                           <div className="bg-black/30 p-4 rounded-3xl text-center space-y-2">
                              <label className="text-[9px] font-bold text-gray-500 uppercase">وقت الموسيقى</label>
                              <div className="flex items-center justify-center gap-3">
                                 <button onClick={() => setConfig({ ...config, musicDuration: Math.max(5, config.musicDuration - 5) })} className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-white">-</button>
                                 <span className="text-xl font-black text-white font-mono">{config.musicDuration}s</span>
                                 <button onClick={() => setConfig({ ...config, musicDuration: config.musicDuration + 5 })} className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-white">+</button>
                              </div>
                           </div>
                           <div className="bg-black/30 p-4 rounded-3xl text-center space-y-2">
                              <label className="text-[9px] font-bold text-gray-500 uppercase">وقت الجلوس</label>
                              <div className="flex items-center justify-center gap-3">
                                 <button onClick={() => setConfig({ ...config, selectionDuration: Math.max(5, config.selectionDuration - 2) })} className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-white">-</button>
                                 <span className="text-xl font-black text-white font-mono">{config.selectionDuration}s</span>
                                 <button onClick={() => setConfig({ ...config, selectionDuration: config.selectionDuration + 2 })} className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-white">+</button>
                              </div>
                           </div>
                           <div className="bg-black/30 p-4 rounded-3xl text-center space-y-2">
                              <label className="text-[9px] font-bold text-gray-500 uppercase">المستبعدين</label>
                              <div className="flex items-center justify-center gap-3">
                                 <button onClick={() => setConfig({ ...config, eliminationCount: Math.max(1, config.eliminationCount - 1) })} className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-white">-</button>
                                 <span className="text-xl font-black text-white font-mono">{config.eliminationCount}</span>
                                 <button onClick={() => setConfig({ ...config, eliminationCount: config.eliminationCount + 1 })} className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-white">+</button>
                              </div>
                           </div>
                        </div>

                        <button onClick={() => setPhase('LOBBY')} disabled={config.selectedSongs.length === 0} className="mt-4 bg-red-600 text-white font-black py-6 rounded-3xl text-4xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-4 disabled:opacity-20 shadow-[0_15px_40px_rgba(255,0,0,0.4)] border-t border-white/20 italic">
                           بـدء الـمـعـركة <Play fill="currentColor" size={32} />
                        </button>
                     </div>
                  </div>
               </div>
            </div>
         )}

         {/* --- PHASE: LOBBY --- */}
         {phase === 'LOBBY' && (
            <div className="w-full h-full flex flex-col items-center justify-center p-10 animate-in fade-in duration-1000 relative bg-transparent overflow-hidden">
               {/* Background Sticker Rain/Ticker */}
               <div className="absolute inset-0 z-0 opacity-10 pointer-events-none">
                  <div className="absolute top-0 left-0 w-full h-[300px] overflow-hidden">
                     <div className="flex gap-10 animate-shimmer whitespace-nowrap py-10">
                        {[...STICKERS_IABS, ...STICKERS_GENERAL].map((s, i) => (
                           <div key={`ticker-top-${i}`} className="w-24 h-24 flex-shrink-0">
                              {s.id ? (
                                 <img
                                    src={`https://files.kick.com/emotes/${s.id}/fullsize`}
                                    className="w-full h-full object-contain drop-shadow-[0_0_20px_rgba(255,255,255,0.3)]"
                                    alt=""
                                 />
                              ) : (
                                 <span className="text-4xl font-black text-white italic opacity-50 underline decoration-red-600/50">{s.name}</span>
                              )}
                           </div>
                        ))}
                        {[...STICKERS_IABS, ...STICKERS_GENERAL].map((s, i) => (
                           <div key={`ticker-top-2-${i}`} className="w-24 h-24 flex-shrink-0">
                              {s.id ? (
                                 <img
                                    src={`https://files.kick.com/emotes/${s.id}/fullsize`}
                                    className="w-full h-full object-contain drop-shadow-[0_0_20px_rgba(255,255,255,0.3)]"
                                    alt=""
                                 />
                              ) : (
                                 <span className="text-4xl font-black text-white italic opacity-50 underline decoration-red-600/50">{s.name}</span>
                              )}
                           </div>
                        ))}
                     </div>
                  </div>
                  <div className="absolute bottom-0 left-0 w-full h-[300px] overflow-hidden">
                     <div className="flex gap-10 animate-shimmer whitespace-nowrap py-10" style={{ animationDirection: 'reverse' }}>
                        {[...STICKERS_GENERAL, ...STICKERS_IABS].reverse().map((s, i) => (
                           <div key={`ticker-bot-${i}`} className="w-24 h-24 flex-shrink-0">
                              {s.id ? (
                                 <img
                                    src={`https://files.kick.com/emotes/${s.id}/fullsize`}
                                    className="w-full h-full object-contain drop-shadow-[0_0_20px_rgba(255,255,255,0.3)]"
                                    alt=""
                                 />
                              ) : (
                                 <span className="text-4xl font-black text-white italic opacity-50 underline decoration-red-600/50">{s.name}</span>
                              )}
                           </div>
                        ))}
                        {[...STICKERS_GENERAL, ...STICKERS_IABS].reverse().map((s, i) => (
                           <div key={`ticker-bot-2-${i}`} className="w-24 h-24 flex-shrink-0">
                              {s.id ? (
                                 <img
                                    src={`https://files.kick.com/emotes/${s.id}/fullsize`}
                                    className="w-full h-full object-contain drop-shadow-[0_0_20px_rgba(255,255,255,0.3)]"
                                    alt=""
                                 />
                              ) : (
                                 <span className="text-4xl font-black text-white italic opacity-50 underline decoration-red-600/50">{s.name}</span>
                              )}
                           </div>
                        ))}
                     </div>
                  </div>
               </div>

               <div className="text-center mb-10 z-10">
                  <h1 className="text-9xl font-black text-white italic tracking-tighter mb-8 drop-shadow-[0_10px_60px_rgba(0,0,0,1)] uppercase">
                     في انتظار اللاعبين
                  </h1>
                  <div className="flex flex-col items-center gap-6">
                     <div className="flex items-center justify-center gap-6 text-4xl text-gray-400 font-bold uppercase tracking-widest bg-black/40 backdrop-blur-xl px-16 py-10 rounded-[4rem] border-2 border-white/5 shadow-2xl">
                        أرسل
                        <span className="relative group">
                           <span className="absolute -inset-4 bg-red-600 blur-2xl opacity-50 group-hover:opacity-100 transition-opacity animate-pulse" />
                           <span className="relative bg-red-600 text-white px-12 py-4 rounded-[2rem] font-black italic shadow-[0_15px_40px_rgba(255,0,0,0.6)] border-2 border-white/30 flex items-center gap-4">
                              {(() => {
                                 const sticker = [...STICKERS_IABS, ...STICKERS_GENERAL].find(s => s.name === config.joinKeyword);
                                 if (sticker?.id) {
                                    return (
                                       <>
                                          <img src={`https://files.kick.com/emotes/${sticker.id}/fullsize`} className="w-12 h-12 object-contain drop-shadow-lg" alt="" />
                                          <span className="text-sm opacity-50 font-mono">#{sticker.id}</span>
                                       </>
                                    );
                                 }
                                 return config.joinKeyword;
                              })()}
                           </span>
                        </span>
                        للمشاركة
                     </div>
                  </div>
               </div>

               <div className="flex-1 w-full max-w-6xl relative flex flex-col items-center justify-center mb-10 overflow-y-auto custom-scrollbar px-6">
                  {participants.length === 0 ? (
                     <div className="flex flex-col items-center animate-pulse opacity-30">
                        <Loader2 size={100} className="text-gray-700 animate-spin mb-4" />
                     </div>
                  ) : (
                     <div className="flex flex-wrap justify-center gap-5 max-w-5xl transition-all duration-700">
                        {participants.map((p) => {
                           const sizes = getDynamicSize(participants.length);
                           return (
                              <div key={p.id} className="animate-in zoom-in duration-500 flex flex-col items-center gap-2 group">
                                 <div className={`${sizes.box} rounded-[2rem] border-2 p-1 transition-all duration-300 shadow-2xl relative overflow-hidden bg-black/40 backdrop-blur-xl group-hover:border-red-600`} style={{ borderColor: p.color || 'rgba(255,255,255,0.1)' }}>
                                    {p.avatar ? (
                                       <img src={p.avatar} className="w-full h-full object-cover rounded-[1.7rem]" />
                                    ) : (
                                       <div className="w-full h-full bg-zinc-900 rounded-[1.7rem] flex items-center justify-center text-gray-600"><User size={sizes.icon} /></div>
                                    )}
                                 </div>
                                 <span className={`${sizes.text} font-black uppercase drop-shadow-md transition-colors group-hover:text-white`} style={{ color: p.color || '#9ca3af' }}>{p.username}</span>
                              </div>
                           )
                        })}
                     </div>
                  )}
               </div>

               <div className="w-full max-w-5xl bg-black/60 backdrop-blur-[40px] p-10 rounded-[3.5rem] border border-white/10 shadow-[0_30px_100px_rgba(0,0,0,0.9)] flex items-center justify-between z-20">
                  <div className="flex items-center gap-6 bg-white/5 px-8 py-4 rounded-[2rem] border border-white/5">
                     <span className="text-7xl font-black text-white font-mono italic tabular-nums leading-none">{participants.length}</span>
                     <span className="text-xl text-red-600 font-black opacity-40">/ {config.maxPlayers} MAX</span>
                  </div>
                  <div className="flex gap-4">
                     <button onClick={addBots} className="px-6 py-6 rounded-[2.5rem] bg-amber-600/20 text-amber-500 font-black hover:bg-amber-600/40 hover:text-white transition-all text-sm border border-amber-500/20 flex flex-col items-center justify-center leading-none gap-1">
                        <span>+50</span>
                        <span>BOTS</span>
                     </button>
                     <button onClick={resetGame} className="px-10 py-6 rounded-[2.5rem] bg-white/5 text-gray-500 font-black hover:text-white transition-all text-lg border border-white/10">تراجع</button>
                     <button onClick={startMusic} disabled={participants.length < 2} className="px-16 py-6 bg-white text-black font-black text-3xl rounded-[2.5rem] shadow-2xl hover:scale-[1.05] active:scale-95 transition-all disabled:opacity-10 italic flex items-center gap-4">بـدء اللعب <Play fill="currentColor" size={32} /></button>
                  </div>
               </div>
            </div>
         )}

         {(phase === 'MUSIC_ON' || phase === 'MUSIC_OFF' || phase === 'RESULTS') && (
            <div
               className="w-full h-full relative flex flex-col items-center justify-center overflow-hidden bg-black cursor-grab active:cursor-grabbing"
               onWheel={(e) => {
                  setZoom(z => Math.max(0.4, Math.min(4, z - e.deltaY * 0.001)));
               }}
               onMouseDown={(e) => {
                  setIsDragging(true);
                  lastMousePos.current = { x: e.clientX, y: e.clientY };
               }}
               onMouseMove={(e) => {
                  if (isDragging) {
                     const dx = e.clientX - lastMousePos.current.x;
                     const dy = e.clientY - lastMousePos.current.y;
                     setPan(p => ({ x: p.x + dx / zoom, y: p.y + dy / zoom }));
                     lastMousePos.current = { x: e.clientX, y: e.clientY };
                  }
               }}
               onMouseUp={() => setIsDragging(false)}
               onMouseLeave={() => setIsDragging(false)}
            >

               {/* UI Elements - Right Side */}
               <div className="absolute right-12 top-1/2 -translate-y-1/2 flex flex-col gap-6 z-50 pointer-events-none scale-75 origin-right">
                  {/* Round Counter */}
                  <div className="bg-black/90 backdrop-blur-2xl px-10 py-6 rounded-[3rem] border-4 border-amber-500/50 shadow-[0_0_50px_rgba(0,0,0,0.8)] pointer-events-auto flex flex-col items-center">
                     <span className="text-xl font-black text-amber-500 block mb-2 text-center tracking-widest">جولات</span>
                     <span className="text-7xl font-black text-white block text-center italic drop-shadow-[0_0_20px_rgba(255,255,255,0.3)]">{currentRound}</span>
                  </div>

                  {/* Timer */}
                  <div className={`px-16 py-12 rounded-[3.5rem] border-8 transition-all duration-500 flex flex-col items-center shadow-2xl pointer-events-auto ${phase === 'MUSIC_ON'
                     ? 'bg-gradient-to-br from-red-600 via-red-700 to-red-800 border-white shadow-[0_0_80px_rgba(255,0,0,0.7)]'
                     : 'bg-black/95 border-amber-500 shadow-[0_0_60px_rgba(251,191,36,0.5)]'
                     }`}>
                     <span className="text-3xl font-black mb-6 opacity-95 tracking-tight uppercase">
                        {phase === 'MUSIC_ON' ? '🎵 تحرك!' : '🪑 احجز!'}
                     </span>
                     <div className="text-[12rem] font-black font-mono tabular-nums leading-none tracking-tighter drop-shadow-[0_10px_30px_rgba(0,0,0,0.5)]">{timer}</div>
                  </div>

                  {/* Exit Button */}
                  <button
                     onClick={onHome}
                     className="bg-black/90 p-8 rounded-3xl border-4 border-red-500/40 text-red-500 hover:bg-red-600 hover:text-white hover:border-red-600 transition-all pointer-events-auto shadow-2xl group flex justify-center items-center"
                  >
                     <LogOut size={48} className="group-hover:scale-110 transition-transform" />
                  </button>
               </div>


               {/* --- THE ARENA --- */}
               <div
                  className="relative w-full h-full flex items-center justify-center transition-transform duration-75 ease-out will-change-transform"
                  style={{
                     transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)`
                  }}
               >

                  {/* Outer Glow Rings for Premium Effect */}
                  <div className="absolute w-[1000px] h-[1000px] rounded-full opacity-20 animate-pulse-ring"
                     style={{
                        background: `radial-gradient(circle, transparent 65%, ${config.selectedMap.glowColor}40 70%, transparent 75%)`,
                     }}>
                  </div>
                  <div className="absolute w-[920px] h-[920px] rounded-full opacity-30 animate-pulse-ring"
                     style={{
                        background: `radial-gradient(circle, transparent 68%, ${config.selectedMap.accentColor}50 72%, transparent 76%)`,
                        animationDelay: '1s',
                        animationDuration: '4s'
                     }}>
                  </div>

                  {/* Rotating Decorative Rings */}
                  <div className="absolute w-[880px] h-[880px] border-2 rounded-full opacity-10 animate-rotate-slow"
                     style={{ borderColor: config.selectedMap.accentColor, borderStyle: 'dashed' }}>
                  </div>
                  <div className="absolute w-[820px] h-[820px] border-2 rounded-full opacity-15 animate-rotate-reverse"
                     style={{ borderColor: config.selectedMap.secondaryColor, borderStyle: 'dotted' }}>
                  </div>

                  {/* Main Arena - EXPANDED SIZE FOR BETTER SPACING */}
                  <div
                     className={`absolute w-[1100px] h-[1100px] border-[15px] transition-all duration-1000 ${getArenaShapeClass(config.selectedMap.shape)} overflow-hidden backdrop-blur-2xl animate-glow`}
                     style={{
                        borderColor: config.selectedMap.borderColor,
                        '--glow-color': config.selectedMap.glowColor,
                        background: config.selectedMap.gridPattern
                           ? `
                            repeating-linear-gradient(0deg, transparent 0px, transparent 2px, ${config.selectedMap.secondaryColor}20 2px, ${config.selectedMap.secondaryColor}20 50px),
                            repeating-linear-gradient(90deg, transparent 0px, transparent 2px, ${config.selectedMap.secondaryColor}20 2px, ${config.selectedMap.secondaryColor}20 50px),
                            radial-gradient(circle at center, ${config.selectedMap.accentColor}30 0%, ${config.selectedMap.borderColor}60 100%)
                          `
                           : `radial-gradient(circle at center, ${config.selectedMap.glowColor}15 0%, rgba(0,0,0,0.8) 70%)`,
                        boxShadow: `
                           0 0 80px ${config.selectedMap.glowColor}, 
                           0 0 120px ${config.selectedMap.glowColor},
                           inset 0 0 60px ${config.selectedMap.pulseColor},
                           0 40px 100px rgba(0,0,0,0.7)
                        `
                     } as any}
                  >
                     {/* Enhanced Animated Particles */}
                     {Array.from({ length: 25 }).map((_, i) => (
                        <div
                           key={`particle-${i}`}
                           className="absolute rounded-full animate-particle"
                           style={{
                              width: `${4 + Math.random() * 8}px`,
                              height: `${4 + Math.random() * 8}px`,
                              backgroundColor: i % 2 === 0 ? config.selectedMap.particleColor : config.selectedMap.accentColor,
                              left: `${Math.random() * 100}%`,
                              top: `${Math.random() * 100}%`,
                              opacity: 0.4,
                              animationDelay: `${Math.random() * 4}s`,
                              animationDuration: `${4 + Math.random() * 6}s`,
                              filter: 'blur(3px)',
                              boxShadow: `0 0 15px ${i % 2 === 0 ? config.selectedMap.particleColor : config.selectedMap.accentColor}`
                           }}
                        />
                     ))}

                     {/* Center Logo with Enhanced Shimmer */}
                     <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="relative w-48 h-48 opacity-20">
                           <div className="absolute inset-0 animate-shimmer"></div>
                           <div className="absolute inset-0 animate-rotate-slow opacity-50">
                              <div className="w-full h-full rounded-full" style={{
                                 background: `conic-gradient(from 0deg, transparent, ${config.selectedMap.accentColor}40, transparent)`
                              }}></div>
                           </div>
                           <img src="https://i.ibb.co/pvCN1NQP/95505180312.png" alt="Center Logo" className="absolute inset-0 w-full h-full object-contain filter grayscale brightness-75 contrast-125" />
                        </div>
                     </div>

                     {/* Multiple Inner Gradient Borders for Depth */}
                     <div className={`absolute inset-6 border-[6px] ${getArenaShapeClass(config.selectedMap.shape)} opacity-40 animate-border-flow`}
                        style={{
                           '--accent': config.selectedMap.accentColor,
                           '--secondary': config.selectedMap.secondaryColor,
                           borderImage: `linear-gradient(45deg, ${config.selectedMap.accentColor}, ${config.selectedMap.secondaryColor}, ${config.selectedMap.accentColor}) 1`,
                           borderImageSlice: 1
                        } as any}></div>
                     <div className={`absolute inset-12 border-[4px] ${getArenaShapeClass(config.selectedMap.shape)} opacity-25`}
                        style={{
                           borderColor: config.selectedMap.secondaryColor,
                           borderStyle: 'dashed'
                        }}></div>
                  </div>

                  {/* CHAIRS (Smart Distribution) */}
                  <div className="absolute inset-0 z-10 pointer-events-none">
                     {chairs.map((chair) => {
                        const sizes = getDynamicSize(chairs.length);
                        const x = chair.x;
                        const y = chair.y;
                        const isOccupied = !!chair.occupiedBy;

                        return (
                           <div
                              key={chair.id}
                              className={`absolute ${sizes.chair} transition-all duration-500 flex items-center justify-center -translate-x-1/2 -translate-y-1/2 pointer-events-auto ${isOccupied
                                 ? 'rounded-full scale-110 z-40'
                                 : 'bg-transparent z-30 hover:scale-110'
                                 }`}
                              // Note: Removed 'animate-pulse' and gradient background from wrapper to keep it clean, let Avatar shine.
                              style={{
                                 top: `calc(50% + ${y}px)`,
                                 left: `calc(50% + ${x}px)`,
                              }}
                           >
                              {/* Layer 1: Empty Chair Visual (Base) */}
                              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                 <Armchair
                                    size={sizes.chairIcon}
                                    className={'transition-all duration-300'}
                                    style={{
                                       color: config.selectedMap.accentColor,
                                       filter: `drop-shadow(0 0 15px ${config.selectedMap.accentColor})`,
                                       transform: isOccupied ? 'scale(0.8)' : 'scale(1)',
                                       opacity: isOccupied ? 0.3 : 0.8
                                    }}
                                 />
                              </div>

                              {/* --- Layer 2: Occupant Avatar (The Circle) --- */}
                              <div className={`
                                  absolute inset-0 rounded-full border-2 border-white shadow-[0_0_20px_rgba(34,197,94,0.6)] z-50
                                  flex items-center justify-center transition-all duration-300
                               `}
                                 style={{
                                    opacity: isOccupied ? 1 : 0,
                                    scale: isOccupied ? '1' : '0.5',
                                    pointerEvents: 'none',
                                    backgroundColor: '#18181b'
                                 }}
                              >
                                 {isOccupied && chair.occupiedBy && (() => {
                                    const occupant = participants.find(p => p.username === chair.occupiedBy);
                                    return (
                                       <div className="relative w-full h-full rounded-full overflow-hidden">
                                          <ProAvatar
                                             url={occupant?.avatar}
                                             username={occupant?.username || ''}
                                             size="w-full h-full"
                                          />
                                          {/* Chair Badge (Small top-right) */}
                                          {!config.hideNumbers && !isOccupied && (
                                             <div className="absolute top-0 right-0 bg-black/80 text-white font-black text-[9px] px-1.5 py-0.5 rounded-bl-lg border-b border-l border-white/20 min-w-[18px] text-center">
                                                {chair.id}
                                             </div>
                                          )}
                                       </div>
                                    );
                                 })()}
                              </div>



                              {/* --- Floating Number (When Empty) --- */}
                              {
                                 !config.hideNumbers && phase !== 'MUSIC_ON' && !isOccupied && (
                                    <div
                                       className={`absolute -top-8 px-2 py-0.5 rounded-xl ${sizes.text} font-black italic shadow-2xl z-40 transition-all duration-300 bg-black/80 border border-white/20 text-white animate-in zoom-in`}
                                       style={{
                                          borderColor: config.selectedMap.borderColor,
                                          color: config.selectedMap.accentColor,
                                          textShadow: '0 5px 15px rgba(0,0,0,0.5)',
                                       }}
                                    >
                                       {chair.id}
                                    </div>
                                 )
                              }

                              {/* Lucky Chair Indicator */}
                              {
                                 chair.isLucky && !isOccupied && (
                                    <div className="absolute -top-12 -right-12 animate-bounce">
                                       <Sparkles size={40} className="text-yellow-400" fill="currentColor" style={{ filter: 'drop-shadow(0 0 20px rgba(251, 191, 36, 1))' }} />
                                    </div>
                                 )
                              }
                           </div>
                        );
                     })}
                  </div>

                  {/* PLAYERS (The actual movement happens here) */}
                  <div className="absolute inset-0 z-20">
                     {participants.map((p, i) => {
                        const sizes = getDynamicSize(participants.length);
                        const seatedChair = chairs.find(c => c.occupiedBy === p.username);
                        const isSeated = !!seatedChair;

                        // Walking animation: adjusted radius for 1100px arena
                        const radius = chairs.length <= 50 ? 600 : chairs.length <= 150 ? 630 : chairs.length <= 300 ? 660 : 680;
                        const orbit = getPlayerOrbitPos(i, participants.length, radius);

                        // Walking animation: faster and more dynamic
                        const bob = phase === 'MUSIC_ON' ? Math.sin(walkingOffset * 20 + i) * 18 : 0;
                        const tilt = phase === 'MUSIC_ON' ? Math.cos(walkingOffset * 15 + i) * 12 : 0;

                        // Target Coordinates: Either Seat or Orbit
                        const targetX = isSeated && seatedChair ? seatedChair.x : orbit.x;
                        const targetY = isSeated && seatedChair ? seatedChair.y : orbit.y;

                        // When seated, we hide the name and eventually the avatar (to reveal the chair's avatar)
                        // Transition logic: Only animate when NOT running (during selection phase)

                        return (
                           <div
                              key={p.id}
                              className={`absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-2 group ${phase === 'MUSIC_ON' ? 'z-30' : 'z-50 scale-125'}`}
                              style={{
                                 top: `calc(50% + ${targetY}px + ${!isSeated ? bob : 0}px)`,
                                 left: `calc(50% + ${targetX}px)`,
                                 transition: phase !== 'MUSIC_ON' ? 'top 0.4s cubic-bezier(0.4, 0, 0.2, 1), left 0.4s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s ease-in' : 'none',
                                 transform: `translate(-50%, -50%) rotate(${!isSeated ? tilt : 0}deg) ${isSeated ? 'scale(0.5)' : 'scale(1)'}`,
                                 filter: phase === 'MUSIC_ON' ? `drop-shadow(0 0 8px ${config.selectedMap.glowColor})` : 'none',
                                 opacity: isSeated ? 0 : 1
                              }}
                           >
                              <div className={`
                             ${sizes.box} rounded-[2rem] border-2 p-1 backdrop-blur-sm shadow-2xl overflow-hidden relative transition-all duration-300
                             ${phase === 'MUSIC_ON' ? 'border-white/40 bg-black/60' : 'border-white/60 bg-black/80 shadow-[0_0_30px_rgba(255,255,255,0.3)]'}
                          `}
                                 style={{
                                    boxShadow: phase === 'MUSIC_ON'
                                       ? `0 0 30px ${config.selectedMap.glowColor}`
                                       : `0 0 40px rgba(255,255,255,0.4)`
                                 }}
                              >
                                 {/* Avatar Glow Effect */}
                                 <div className="absolute inset-0 opacity-20 blur-xl" style={{ backgroundColor: p.color || config.selectedMap.accentColor }}></div>

                                 <ProAvatar
                                    url={p.avatar}
                                    username={p.username}
                                    size="w-full h-full"
                                 />
                              </div>
                              <span className={`
                             ${sizes.text} font-black drop-shadow-lg transition-all duration-300
                          `}
                                 style={{
                                    color: p.color || '#fff',
                                    opacity: 1, // Show names while walking/choosing
                                 }}
                              >
                                 {p.username}
                              </span>
                           </div>
                        )
                     })}
                  </div>
               </div>



               {/* RESULTS OVERLAY - PREMIUM REDESIGN */}
               {
                  phase === 'RESULTS' && (
                     <div className="absolute inset-0 z-[100] flex items-center justify-center animate-in zoom-in duration-700 p-8 overflow-hidden">
                        {/* Animated Background */}
                        <div className="absolute inset-0 bg-gradient-to-br from-red-950 via-black to-gray-950" />

                        {/* Animated Particles */}
                        {Array.from({ length: 30 }).map((_, i) => (
                           <div
                              key={`elim-particle-${i}`}
                              className="absolute rounded-full animate-particle"
                              style={{
                                 width: `${3 + Math.random() * 6}px`,
                                 height: `${3 + Math.random() * 6}px`,
                                 backgroundColor: i % 3 === 0 ? '#dc2626' : i % 3 === 1 ? '#991b1b' : '#450a0a',
                                 left: `${Math.random() * 100}%`,
                                 top: `${Math.random() * 100}%`,
                                 opacity: 0.3,
                                 animationDelay: `${Math.random() * 4}s`,
                                 animationDuration: `${5 + Math.random() * 8}s`,
                                 filter: 'blur(2px)',
                                 boxShadow: '0 0 10px currentColor'
                              }}
                           />
                        ))}

                        {/* Red Energy Rings */}
                        <div className="absolute w-[500px] h-[500px] rounded-full opacity-10 animate-pulse-ring"
                           style={{
                              background: 'radial-gradient(circle, transparent 60%, #dc262640 70%, transparent 80%)',
                           }}
                        />
                        <div className="absolute w-[400px] h-[400px] rounded-full opacity-20 animate-pulse-ring"
                           style={{
                              background: 'radial-gradient(circle, transparent 65%, #ef444450 75%, transparent 85%)',
                              animationDelay: '1s'
                           }}
                        />

                        {/* Main Content */}
                        <div className="relative z-10 text-center max-w-7xl w-full flex flex-col items-center">
                           <div className="relative mb-6 group scale-75">
                              <div className="absolute inset-0 bg-red-600/30 blur-[100px] scale-150 animate-pulse" />
                              <div className="relative p-6 bg-gradient-to-br from-red-950/80 via-red-900/60 to-red-950/80 rounded-[2.5rem] border-4 shadow-2xl animate-in zoom-in duration-700"
                                 style={{
                                    borderImage: 'linear-gradient(135deg, #dc2626, #991b1b, #dc2626) 1',
                                    boxShadow: '0 0 80px rgba(220, 38, 38, 0.6), 0 30px 60px rgba(0, 0, 0, 0.8), inset 0 0 40px rgba(220, 38, 38, 0.2)'
                                 }}
                              >
                                 <Skull size={80} className="text-red-500 drop-shadow-[0_0_30px_rgba(239,68,68,1)] animate-pulse" strokeWidth={1.5} />
                              </div>
                           </div>

                           {/* Title with Glitch Effect */}
                           <div className="relative mb-8">
                              <h2 className="text-[70px] font-black text-transparent bg-clip-text bg-gradient-to-b from-red-400 via-red-500 to-red-600 italic uppercase tracking-tighter mb-2 leading-none drop-shadow-[0_0_40px_rgba(239,68,68,0.8)] animate-in slide-in-from-top duration-700"
                                 style={{
                                    WebkitTextStroke: '1px rgba(220, 38, 38, 0.3)',
                                    textShadow: '0 0 80px rgba(239,68,68,0.8), 0 10px 40px rgba(0,0,0,0.9)'
                                 }}
                              >
                                 تم الإقصاء!
                              </h2>
                              <div className="text-red-500/60 font-black text-base uppercase tracking-[0.5em] animate-in fade-in duration-1000 delay-300">
                                 ELIMINATED PLAYERS
                              </div>
                           </div>

                           {/* Eliminated Players Grid - Premium Cards */}
                           <div className="w-full mb-12 relative">
                              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-red-950/20 to-transparent blur-xl" />
                              <div className="relative bg-black/60 backdrop-blur-2xl border-2 rounded-[4rem] p-12 shadow-2xl overflow-hidden"
                                 style={{
                                    borderImage: 'linear-gradient(135deg, rgba(220, 38, 38, 0.3), rgba(153, 27, 27, 0.5), rgba(220, 38, 38, 0.3)) 1',
                                    boxShadow: '0 0 60px rgba(220, 38, 38, 0.2), inset 0 0 80px rgba(0, 0, 0, 0.5)'
                                 }}
                              >
                                 {/* Decorative Corner Elements */}
                                 <div className="absolute top-4 right-4 w-20 h-20 border-t-4 border-r-4 border-red-600/30 rounded-tr-3xl" />
                                 <div className="absolute bottom-4 left-4 w-20 h-20 border-b-4 border-l-4 border-red-600/30 rounded-bl-3xl" />

                                 <div className="max-h-[40vh] overflow-y-auto custom-scrollbar px-4">
                                    {lastEliminated.length > 0 ? (
                                       <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                                          {lastEliminated.map((p, idx) => (
                                             <div
                                                key={p.id}
                                                className="group animate-in slide-in-from-bottom duration-700"
                                                style={{ animationDelay: `${idx * 100}ms` }}
                                             >
                                                <div className="relative bg-gradient-to-br from-red-950/40 via-gray-900/60 to-black/80 rounded-[2.5rem] p-6 border-2 border-red-900/40 backdrop-blur-xl hover:scale-105 hover:border-red-600/60 transition-all duration-500 cursor-pointer shadow-xl"
                                                   style={{
                                                      boxShadow: '0 10px 40px rgba(0, 0, 0, 0.6), inset 0 0 30px rgba(220, 38, 38, 0.1)'
                                                   }}
                                                >
                                                   {/* Glow effect on hover */}
                                                   <div className="absolute inset-0 bg-gradient-to-br from-red-600/0 to-red-600/0 group-hover:from-red-600/20 group-hover:to-transparent rounded-[2.5rem] transition-all duration-500" />

                                                   {/* Skull overlay */}
                                                   <div className="absolute top-3 right-3 opacity-30 group-hover:opacity-60 transition-opacity">
                                                      <Skull size={24} className="text-red-600" />
                                                   </div>

                                                   {/* Avatar Container */}
                                                   <div className="relative mb-4">
                                                      <div className="w-28 h-28 mx-auto rounded-[2rem] border-4 border-red-800/50 overflow-hidden shadow-2xl bg-gradient-to-br from-gray-900 to-black relative group-hover:border-red-600/70 transition-all duration-500"
                                                         style={{
                                                            boxShadow: '0 0 40px rgba(220, 38, 38, 0.4), inset 0 0 20px rgba(0, 0, 0, 0.8)'
                                                         }}
                                                      >
                                                         {/* Red overlay */}
                                                         <div className="absolute inset-0 bg-gradient-to-br from-red-600/40 via-red-900/30 to-black/50 z-10 mix-blend-multiply" />

                                                         {p.avatar ? (
                                                            <img
                                                               src={p.avatar}
                                                               className="w-full h-full object-cover grayscale brightness-75 contrast-125 group-hover:grayscale-0 group-hover:brightness-90 transition-all duration-500 relative z-0"
                                                               alt={p.username}
                                                            />
                                                         ) : (
                                                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-900 to-black">
                                                               <User size={48} className="text-red-800/40" />
                                                            </div>
                                                         )}

                                                         {/* X mark overlay */}
                                                         <div className="absolute inset-0 flex items-center justify-center z-20">
                                                            <div className="w-16 h-16 rounded-full bg-red-600/90 border-4 border-white/90 flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform">
                                                               <span className="text-white text-4xl font-black leading-none">✕</span>
                                                            </div>
                                                         </div>
                                                      </div>
                                                   </div>

                                                   {/* Username */}
                                                   <div className="relative text-center space-y-1">
                                                      <div className="text-sm font-black text-red-400 uppercase tracking-wider group-hover:text-red-300 transition-colors">
                                                         {p.username}
                                                      </div>
                                                      <div className="text-[10px] font-bold text-red-800/60 uppercase tracking-[0.2em]">
                                                         ELIMINATED
                                                      </div>
                                                   </div>

                                                   {/* Bottom accent line */}
                                                   <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-2/3 h-1 bg-gradient-to-r from-transparent via-red-600/50 to-transparent rounded-full" />
                                                </div>
                                             </div>
                                          ))}
                                       </div>
                                    ) : (
                                       <div className="py-20 text-center">
                                          <Ghost size={80} className="text-red-900/20 mx-auto mb-6" />
                                          <span className="text-red-900/40 font-black text-3xl italic">لم يتم استبعاد أحد!</span>
                                       </div>
                                    )}
                                 </div>
                              </div>
                           </div>

                           {/* Action Buttons */}
                           <div className="flex gap-6 justify-center animate-in slide-in-from-bottom duration-700 delay-500">
                              <button
                                 onClick={startMusic}
                                 className="group relative px-20 py-7 bg-gradient-to-r from-green-600 via-green-500 to-green-600 text-white font-black text-3xl rounded-[2.5rem] hover:scale-110 active:scale-95 transition-all duration-300 italic overflow-hidden border-2 border-green-400/30"
                                 style={{
                                    boxShadow: '0 0 60px rgba(34, 197, 94, 0.5), 0 20px 40px rgba(0, 0, 0, 0.6), inset 0 2px 0 rgba(255, 255, 255, 0.3)'
                                 }}
                              >
                                 <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                                 <span className="relative flex items-center gap-3">
                                    <FastForward size={32} className="animate-pulse" />
                                    إعادة الجولة
                                 </span>
                              </button>
                              <button
                                 onClick={resetGame}
                                 className="group relative px-20 py-7 bg-gradient-to-r from-red-600 via-red-500 to-red-600 text-white font-black text-3xl rounded-[2.5rem] hover:scale-110 active:scale-95 transition-all duration-300 italic overflow-hidden border-2 border-red-400/30"
                                 style={{
                                    boxShadow: '0 0 60px rgba(239, 68, 68, 0.5), 0 20px 40px rgba(0, 0, 0, 0.6), inset 0 2px 0 rgba(255, 255, 255, 0.3)'
                                 }}
                              >
                                 <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                                 <span className="relative flex items-center gap-3">
                                    <Settings size={32} className="animate-spin-slow" />
                                    الإعدادات
                                 </span>
                              </button>
                           </div>
                        </div>
                     </div>
                  )
               }
            </div >
         )
         }

         {/* --- PHASE: FINALE - PREMIUM REDESIGN --- */}
         {
            phase === 'FINALE' && winner && (
               <div className="w-full h-full flex flex-col items-center justify-center p-10 animate-in zoom-in duration-1000 relative overflow-hidden">
                  {/* Premium Gradient Background */}
                  <div className="absolute inset-0 bg-gradient-to-br from-amber-950 via-black to-yellow-950" />

                  {/* Radial Glow */}
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-yellow-600/30 via-amber-900/20 to-transparent opacity-80" />

                  {/* Gold Particles */}
                  {Array.from({ length: 50 }).map((_, i) => (
                     <div
                        key={`gold-particle-${i}`}
                        className="absolute rounded-full animate-particle"
                        style={{
                           width: `${2 + Math.random() * 8}px`,
                           height: `${2 + Math.random() * 8}px`,
                           backgroundColor: i % 4 === 0 ? '#fbbf24' : i % 4 === 1 ? '#f59e0b' : i % 4 === 2 ? '#fcd34d' : '#fef3c7',
                           left: `${Math.random() * 100}%`,
                           top: `${Math.random() * 100}%`,
                           opacity: 0.4 + Math.random() * 0.4,
                           animationDelay: `${Math.random() * 4}s`,
                           animationDuration: `${4 + Math.random() * 6}s`,
                           filter: 'blur(1px)',
                           boxShadow: '0 0 15px currentColor'
                        }}
                     />
                  ))}

                  {/* Golden Energy Rings */}
                  <div className="absolute w-[600px] h-[600px] rounded-full opacity-10 animate-pulse-ring"
                     style={{
                        background: 'radial-gradient(circle, transparent 60%, #fbbf2440 70%, transparent 80%)',
                     }}
                  />
                  <div className="absolute w-[450px] h-[450px] rounded-full opacity-15 animate-pulse-ring"
                     style={{
                        background: 'radial-gradient(circle, transparent 65%, #f59e0b50 75%, transparent 85%)',
                        animationDelay: '1s'
                     }}
                  />

                  {/* Main Content */}
                  <div className="relative z-10 text-center w-full max-w-6xl flex flex-col items-center">
                     {/* Trophy Icon with Premium Effects */}
                     <div className="relative mb-8 group animate-in zoom-in duration-1000">
                        <div className="absolute inset-0 bg-yellow-500/40 blur-[120px] scale-[2] animate-pulse" />
                        <div className="relative">
                           <Trophy
                              size={100}
                              className="text-yellow-400 drop-shadow-[0_0_60px_rgba(251,191,36,1)] animate-bounce"
                              strokeWidth={1.5}
                              fill="url(#goldGradient)"
                           />
                           <svg width="0" height="0">
                              <defs>
                                 <linearGradient id="goldGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                    <stop offset="0%" style={{ stopColor: '#fef3c7', stopOpacity: 1 }} />
                                    <stop offset="50%" style={{ stopColor: '#fbbf24', stopOpacity: 1 }} />
                                    <stop offset="100%" style={{ stopColor: '#d97706', stopOpacity: 1 }} />
                                 </linearGradient>
                              </defs>
                           </svg>
                        </div>

                        {/* Sparkles around trophy */}
                        {Array.from({ length: 8 }).map((_, i) => (
                           <Sparkles
                              key={`sparkle-${i}`}
                              size={24}
                              className="absolute text-yellow-300 animate-pulse"
                              fill="currentColor"
                              style={{
                                 top: `${50 + 40 * Math.cos(i * Math.PI / 4)}%`,
                                 left: `${50 + 40 * Math.sin(i * Math.PI / 4)}%`,
                                 animationDelay: `${i * 0.2}s`,
                                 filter: 'drop-shadow(0 0 10px rgba(251, 191, 36, 1))'
                              }}
                           />
                        ))}
                     </div>

                     {/* Winner Title */}
                     <div className="relative mb-12 animate-in slide-in-from-top duration-1000">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-yellow-500/20 to-transparent blur-2xl" />
                        <div className="relative space-y-4">
                           <div className="text-yellow-500 font-black text-3xl uppercase tracking-[0.8em] italic animate-pulse drop-shadow-[0_0_30px_rgba(251,191,36,0.8)]">
                              WINNER SURVIVOR
                           </div>
                           <div className="flex items-center justify-center gap-4">
                              <div className="h-1 w-32 bg-gradient-to-r from-transparent via-yellow-500 to-yellow-500 rounded-full" />
                              <Sparkles size={28} className="text-yellow-400 animate-spin-slow" fill="currentColor" />
                              <div className="h-1 w-32 bg-gradient-to-l from-transparent via-yellow-500 to-yellow-500 rounded-full" />
                           </div>
                        </div>
                     </div>

                     {/* Winner Avatar - Premium Card */}
                     <div className="relative mb-16 group animate-in zoom-in duration-1000 delay-300">
                        {/* Glow effects */}
                        <div className="absolute inset-0 bg-yellow-500/30 blur-[150px] scale-[2.5] animate-pulse" />
                        <div className="absolute inset-0 bg-white/20 blur-[100px] scale-[2] rounded-full" />

                        {/* Main Card */}
                        <div className="relative">
                           {/* Rotating rings */}
                           <div className="absolute -inset-8 border-4 border-dashed border-yellow-500/30 rounded-full animate-rotate-slow" />
                           <div className="absolute -inset-12 border-4 border-dotted border-amber-500/20 rounded-full animate-rotate-reverse" />

                           {/* Avatar Container */}
                           <div className="relative w-56 h-56 rounded-[4rem] border-[12px] overflow-hidden shadow-2xl bg-gradient-to-br from-gray-900 via-black to-gray-900 transform group-hover:rotate-3 group-hover:scale-105 transition-all duration-700"
                              style={{
                                 borderImage: 'linear-gradient(135deg, #fef3c7, #fbbf24, #f59e0b, #fbbf24, #fef3c7) 1',
                                 boxShadow: '0 0 100px rgba(251, 191, 36, 0.8), 0 40px 80px rgba(0, 0, 0, 0.8), inset 0 0 60px rgba(251, 191, 36, 0.2)'
                              }}
                           >
                              {/* Shimmer effect */}
                              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 z-20" />

                              {/* Avatar */}
                              {winner.avatar ? (
                                 <img
                                    src={winner.avatar}
                                    className="w-full h-full object-cover relative z-10 group-hover:scale-110 transition-transform duration-700"
                                    alt={winner.username}
                                 />
                              ) : (
                                 <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-900 to-black">
                                    <User size={140} className="text-yellow-600/40" />
                                 </div>
                              )}

                              {/* Champion Badge */}
                              <div className="absolute bottom-0 w-full bg-gradient-to-r from-yellow-600 via-yellow-500 to-yellow-600 text-white font-black py-3 text-lg tracking-[0.5em] italic z-30 border-t-4 border-yellow-300/50 relative overflow-hidden">
                                 <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
                                 <span className="relative flex items-center justify-center gap-3">
                                    <Trophy size={24} className="animate-bounce" />
                                    C H A M P I O N
                                    <Trophy size={24} className="animate-bounce" style={{ animationDelay: '0.2s' }} />
                                 </span>
                              </div>

                              {/* Corner decorations */}
                              <div className="absolute top-4 right-4 w-16 h-16 border-t-4 border-r-4 border-yellow-400/60 rounded-tr-3xl" />
                              <div className="absolute bottom-20 left-4 w-16 h-16 border-b-4 border-l-4 border-yellow-400/60 rounded-bl-3xl" />
                           </div>

                           {/* Floating crowns */}
                           <div className="absolute -top-6 -right-6 text-6xl animate-bounce">👑</div>
                           <div className="absolute -top-6 -left-6 text-6xl animate-bounce" style={{ animationDelay: '0.3s' }}>👑</div>
                        </div>
                     </div>

                     {/* Winner Username */}
                     <div className="relative mb-16 animate-in slide-in-from-bottom duration-1000 delay-500">
                        <div className="absolute inset-0 bg-yellow-500/20 blur-[100px]" />
                        <h1 className="relative text-[80px] font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-200 via-yellow-400 to-yellow-600 italic tracking-tighter uppercase leading-none"
                           style={{
                              WebkitTextStroke: '3px rgba(251, 191, 36, 0.3)',
                              textShadow: '0 0 100px rgba(251,191,36,0.9), 0 20px 60px rgba(0,0,0,1), 0 0 40px rgba(251,191,36,0.6)'
                           }}
                        >
                           {winner.username}
                        </h1>
                        <div className="text-yellow-600/60 font-black text-2xl uppercase tracking-[0.5em] mt-4">
                           LEGENDARY WINNER
                        </div>
                     </div>

                     {/* Stats Cards */}
                     <div className="grid grid-cols-3 gap-6 mb-12 w-full max-w-4xl animate-in fade-in duration-1000 delay-700">
                        <div className="bg-gradient-to-br from-yellow-950/60 via-black/60 to-amber-950/60 backdrop-blur-xl p-6 rounded-3xl border-2 border-yellow-600/30 shadow-2xl relative overflow-hidden group hover:scale-105 transition-transform">
                           <div className="absolute inset-0 bg-gradient-to-br from-yellow-600/0 to-yellow-600/0 group-hover:from-yellow-600/10 group-hover:to-transparent transition-all" />
                           <Trophy size={40} className="text-yellow-500 mx-auto mb-3 drop-shadow-[0_0_20px_rgba(251,191,36,0.8)]" />
                           <div className="text-5xl font-black text-yellow-400 mb-2">500</div>
                           <div className="text-xs font-bold text-yellow-600/60 uppercase tracking-wider">نقاط</div>
                        </div>
                        <div className="bg-gradient-to-br from-yellow-950/60 via-black/60 to-amber-950/60 backdrop-blur-xl p-6 rounded-3xl border-2 border-yellow-600/30 shadow-2xl relative overflow-hidden group hover:scale-105 transition-transform">
                           <div className="absolute inset-0 bg-gradient-to-br from-yellow-600/0 to-yellow-600/0 group-hover:from-yellow-600/10 group-hover:to-transparent transition-all" />
                           <Target size={40} className="text-yellow-500 mx-auto mb-3 drop-shadow-[0_0_20px_rgba(251,191,36,0.8)]" />
                           <div className="text-5xl font-black text-yellow-400 mb-2">#1</div>
                           <div className="text-xs font-bold text-yellow-600/60 uppercase tracking-wider">مركز</div>
                        </div>
                        <div className="bg-gradient-to-br from-yellow-950/60 via-black/60 to-amber-950/60 backdrop-blur-xl p-6 rounded-3xl border-2 border-yellow-600/30 shadow-2xl relative overflow-hidden group hover:scale-105 transition-transform">
                           <div className="absolute inset-0 bg-gradient-to-br from-yellow-600/0 to-yellow-600/0 group-hover:from-yellow-600/10 group-hover:to-transparent transition-all" />
                           <Sparkles size={40} className="text-yellow-500 mx-auto mb-3 drop-shadow-[0_0_20px_rgba(251,191,36,0.8)]" fill="currentColor" />
                           <div className="text-5xl font-black text-yellow-400 mb-2">{currentRound}</div>
                           <div className="text-xs font-bold text-yellow-600/60 uppercase tracking-wider">جولات</div>
                        </div>
                     </div>

                     {/* Action Buttons */}
                     <div className="flex gap-8 justify-center animate-in slide-in-from-bottom duration-1000 delay-1000">
                        <button
                           onClick={resetGame}
                           className="group relative px-20 py-7 bg-gradient-to-r from-yellow-600 via-yellow-500 to-yellow-600 text-black font-black text-3xl rounded-[2.5rem] hover:scale-110 active:scale-95 transition-all duration-300 italic overflow-hidden border-2 border-yellow-300/50 shadow-2xl"
                           style={{
                              boxShadow: '0 0 80px rgba(251, 191, 36, 0.6), 0 20px 50px rgba(0, 0, 0, 0.7), inset 0 2px 0 rgba(255, 255, 255, 0.4)'
                           }}
                        >
                           <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                           <span className="relative flex items-center gap-3">
                              <Play size={32} fill="currentColor" />
                              إعادة اللعبة
                           </span>
                        </button>
                        <button
                           onClick={onHome}
                           className="group relative px-20 py-7 bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800 text-white font-black text-3xl rounded-[2.5rem] hover:scale-110 active:scale-95 transition-all duration-300 italic overflow-hidden border-2 border-gray-600/50 backdrop-blur-xl"
                           style={{
                              boxShadow: '0 0 40px rgba(75, 85, 99, 0.5), 0 20px 50px rgba(0, 0, 0, 0.7), inset 0 2px 0 rgba(255, 255, 255, 0.1)'
                           }}
                        >
                           <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                           <span className="relative flex items-center gap-3">
                              <Home size={32} />
                              الرئيسية
                           </span>
                        </button>
                     </div>

                     {/* Confetti effect (text based) */}
                     <div className="absolute inset-0 pointer-events-none">
                        {Array.from({ length: 20 }).map((_, i) => (
                           <div
                              key={`confetti-${i}`}
                              className="absolute text-4xl animate-particle"
                              style={{
                                 left: `${Math.random() * 100}%`,
                                 top: `-10%`,
                                 animationDelay: `${Math.random() * 2}s`,
                                 animationDuration: `${3 + Math.random() * 3}s`,
                                 opacity: 0.6
                              }}
                           >
                              {['🎉', '🎊', '✨', '⭐', '💫'][i % 5]}
                           </div>
                        ))}
                     </div>
                  </div>
               </div>
            )
         }

         {/* --- PHASE: DRAW (EVERYONE ELIMINATED) - PREMIUM DESIGN --- */}
         {
            phase === 'DRAW' && (
               <div className="w-full h-full flex flex-col items-center justify-center p-10 animate-in zoom-in duration-1000 relative overflow-hidden">
                  {/* Premium Gradient Background */}
                  <div className="absolute inset-0 bg-gradient-to-br from-orange-950 via-black to-gray-950" />

                  {/* Radial Glow */}
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-orange-600/30 via-gray-900/20 to-transparent opacity-80" />

                  {/* Particles */}
                  {Array.from({ length: 40 }).map((_, i) => (
                     <div
                        key={`draw-particle-${i}`}
                        className="absolute rounded-full animate-particle"
                        style={{
                           width: `${2 + Math.random() * 6}px`,
                           height: `${2 + Math.random() * 6}px`,
                           backgroundColor: i % 3 === 0 ? '#f97316' : i % 3 === 1 ? '#ea580c' : '#9a3412',
                           left: `${Math.random() * 100}%`,
                           top: `${Math.random() * 100}%`,
                           opacity: 0.3,
                           animationDelay: `${Math.random() * 4}s`,
                           animationDuration: `${5 + Math.random() * 8}s`,
                           filter: 'blur(2px)',
                           boxShadow: '0 0 10px currentColor'
                        }}
                     />
                  ))}

                  {/* Energy Rings */}
                  <div className="absolute w-[900px] h-[900px] rounded-full opacity-10 animate-pulse-ring"
                     style={{
                        background: 'radial-gradient(circle, transparent 60%, #f9731640 70%, transparent 80%)',
                     }}
                  />
                  <div className="absolute w-[700px] h-[700px] rounded-full opacity-15 animate-pulse-ring"
                     style={{
                        background: 'radial-gradient(circle, transparent 65%, #ea580c50 75%, transparent 85%)',
                        animationDelay: '1.2s'
                     }}
                  />

                  {/* Main Content */}
                  <div className="relative z-10 text-center w-full max-w-5xl flex flex-col items-center">
                     {/* Icon Container */}
                     <div className="relative mb-10 group animate-in zoom-in duration-1000">
                        <div className="absolute inset-0 bg-orange-500/30 blur-[100px] scale-[2] animate-pulse" />
                        <div className="relative flex items-center justify-center gap-8">
                           {/* Left Trophy */}
                           <div className="relative">
                              <Trophy
                                 size={120}
                                 className="text-orange-400 drop-shadow-[0_0_50px_rgba(249,115,22,1)] animate-pulse"
                                 strokeWidth={1.5}
                              />
                              <div className="absolute -top-4 -right-4 w-12 h-12 rounded-full bg-orange-600/90 border-4 border-white/90 flex items-center justify-center shadow-2xl">
                                 <span className="text-white text-2xl font-black leading-none">=</span>
                              </div>
                           </div>

                           {/* VS Symbol */}
                           <div className="relative">
                              <div className="w-28 h-28 rounded-full bg-gradient-to-br from-orange-600 via-orange-500 to-orange-600 border-4 border-white/30 flex items-center justify-center shadow-2xl animate-pulse"
                                 style={{
                                    boxShadow: '0 0 80px rgba(249, 115, 22, 0.6), 0 30px 60px rgba(0, 0, 0, 0.8), inset 0 0 40px rgba(249, 115, 22, 0.2)'
                                 }}
                              >
                                 <span className="text-white text-5xl font-black italic">VS</span>
                              </div>
                              {/* Sparkles around VS */}
                              {Array.from({ length: 6 }).map((_, i) => (
                                 <Zap
                                    key={`vs-spark-${i}`}
                                    size={20}
                                    className="absolute text-orange-300 animate-pulse"
                                    fill="currentColor"
                                    style={{
                                       top: `${50 + 45 * Math.cos(i * Math.PI / 3)}%`,
                                       left: `${50 + 45 * Math.sin(i * Math.PI / 3)}%`,
                                       animationDelay: `${i * 0.15}s`,
                                       filter: 'drop-shadow(0 0 8px rgba(249, 115, 22, 1))'
                                    }}
                                 />
                              ))}
                           </div>

                           {/* Right Trophy */}
                           <div className="relative">
                              <Trophy
                                 size={120}
                                 className="text-orange-400 drop-shadow-[0_0_50px_rgba(249,115,22,1)] animate-pulse"
                                 strokeWidth={1.5}
                                 style={{ animationDelay: '0.3s' }}
                              />
                              <div className="absolute -top-4 -left-4 w-12 h-12 rounded-full bg-orange-600/90 border-4 border-white/90 flex items-center justify-center shadow-2xl">
                                 <span className="text-white text-2xl font-black leading-none">=</span>
                              </div>
                           </div>
                        </div>
                     </div>

                     {/* Title */}
                     <div className="relative mb-10 animate-in slide-in-from-top duration-1000">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-orange-500/20 to-transparent blur-2xl" />
                        <div className="relative space-y-4">
                           <h1 className="text-[80px] font-black text-transparent bg-clip-text bg-gradient-to-b from-orange-300 via-orange-500 to-orange-700 italic uppercase tracking-tighter leading-none"
                              style={{
                                 WebkitTextStroke: '3px rgba(249, 115, 22, 0.3)',
                                 textShadow: '0 0 100px rgba(249,115,22,0.9), 0 20px 60px rgba(0,0,0,1), 0 0 40px rgba(249,115,22,0.6)'
                              }}
                           >
                              تعادل!
                           </h1>
                           <div className="text-orange-500/70 font-black text-2xl uppercase tracking-[0.5em] animate-pulse">
                              NO ONE SURVIVED
                           </div>
                           <div className="flex items-center justify-center gap-4 mt-6">
                              <div className="h-1 w-32 bg-gradient-to-r from-transparent via-orange-500 to-orange-500 rounded-full" />
                              <Ghost size={32} className="text-orange-400 animate-bounce" />
                              <div className="h-1 w-32 bg-gradient-to-l from-transparent via-orange-500 to-orange-500 rounded-full" />
                           </div>
                        </div>
                     </div>

                     {/* Message Box */}
                     <div className="relative mb-8 w-full max-w-xl animate-in fade-in duration-1000 delay-300 scale-90">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-orange-950/30 to-transparent blur-xl" />
                        <div className="relative bg-black/60 backdrop-blur-2xl border-2 rounded-[3rem] p-8 shadow-2xl overflow-hidden"
                           style={{
                              borderImage: 'linear-gradient(135deg, rgba(249, 115, 22, 0.3), rgba(234, 88, 12, 0.5), rgba(249, 115, 22, 0.3)) 1',
                              boxShadow: '0 0 60px rgba(249, 115, 22, 0.3), inset 0 0 80px rgba(0, 0, 0, 0.5)'
                           }}
                        >
                           {/* Decorative Corner Elements */}
                           <div className="absolute top-4 right-4 w-20 h-20 border-t-4 border-r-4 border-orange-600/30 rounded-tr-3xl" />
                           <div className="absolute bottom-4 left-4 w-20 h-20 border-b-4 border-l-4 border-orange-600/30 rounded-bl-3xl" />

                           <div className="space-y-4 text-center">
                              <div className="flex items-center justify-center gap-4 mb-6">
                                 <Skull size={40} className="text-orange-500" />
                                 <div className="text-6xl">💀</div>
                                 <Skull size={40} className="text-orange-500" />
                              </div>
                              <p className="text-2xl font-black text-orange-400 leading-relaxed">
                                 لم يتمكن أي لاعب من الجلوس على الكراسي!
                              </p>
                              <p className="text-xl font-bold text-orange-600/60 leading-relaxed">
                                 تم إقصاء جميع المتسابقين في نفس الوقت
                              </p>
                              <div className="flex items-center justify-center gap-3 pt-4">
                                 <div className="w-3 h-3 rounded-full bg-orange-500 animate-pulse" />
                                 <div className="w-3 h-3 rounded-full bg-orange-500 animate-pulse" style={{ animationDelay: '0.2s' }} />
                                 <div className="w-3 h-3 rounded-full bg-orange-500 animate-pulse" style={{ animationDelay: '0.4s' }} />
                              </div>
                           </div>
                        </div>
                     </div>

                     {/* Action Buttons */}
                     <div className="flex gap-8 justify-center animate-in slide-in-from-bottom duration-1000 delay-500">
                        <button
                           onClick={resetGame}
                           className="group relative px-20 py-7 bg-gradient-to-r from-orange-600 via-orange-500 to-orange-600 text-white font-black text-3xl rounded-[2.5rem] hover:scale-110 active:scale-95 transition-all duration-300 italic overflow-hidden border-2 border-orange-300/50 shadow-2xl"
                           style={{
                              boxShadow: '0 0 80px rgba(249, 115, 22, 0.6), 0 20px 50px rgba(0, 0, 0, 0.7), inset 0 2px 0 rgba(255, 255, 255, 0.4)'
                           }}
                        >
                           <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                           <span className="relative flex items-center gap-3">
                              <Play size={32} fill="currentColor" />
                              إعادة المباراة
                           </span>
                        </button>
                        <button
                           onClick={() => setPhase('SETUP')}
                           className="group relative px-20 py-7 bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800 text-white font-black text-3xl rounded-[2.5rem] hover:scale-110 active:scale-95 transition-all duration-300 italic overflow-hidden border-2 border-gray-600/50 backdrop-blur-xl"
                           style={{
                              boxShadow: '0 0 40px rgba(75, 85, 99, 0.5), 0 20px 50px rgba(0, 0, 0, 0.7), inset 0 2px 0 rgba(255, 255, 255, 0.1)'
                           }}
                        >
                           <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                           <span className="relative flex items-center gap-3">
                              <Settings size={32} />
                              الإعدادات
                           </span>
                        </button>
                     </div>

                     {/* Floating Emojis */}
                     <div className="absolute inset-0 pointer-events-none">
                        {Array.from({ length: 15 }).map((_, i) => (
                           <div
                              key={`emoji-${i}`}
                              className="absolute text-5xl animate-particle opacity-40"
                              style={{
                                 left: `${Math.random() * 100}%`,
                                 top: `${Math.random() * 100}%`,
                                 animationDelay: `${Math.random() * 3}s`,
                                 animationDuration: `${6 + Math.random() * 4}s`,
                              }}
                           >
                              {['💀', '👻', '⚡', '💥', '🔥'][i % 5]}
                           </div>
                        ))}
                     </div>
                  </div>
               </div>
            )
         }
      </div >
   );
};
