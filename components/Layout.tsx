
import React, { useState } from 'react';
import { ViewState } from '../types';
import { ChatWidget } from './ChatWidget';
import {
  MessageSquare, X, Settings2,
  Maximize2, Minimize2, PanelRightClose,
  LayoutGrid, Video, Home, User
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  currentView: ViewState;
  onChangeView: (view: ViewState) => void;
  onOBSLinks?: () => void;
  onToggleOBSPreview?: () => void;
  obsPreviewActive?: boolean;
  obsPreviewSlot?: React.ReactNode;
  isAuthorized?: boolean;
  userRole?: 'admin' | 'user';
}

export const Layout: React.FC<LayoutProps> = ({ children, currentView, onChangeView, onOBSLinks, onToggleOBSPreview, obsPreviewActive, obsPreviewSlot, isAuthorized, userRole }) => {
  const [chatOpen, setChatOpen] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(450); // Default Width

  const viewBg = (view: ViewState) => {
    switch (view) {
      case 'FAWAZIR_GAME':
        return "url('/pak/classic_2.png')";
      default:
        return "url('https://i.ibb.co/kWJRhSN/1000126060.png')";
    }
  };

  const handleResize = (amount: number) => {
    setSidebarWidth(prev => {
      const next = prev + amount;
      return Math.min(Math.max(next, 350), 650); // Limits: 350px to 650px
    });
  };

  const isHome = currentView === 'HOME' || (currentView as string) === 'ADMIN_LOGIN';

  return (
    <div className="h-screen w-screen flex bg-black overflow-hidden font-sans" dir="rtl">

      {/* Sidebar Container */}
      <aside
        style={{ width: chatOpen ? `${sidebarWidth}px` : '0px' }}
        className="h-full transition-all duration-500 ease-in-out border-l border-white/10 flex-shrink-0 z-50 flex flex-col bg-[#050505] shadow-[20px_0_50px_rgba(0,0,0,0.5)] relative overflow-hidden"
      >
        {/* --- MODERN COMMAND BAR (ABOVE CHAT) --- */}
        <div className="h-16 shrink-0 bg-gradient-to-l from-red-600/10 via-black to-black border-b border-white/10 flex items-center justify-between px-4 z-30">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-red-600 to-red-900 rounded-xl shadow-[0_0_20px_rgba(255,0,0,0.4)] border border-white/20">
              <LayoutGrid size={18} className="text-white drop-shadow-[0_0_5px_rgba(255,255,255,0.8)]" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-white uppercase tracking-[0.3em] italic leading-none">نظام التحكم</span>
              <span className="text-[8px] font-bold text-red-500/80 uppercase tracking-widest mt-0.5">Control Center</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 bg-white/5 p-1 rounded-2xl border border-white/10">
            {/* Resize Controls */}
            <button
              onClick={() => handleResize(-50)}
              title="تصغير الشات"
              className="p-2 hover:bg-white/10 text-gray-400 hover:text-white transition-all rounded-xl border border-transparent hover:border-white/10 active:scale-90"
            >
              <Minimize2 size={16} />
            </button>

            <div className="w-px h-4 bg-white/10 mx-1"></div>

            <button
              onClick={() => handleResize(50)}
              title="تكبير الشات"
              className="p-2 hover:bg-white/10 text-gray-400 hover:text-white transition-all rounded-xl border border-transparent hover:border-white/10 active:scale-90"
            >
              <Maximize2 size={16} />
            </button>

            <div className="w-px h-4 bg-white/10 mx-1"></div>

            {/* Hide Button */}
            <button
              onClick={() => setChatOpen(false)}
              title="إخفاء الجانب"
              className="p-2 bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white transition-all rounded-xl border border-red-600/20 active:scale-90"
            >
              <PanelRightClose size={16} className="rotate-180" />
            </button>
          </div>

          <div className="w-px h-6 bg-white/10 mx-3"></div>

          {/* Navigation Buttons */}
          {isAuthorized && (
            <div className="flex items-center gap-2">
              {/* Profile Button for Users */}
              {userRole === 'user' && (
                <div className="relative group/profile">
                  <div className="absolute -top-7 left-1/2 -translate-x-1/2 px-2 py-1 bg-red-600 text-white text-[8px] font-black rounded-lg opacity-0 group-hover/profile:opacity-100 transition-all duration-300 whitespace-nowrap z-50 pointer-events-none shadow-[0_0_10px_rgba(220,38,38,0.4)]">
                    ملفي الشخصي
                  </div>
                  <button
                    onClick={() => onChangeView('USER_DASHBOARD' as any)}
                    className="relative p-2 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all rounded-xl border border-white/10 active:scale-95 group"
                  >
                    <User size={18} className="relative z-10" />
                  </button>
                </div>
              )}

              <div className="relative group/home">
                <div className="absolute -top-7 left-1/2 -translate-x-1/2 px-2 py-1 bg-red-600 text-white text-[8px] font-black rounded-lg opacity-0 group-hover/home:opacity-100 transition-all duration-300 whitespace-nowrap z-50 pointer-events-none shadow-[0_0_10px_rgba(220,38,38,0.4)]">
                  {userRole === 'user' ? 'لوحة القيادة' : 'العودة للرئيسية'}
                </div>
                <button
                  onClick={() => onChangeView(userRole === 'user' ? 'USER_DASHBOARD' as any : 'HOME')}
                  title={userRole === 'user' ? "العودة للوحة القيادة" : "العودة للقائمة الرئيسية"}
                  className="relative p-2 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white transition-all rounded-xl border border-red-600/30 active:scale-95 shadow-[0_0_10px_rgba(220,38,38,0.2)] hover:shadow-[0_0_20px_rgba(220,38,38,0.6)] group"
                >
                  <Home size={18} className="relative z-10" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Top Section: Chat Content */}
        <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
          <ChatWidget lang="ar" />
        </div>

        {/* OBS Preview Section - Integrated into Sidebar */}
        {obsPreviewActive && obsPreviewSlot && (
          <div className="h-[200px] shrink-0 border-t-2 border-white/10 bg-black relative group overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-6 bg-emerald-600/20 px-3 flex items-center justify-between z-10 border-b border-white/5">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></div>
                <span className="text-[8px] font-black text-white italic tracking-tighter uppercase">LIVE OBS OUTPUT</span>
              </div>
            </div>
            <div className="w-full h-full pt-6 relative overflow-hidden flex items-center justify-center">
              <div className="scale-[0.23] origin-center" style={{ width: '1920px', height: '1080px' }}>
                {obsPreviewSlot}
              </div>
              {/* Overlay to prevent interaction in sidebar */}
              <div className="absolute inset-0 z-20"></div>
            </div>
            {/* Border Glow */}
            <div className="absolute inset-0 pointer-events-none border border-emerald-500/30"></div>
          </div>
        )}

        {/* Bottom Section: Game Controls */}
        {!isHome && (
          <div className="flex-[1.2] min-h-0 border-t-2 border-white/10 bg-gradient-to-b from-black/60 to-red-950/10 backdrop-blur-3xl flex flex-col relative">
            <div className="p-5 border-b border-white/10 flex items-center gap-4 bg-black/40">
              <div className="p-2 bg-red-600 rounded-lg shadow-[0_0_15px_rgba(255,0,0,0.4)]">
                <Settings2 size={20} className="text-white animate-spin-slow" />
              </div>
              <span className="text-sm font-black text-white uppercase tracking-[0.2em]">إعدادات الـمـيـدان</span>
            </div>
            <div id="game-sidebar-portal" className="flex-1 overflow-y-auto custom-scrollbar">
              {/* Game-specific controls teleported here */}
            </div>
            <div className="absolute bottom-0 left-0 w-full h-1.5 bg-gradient-to-r from-transparent via-red-600 to-transparent shadow-[0_0_20px_red]"></div>
          </div>
        )}
      </aside>

      {/* Main Game Area */}
      <main className="flex-1 relative flex flex-col h-full overflow-hidden bg-black">
        {/* Global Background Layer */}
        <div
          className="absolute inset-0 z-0 pointer-events-none opacity-40 transition-all duration-1000 bg-center bg-no-repeat blur-[2px]"
          style={{
            backgroundImage: viewBg(currentView),
            backgroundSize: 'cover'
          }}
        ></div>

        {/* Content Container */}
        <div className="flex-1 w-full h-full relative z-10 overflow-y-auto overflow-x-hidden p-4 md:p-8 flex flex-col items-center">
          {children}
        </div>
      </main>

      {/* Re-Open Chat Button (Visible only when chat is closed) */}
      {!chatOpen && (
        <button
          onClick={() => setChatOpen(true)}
          className="fixed bottom-40 left-10 z-[100] p-6 bg-red-600 text-white rounded-[2rem] shadow-[0_0_50px_rgba(255,0,0,0.6)] hover:scale-110 active:scale-95 transition-all border-2 border-white/20 animate-in slide-in-from-left-20 duration-500"
        >
          <MessageSquare size={32} strokeWidth={3} className="drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]" />
        </button>
      )}
    </div>
  );
};