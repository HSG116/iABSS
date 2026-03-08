import React, { useState, useEffect, useRef } from 'react';
import { Layout } from './components/Layout';
import { CategorySelect } from './components/CategorySelect';
import { FawazirGame } from './components/FawazirGame';
import { MusicalChairsGame } from './components/MusicalChairsGame';
import { MasaqilWar } from './components/MasaqilWar';
import { BlurGuess } from './components/BlurGuess';
import { SpinWheel } from './components/SpinWheel';
import { Raffle } from './components/Raffle';
import { FlagQuiz } from './components/FlagQuiz';
import { TeamBattle } from './components/TeamBattle';
import { TypingRace } from './components/TypingRace';
import { GridHunt } from './components/GridHunt';
import { CupShuffle } from './components/CupShuffle';
import { TerritoryWar } from './components/TerritoryWar';
import { TruthOrLie } from './components/TruthOrLie';

import { DrawingChallenge } from './components/DrawingChallenge';
import { FruitWar } from './components/FruitWar';
import { LogoRound } from './components/LogoRound';
import { ForbiddenWords } from './components/ForbiddenWords';
import { VotingGame } from './components/VotingGame';
import { TimeBomb } from './components/TimeBomb';
import { WordBuilder } from './components/WordBuilder';
import { GlassBridgeV2 } from './components/GlassBridgeV2';
import { FloorIsLava } from './components/FloorIsLava';
import { EmojiCode } from './components/EmojiCode';
import { LetterHexagonGame } from './components/LetterHexagonGame';
import { BuzzerPad } from './components/BuzzerPad';
import { AdminDashboard } from './components/AdminDashboard';
import { GlobalAnnouncement } from './components/GlobalAnnouncement';
import { ViewState } from './types';
import { GlobalPasswordPage } from './components/GlobalPasswordPage';
import { UserDashboard } from './components/UserDashboard';
import {
  Trophy, Play, Lock, User, Swords, Image as ImageIcon,
  RotateCw, Gift, Flag, Users2, Keyboard, Gem, Coffee,
  PaintBucket, Sparkles, ShieldCheck, Zap, Armchair,
  Maximize2, MonitorOff, CheckCircle2, AlertTriangle,
  Crown, Medal, Loader2, RefreshCw, ChevronRight, Video,
  Sword, Globe, Brain, Vote, Bomb, Type, Footprints, Flame, Smile,
  ArrowUp, ArrowDown, Edit2, Save, Eye, EyeOff, Maximize, Minimize, Layout as LayoutIcon, X, LogIn
} from 'lucide-react';
import { getAssetUrl } from './utils/assets';
import { chatService } from './services/chatService';
import { supabase, leaderboardService, gamesService } from './services/supabase';
import { OBSLinksModal } from './components/OBSLinksModal';
import { SponsorsWidget } from './components/SponsorsWidget';
import { ProAvatar } from './components/ProAvatar';
import TecshIcon from './components/TecsIcon';

const ICON_MAP: Record<string, any> = {
  Sparkles, Armchair, TecshIcon, ImageIcon, Zap, Gift, Flag, Users2, Keyboard, Swords, Coffee, PaintBucket, AlertTriangle, Video, Sword, Globe, Brain, Vote, Bomb, Type, Footprints, Flame, Smile
};


const App: React.FC = () => {
  // Initialize from URL params to prevent flicker
  const getInitialParams = () => {
    if (typeof window === 'undefined') return { obs: false, view: 'HOME' as ViewState };
    const params = new URLSearchParams(window.location.search);
    const studioToken = !!(process.env.OBS_STUDIO_TOKEN && params.get('t') === process.env.OBS_STUDIO_TOKEN);
    return {
      obs: params.get('obs') === 'true' || studioToken,
      view: studioToken ? 'DRAWING_CHALLENGE' : (params.get('view') as ViewState) || 'HOME'
    };
  };

  const initialParams = getInitialParams();
  const [currentView, setCurrentView] = useState<ViewState | 'ADMIN_LOGIN' | 'ADMIN_PANEL'>(() => {
    if (initialParams.view !== 'HOME') return initialParams.view;
    try {
      const stored = localStorage.getItem('site_access_granted');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.valid && parsed.role === 'user') return 'USER_DASHBOARD';
      }
    } catch (e) { }
    return initialParams.view;
  });
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showWelcome, setShowWelcome] = useState(!initialParams.obs);
  const [isOBSMode, setIsOBSMode] = useState(initialParams.obs);
  const [showOBSModal, setShowOBSModal] = useState(false);
  const [showObsPreview, setShowObsPreview] = useState(false);

  // Authorization State - bypass for OBS
  const [isAuthorized, setIsAuthorized] = useState<boolean>(() => {
    if (initialParams.obs) return true;
    try {
      const stored = localStorage.getItem('site_access_granted');
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed.valid === true;
      }
    } catch (e) { }
    return false;
  });
  const [userRole, setUserRole] = useState<'admin' | 'user'>(() => {
    try {
      const stored = localStorage.getItem('site_access_granted');
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed.role || 'admin';
      }
    } catch (e) { }
    return 'admin';
  });

  const [leaderboardData, setLeaderboardData] = useState<any[]>([]);
  const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState(false);
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');


  const [activeAnnouncement, setActiveAnnouncement] = useState<string | null>(null);

  // Games Management State
  const [games, setGames] = useState<any[]>([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSavingGames, setIsSavingGames] = useState(false);

  const loadGames = async () => {
    const { data } = await gamesService.getAllGames();
    if (data && data.length > 0) {
      setGames(data);
    }
  };

  useEffect(() => {
    loadGames();
  }, []);

  const moveGame = (index: number, direction: 'up' | 'down') => {
    const newGames = [...games];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newGames.length) return;

    [newGames[index], newGames[targetIndex]] = [newGames[targetIndex], newGames[index]];

    // Update positions
    const updatedGames = newGames.map((g, i) => ({ ...g, position: i + 1 }));
    setGames(updatedGames);
  };

  const saveGamesOrder = async () => {
    setIsSavingGames(true);
    const gamesToSave = games.map(g => ({
      id: g.id,
      title: g.title,
      view_id: g.view_id,
      icon_name: g.icon_name,
      position: g.position,
      is_primary: !!g.is_primary,
      is_visible: g.is_visible !== false,
      has_obs: !!g.has_obs,
      is_coming_soon: !!g.is_coming_soon,
      coming_soon_text: g.coming_soon_text || 'قريباً'
    }));

    if (gamesToSave.some(g => !g.id)) {
      console.error("Missing ID in some games:", gamesToSave);
      alert("خطأ: بعض الألعاب تفتقد للمعرف (ID). يرجى تحديث الصفحة.");
      setIsSavingGames(false);
      return;
    }

    const { error } = await gamesService.updateAllPositions(gamesToSave);
    if (!error) {
      console.log("Save successful!");
      await loadGames();
      setIsEditMode(false);
    } else {
      console.error("Save error:", error);
      alert("حدث خطأ أثناء الحفظ: " + (error as any).message);
    }
    setIsSavingGames(false);
  };

  const toggleGameVisibility = (id: string) => {
    setGames(prev => prev.map(g =>
      g.id === id ? { ...g, is_visible: !g.is_visible } : g
    ));
  };

  const toggleGameSize = (id: string) => {
    setGames(prev => prev.map(g =>
      g.id === id ? { ...g, is_primary: !g.is_primary } : g
    ));
  };





  const playNotificationSound = () => {
    try {
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
      audio.volume = 0.6;
      audio.play().catch(e => console.warn("Sound play blocked:", e));
    } catch (e) {
      console.warn("Audio failed:", e);
    }
  };

  useEffect(() => {
    if (isOBSMode) {
      document.body.classList.add('obs-mode');
    } else {
      document.body.classList.remove('obs-mode');
    }
  }, [isOBSMode]);

  // Global Chat Connection
  useEffect(() => {
    const channel = localStorage.getItem('kick_channel_name') || 'iabs';
    console.log(`[App] Initializing Chat Connection for: ${channel}`);
    chatService.connect(channel);

    // Cleanup is not strictly necessary here as we want it persistent, 
    // but good practice if App unmounts (rare)
    return () => {
      // We don't disconnect here to keep it alive for OBS/GAMES
      // unless we really want a clean exit.
    };
  }, []);

  useEffect(() => {
    // Better Real-time listener
    const channel = supabase
      .channel('announcements_realtime')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'announcements' },
        (payload) => {
          console.log('SURPRISE! New announcement:', payload.new.content);
          setActiveAnnouncement(payload.new.content);
          playNotificationSound();
        }
      )
      .subscribe((status) => {
        console.log('Announcement subscription status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadLeaderboard = (silent: boolean = false) => {
    if (!silent) setIsLoadingLeaderboard(true);
    leaderboardService.getAllRankedPlayers().then(data => {
      setLeaderboardData(data);
      if (!silent) setIsLoadingLeaderboard(false);
    });
  };

  useEffect(() => {
    if (currentView === 'LEADERBOARD') {
      loadLeaderboard();
    }
  }, [currentView]);

  useEffect(() => {
    if (currentView === 'LEADERBOARD') {
      const channel = supabase.channel('leaderboard_updates')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'leaderboard' }, () => loadLeaderboard(true))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => loadLeaderboard(true))
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [currentView]);

  // Security Check for Admin Panel
  useEffect(() => {
    if (currentView === 'ADMIN_PANEL') {
      if (userRole === 'admin') {
        const adminAuth = localStorage.getItem('admin_access_granted');
        if (!adminAuth) {
          const siteAuth = localStorage.getItem('site_access_granted');
          if (siteAuth) localStorage.setItem('admin_access_granted', siteAuth);
        }
        return;
      }
      try {
        const stored = localStorage.getItem('admin_access_granted');
        const parsed = stored ? JSON.parse(stored) : null;
        if (!parsed || !parsed.valid) setCurrentView('ADMIN_LOGIN');
      } catch (e) {
        setCurrentView('ADMIN_LOGIN');
      }
    }
  }, [currentView, userRole]);

  // PROTECTION: Prevent regular users from accessing the HOME page
  useEffect(() => {
    if (isAuthorized && userRole === 'user' && currentView === 'HOME') {
      console.log("[Security] Redirecting user from HOME to DASHBOARD");
      setCurrentView('USER_DASHBOARD');
    }
  }, [isAuthorized, userRole, currentView]);

  const handleCategorySelect = (id: string) => {
    setSelectedCategory(id);
    setCurrentView('FAWAZIR_GAME');
  };

  const handleAdminLogin = async () => {
    const isValid = await leaderboardService.verifyAdminPassword(adminPasswordInput);
    if (isValid) {
      setCurrentView('ADMIN_PANEL');
      setAdminPasswordInput('');
      setLoginError('');
    } else {
      setLoginError('كلمة المرور غير صحيحة');
    }
  };



  const handleGoHome = () => {
    if (userRole === 'user') {
      setCurrentView('USER_DASHBOARD');
    } else {
      setCurrentView('HOME');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('site_access_granted');
    localStorage.removeItem('admin_access_granted');
    localStorage.removeItem('iabs_user');
    setIsAuthorized(false);
    setUserRole('admin');
    setCurrentView('HOME');
    window.location.reload(); // Refresh to ensure clean state
  };

  const PremiumGameButton = ({
    title, icon: Icon, onClick, isPrimary = false, isComingSoon = false,
    comingSoonText = "قريباً", hasOBS = false, index, total,
    onMoveUp, onMoveDown, isEditMode, isVisible = true, onToggleVisibility, onToggleSize
  }: any) => {
    // Dynamic size scaling based on position (smaller towards the end)
    const scale = isEditMode ? 1 : Math.max(0.85, 1 - (index / (total * 2)));

    return (
      <div className={`relative group/btn-container transition-all duration-500 ${!isVisible && !isEditMode ? 'hidden' : ''}`} style={{ transform: `scale(${scale})` }}>
        <button
          onClick={isComingSoon ? undefined : onClick}
          disabled={isComingSoon || isEditMode}
          className={`group relative flex items-center justify-center gap-3 md:gap-4 overflow-hidden border-2 transition-all duration-300 active:scale-95 text-white font-black italic
            ${isEditMode ? "border-white/40 ring-4 ring-white/10 scale-95 opacity-80" : "border-white/10"}
            ${!isVisible && isEditMode ? "opacity-40 grayscale" : ""}
            ${isComingSoon ? "bg-zinc-900 cursor-not-allowed grayscale pointer-events-none" : "bg-iabs-red shadow-[0_15px_40px_rgba(255,0,0,0.3)]"}
            ${isPrimary
              ? "px-6 py-4 text-xl md:text-2xl rounded-[2rem] hover:scale-105 w-full lg:max-w-lg shadow-[0_20px_50px_rgba(255,0,0,0.4)]"
              : "px-3 py-3 text-sm md:text-base rounded-[1.5rem] hover:scale-105 w-full"
            } `}
        >
          <div className="absolute inset-0 bg-white/30 translate-x-[-150%] group-hover:translate-x-[150%] transition-transform duration-1000 skew-x-[-35deg] pointer-events-none z-20"></div>
          <div className="absolute top-0 left-0 w-full h-[45%] bg-gradient-to-b from-white/30 to-transparent pointer-events-none z-10"></div>

          {hasOBS && (
            <div className="absolute top-0 left-0 z-50 flex items-center gap-1 bg-black/60 backdrop-blur-md px-1.5 py-0.5 rounded-br-xl border-b border-r border-white/20 shadow-lg group-hover:bg-red-600/80 transition-colors">
              <Video size={10} className="text-white drop-shadow-sm" />
              <span className="text-[8px] font-black text-white uppercase tracking-tighter">OBS</span>
            </div>
          )}

          <div className="relative z-30 flex-shrink-0 transition-all duration-500 transform group-hover:scale-110 group-hover:rotate-6 flex items-center justify-center">
            <div className={`relative ${isPrimary ? 'w-10 h-10' : 'w-8 h-8'} flex items-center justify-center ${isComingSoon ? 'opacity-30' : ''}`}>
              <Icon size={isPrimary ? 32 : 20} color="#FFFFFF" strokeWidth={2.5} className="drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]" />
            </div>
          </div>

          <span className={`relative z-30 text-white font-black italic tracking-tighter uppercase leading-none bg-transparent ${isComingSoon ? 'opacity-30' : ''}`}>
            {title}
          </span>

          {isComingSoon && (
            <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-[2px]">
              <div className="bg-yellow-500 text-black px-4 py-0.5 rounded-full font-black text-xs -rotate-12 shadow-[0_0_20px_rgba(234,179,8,0.5)] animate-pulse">
                {comingSoonText}
              </div>
            </div>
          )}

          {!isVisible && isEditMode && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 border-2 border-dashed border-white/20 rounded-inherit">
              <EyeOff size={24} className="text-white/50" />
            </div>
          )}
        </button>

        {isEditMode && (
          <>
            <div className="absolute -top-3 -right-3 flex flex-col gap-1 z-[60]">
              <button
                onClick={(e) => { e.stopPropagation(); onMoveUp(); }}
                className="bg-zinc-800 hover:bg-zinc-700 p-1.5 rounded-full border border-white/20 text-white shadow-lg"
                title="نقل لأعلى"
              >
                <ArrowUp size={14} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onMoveDown(); }}
                className="bg-zinc-800 hover:bg-zinc-700 p-1.5 rounded-full border border-white/20 text-white shadow-lg"
                title="نقل لأسفل"
              >
                <ArrowDown size={14} />
              </button>
            </div>

            <div className="absolute -top-3 -left-3 flex flex-col gap-1 z-[60]">
              <button
                onClick={(e) => { e.stopPropagation(); onToggleVisibility(); }}
                className={`${isVisible ? 'bg-blue-600 hover:bg-blue-500' : 'bg-zinc-600 hover:bg-zinc-500'} p-1.5 rounded-full border border-white/20 text-white shadow-lg transition-colors`}
                title={isVisible ? "إخفاء اللعبة" : "إظهار اللعبة"}
              >
                {isVisible ? <Eye size={14} /> : <EyeOff size={14} />}
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onToggleSize(); }}
                className="bg-zinc-800 hover:bg-zinc-700 p-1.5 rounded-full border border-white/20 text-white shadow-lg"
                title={isPrimary ? "تحويل لزر صغير" : "تحويل لزر كبير"}
              >
                {isPrimary ? <Minimize size={14} /> : <Maximize size={14} />}
              </button>
            </div>
          </>
        )}
      </div>
    );
  };



  const renderContent = (obsMode: boolean = false) => {
    switch (currentView) {
      case 'ADMIN_PANEL': return <AdminDashboard onLogout={handleGoHome} />;
      case 'ADMIN_LOGIN': return (
        <GlobalPasswordPage
          onSuccess={() => setCurrentView('ADMIN_PANEL')}
          storageKey="admin_access_granted"
          title="بوابة الإدارة"
          subtitle="SYSTEM ADMINISTRATION"
          newTitle="التحقق الإداري"
          returningTitle="دخول المشرف"
        />
      );
      case 'FAWAZIR_SELECT': return <CategorySelect onSelect={handleCategorySelect} onBack={handleGoHome} />;
      case 'FAWAZIR_GAME': return selectedCategory ? <FawazirGame category={selectedCategory} onFinish={() => setCurrentView('LEADERBOARD')} onHome={handleGoHome} isOBS={obsMode} /> : null;
      case 'MUSICAL_CHAIRS': return <MusicalChairsGame onHome={handleGoHome} isOBS={obsMode} />;
      case 'MASAQIL_WAR': return <MasaqilWar channelConnected={true} onHome={handleGoHome} isOBS={obsMode} />;
      case 'BLUR_GUESS': return <BlurGuess channelConnected={true} onHome={handleGoHome} isOBS={obsMode} />;
      case 'SPIN_WHEEL': return <SpinWheel channelConnected={true} onHome={handleGoHome} isOBS={obsMode} />;
      case 'RAFFLE': return <Raffle channelConnected={true} onHome={handleGoHome} isOBS={obsMode} />;
      case 'FLAG_QUIZ': return <FlagQuiz channelConnected={true} onHome={handleGoHome} isOBS={obsMode} />;
      case 'TEAM_BATTLE': return <TeamBattle channelConnected={true} onHome={handleGoHome} isOBS={obsMode} />;
      case 'TYPING_RACE': return <TypingRace channelConnected={true} onHome={handleGoHome} isOBS={obsMode} />;
      case 'GRID_HUNT': return <GridHunt channelConnected={true} onHome={handleGoHome} isOBS={obsMode} />;
      case 'CUP_SHUFFLE': return <CupShuffle channelConnected={true} onHome={handleGoHome} isOBS={obsMode} />;
      case 'TERRITORY_WAR': return <TerritoryWar channelConnected={true} onHome={handleGoHome} isOBS={obsMode} />;
      case 'TRUTH_OR_LIE': return <TruthOrLie channelConnected={true} onHome={handleGoHome} isOBS={obsMode} />;

      case 'DRAWING_CHALLENGE': return <DrawingChallenge onHome={handleGoHome} isOBS={obsMode} />;
      case 'FRUIT_WAR': return <FruitWar onHome={handleGoHome} isOBS={obsMode} />;
      case 'LOGO_ROUND': return <LogoRound onHome={handleGoHome} isOBS={obsMode} />;
      case 'FORBIDDEN_WORDS': return <ForbiddenWords onHome={handleGoHome} isOBS={obsMode} />;
      case 'VOTING_GAME': return <VotingGame onHome={handleGoHome} isOBS={obsMode} />;
      case 'TIME_BOMB': return <TimeBomb onHome={handleGoHome} isOBS={obsMode} />;
      case 'WORD_BUILDER': return <WordBuilder onHome={handleGoHome} isOBS={obsMode} />;
      case 'GLASS_BRIDGE_V2': return <GlassBridgeV2 onHome={handleGoHome} isOBS={obsMode} />;
      case 'FLOOR_IS_LAVA': return <FloorIsLava onHome={handleGoHome} isOBS={obsMode} />;
      case 'EMOJI_CODE': return <EmojiCode onHome={handleGoHome} isOBS={obsMode} />;
      case 'LETTER_GAME': return <LetterHexagonGame onHome={handleGoHome} isOBS={obsMode} onToggleOBSPreview={() => setShowObsPreview(!showObsPreview)} obsPreviewActive={showObsPreview} />;
      case 'BUZZER_PAD': return <BuzzerPad />;

      case 'USER_DASHBOARD': return (
        <div className="flex-1 w-full max-w-7xl mx-auto flex flex-col p-4 md:p-8 animate-in slide-in-from-bottom-20 duration-1000">
          <UserDashboard
            onLogout={handleLogout}
            userData={(() => {
              const stored = localStorage.getItem('iabs_user');
              return stored ? JSON.parse(stored) : { id: '', display_name: 'Guest', kick_username: 'guest' };
            })()}
          />
        </div>
      );

      case 'LEADERBOARD': return (
        <div className="animate-in fade-in zoom-in duration-500 max-w-6xl mx-auto w-full pt-10 px-6 h-full flex flex-col items-center">
          <div className="text-center mb-12">
            <h2 className="text-7xl font-black italic red-neon-text tracking-tighter mb-4">أساطير الساحة</h2>
            <div className="flex items-center justify-center gap-4 text-white/40 uppercase tracking-[0.5em] text-xs font-bold">
              <div className="h-[1px] w-12 bg-white/20" />
              TOP SURVIVORS
              <div className="h-[1px] w-12 bg-white/20" />
            </div>
          </div>

          <div className="w-full space-y-12">
            {/* Top 3 Podium Cards */}
            {!isLoadingLeaderboard && leaderboardData.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-end mb-16">
                {/* 2nd Place */}
                {leaderboardData[1] && (
                  <div className="order-2 md:order-1 h-[280px] glass-card rounded-[3rem] p-8 border-2 border-slate-400/30 flex flex-col items-center justify-center relative hover:scale-105 transition-all group overflow-hidden bg-gradient-to-t from-slate-900/80 to-transparent">
                    <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                      <Medal size={80} className="text-slate-400" />
                    </div>
                    <div className="mb-6 relative group/avatar">
                      <ProAvatar url={leaderboardData[1].avatar_url} username={leaderboardData[1].username} frameUrl={leaderboardData[1].active_frame_url} size="w-24 h-24" className="shadow-2xl" />
                      <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-full bg-slate-400 text-black flex items-center justify-center font-black text-xl border-4 border-black z-[110] shadow-lg">2</div>
                    </div>
                    <div className="text-2xl font-black text-white mb-2">{leaderboardData[1].username}</div>
                    <div className="flex gap-4">
                      <span className="text-slate-400 font-bold">{leaderboardData[1].score || 0} نقطة</span>
                      <span className="text-white/20">|</span>
                      <span className="text-slate-400 font-bold">{leaderboardData[1].wins || 0} فوز</span>
                    </div>
                  </div>
                )}

                {/* 1st Place - Champion */}
                {leaderboardData[0] && (
                  <div className="order-1 md:order-2 h-[340px] glass-card rounded-[3.5rem] p-8 border-4 border-yellow-500/50 flex flex-col items-center justify-center relative hover:scale-110 transition-all group overflow-hidden bg-gradient-to-t from-yellow-900/40 via-yellow-950/20 to-transparent shadow-[0_0_80px_rgba(234,179,8,0.2)]">
                    <div className="absolute -top-10 animate-float opacity-30">
                      <Crown size={120} className="text-yellow-500 blur-sm" />
                    </div>
                    <div className="mb-8 relative z-10 group/avatar">
                      <div className="absolute -inset-4 bg-yellow-500/20 blur-2xl rounded-full animate-pulse" />
                      <ProAvatar url={leaderboardData[0].avatar_url} username={leaderboardData[0].username} frameUrl={leaderboardData[0].active_frame_url} size="w-32 h-32" className="shadow-[0_0_30px_rgba(234,179,8,0.3)]" />
                      <div className="absolute -bottom-2 -right-2 w-12 h-12 rounded-full bg-yellow-500 text-black flex items-center justify-center font-black text-2xl border-4 border-black animate-bounce z-[110] shadow-lg">1</div>
                    </div>
                    <div className="text-4xl font-black text-white italic mb-3 drop-shadow-[0_0_20px_rgba(255,255,255,0.3)]">{leaderboardData[0].username}</div>
                    <div className="flex gap-6 relative z-10 bg-black/40 px-6 py-2 rounded-full border border-yellow-500/20">
                      <span className="text-yellow-500 font-black text-xl">{leaderboardData[0].score || 0} نقطة</span>
                      <span className="text-white/20">|</span>
                      <span className="text-yellow-500 font-black text-xl">{leaderboardData[0].wins || 0} فوز</span>
                    </div>
                  </div>
                )}

                {/* 3rd Place */}
                {leaderboardData[2] && (
                  <div className="order-3 h-[240px] glass-card rounded-[3rem] p-8 border-2 border-orange-700/30 flex flex-col items-center justify-center relative hover:scale-105 transition-all group overflow-hidden bg-gradient-to-t from-orange-950/40 to-transparent">
                    <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                      <Medal size={60} className="text-orange-700" />
                    </div>
                    <div className="mb-6 relative group/avatar">
                      <ProAvatar url={leaderboardData[2].avatar_url} username={leaderboardData[2].username} frameUrl={leaderboardData[2].active_frame_url} size="w-20 h-20" className="shadow-xl" />
                      <div className="absolute -bottom-2 -right-2 w-9 h-9 rounded-full bg-orange-700 text-white flex items-center justify-center font-black text-lg border-4 border-black z-[110] shadow-md">3</div>
                    </div>
                    <div className="text-xl font-black text-white mb-2">{leaderboardData[2].username}</div>
                    <div className="flex gap-4">
                      <span className="text-orange-700 font-bold">{leaderboardData[2].score || 0} نقطة</span>
                      <span className="text-white/20">|</span>
                      <span className="text-orange-700 font-bold">{leaderboardData[2].wins || 0} فوز</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Rest of the players table */}
            <div className="glass-card rounded-[3rem] border border-white/5 overflow-hidden shadow-2xl bg-black/40 backdrop-blur-xl flex-1 mb-8">
              {isLoadingLeaderboard ? (
                <div className="flex flex-col items-center justify-center h-[300px] gap-6">
                  <Loader2 className="animate-spin text-iabs-red" size={60} />
                  <div className="text-xl text-gray-400 font-bold animate-pulse italic tracking-widest">GATHERING LEGENDS...</div>
                </div>
              ) : (
                <div className="overflow-x-auto h-full custom-scrollbar">
                  <table className="w-full text-right">
                    <thead className="bg-white/5 border-b border-white/5">
                      <tr className="text-gray-400 font-black uppercase text-[10px] tracking-[0.3em]">
                        <th className="p-8 text-center w-24">الرتبة</th>
                        <th className="p-8 text-right">المتسابق</th>
                        <th className="p-8 text-center">مرات الفوز</th>
                        <th className="p-8 text-left">مجموع النقاط</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {leaderboardData.slice(3).map((user, index) => (
                        <tr key={user.id} className="hover:bg-white/10 transition-all group animate-in slide-in-from-right duration-500" style={{ animationDelay: `${index * 50} ms` }}>
                          <td className="p-6 text-center">
                            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center font-black text-gray-500 group-hover:text-white group-hover:bg-iabs-red/20 transition-all transition-colors border border-white/5">
                              {index + 4}
                            </div>
                          </td>
                          <td className="p-6">
                            <div className="flex items-center gap-6">
                              <ProAvatar url={user.avatar_url} username={user.username} frameUrl={user.active_frame_url} />
                              <span className="font-black text-2xl text-white group-hover:text-iabs-red transition-all group-hover:translate-x-[-4px] tracking-tight">{user.username}</span>
                            </div>
                          </td>
                          <td className="p-6 text-center">
                            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-white/5 border border-white/5 font-black text-xl text-gray-300 group-hover:text-white group-hover:border-white/20 transition-all font-mono">
                              {user.wins || 0}
                            </div>
                          </td>
                          <td className="p-6 text-left">
                            <div className="font-black text-3xl text-kick-green font-mono tracking-tighter drop-shadow-[0_0_15px_rgba(83,252,24,0.4)] group-hover:scale-110 transition-transform origin-left">
                              {user.score || 0}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {leaderboardData.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-32 space-y-6 opacity-20">
                      <Trophy size={100} strokeWidth={1} />
                      <div className="text-2xl font-black italic">ARENA IS EMPTY</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-6 mt-10 mb-16">
            <button onClick={handleGoHome} className="group px-12 py-5 bg-white/5 hover:bg-white/10 rounded-[2rem] text-white font-black text-lg transition-all border border-white/10 hover:border-white/30 flex items-center gap-4">
              <ChevronRight className="group-hover:translate-x-2 transition-transform" /> العودة للرئيسية
            </button>
            <button onClick={loadLeaderboard} className="p-5 bg-iabs-red/10 text-iabs-red rounded-[2rem] border-2 border-iabs-red/20 hover:bg-iabs-red hover:text-white transition-all">
              <RefreshCw size={24} className={isLoadingLeaderboard ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      );

      case 'HOME':
      default:
        return (
          <div className="flex-1 flex flex-col items-center w-full max-w-7xl px-4 py-4 animate-in fade-in slide-in-from-bottom-12 duration-1000">
            <div className="mb-8 relative flex flex-col items-center">
              <div className="absolute inset-0 bg-iabs-red/10 blur-[150px] rounded-full scale-125 animate-pulse"></div>
              <img src="https://i.ibb.co/pvCN1NQP/95505180312.png" className="h-32 mb-4 animate-float drop-shadow-[0_0_50px_rgba(255,0,0,0.5)]" alt="iABS Logo" />
              <div className="relative text-center">
                <h1 className="text-6xl md:text-8xl font-black red-neon-text leading-none italic tracking-tighter select-none drop-shadow-[0_10px_30px_rgba(255,0,0,0.6)]">
                  iABS ARENA
                </h1>
                <div className="mt-6 flex flex-col items-center gap-4 animate-in slide-in-from-bottom duration-1000 delay-300">
                  <div className="h-[1px] w-full max-w-lg bg-gradient-to-r from-transparent via-red-500/50 to-transparent"></div>

                  <h2 className="text-xl md:text-3xl font-black text-white px-4 text-center leading-relaxed drop-shadow-[0_4px_10px_rgba(0,0,0,0.5)] tracking-wide">
                    أكبر منصة ألعاب تفاعلية للبثوث المباشرة <br />
                    <span className="text-red-500 drop-shadow-[0_0_15px_rgba(239,68,68,0.6)]">بألعاب أكثر من 23 لعبة</span>
                  </h2>

                  <div className="relative bg-black/80 backdrop-blur-3xl px-8 py-4 rounded-3xl border border-red-900/50 hover:border-red-500/50 transition-all hover:scale-105 group shadow-[0_0_50px_rgba(220,38,38,0.2)]">
                    <div className="flex flex-col items-center gap-2 text-center">
                      <div className="flex items-center gap-2 text-2xl md:text-3xl font-black text-white italic">
                        <span className="text-green-500 animate-pulse drop-shadow-[0_0_15px_rgba(34,197,94,0.6)]">+1000</span>
                        <span>شخص لعب بالشات  🔥</span>
                      </div>
                      <span className="text-white/60 text-sm md:text-base font-bold tracking-widest mt-1">
                        يمكنك رؤيتهم في قائمة المتصدرين 🏆
                      </span>
                    </div>
                  </div>

                  <div className="h-[1px] w-full max-w-lg bg-gradient-to-r from-transparent via-red-500/50 to-transparent mt-2"></div>
                </div>
              </div>
            </div>

            <div className="w-full flex flex-col items-center mb-16 space-y-8 px-4">
              {/* Dynamic Primary Games Layout */}
              {(() => {
                const primaryVisible = games.filter(g => g.is_primary && (g.is_visible !== false || isEditMode));

                if (primaryVisible.length === 2) {
                  return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-3xl">
                      {primaryVisible.map((game, idx) => (
                        <PremiumGameButton
                          key={game.id}
                          title={game.title}
                          icon={ICON_MAP[game.icon_name] || Sparkles}
                          isPrimary
                          onClick={() => setCurrentView(game.view_id)}
                          index={idx}
                          total={games.length}
                          isEditMode={isEditMode}
                          isVisible={game.is_visible !== false}
                          onMoveUp={() => moveGame(games.indexOf(game), 'up')}
                          onMoveDown={() => moveGame(games.indexOf(game), 'down')}
                          onToggleVisibility={() => toggleGameVisibility(game.id)}
                          onToggleSize={() => toggleGameSize(game.id)}
                        />
                      ))}
                    </div>
                  );
                }

                return (
                  <>
                    {/* Row 1: First Primary Game - Centered */}
                    <div className="w-full flex justify-center max-w-2xl">
                      {primaryVisible.slice(0, 1).map((game) => (
                        <div key={game.id} className="w-full flex justify-center">
                          <PremiumGameButton
                            title={game.title}
                            icon={ICON_MAP[game.icon_name] || Sparkles}
                            isPrimary
                            onClick={() => setCurrentView(game.view_id)}
                            index={0}
                            total={games.length}
                            isEditMode={isEditMode}
                            isVisible={game.is_visible !== false}
                            onMoveUp={() => moveGame(games.indexOf(game), 'up')}
                            onMoveDown={() => moveGame(games.indexOf(game), 'down')}
                            onToggleVisibility={() => toggleGameVisibility(game.id)}
                            onToggleSize={() => toggleGameSize(game.id)}
                          />
                        </div>
                      ))}
                    </div>

                    {/* Row 2: Next Primary Games - Side by Side */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-3xl">
                      {primaryVisible.slice(1, 3).map((game, idx) => (
                        <div key={game.id} className="w-full">
                          <PremiumGameButton
                            title={game.title}
                            icon={ICON_MAP[game.icon_name] || Sparkles}
                            isPrimary
                            onClick={() => setCurrentView(game.view_id)}
                            index={idx + 1}
                            total={games.length}
                            isEditMode={isEditMode}
                            isVisible={game.is_visible !== false}
                            onMoveUp={() => moveGame(games.indexOf(game), 'up')}
                            onMoveDown={() => moveGame(games.indexOf(game), 'down')}
                            onToggleVisibility={() => toggleGameVisibility(game.id)}
                            onToggleSize={() => toggleGameSize(game.id)}
                          />
                        </div>
                      ))}
                    </div>

                    {/* Row 3+: Any Other Primary Games */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-3xl">
                      {primaryVisible.slice(3).map((game, idx) => (
                        <div key={game.id} className="w-full">
                          <PremiumGameButton
                            title={game.title}
                            icon={ICON_MAP[game.icon_name] || Sparkles}
                            isPrimary
                            onClick={() => setCurrentView(game.view_id)}
                            index={idx + 3}
                            total={games.length}
                            isEditMode={isEditMode}
                            isVisible={game.is_visible !== false}
                            onMoveUp={() => moveGame(games.indexOf(game), 'up')}
                            onMoveDown={() => moveGame(games.indexOf(game), 'down')}
                            onToggleVisibility={() => toggleGameVisibility(game.id)}
                            onToggleSize={() => toggleGameSize(game.id)}
                          />
                        </div>
                      ))}
                    </div>
                  </>
                );
              })()}
            </div>

            <div className="w-full max-w-5xl space-y-8 mb-20">
              <div className="flex items-center gap-10 px-8 opacity-25">
                <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent via-white to-transparent"></div>
                <h2 className="text-white font-black text-xs uppercase tracking-[1.5em] italic">Secondary Units</h2>
                <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-white to-transparent"></div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4 px-4">
                {games.filter(g => !g.is_primary).map((game, idx) => (
                  <PremiumGameButton
                    key={game.id}
                    title={game.title}
                    icon={ICON_MAP[game.icon_name] || Sparkles}
                    onClick={() => setCurrentView(game.view_id)}
                    isComingSoon={game.is_coming_soon}
                    comingSoonText={game.coming_soon_text}
                    hasOBS={game.has_obs}
                    index={idx + games.filter(g => g.is_primary).length}
                    total={games.length}
                    isEditMode={isEditMode}
                    isVisible={game.is_visible !== false}
                    onMoveUp={() => moveGame(games.indexOf(game), 'up')}
                    onMoveDown={() => moveGame(games.indexOf(game), 'down')}
                    onToggleVisibility={() => toggleGameVisibility(game.id)}
                    onToggleSize={() => toggleGameSize(game.id)}
                  />
                ))}
              </div>
            </div>

            {/* Featured Epic Game Button: Black Sidebar Version */}
            <div className="w-full flex justify-center pb-16 animate-in slide-in-from-bottom duration-1000">
              <button
                onClick={() => setCurrentView('LETTER_GAME')}
                className="group relative w-full max-w-xl h-[100px] md:h-[130px] bg-black border-2 border-red-600/20 hover:border-red-600/80 rounded-[2.5rem] shadow-[0_15px_40px_rgba(0,0,0,0.6)] hover:shadow-[0_20px_80px_rgba(220,38,38,0.3)] hover:scale-105 transition-all duration-500 active:scale-95 overflow-hidden flex items-center justify-between px-8 md:px-12"
              >
                {/* Standard Premium Effects */}
                <div className="absolute inset-0 bg-white/5 translate-x-[-150%] group-hover:translate-x-[150%] transition-transform duration-1000 skew-x-[-35deg] pointer-events-none z-20"></div>
                <div className="absolute inset-0 bg-gradient-to-r from-red-600/0 via-red-600/5 to-transparent pointer-events-none"></div>

                {/* Left Side: Entry Mark */}
                <div className="relative z-30 flex items-center gap-4">
                  <div className="w-12 h-12 md:w-14 md:h-14 bg-red-600/10 border border-red-600/30 rounded-full flex items-center justify-center shadow-lg group-hover:bg-red-600 group-hover:border-white transition-all duration-500 group-hover:rotate-[-12deg]">
                    <Swords size={24} className="text-red-500 group-hover:text-white transition-colors" />
                  </div>
                  <div className="hidden md:flex flex-col items-start leading-none">
                    <span className="text-red-500 font-black text-xs uppercase tracking-widest mb-1">BATTLE START</span>
                    <span className="text-white/20 font-bold text-[8px] uppercase tracking-[0.3em]">ARENA CHALLENGE</span>
                  </div>
                </div>

                {/* Right Side: The Image (contains its own text) */}
                <div className="relative z-30 h-full flex items-center p-3 md:p-4">
                  <img
                    src="/photo/image76.png"
                    alt="Letters Challenge"
                    className="h-full w-auto object-contain drop-shadow-[0_4px_20px_rgba(255,0,0,0.2)] transition-transform duration-700 group-hover:scale-110 group-hover:translate-x-[-10px]"
                  />
                </div>

                {/* OBS Badge */}
                <div className="absolute top-0 right-0 z-50 flex items-center gap-1.5 bg-black/80 backdrop-blur-md px-3 py-1 rounded-bl-2xl border-l border-b border-red-600/30 group-hover:bg-red-600 transition-colors">
                  <Video size={12} className="text-white" />
                  <span className="text-[10px] font-black text-white uppercase tracking-tighter">OBS SUPPORTED</span>
                </div>
              </button>
            </div>

            <div className="flex flex-wrap justify-center gap-10 md:gap-20 mt-10 pb-10">
              <button onClick={() => setCurrentView('LEADERBOARD')} className="flex items-center gap-4 text-white/40 hover:text-iabs-red font-black text-2xl tracking-[0.2em] transition-all hover:scale-105 group italic">
                <Trophy size={28} className="group-hover:animate-bounce text-yellow-500 drop-shadow-[0_0_15px_rgba(255,215,0,0.5)]" />
                لوحة الصدارة
              </button>

              <button
                onClick={() => {
                  if (userRole === 'admin') {
                    const siteAuth = localStorage.getItem('site_access_granted');
                    if (siteAuth) {
                      localStorage.setItem('admin_access_granted', siteAuth);
                      setCurrentView('ADMIN_PANEL');
                      return;
                    }
                  }
                  setCurrentView('ADMIN_LOGIN');
                }}
                className="flex items-center gap-4 text-white/10 hover:text-white/40 font-black text-2xl tracking-[0.2em] transition-all hover:scale-105 group border-l-4 border-white/5 pl-10 md:pl-20 italic"
              >
                <ShieldCheck size={28} className="group-hover:text-blue-500 transition-colors" />
                الإدارة
              </button>
            </div>

            <div className="w-full flex justify-center items-center pb-20">
              {userRole === 'admin' && (
                !isEditMode ? (
                  <button
                    onClick={() => {
                      setIsEditMode(true);
                    }}
                    className="flex items-center gap-4 px-8 py-3 bg-white/5 hover:bg-white/10 rounded-3xl border-2 border-white/10 text-white font-black italic tracking-tighter transition-all shadow-xl hover:scale-105 active:scale-95 group"
                  >
                    <Edit2 size={20} className="text-red-500 group-hover:rotate-12 transition-transform" />
                    <span>تعديل ترتيب الألعاب</span>
                  </button>
                ) : (
                  <button
                    onClick={saveGamesOrder}
                    disabled={isSavingGames}
                    className="flex items-center gap-4 px-8 py-3 bg-green-600 hover:bg-green-500 rounded-3xl border-2 border-white/20 text-white font-black italic tracking-tighter transition-all shadow-[0_0_40px_rgba(22,163,74,0.4)] animate-in zoom-in duration-300"
                  >
                    {isSavingGames ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
                    <span>حفظ الترتيب الجديد</span>
                  </button>
                )
              )}
            </div>

          </div>
        );
    }
  };



  if (isOBSMode) {
    return (
      <div className="fixed inset-0 bg-transparent overflow-hidden flex items-center justify-center z-[99999]">
        {(currentView === 'FAWAZIR_GAME' || currentView === 'FAWAZIR_SELECT') && <SponsorsWidget />}
        {renderContent(true)}
      </div>
    );
  }

  return (
    <Layout
      currentView={currentView as ViewState}
      onChangeView={(v) => setCurrentView(v)}
      onOBSLinks={() => setShowOBSModal(true)}
      onToggleOBSPreview={() => setShowObsPreview(!showObsPreview)}
      obsPreviewActive={showObsPreview}
      obsPreviewSlot={renderContent(true)}
      isAuthorized={isAuthorized}
      userRole={userRole}
    >
      <OBSLinksModal isOpen={showOBSModal} onClose={() => setShowOBSModal(false)} />
      {(currentView === 'FAWAZIR_GAME' || currentView === 'FAWAZIR_SELECT') && <SponsorsWidget />}
      {!isAuthorized && <GlobalPasswordPage onSuccess={(role) => {
        setUserRole(role);
        setIsAuthorized(true);
        if (role === 'user') setCurrentView('USER_DASHBOARD');
      }} />}

      {/* Only show content if authorized */}
      {isAuthorized && (
        <div className="relative w-full h-full flex flex-col items-center">
          {renderContent(false)}
        </div>
      )}

      {activeAnnouncement && (
        <GlobalAnnouncement
          message={activeAnnouncement}
          onClose={() => setActiveAnnouncement(null)}
        />
      )}
    </Layout>
  );
};

export default App;
