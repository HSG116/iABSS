
import React, { useState, useEffect } from 'react';
import {
  Shield, Trash2, Key, Database, Save, AlertTriangle,
  UserPlus, UserMinus, Search, Star, Ban, Unlock,
  Megaphone, Activity, History, Settings, Users,
  Zap, Palette, Eye, EyeOff, RotateCw, Trophy,
  Music, Sparkles, Wind, Flame, Ticket, Fingerprint,
  Users2, Gavel, Radio, LayoutDashboard, Terminal, X
} from 'lucide-react';
import { leaderboardService, adminService, supabase } from '../services/supabase';
import { chatService } from '../services/chatService';
import { ProAvatar } from './ProAvatar';

interface AdminDashboardProps {
  onLogout: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'bans' | 'announcements' | 'arena' | 'promo' | 'logs' | 'system'>('overview');
  const [profiles, setProfiles] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [promoCodes, setPromoCodes] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [arenaStatus, setArenaStatus] = useState<any>({});

  const [targetUser, setTargetUser] = useState('');
  const [pointDelta, setPointDelta] = useState(100);
  const [statusMsg, setStatusMsg] = useState('');
  const [isError, setIsError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [statType, setStatType] = useState<'points' | 'credits' | 'wins'>('points');

  // Ban tool states
  const [banReason, setBanReason] = useState('مخالفة قوانين الدردشة');
  const [searchQuery, setSearchQuery] = useState('');

  // New states for additions
  const [newPromo, setNewPromo] = useState({ code: '', amount: 1000, maxUses: 10 });
  const [newAnnouncement, setNewAnnouncement] = useState('');
  const [chatMonitorActive, setChatMonitorActive] = useState(false);
  const [chatStatus, setChatStatus] = useState<{ connected: boolean; error: boolean; details?: string }>({ connected: false, error: false });

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  useEffect(() => {
    const validateSession = async () => {
      let raw = localStorage.getItem('admin_access_granted');

      // Fallback: Check if we can sync from site_access_granted
      if (!raw) {
        const siteAuth = localStorage.getItem('site_access_granted');
        if (siteAuth) {
          const parsedSite = JSON.parse(siteAuth);
          if (parsedSite.role === 'admin') {
            localStorage.setItem('admin_access_granted', siteAuth);
            raw = siteAuth;
          }
        }
      }

      let token: string | null = null;
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          token = parsed?.token || null;
        } catch { }
      }

      const { data, error } = await supabase
        .from('app_config')
        .select('value')
        .eq('key', 'admin_password')
        .maybeSingle();

      if (error) {
        console.warn("[AdminAuth] Supabase check failed, skipping validation to prevent kick.");
        return;
      }

      if (data && token) {
        const dbPass = String(data.value).trim();
        const sessionPass = String(token).trim();

        console.log("[AdminAuth] Validating Session:", { sessionPass: "***", dbPass: "***", match: sessionPass === dbPass });

        if (sessionPass !== dbPass) {
          console.error("[AdminAuth] Password mismatch detected. Revoking access.");
          localStorage.removeItem('admin_access_granted');
          onLogout();
        } else {
          console.log("[AdminAuth] Session validated successfully.");
        }
      } else {
        console.log("[AdminAuth] Validation skipped: data or token missing (syncing...)");
      }
    };
    validateSession();
    const channel = supabase
      .channel('admin_password_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'app_config' }, validateSession)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Effect 1: Connection Management
  useEffect(() => {
    const channel = localStorage.getItem('kick_channel_name') || 'iabs';
    chatService.connect(channel);
    setChatMonitorActive(true);

    const unbindStatus = chatService.onStatusChange((connected, error, details) => {
      setChatStatus({ connected, error, details });
    });

    return () => {
      unbindStatus();
      chatService.disconnect();
      setChatMonitorActive(false);
    };
  }, []);

  // Effect 2: Message Listener (Promo Codes)
  useEffect(() => {
    const unbindMsg = chatService.onMessage(async (msg) => {
      const raw = msg.content.trim().toUpperCase();
      // Only process if we have active codes
      const matched = promoCodes.find(p => p.is_active && (raw === p.code.toUpperCase() || raw === `!${p.code.toUpperCase()}`));

      if (matched) {
        const res = await leaderboardService.claimPromoCode(msg.user.username, matched.code);
        if ((res as any).success) {
          showStatus(`✅ تم تفعيل الكود ${matched.code} للمستخدم ${msg.user.username}`);
          // Refresh data to update usage counts
          fetchData();
        } else {
          // Optional: Log failure or silent fail
          console.log(`Promo fail for ${msg.user.username}:`, res);
        }
      }
    });

    return () => unbindMsg();
  }, [promoCodes]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // ALWAYS load promo codes so the global listener works
      const { data: promos } = await adminService.getPromoCodes();
      setPromoCodes(promos || []);

      if (activeTab === 'users' || activeTab === 'overview' || activeTab === 'bans') {
        const { data: allProfiles } = await adminService.getAllProfiles();

        // Fetch leaderboard data to merge stats (Score/Wins)
        const rankedData = await leaderboardService.getAllRankedPlayers();

        // Create a map for fast lookup (lowercase keys)
        const statsMap = new Map();
        rankedData.forEach((p: any) => {
          statsMap.set(p.username?.toLowerCase(), { score: p.score, wins: p.wins });
        });

        // Merge and Sort
        const merged = allProfiles.map((p: any) => {
          const stats = statsMap.get(p.username?.toLowerCase()) || { score: 0, wins: 0 };
          return { ...p, ...stats };
        });

        // Sort by Score DESC
        merged.sort((a: any, b: any) => (b.score || 0) - (a.score || 0));

        setProfiles(merged);
        const { data: recentLogs } = await adminService.getAuditLogs(200);
        setLogs(recentLogs);
      }
      if (activeTab === 'announcements') {
        const { data } = await adminService.getAnnouncements();
        setAnnouncements(data);
      }
      if (activeTab === 'logs') {
        const { data } = await adminService.getAuditLogs();
        setLogs(data);
      }
      if (activeTab === 'arena') {
        const { status } = await adminService.getArenaStatus();
        setArenaStatus(status);
      }
    } catch (e) {
      console.error(e);
    }
    setIsLoading(false);
  };

  const showStatus = (msg: string, err = false) => {
    setStatusMsg(msg);
    setIsError(err);
    setTimeout(() => setStatusMsg(''), 3000);
  };

  const handleAdjustStats = async (isAdding: boolean, customAmount?: number) => {
    if (!targetUser) return showStatus('يرجى إدخال اسم المستخدم', true);
    const amount = customAmount !== undefined ? (isAdding ? customAmount : -customAmount) : (isAdding ? pointDelta : -pointDelta);

    let error;
    if (statType === 'points') {
      const res = await leaderboardService.adjustPlayerStats(targetUser, amount, 0);
      error = res.error;
    } else if (statType === 'wins') {
      const res = await leaderboardService.adjustPlayerStats(targetUser, 0, amount);
      error = res.error;
    } else {
      const res = await adminService.adjustCredits(targetUser, amount);
      error = res.error;
    }

    if (error) showStatus('حدث خطأ', true);
    else {
      showStatus(`تم تحديث بيانات ${targetUser}`);
      fetchData();
    }
  };

  const handleResetUser = async (username: string) => {
    if (!confirm(`هل أنت متأكد من تصفير جميع بيانات ${username}؟ (نقاط، فوز، رصيد)`)) return;

    // Reset Leaderboard stats
    await leaderboardService.adjustPlayerStats(username, -999999, -999999);

    // Reset Credits
    const { data: p } = await adminService.getAllProfiles();
    const userProf = p.find((u: any) => u.username.toLowerCase() === username.toLowerCase());
    if (userProf && userProf.credits > 0) {
      await adminService.adjustCredits(username, -userProf.credits);
    }

    await adminService.logAction('CORE_ADMIN', 'RESET_USER_STATS', { username });
    showStatus(`تم تصفير بيانات ${username}`);
    fetchData();
  };

  const handleToggleBan = async (username: string, currentBan: boolean) => {
    const { error } = await adminService.toggleUserBan(username, !currentBan, banReason);
    if (error) showStatus('خطأ في العملية', true);
    else {
      showStatus(currentBan ? `تم فك حظر ${username}` : `تم حظر ${username} بنجاح`);
      fetchData();
    }
  };

  const updateArena = async (key: string, value: any) => {
    const { error } = await adminService.updateArenaStatus(key, value);
    if (error) showStatus('فشل التحديث', true);
    else {
      showStatus('تم تحديث إعدادات الساحة');
      fetchData();
    }
  };

  const filteredProfiles = profiles.filter(p => p.username.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="w-full h-full bg-[#030303] text-white flex animate-in fade-in duration-700 font-sans overflow-hidden">
      {/* Premium Gradient Sidebar */}
      <div className="w-[340px] shrink-0 bg-gradient-to-b from-black via-zinc-900 to-black border-r border-white/5 flex flex-col p-8 relative">
        <div className="absolute top-0 right-0 w-1 h-full bg-gradient-to-b from-iabs-red via-transparent to-iabs-red opacity-20"></div>

        <div className="flex items-center gap-5 mb-14 px-2">
          <div className="relative">
            <div className="absolute inset-0 bg-iabs-red blur-xl opacity-30 animate-pulse"></div>
            <Shield size={44} className="text-iabs-red relative z-10" />
          </div>
          <div>
            <h1 className="text-3xl font-black italic tracking-tighter text-white">iABS <span className="text-iabs-red">ADM</span></h1>
            <p className="text-[10px] text-zinc-500 font-bold tracking-[0.4em] uppercase">Control Suite</p>
          </div>
        </div>

        <div className="space-y-3 flex-1 overflow-y-auto no-scrollbar">
          {[
            { id: 'overview', label: 'نظرة عامة', icon: LayoutDashboard, color: 'text-white' },
            { id: 'users', label: 'إدارة المتسابقين', icon: Users, color: 'text-blue-500' },
            { id: 'bans', label: 'المحكومين (Bans)', icon: Gavel, color: 'text-red-500' },
            { id: 'announcements', label: 'مركز البث', icon: Radio, color: 'text-orange-500' },
            { id: 'promo', label: 'الأكواد الترويجية', icon: Ticket, color: 'text-yellow-500' },
            { id: 'arena', label: 'إعدادات الساحة', icon: Palette, color: 'text-purple-500' },
            { id: 'logs', label: 'سجل العمليات', icon: Terminal, color: 'text-zinc-400' },
            { id: 'system', label: 'صيانة النظام', icon: Settings, color: 'text-red-600' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`w-full flex items-center gap-5 px-6 py-5 rounded-[1.5rem] transition-all relative group ${activeTab === tab.id
                ? 'bg-iabs-red text-white shadow-[0_15px_30px_rgba(255,0,0,0.2)]'
                : 'text-zinc-500 hover:text-white hover:bg-white/5'
                }`}
            >
              <tab.icon size={22} className={activeTab === tab.id ? 'text-white' : tab.color} />
              <span className="font-black text-sm italic">{tab.label}</span>
              {activeTab === tab.id && <div className="absolute right-3 w-1.5 h-1.5 bg-white rounded-full"></div>}
            </button>
          ))}
        </div>

        <button onClick={onLogout} className="mt-8 py-5 border border-white/10 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-red-600/10 hover:text-red-500 transition-all active:scale-95 italic">Log Out From System</button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Modern Top Header */}
        <div className="h-24 shrink-0 border-b border-white/5 flex items-center justify-between px-12 bg-black/40 backdrop-blur-3xl z-40">
          <div className="flex items-center gap-10">
            <div className="flex flex-col">
              <span className="text-[10px] text-zinc-600 font-black uppercase tracking-widest">Global Operations</span>
              <span className="text-xl font-black italic uppercase">{activeTab.replace('_', ' ')}</span>
            </div>
            <div className="h-8 w-[1px] bg-white/10"></div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-kick-green rounded-full shadow-[0_0_10px_green]"></div>
                <span className="text-[10px] font-black text-white italic tracking-widest">LIVE_CONNECTION</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button onClick={fetchData} className="p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-all"><RotateCw size={20} className={isLoading ? 'animate-spin' : ''} /></button>
            <div className="bg-white/5 px-6 py-3 rounded-2xl border border-white/10">
              <span className="text-xs font-mono font-black text-zinc-400">SESSIONID: iABS-{Math.floor(Math.random() * 99999)}</span>
            </div>
          </div>
        </div>

        {/* Dynamic Content Panel */}
        <div className="flex-1 overflow-y-auto p-12 custom-scrollbar bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]">
          {statusMsg && (
            <div className={`fixed top-10 left-1/2 -translate-x-1/2 px-10 py-5 rounded-[2rem] font-black shadow-2xl z-[1000] animate-in slide-in-from-top-10 backdrop-blur-2xl border ${isError ? 'bg-red-600 border-red-400 text-white' : 'bg-kick-green border-white text-black'}`}>
              <div className="flex items-center gap-3">{isError ? <AlertTriangle size={24} /> : <Shield size={24} />}{statusMsg}</div>
            </div>
          )}

          {activeTab === 'overview' && (
            <div className="space-y-10 animate-in fade-in slide-in-from-right-10 duration-500">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                {[
                  { label: 'إجمالي المسجلين', value: profiles.length, icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10' },
                  { label: 'المحظورين حالياً', value: profiles.filter(p => p.is_banned).length, icon: Ban, color: 'text-red-500', bg: 'bg-red-500/10' },
                  { label: 'الأرصدة المتداولة', value: profiles.reduce((acc, p) => acc + (p.credits || 0), 0), icon: Zap, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
                  { label: 'نقاط المتصدرين', value: profiles.reduce((acc, p) => acc + (p.score || 0), 0), icon: Trophy, color: 'text-green-500', bg: 'bg-green-500/10' },
                ].map(stat => (
                  <div className="glass-card p-8 rounded-[3rem] border border-white/5 hover:border-white/10 transition-all flex items-center gap-6 group">
                    <div className={`w-16 h-16 rounded-2xl ${stat.bg} flex items-center justify-center ${stat.color} group-hover:scale-110 transition-transform shadow-xl`}>
                      <stat.icon size={28} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">{stat.label}</p>
                      <p className="text-3xl font-black italic">{stat.value.toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="glass-card p-10 rounded-[3rem] border border-white/5 bg-gradient-to-br from-white/[0.02] to-transparent">
                  <h3 className="text-2xl font-black italic mb-8 flex items-center gap-3">آخر النشاطات <Activity size={24} className="text-blue-500" /></h3>
                  <div className="space-y-4">
                    {profiles.slice(0, 5).map(p => (
                      <div key={p.id} className="bg-black/40 p-5 rounded-2xl flex items-center justify-between border border-white/[0.03]">
                        <div className="flex items-center gap-4">
                          <div className="shrink-0">
                            <ProAvatar url={p.avatar_url} username={p.username} size="w-10 h-10" />
                          </div>
                          <span className="font-black italic">{p.username}</span>
                        </div>
                        <span className="text-[10px] font-mono text-zinc-600">{new Date(p.created_at).toLocaleDateString('ar-EG')}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="glass-card p-10 rounded-[3rem] border border-white/5 flex flex-col justify-center items-center text-center">
                  <Terminal size={80} className="text-zinc-800 mb-6" />
                  <h4 className="text-xl font-black italic mb-2">النظام قيد التشغيل الكامل</h4>
                  <p className="text-zinc-500 font-bold text-sm max-w-xs">جميع الوحدات البرمجية تعمل بكفاءة عالية. السيرفر متصل بقاعدة بيانات SQL السحابية.</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="space-y-10 animate-in fade-in duration-500">
              <div className="flex flex-col md:flex-row gap-6 items-end justify-between">
                <div className="flex-1 w-full max-w-xl">
                  <label className="text-xs font-black text-zinc-600 uppercase tracking-widest pl-4 mb-2 block italic">Search Engine Database</label>
                  <div className="relative">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-600" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="ابحث بالاسم عن أي متسابق..."
                      className="w-full bg-black border border-white/10 rounded-[2rem] p-6 pl-16 text-xl text-white font-black focus:border-blue-600 outline-none transition-all shadow-2xl"
                    />
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="bg-zinc-900 px-8 py-5 rounded-3xl border border-white/10 text-center">
                    <span className="text-[10px] font-black text-zinc-500 uppercase tracking-wider block mb-1">Total Found</span>
                    <span className="text-3xl font-black italic">{filteredProfiles.length}</span>
                  </div>
                </div>
              </div>

              <div className="glass-card rounded-[3.5rem] border border-white/5 overflow-hidden shadow-2xl">
                <table className="w-full text-right">
                  <thead>
                    <tr className="bg-white/5 text-[10px] font-black uppercase text-zinc-600 tracking-[0.3em] border-b border-white/5">
                      <th className="p-10">ENTITY (PLAYER)</th>
                      <th className="p-10">WINS (فوز)</th>
                      <th className="p-10">SCORE (نقاط)</th>
                      <th className="p-10">CREDITS (§)</th>
                      <th className="p-10">STATUS</th>
                      <th className="p-10 text-center">CONTROL</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.02]">
                    {filteredProfiles.map(p => (
                      <tr key={p.id} className="hover:bg-white/[0.03] transition-all group">
                        <td className="p-6">
                          <div className="flex items-center gap-6">
                            <div className="shrink-0 group-hover:scale-110 transition-transform">
                              <ProAvatar url={p.avatar_url} username={p.username} size="w-16 h-16" />
                            </div>
                            <div>
                              <div className={`text-xl font-black italic ${p.is_banned ? 'text-zinc-700 line-through' : 'text-white'}`}>{p.username}</div>
                              <div className="text-[10px] font-mono font-bold text-zinc-600">{p.id.slice(0, 8).toUpperCase()}</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-6">
                          <div className="font-black text-2xl text-blue-500 italic">{p.wins || 0}</div>
                        </td>
                        <td className="p-6 text-2xl font-black italic text-white/80">{p.score || 0}</td>
                        <td className="p-6 text-2xl font-black text-kick-green italic">
                          § {p.credits || 0}
                          <div className="text-[10px] font-mono text-zinc-500 mt-2">
                            {(() => {
                              const entry = (logs || []).find(l => (l.details?.username === p.username) && (l.action === 'PROMO_REDEEM' || l.action === 'CREDITS_ADJUST'));
                              if (!entry) return 'آخر تعديل: غير متوفر';
                              if (entry.action === 'PROMO_REDEEM') return `آخر تعديل: PROMO (${entry.details?.code})`;
                              if (entry.action === 'CREDITS_ADJUST') return `آخر تعديل: ADMIN (${entry.details?.amount > 0 ? '+' : ''}${entry.details?.amount})`;
                              return 'آخر تعديل: غير متوفر';
                            })()}
                          </div>
                        </td>
                        <td className="p-6">
                          {p.is_banned
                            ? <span className="inline-flex items-center gap-2 bg-red-600/10 text-red-500 border border-red-500/20 px-5 py-2 rounded-full text-[10px] font-black tracking-widest uppercase shadow-[0_0_20px_rgba(255,0,0,0.1)]">Restricted</span>
                            : <span className="inline-flex items-center gap-2 bg-green-600/10 text-kick-green border border-green-500/20 px-5 py-2 rounded-full text-[10px] font-black tracking-widest uppercase shadow-[0_0_20px_rgba(0,255,0,0.1)]">Authorized</span>
                          }
                        </td>
                        <td className="p-6">
                          <div className="flex items-center gap-2 justify-center">
                            <button onClick={() => { setTargetUser(p.username); setStatType('points'); showStatus(`تم تحديد ${p.username} للتعديل`); }} className="p-3 bg-blue-600/10 text-blue-500 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-lg shadow-blue-500/10" title="تعديل النقاط"><Trophy size={20} /></button>
                            <button onClick={() => { setTargetUser(p.username); setStatType('wins'); showStatus(`تم تحديد ${p.username} لتعديل الفوز`); }} className="p-3 bg-yellow-600/10 text-yellow-500 rounded-xl hover:bg-yellow-600 hover:text-white transition-all shadow-lg shadow-yellow-500/10" title="تعديل الفوز"><Star size={20} /></button>
                            <button onClick={() => { setTargetUser(p.username); setStatType('credits'); showStatus(`تم تحديد ${p.username} لتعديل الرصيد`); }} className="p-3 bg-kick-green/10 text-kick-green rounded-xl hover:bg-kick-green hover:text-black transition-all shadow-lg shadow-green-500/10" title="تعديل الرصيد"><Zap size={20} /></button>
                            <button onClick={() => handleToggleBan(p.username, p.is_banned)} className={`p-3 rounded-xl transition-all shadow-lg ${p.is_banned ? 'bg-kick-green text-black' : 'bg-red-600/10 text-red-500 hover:bg-red-600 hover:text-white shadow-red-500/10'}`} title={p.is_banned ? 'فك الحظر' : 'حظر'} >{p.is_banned ? <Unlock size={20} /> : <Ban size={20} />}</button>
                            <button onClick={() => handleResetUser(p.username)} className="p-3 bg-white/5 text-white/40 rounded-xl hover:bg-white/10 hover:text-white transition-all" title="تصفير البيانات"><RotateCw size={20} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Full-Screen Stats Edit Mode (Dedicated Page UI) */}
              {targetUser && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 md:p-10 animate-in fade-in duration-300">
                  {/* Glass Backdrop */}
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-2xl" onClick={() => setTargetUser('')}></div>

                  {/* Modal Page Container */}
                  <div className="relative w-full max-w-3xl bg-[#0a0a0a] rounded-[4rem] border border-white/10 shadow-[0_50px_200px_rgba(0,0,0,1)] overflow-hidden animate-in zoom-in-95 duration-500">
                    {/* Dynamic Glow bar */}
                    <div className={`h-2 w-full transition-all duration-500 ${statType === 'points' ? 'bg-blue-600 shadow-[0_0_40px_rgba(37,99,235,0.8)]' : statType === 'wins' ? 'bg-yellow-500 shadow-[0_0_40px_rgba(234,179,8,0.8)]' : 'bg-kick-green shadow-[0_0_40px_rgba(83,252,24,0.8)]'}`}></div>

                    <div className="p-12 md:p-16 space-y-12">
                      {/* Header Section */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-8">
                          <div className="relative group">
                            <div className={`absolute inset-0 blur-3xl opacity-40 rounded-full transition-opacity ${statType === 'points' ? 'bg-blue-600' : statType === 'wins' ? 'bg-yellow-500' : 'bg-kick-green'}`}></div>
                            <ProAvatar url={profiles.find(p => p.username === targetUser)?.avatar_url} username={targetUser} size="w-24 h-24" className="relative z-10 border-2 border-white/10 shadow-2xl" />
                          </div>
                          <div>
                            <h2 className="text-4xl md:text-5xl font-black italic text-white tracking-tighter mb-2">{targetUser}</h2>
                            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.6em] flex items-center gap-3 italic">
                              <Fingerprint size={16} className="text-red-600 animate-pulse" /> Admin Control Protocol
                            </p>
                          </div>
                        </div>
                        <button onClick={() => setTargetUser('')} className="w-16 h-16 bg-white/5 hover:bg-red-600 hover:text-white rounded-[2rem] flex items-center justify-center transition-all shadow-xl active:scale-95"><X size={32} /></button>
                      </div>

                      {/* Control Modules (Tabs) */}
                      <div className="grid grid-cols-3 gap-6 p-2 bg-white/[0.02] border border-white/5 rounded-[3rem]">
                        {[
                          { id: 'points', label: 'النقاط', icon: Trophy, activeColor: 'bg-blue-600' },
                          { id: 'wins', label: 'الفوز', icon: Star, activeColor: 'bg-yellow-500' },
                          { id: 'credits', label: 'الرصيد', icon: Zap, activeColor: 'bg-kick-green' }
                        ].map(tab => (
                          <button
                            key={tab.id}
                            onClick={() => setStatType(tab.id as any)}
                            className={`flex flex-col items-center gap-3 py-7 rounded-[2.5rem] transition-all duration-300 ${statType === tab.id ? `${tab.activeColor} ${tab.id === 'points' ? 'text-white' : 'text-black'} shadow-2xl scale-105` : 'text-zinc-500 hover:text-white hover:bg-white/5'}`}
                          >
                            <tab.icon size={28} />
                            <span className="text-[10px] font-black uppercase tracking-widest">{tab.label}</span>
                          </button>
                        ))}
                      </div>

                      <div className="space-y-12">
                        {/* Precision Input Module */}
                        <div className="bg-black border border-white/5 rounded-[4.5rem] p-12 flex flex-col items-center gap-10 shadow-inner md:relative">
                          <span className="text-[9px] font-black text-zinc-700 uppercase tracking-[0.8em]">Adjusting Value Interface</span>
                          <div className="flex items-center gap-14">
                            <button onClick={() => setPointDelta(Math.max(1, pointDelta - 10))} className="w-24 h-24 flex items-center justify-center bg-white/5 border border-white/5 rounded-[2rem] hover:bg-white/10 transition-all text-4xl font-black shadow-xl">-</button>
                            <input
                              type="number"
                              value={pointDelta}
                              onChange={(e) => setPointDelta(Number(e.target.value))}
                              className={`w-56 bg-transparent text-center text-7xl md:text-9xl font-black outline-none tracking-tighter [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none transition-colors duration-500 ${statType === 'points' ? 'text-blue-500' : statType === 'wins' ? 'text-yellow-500' : 'text-kick-green'}`}
                            />
                            <button onClick={() => setPointDelta(pointDelta + 10)} className="w-24 h-24 flex items-center justify-center bg-white/5 border border-white/5 rounded-[2rem] hover:bg-white/10 transition-all text-4xl font-black shadow-xl">+</button>
                          </div>

                          {/* Fast Injection Buttons */}
                          <div className="flex flex-wrap justify-center gap-3 w-full max-w-xl">
                            {[1, 5, 20, 50, 100, 500, 1000].map(val => (
                              <button key={val} onClick={() => handleAdjustStats(true, val)} className="px-10 py-5 bg-white/[0.03] border border-white/5 rounded-2xl text-xs font-black hover:bg-white/10 hover:border-white/20 transition-all shadow-md">+{val}</button>
                            ))}
                          </div>
                        </div>

                        {/* Primary Actions Footer */}
                        <div className="flex gap-8">
                          <button
                            onClick={() => handleAdjustStats(true)}
                            className={`flex-[3] py-11 rounded-[3.5rem] font-black text-3xl italic uppercase tracking-widest transition-all active:scale-95 shadow-[0_25px_80px_rgba(0,0,0,0.4)] ${statType === 'points' ? 'bg-blue-600 text-white shadow-blue-500/20' : statType === 'wins' ? 'bg-yellow-500 text-black shadow-yellow-500/20' : 'bg-kick-green text-black shadow-green-500/20'}`}
                          >
                            تأكيد الإضافة
                          </button>
                          <button
                            onClick={() => handleAdjustStats(false)}
                            className="flex-1 py-11 bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white border-2 border-red-500/20 rounded-[3.5rem] font-black flex items-center justify-center gap-5 transition-all active:scale-95 shadow-xl group"
                          >
                            <UserMinus size={40} className="group-hover:scale-110 transition-transform" />
                            <span className="hidden lg:inline text-xl italic font-black uppercase tracking-wider">خصم</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'bans' && (
            <div className="max-w-4xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-12 duration-700">
              <div>
                <h2 className="text-6xl font-black text-red-600 italic tracking-tighter drop-shadow-[0_0_30px_rgba(255,0,0,0.3)]">IRON SHIELD</h2>
                <p className="text-zinc-500 font-bold mt-4 text-xl italic uppercase">Centralized Punishment & Restriction Hub</p>
              </div>

              <div className="glass-card p-12 rounded-[4rem] border border-red-600/20 bg-red-600/[0.01] shadow-2xl relative overflow-hidden group">
                <Gavel size={150} className="absolute right-[-20px] top-[-20px] text-red-600/5 group-hover:rotate-12 transition-transform duration-1000" />
                <h3 className="text-3xl font-black text-white italic mb-10 flex items-center gap-4 border-b border-white/5 pb-6">
                  <Ban className="text-red-600" size={32} /> حظر لاعب جديد
                </h3>
                <div className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest pl-4">Target Identity</label>
                      <input
                        type="text"
                        value={targetUser}
                        onChange={(e) => setTargetUser(e.target.value)}
                        placeholder="اسم المستخدم..."
                        className="w-full bg-black border border-white/10 rounded-[2rem] p-6 text-2xl text-white font-black focus:border-red-600 outline-none transition-all shadow-inner"
                      />
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest pl-4">Violation Type (Reason)</label>
                      <select
                        value={banReason}
                        onChange={(e) => setBanReason(e.target.value)}
                        className="w-full bg-black border border-white/10 rounded-[2rem] p-6 text-xl text-white font-black focus:border-red-600 outline-none appearance-none"
                      >
                        <option>مخالفة قوانين الدردشة</option>
                        <option>استخدام برامج مساعدة (Cheating)</option>
                        <option>إزعاج المتسابقين (Harassment)</option>
                        <option>إساءة استخدام النظام</option>
                        <option>قرار إداري مباشر</option>
                      </select>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      if (!targetUser) return showStatus('يرجى كتابة اسم اللاعب', true);
                      if (confirm(`تأكيد حظر ${targetUser} نهائياً؟`)) handleToggleBan(targetUser, false);
                    }}
                    className="w-full py-8 bg-black border-2 border-red-600 text-red-500 font-black text-3xl rounded-[2.5rem] hover:bg-red-600 hover:text-white transition-all shadow-[0_30px_80px_rgba(220,38,38,0.2)] flex items-center justify-center gap-4 italic uppercase"
                  >
                    <Gavel size={36} /> Execute Judgement
                  </button>
                </div>
              </div>

              <div className="space-y-6">
                <h4 className="text-xs font-black text-zinc-600 uppercase tracking-[0.4em] pl-4 italic">Banned List Database</h4>
                {profiles.filter(p => p.is_banned).map(p => (
                  <div key={p.id} className="glass-card p-8 rounded-3xl border border-red-900/40 bg-red-950/5 flex items-center justify-between group hover:border-red-500/40 transition-all">
                    <div className="flex items-center gap-8">
                      <div className="relative group-hover:scale-110 transition-transform">
                        <ProAvatar url={p.avatar_url} username={p.username} size="w-16 h-16" className="opacity-40 grayscale" />
                        <Ban size={24} className="absolute inset-0 m-auto text-red-600 drop-shadow-xl z-20" />
                      </div>
                      <div>
                        <div className="text-2xl font-black text-white italic">{p.username}</div>
                        <div className="text-[10px] font-bold text-red-600/60 uppercase tracking-widest mt-1">Status: Restricted Permanently</div>
                      </div>
                    </div>
                    <button onClick={() => handleToggleBan(p.username, true)} className="px-8 py-4 bg-green-600/10 text-kick-green border border-green-500/20 rounded-2xl font-black text-xs hover:bg-green-600 hover:text-black transition-all active:scale-95 italic uppercase tracking-widest">Unban Player</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'announcements' && (
            <div className="max-w-5xl mx-auto space-y-12 animate-in slide-in-from-right-12">
              <div>
                <h2 className="text-6xl font-black text-white italic tracking-tighter">BROADCAST CORE</h2>
                <p className="text-zinc-500 font-bold mt-4 text-xl italic uppercase">Global Frequency Distribution System</p>
              </div>

              <div className="glass-card p-14 rounded-[4rem] border border-orange-500/20 bg-orange-500/[0.01] shadow-2xl relative">
                <Radio size={200} className="absolute left-[-50px] top-[-50px] text-orange-600/5 group-hover:rotate-45 transition-transform duration-1000" />
                <div className="flex flex-col gap-10">
                  <textarea
                    value={newAnnouncement}
                    onChange={(e) => setNewAnnouncement(e.target.value)}
                    placeholder="اكتب رسالة البث العام هنا... ستظهر للجميع فوراً بصوت وتصميم فاخر!"
                    className="w-full bg-black/40 border-4 border-white/[0.03] rounded-[3rem] p-12 text-3xl text-white font-black focus:border-red-600 outline-none transition-all min-h-[300px] shadow-inner text-center leading-relaxed italic placeholder:text-zinc-800"
                  />
                  <button
                    onClick={async () => {
                      if (!newAnnouncement) return;
                      setIsLoading(true);
                      const { error } = await adminService.addAnnouncement(newAnnouncement);
                      setIsLoading(false);
                      if (!error) {
                        setNewAnnouncement('');
                        showStatus('تم إطلاق البث المباشر بنجاح!');
                        fetchData();
                      } else {
                        showStatus('فشل إرسال البث', true);
                      }
                    }}
                    disabled={isLoading}
                    className="w-full py-8 bg-gradient-to-r from-red-600 to-orange-600 text-white font-black text-3xl rounded-[3rem] hover:scale-[1.02] active:scale-95 transition-all shadow-[0_25px_80px_rgba(255,0,0,0.4)] flex items-center justify-center gap-4 italic uppercase disabled:opacity-50"
                  >
                    <Radio size={40} className={isLoading ? 'animate-spin' : 'animate-pulse'} />
                    {isLoading ? 'Processing...' : 'TRANSMIT REAL-TIME PULSE'}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {announcements.map(a => (
                  <div key={a.id} className="bg-white/[0.02] border border-white/5 p-8 rounded-[2.5rem] flex items-center justify-between group relative overflow-hidden hover:bg-white/[0.04] transition-all">
                    <div className="absolute top-0 left-0 w-2 h-full bg-orange-600/20 group-hover:bg-orange-600 transition-colors"></div>
                    <p className="text-xl text-white font-bold flex-1 px-4 italic leading-relaxed">{a.content}</p>
                    <button onClick={() => adminService.deleteAnnouncement(a.id).then(fetchData)} className="p-4 bg-red-600/10 text-red-500 rounded-2xl hover:bg-red-600 hover:text-white transition-all shrink-0"><Trash2 size={24} /></button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'promo' && (
            <div className="max-w-5xl mx-auto space-y-12 animate-in zoom-in-95 duration-700">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-6xl font-black text-yellow-500 italic tracking-tighter">GOLDEN FORGE</h2>
                  <p className="text-zinc-500 font-bold mt-4 text-xl">صناعة الأكواد والهدايا الترويجية</p>
                </div>
                <Ticket size={100} className="text-yellow-600/20" />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                <div className="glass-card p-12 rounded-[4rem] border border-yellow-500/20 bg-yellow-500/[0.01] shadow-2xl">
                  <h3 className="text-3xl font-black text-white italic mb-4 flex items-center gap-4"><Sparkles className="text-yellow-500" /> كود ترويجي جديد</h3>
                  <div className="mb-6 text-xs text-zinc-500 font-bold">
                    حالة مراقبة الشات: {chatStatus.connected ? <span className="text-kick-green">متصل</span> : <span className="text-red-500">غير متصل</span>}
                    {chatStatus.details ? <span className="ml-2 opacity-60">({chatStatus.details})</span> : null}
                  </div>
                  <div className="space-y-8">
                    <div className="space-y-3">
                      <label className="text-xs font-black text-zinc-600 uppercase tracking-widest pl-4">Secret Sequence</label>
                      <input
                        type="text"
                        value={newPromo.code}
                        onChange={(e) => setNewPromo({ ...newPromo, code: e.target.value.toUpperCase() })}
                        placeholder="مثال: GOLDEN_KICK"
                        className="w-full bg-black border-2 border-white/10 rounded-[2.5rem] p-8 text-4xl text-white font-black focus:border-yellow-500 outline-none transition-all shadow-2xl text-center tracking-widest placeholder:text-zinc-800"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-8">
                      <div className="space-y-3">
                        <label className="text-xs font-black text-zinc-600 uppercase tracking-widest">Amount (§)</label>
                        <input
                          type="number"
                          value={newPromo.amount}
                          onChange={(e) => setNewPromo({ ...newPromo, amount: Number(e.target.value) })}
                          className="w-full bg-white/5 border border-white/10 rounded-3xl p-6 text-2xl font-black text-yellow-500 text-center"
                        />
                      </div>
                      <div className="space-y-3">
                        <label className="text-xs font-black text-zinc-600 uppercase tracking-widest">Global Limit</label>
                        <input
                          type="number"
                          value={newPromo.maxUses}
                          onChange={(e) => setNewPromo({ ...newPromo, maxUses: Number(e.target.value) })}
                          className="w-full bg-white/5 border border-white/10 rounded-3xl p-6 text-2xl font-black text-white text-center"
                        />
                      </div>
                    </div>
                    <button
                      onClick={async () => {
                        if (!newPromo.code) return;
                        await adminService.addPromoCode(newPromo.code, newPromo.amount, newPromo.maxUses);
                        showStatus('تم توليد الكود بنجاح');
                        setNewPromo({ code: '', amount: 1000, maxUses: 10 });
                        fetchData();
                      }}
                      className="w-full py-8 bg-yellow-500 text-black font-black text-3xl rounded-[3rem] hover:scale-[1.03] active:scale-95 transition-all shadow-[0_20px_60px_rgba(234,179,8,0.3)] flex items-center justify-center gap-4 italic uppercase"
                    >
                      <Save size={32} /> Commit Golden Forge
                    </button>
                  </div>
                </div>

                <div className="space-y-6">
                  <h3 className="text-xs font-black text-zinc-600 uppercase tracking-[0.3em] pl-4 italic">Active Coupon Clusters</h3>
                  {promoCodes.map(promo => (
                    <div key={promo.id} className="bg-gradient-to-r from-zinc-900 to-black border border-white/5 p-8 rounded-[2rem] flex items-center justify-between group hover:border-yellow-500/30 transition-all shadow-2xl overflow-hidden relative">
                      <div className="absolute top-0 right-0 w-24 h-full bg-yellow-500/5 skew-x-[-20deg] translate-x-12"></div>
                      <div className="flex items-center gap-10">
                        <div className="w-20 h-20 bg-yellow-500 rounded-3xl flex items-center justify-center text-black font-black text-4xl shadow-xl shrink-0 group-hover:rotate-12 transition-transform">
                          <Ticket size={40} />
                        </div>
                        <div>
                          <div className="text-3xl font-black text-white italic tracking-widest uppercase">{promo.code}</div>
                          <div className="flex items-center gap-5 mt-3">
                            <span className="text-yellow-500 font-black text-lg italic">§ {promo.reward_amount}</span>
                            <div className="h-4 w-[1px] bg-zinc-700"></div>
                            <span className="text-zinc-500 text-xs font-bold uppercase">{promo.current_uses} / {promo.max_uses} USES</span>
                            <div className="h-4 w-[1px] bg-zinc-700"></div>
                            <span className={`text-xs font-black uppercase ${promo.is_active ? 'text-kick-green' : 'text-red-500'}`}>{promo.is_active ? 'ACTIVE' : 'INACTIVE'}</span>
                          </div>
                        </div>
                      </div>
                      <div className="relative z-10 opacity-0 group-hover:opacity-100 flex items-center gap-3">
                        <button onClick={() => adminService.togglePromoActive(promo.id, !promo.is_active).then(fetchData)} className={`p-4 rounded-2xl transition-all ${promo.is_active ? 'bg-red-600/10 text-red-500 hover:bg-red-600 hover:text-white' : 'bg-kick-green/10 text-kick-green hover:bg-kick-green hover:text-black'}`}>{promo.is_active ? <EyeOff size={22} /> : <Eye size={22} />}</button>
                        <button onClick={() => adminService.deletePromoCode(promo.id).then(fetchData)} className="p-5 bg-red-600/10 text-red-500 rounded-2xl hover:bg-red-600 hover:text-white transition-all"><Trash2 size={24} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'arena' && (
            <div className="space-y-12 animate-in fade-in duration-1000">
              <div>
                <h2 className="text-6xl font-black text-white italic tracking-tighter">ARENA CORE</h2>
                <p className="text-zinc-500 font-bold mt-4 text-xl italic uppercase">Quantum Environment Manipulation Control</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                <div className="glass-card p-10 rounded-[4rem] border border-white/5 bg-white/[0.01] hover:border-iabs-red/30 transition-all shadow-2xl flex flex-col">
                  <h3 className="text-2xl font-black text-white italic mb-10 border-b border-white/5 pb-4 flex items-center justify-between">Thematic Matrix <Palette size={24} className="text-iabs-red" /></h3>
                  <div className="grid grid-cols-1 gap-4 flex-1">
                    {['default', 'neon_blue', 'golden_arena', 'stealth_dark'].map(m => (
                      <button
                        key={m}
                        onClick={() => updateArena('global_mood', { ...arenaStatus.global_mood, theme: m })}
                        className={`p-6 rounded-[2rem] flex items-center justify-center border-2 transition-all font-black text-xs uppercase tracking-widest ${arenaStatus.global_mood?.theme === m ? 'border-iabs-red bg-white/5 text-white scale-105 shadow-xl' : 'border-transparent bg-black/40 text-zinc-600 hover:border-white/10'}`}
                      >
                        {m.replace('_', ' ')}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="glass-card p-10 rounded-[4rem] border border-white/5 bg-white/[0.01] hover:border-kick-green/30 transition-all shadow-2xl flex flex-col">
                  <h3 className="text-2xl font-black text-white italic mb-10 border-b border-white/5 pb-4 flex items-center justify-between">Visual FX <Sparkles size={24} className="text-kick-green" /></h3>
                  <div className="grid grid-cols-2 gap-4 flex-1">
                    {[
                      { id: 'none', label: 'VOID', icon: EyeOff, color: 'text-zinc-600' },
                      { id: 'snow', label: 'SNOW', icon: Wind, color: 'text-blue-400' },
                      { id: 'fire', label: 'EMBER', icon: Flame, color: 'text-orange-500' },
                      { id: 'confetti', label: 'CELEB', icon: Sparkles, color: 'text-kick-green' }
                    ].map(fx => (
                      <button
                        key={fx.id}
                        onClick={() => updateArena('global_mood', { ...arenaStatus.global_mood, particles: fx.id })}
                        className={`p-8 rounded-[2.5rem] flex flex-col items-center gap-4 transition-all border-2 ${arenaStatus.global_mood?.particles === fx.id ? 'bg-kick-green text-black border-kick-green scale-105 shadow-xl' : 'bg-black/40 text-zinc-600 border-transparent hover:border-white/10'}`}
                      >
                        <fx.icon size={32} />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">{fx.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="glass-card p-10 rounded-[4rem] border border-white/5 bg-white/[0.01] hover:border-blue-500/30 transition-all shadow-2xl flex flex-col">
                  <h3 className="text-2xl font-black text-white italic mb-10 border-b border-white/5 pb-4 flex items-center justify-between">Audio Stream <Music size={24} className="text-blue-500" /></h3>
                  <div className="space-y-8 flex-1">
                    <div className="bg-black/60 p-6 rounded-[2rem] border border-white/5 flex items-center justify-between">
                      <span className="text-xs font-black uppercase tracking-widest text-zinc-500 italic">Streaming Status</span>
                      <button
                        onClick={() => updateArena('audio_overlay', { ...arenaStatus.audio_overlay, enabled: !arenaStatus.audio_overlay?.enabled })}
                        className={`w-16 h-8 rounded-full p-1 relative transition-all ${arenaStatus.audio_overlay?.enabled ? 'bg-blue-600' : 'bg-zinc-800'}`}
                      >
                        <div className={`w-6 h-6 bg-white rounded-full transition-all shadow-lg ${arenaStatus.audio_overlay?.enabled ? 'translate-x-8' : 'translate-x-0'}`}></div>
                      </button>
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest pl-4">MP3 Network Link</label>
                      <input
                        type="text"
                        value={arenaStatus.audio_overlay?.url || ''}
                        onChange={(e) => updateArena('audio_overlay', { ...arenaStatus.audio_overlay, url: e.target.value })}
                        placeholder="https://server.com/track.mp3"
                        className="w-full bg-black border border-white/10 rounded-2xl p-5 text-xs font-mono text-blue-400 focus:border-blue-500 outline-none"
                      />
                    </div>
                    <div className="space-y-4 pt-4">
                      <div className="flex justify-between items-center px-4"><span className="text-[10px] font-black text-zinc-600 uppercase">Volume Matrix</span><span className="font-mono text-xs text-white">{(arenaStatus.audio_overlay?.volume * 100).toFixed(0)}%</span></div>
                      <input type="range" min="0" max="1" step="0.1" value={arenaStatus.audio_overlay?.volume || 0.5} onChange={(e) => updateArena('audio_overlay', { ...arenaStatus.audio_overlay, volume: Number(e.target.value) })} className="w-full h-2 bg-zinc-900 rounded-lg appearance-none cursor-pointer accent-blue-600" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="glass-card p-14 rounded-[4rem] border border-white/5 bg-gradient-to-r from-zinc-950 to-black relative overflow-hidden group shadow-[0_50px_100px_rgba(0,0,0,0.8)]">
                <div className="flex flex-col lg:flex-row items-center justify-between gap-12 relative z-10">
                  <div className="text-center lg:text-right">
                    <h3 className="text-5xl font-black text-white italic mb-6 tracking-tighter uppercase">GHOST_VIEWER_OVERRIDE</h3>
                    <p className="text-zinc-500 font-bold text-xl leading-relaxed italic max-w-2xl">تحديث عداد الحضور الوهمي في واجهة العرض لتحفيز التفاعل النفسي والمصداقية البصرية في الساحة للجمهور.</p>
                  </div>
                  <div className="bg-black p-12 rounded-[3.5rem] border border-white/10 flex flex-col items-center gap-10 min-w-[400px] shadow-2xl">
                    <div className={`w-36 h-36 rounded-full border-4 flex items-center justify-center transition-all ${arenaStatus.viewer_override?.enabled ? 'border-kick-green shadow-[0_0_50px_rgba(0,255,0,0.2)] bg-kick-green/5' : 'border-zinc-900 bg-transparent'}`}>
                      <Eye size={64} className={arenaStatus.viewer_override?.enabled ? 'text-kick-green animate-pulse' : 'text-zinc-800'} />
                    </div>
                    <div className="w-full space-y-4">
                      <div className="flex justify-between items-center px-6"><span className="text-[10px] font-black text-zinc-600 uppercase">Input Count Matrix</span><button onClick={() => updateArena('viewer_override', { ...arenaStatus.viewer_override, enabled: !arenaStatus.viewer_override?.enabled })} className={`font-black italic uppercase text-lg ${arenaStatus.viewer_override?.enabled ? 'text-kick-green' : 'text-zinc-700'}`}>{arenaStatus.viewer_override?.enabled ? 'ENGAGED' : 'OFFLINE'}</button></div>
                      <input
                        type="number"
                        value={arenaStatus.viewer_override?.count || 0}
                        onChange={(e) => updateArena('viewer_override', { ...arenaStatus.viewer_override, count: Number(e.target.value) })}
                        className="w-full bg-zinc-950 border-2 border-white/5 rounded-[2rem] p-8 text-center text-6xl text-white font-black italic focus:border-kick-green outline-none"
                      />
                    </div>
                  </div>
                </div>
                <div className="absolute top-0 right-[-100px] w-1/2 h-full bg-gradient-to-l from-kick-green/5 via-transparent to-transparent pointer-events-none skew-x-[-15deg]"></div>
              </div>
            </div>
          )}

          {activeTab === 'logs' && (
            <div className="space-y-12 animate-in fade-in duration-1000">
              <div className="flex items-end justify-between">
                <div>
                  <h2 className="text-6xl font-black text-white italic tracking-tighter">ADMIN VAULT LOGS</h2>
                  <p className="text-zinc-500 font-bold mt-4 text-xl">سجل كامل لجميع العمليات الإدارية المشفرة</p>
                </div>
                <Terminal size={100} className="text-zinc-900" />
              </div>
              <div className="glass-card rounded-[4rem] border border-white/5 overflow-hidden shadow-[0_40px_100px_rgba(0,0,0,0.9)]">
                <table className="w-full text-right">
                  <thead>
                    <tr className="bg-white/5 text-[10px] font-black uppercase text-zinc-600 tracking-[0.4em] border-b border-white/5">
                      <th className="p-10">UTC_TIME_VECTOR</th>
                      <th className="p-10">AUTHORITY</th>
                      <th className="p-10 text-center">OPERATION</th>
                      <th className="p-10">ENCRYPTED_DATA_PACKET</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.02] bg-black/40">
                    {logs.map(log => (
                      <tr key={log.id} className="text-sm hover:bg-white/[0.01] transition-colors group">
                        <td className="p-8 font-mono text-zinc-500 text-xs italic">{new Date(log.created_at).toLocaleString('ar-EG')}</td>
                        <td className="p-8 font-black text-iabs-red italic tracking-widest uppercase">{log.admin_username}</td>
                        <td className="p-8 text-center"><span className="bg-zinc-800 text-zinc-200 border border-white/10 px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest">{log.action}</span></td>
                        <td className="p-8 text-zinc-600 font-mono text-[10px] opacity-40 group-hover:opacity-100 transition-opacity">{JSON.stringify(log.details)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'system' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 animate-in zoom-in-95 duration-700 pb-20">
              <div className="bg-gradient-to-br from-red-950/20 to-black border-2 border-red-600/30 p-16 rounded-[4.5rem] relative overflow-hidden group shadow-[0_0_150px_rgba(255,0,0,0.05)]">
                <div className="absolute -right-20 -top-20 text-red-600/5 group-hover:scale-110 group-hover:rotate-12 transition-transform duration-1000"><Trash2 size={500} /></div>
                <h3 className="text-5xl font-black text-red-600 italic mb-10 flex items-center gap-6"><Database size={50} /> CLEAR_CELL_DATA</h3>
                <p className="text-zinc-400 font-bold text-2xl mb-14 leading-relaxed italic">سيتم تصفير جميع سجلات المتسابقين، الأرصدة، والمراكز نهائياً من الـ Core الخاص بالموقع. استخدم هذا الصلاحية بحذر شديد.</p>
                <button
                  onClick={async () => { if (confirm('تأكيد مسح جميع بيانات المتصدرين؟ لا يمكن التراجع!')) { await leaderboardService.resetLeaderboard(); showStatus('تم تنظيف قاعدة البيانات بالكامل'); fetchData(); } }}
                  className="w-full py-10 bg-red-600 text-white font-black text-4xl rounded-[3rem] hover:scale-[1.03] active:scale-95 transition-all shadow-[0_30px_100px_rgba(220,38,38,0.4)] flex items-center justify-center gap-6 uppercase italic tracking-tighter"
                >
                  <AlertTriangle size={56} className="animate-pulse" /> Purge Database
                </button>
              </div>

              <div className="glass-card p-16 rounded-[4.5rem] border border-white/5 bg-white/[0.01] flex flex-col justify-between shadow-2xl">
                <div>
                  <h3 className="text-4xl font-black text-white italic mb-10 flex items-center gap-6"><Key size={44} className="text-blue-600" /> ACCESS_PROTOCOL</h3>
                  <div className="space-y-10">
                    <div className="space-y-5">
                      <label className="text-xs font-black text-zinc-600 uppercase tracking-[0.5em] pl-8">New Auth Signature Code</label>
                      <input type="password" placeholder="أدخل كلمة المرور الجديدة..." className="w-full bg-black border-2 border-white/5 rounded-[3rem] p-10 text-4xl text-white font-black focus:border-blue-600 outline-none transition-all shadow-inner tracking-[0.3em] text-center" />
                    </div>
                    <button className="w-full py-10 bg-white text-black font-black text-3xl rounded-[3rem] hover:scale-[1.03] active:scale-95 transition-all shadow-[0_30px_100px_rgba(255,255,255,0.1)] flex items-center justify-center gap-6 italic uppercase">
                      <Save size={40} /> Update Master Key
                    </button>
                  </div>
                </div>
                <div className="mt-14 p-10 bg-blue-600/10 rounded-[2.5rem] border border-blue-600/20 text-center italic font-bold text-blue-400 text-sm">
                  تنبيه أمني: تغيير كود الدخول سيقوم بإنهاء جميع الجلسات النشطة للأدمن بشكل فورى وإجباري.
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
