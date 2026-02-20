import React, { useState, useEffect } from 'react';
import {
    User, Trophy, Settings, Layout, ShoppingBag,
    Star, Wallet, Shield, Zap, Sparkles, ChevronRight,
    Search, Filter, CheckCircle, Lock, Gem, Crown,
    ArrowRight, Box, Palette, Image as ImageIcon
} from 'lucide-react';
import { supabase } from '../services/supabase';
import { getAssetUrl } from '../utils/assets';

interface UserDashboardProps {
    userData: {
        id: string;
        kick_username: string;
        display_name: string;
        avatar?: string;
        points?: number;
    };
}

type DashboardView = 'OVERVIEW' | 'STORE' | 'LOCKER' | 'RANKINGS' | 'SETTINGS';

export const UserDashboard: React.FC<UserDashboardProps> = ({ userData }) => {
    const [activeView, setActiveView] = useState<DashboardView>('OVERVIEW');
    const [points, setPoints] = useState(userData.points || 0);
    const [activeFrame, setActiveFrame] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    // Sidebar items
    const navItems = [
        { id: 'OVERVIEW', label: 'نظرة عامة', icon: Layout },
        { id: 'STORE', label: 'المتجر', icon: ShoppingBag },
        { id: 'LOCKER', label: 'خزانة الأغراض', icon: Box },
        { id: 'RANKINGS', label: 'لوحة الصدارة', icon: Crown },
        { id: 'SETTINGS', label: 'الإعدادات', icon: Settings },
    ];

    useEffect(() => {
        const fetchUserData = async () => {
            const username = (userData.kick_username || (userData as any).kickUsername)?.toLowerCase();
            if (!username) return;

            // 1. Fetch points
            const { data: lbData } = await supabase
                .from('leaderboard')
                .select('score')
                .ilike('username', username)
                .maybeSingle();

            if (lbData) setPoints(lbData.score || 0);
            else setPoints(0);

            // 2. Fetch active frame
            const { data: profile } = await supabase
                .from('profiles')
                .select('active_frame_url')
                .ilike('username', username)
                .maybeSingle();

            if (profile) setActiveFrame(profile.active_frame_url);
        };
        fetchUserData();
    }, [userData]);

    const renderView = () => {
        switch (activeView) {
            case 'OVERVIEW': return <Overview userData={{ ...userData, points }} />;
            case 'STORE': return <Store userId={userData.id} kickUsername={userData.kick_username || (userData as any).kickUsername} points={points} onPurchase={(newPoints) => setPoints(newPoints)} />;
            case 'LOCKER': return <Locker userId={userData.id} onEquipChanged={(frame: string | null) => setActiveFrame(frame)} />;
            case 'RANKINGS': return <Rankings />;
            case 'SETTINGS': return <SettingsSection userData={userData} />;
            default: return <Overview userData={{ ...userData, points }} />;
        }
    };

    return (
        <div className="flex flex-col md:flex-row w-full h-full min-h-[600px] bg-black/40 backdrop-blur-3xl rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl animate-in zoom-in duration-500">
            {/* Sidebar */}
            <aside className="w-full md:w-72 bg-zinc-950/50 border-b md:border-b-0 md:border-l border-white/5 p-6 flex flex-col gap-8">
                {/* Profile Brief */}
                <div className="flex items-center gap-4 p-4 bg-white/5 rounded-3xl border border-white/10">
                    <div className="relative w-14 h-14 flex-shrink-0">
                        <div className="w-12 h-12 m-1 rounded-2xl overflow-hidden border border-red-500/30 bg-black">
                            {userData.avatar ? (
                                <img src={userData.avatar} className="w-full h-full object-cover" alt="" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-700">
                                    <User size={24} />
                                </div>
                            )}
                        </div>
                        {activeFrame && (
                            <img src={getAssetUrl(activeFrame)} className="absolute inset-0 w-full h-full object-contain pointer-events-none scale-125" alt="Frame" />
                        )}
                    </div>
                    <div className="overflow-hidden">
                        <div className="text-white font-black text-sm truncate">{userData.display_name}</div>
                        <div className="flex items-center gap-1.5 text-yellow-500 text-[10px] font-bold">
                            <Wallet size={10} />
                            <span>{points.toLocaleString()} نقطة</span>
                        </div>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex flex-col gap-2">
                    {navItems.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => setActiveView(item.id as DashboardView)}
                            className={`
                                flex items-center gap-4 px-5 py-4 rounded-2xl font-black text-sm transition-all duration-300
                                ${activeView === item.id
                                    ? 'bg-red-600 text-white shadow-lg shadow-red-900/20 translate-x-1'
                                    : 'text-gray-500 hover:text-white hover:bg-white/5'}
                            `}
                        >
                            <item.icon size={18} />
                            <span>{item.label}</span>
                            {activeView === item.id && <div className="mr-auto w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
                        </button>
                    ))}
                </nav>

                <div className="mt-auto pt-6 border-t border-white/5">
                    <div className="bg-gradient-to-br from-red-600/10 to-transparent p-5 rounded-3xl border border-red-500/10 relative overflow-hidden group">
                        <Sparkles size={40} className="absolute -bottom-2 -right-2 text-red-600/10 group-hover:scale-150 transition-transform duration-700" />
                        <div className="relative z-10">
                            <div className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-1">iABS VIP</div>
                            <div className="text-white font-bold text-xs leading-relaxed opacity-60">ارفع مستواك للحصول على خصومات حصرية في المتجر!</div>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-10 bg-gradient-to-br from-transparent to-black/20">
                {renderView()}
            </main>
        </div>
    );
};

// --- SUB-COMPONENTS ---

const Overview = ({ userData }: any) => {
    const [history, setHistory] = useState<any[]>([]);
    const [stats, setStats] = useState({ purchases: 0, rank: '...' });

    useEffect(() => {
        const fetchOverviewData = async () => {
            const username = (userData.kick_username || (userData as any).kickUsername)?.toLowerCase();
            if (!username) return;

            // 1. Fetch transactions
            const { data: transData } = await supabase
                .from('transactions')
                .select('*')
                .eq('user_id', userData.id)
                .order('created_at', { ascending: false })
                .limit(5);
            if (transData) setHistory(transData);

            // 2. Fetch inventory count
            const { count } = await supabase
                .from('user_inventory')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', userData.id);

            // 3. Fetch rank (simple implementation based on score)
            const { data: rankData } = await supabase
                .from('leaderboard')
                .select('username, score')
                .order('score', { ascending: false });

            let userRank = 'N/A';
            if (rankData) {
                const index = rankData.findIndex(r => r.username.toLowerCase() === username);
                if (index !== -1) userRank = `#${index + 1}`;
            }

            setStats({ purchases: count || 0, rank: userRank });
        };
        fetchOverviewData();
    }, [userData.id, userData.kick_username, (userData as any).kickUsername]);

    return (
        <div className="space-y-8 animate-in slide-in-from-bottom-10 duration-700">
            <header>
                <h1 className="text-4xl font-black italic text-white tracking-tighter mb-2">لوحة التحكم</h1>
                <p className="text-gray-500 font-bold text-sm tracking-widest uppercase">Member Dashboard / Overview</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatsCard label="إجمالي النقاط" value={(userData.points || 0).toLocaleString()} icon={Wallet} color="text-yellow-500" />
                <StatsCard label="المرتبة الحالية" value={stats.rank} icon={Trophy} color="text-red-500" />
                <StatsCard label="عدد المشتريات" value={stats.purchases.toString()} icon={ShoppingBag} color="text-blue-500" />
            </div>

            <div className="bg-white/[0.02] border border-white/5 rounded-[2.5rem] p-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/5 blur-[100px] rounded-full -translate-y-1/2 translate-x-1/2"></div>
                <div className="relative z-10">
                    <h3 className="text-white font-black text-xl mb-6 flex items-center gap-3">
                        <Zap className="text-red-500" size={20} /> آخر النشاطات
                    </h3>
                    <div className="space-y-4">
                        {history.length > 0 ? history.map(item => (
                            <ActivityItem
                                key={item.id}
                                label={item.description}
                                time={new Date(item.created_at).toLocaleDateString('ar-SA')}
                                points={item.amount > 0 ? `+${item.amount}` : item.amount.toString()}
                                type={item.type === 'PURCHASE' ? 'purchase' : 'reward'}
                            />
                        )) : (
                            <div className="text-center py-10 opacity-20 font-bold italic">لا توجد نشاطات مؤخراً</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

const Store = ({ userId, kickUsername, points, onPurchase }: any) => {
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchItems = async () => {
            const { data } = await supabase.from('store_items').select('*').eq('is_active', true);
            if (data) setItems(data);
            setLoading(false);
        };
        fetchItems();
    }, []);

    const handleBuy = async (item: any) => {
        if (points < item.price) {
            alert('نقاطك غير كافية!');
            return;
        }

        const confirmPurchase = window.confirm(`هل تريد شراء ${item.name} مقابل ${item.price} نقطة؟`);
        if (!confirmPurchase) return;

        try {
            // 1. Deduct from Leaderboard table (score column)
            const newPoints = points - item.price;

            const { error: updateError } = await supabase
                .from('leaderboard')
                .update({ score: newPoints })
                .ilike('username', kickUsername);

            if (updateError) throw updateError;

            // Optional: Also keep 'users.points' in sync if needed, but the requirement specifically said leaderboard
            await supabase.from('users').update({ points: newPoints }).eq('id', userId);

            // 2. Add to inventory
            await supabase.from('user_inventory').insert({
                user_id: userId,
                item_id: item.id
            });

            // 3. Log transaction
            await supabase.from('transactions').insert({
                user_id: userId,
                amount: -item.price,
                type: 'PURCHASE',
                description: `شراء ${item.name}`
            });

            onPurchase(newPoints);
            alert('تم الشراء بنجاح! يمكنك تفعيله من الخزانة.');
        } catch (e) {
            console.error(e);
            alert('حدث خطأ أثناء العملية.');
        }
    };

    return (
        <div className="space-y-8 animate-in slide-in-from-bottom-10 duration-700">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black italic text-white tracking-tighter mb-2">المتجر الحصري</h1>
                    <p className="text-gray-500 font-bold text-sm tracking-widest uppercase">Premium Skins & Items</p>
                </div>
                <div className="flex items-center gap-4 bg-yellow-500/10 border border-yellow-500/20 px-6 py-3 rounded-2xl">
                    <div className="flex flex-col items-end">
                        <span className="text-[10px] text-yellow-500/60 font-black uppercase">رصيدك الحالي</span>
                        <span className="text-white font-black text-xl tracking-tighter">{points.toLocaleString()}</span>
                    </div>
                    <Gem className="text-yellow-500" size={24} />
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {items.map((item) => (
                    <div key={item.id} className="bg-white/[0.03] border border-white/10 rounded-[2rem] p-6 hover:bg-white/[0.05] transition-all group overflow-hidden relative flex flex-col">
                        <div className="absolute -top-10 -right-10 w-32 h-32 bg-red-600/5 blur-3xl rounded-full group-hover:bg-red-600/10 transition-all"></div>

                        <div className="relative mb-6">
                            <div className="w-full aspect-square bg-black/60 rounded-3xl border border-white/5 flex items-center justify-center relative overflow-hidden group-hover:bg-black/40 transition-colors">
                                <div className="w-20 h-20 bg-zinc-800 rounded-2xl overflow-hidden border border-white/10 relative">
                                    <User size={40} className="m-auto mt-5 text-zinc-700" />
                                    {item.image_url && (
                                        <img src={getAssetUrl(item.image_url)} className="absolute inset-0 w-full h-full object-contain scale-125" alt="" />
                                    )}
                                </div>

                                {item.type === 'FRAME' && !item.image_url && (
                                    <div className="w-24 h-24 rounded-2xl border-4" style={item.config}>
                                    </div>
                                )}

                                {item.config?.showUsername && (
                                    <div className="absolute bottom-2 left-0 right-0 text-center">
                                        <div className="bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded text-[8px] font-black text-white inline-block border border-white/10">
                                            {kickUsername}
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="absolute top-4 left-4">
                                <span className="bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-black text-gray-400 border border-white/10 uppercase tracking-widest">
                                    {item.type}
                                </span>
                            </div>
                        </div>

                        <div className="space-y-4 relative flex-1 flex flex-col">
                            <div>
                                <h4 className="text-white font-black text-lg">{item.name}</h4>
                                <p className="text-gray-500 text-xs font-bold leading-relaxed">{item.description}</p>
                            </div>

                            <button
                                onClick={() => handleBuy(item)}
                                className="w-full mt-auto bg-white/5 hover:bg-yellow-500 hover:text-black py-4 rounded-xl font-black text-sm uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-3 group/btn"
                            >
                                <ArrowRight size={16} className="opacity-0 group-hover/btn:opacity-100 -translate-x-2 group-hover/btn:translate-x-0 transition-all" />
                                <span>{item.price.toLocaleString()} نقطة</span>
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const Locker = ({ userId, onEquipChanged }: any) => {
    const [ownedItems, setOwnedItems] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const fetchOwned = async () => {
            const { data } = await supabase
                .from('user_inventory')
                .select('*, store_items(*)')
                .eq('user_id', userId);
            if (data) setOwnedItems(data);
        };
        fetchOwned();
    }, [userId]);

    const toggleEquip = async (inventoryId: string, currentStatus: boolean, itemType: string) => {
        setIsLoading(true);
        try {
            // 1. If equipping, unequip others of ONLY the same type
            if (!currentStatus) {
                // Fetch all owned items to find those of the same type
                const { data: currentInventory } = await supabase
                    .from('user_inventory')
                    .select('id, item_id, store_items(type)')
                    .eq('user_id', userId);

                if (currentInventory) {
                    const sameTypeIds = currentInventory
                        .filter((inv: any) => inv.store_items.type === itemType)
                        .map((inv: any) => inv.id);

                    if (sameTypeIds.length > 0) {
                        await supabase
                            .from('user_inventory')
                            .update({ is_equipped: false })
                            .in('id', sameTypeIds);
                    }
                }
            }

            // 2. Toggle the selected item
            const newStatus = !currentStatus;
            await supabase
                .from('user_inventory')
                .update({ is_equipped: newStatus })
                .eq('id', inventoryId);

            // 3. If it's a FRAME, update profiles.active_frame_url
            if (itemType === 'FRAME') {
                const { data: itemData } = await supabase
                    .from('store_items')
                    .select('image_url')
                    .eq('id', (ownedItems.find(i => i.id === inventoryId))?.item_id)
                    .single();

                const frameUrl = newStatus ? itemData?.image_url : null;
                await supabase.from('profiles').update({ active_frame_url: frameUrl }).eq('id', userId);
                if (onEquipChanged) onEquipChanged(frameUrl);
            }

            // Refresh
            const { data } = await supabase
                .from('user_inventory')
                .select('*, store_items(*)')
                .eq('user_id', userId);
            if (data) setOwnedItems(data);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-8 animate-in slide-in-from-bottom-10 duration-700">
            <header>
                <h1 className="text-4xl font-black italic text-white tracking-tighter mb-2">الخزانة الخاصة</h1>
                <p className="text-gray-500 font-bold text-sm tracking-widest uppercase">My Collection / Inventory</p>
            </header>

            {ownedItems.length === 0 ? (
                <div className="bg-white/5 border border-dashed border-white/10 rounded-[2.5rem] p-20 flex flex-col items-center justify-center text-center">
                    <Box size={64} className="text-gray-700 mb-6" />
                    <h3 className="text-white font-black text-xl mb-2">خزانتك فارغة</h3>
                    <p className="text-gray-500 font-bold text-sm">توجه إلى المتجر للحصول على الإطارات والمميزات الحصرية.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {ownedItems.map((inv) => (
                        <div key={inv.id} className={`bg-white/[0.03] border rounded-[2rem] p-6 transition-all group ${inv.is_equipped ? 'border-green-500/50 shadow-[0_0_30px_rgba(34,197,94,0.1)]' : 'border-white/10'}`}>
                            <div className="w-full aspect-square bg-black/60 rounded-3xl border border-white/5 flex items-center justify-center mb-6 relative overflow-hidden">
                                <div className="w-20 h-20 bg-zinc-800 rounded-2xl overflow-hidden border border-white/10 relative">
                                    <User size={40} className="m-auto mt-5 text-zinc-700" />
                                    {inv.store_items.image_url && (
                                        <img src={getAssetUrl(inv.store_items.image_url)} className="absolute inset-0 w-full h-full object-contain scale-125" alt="" />
                                    )}
                                </div>

                                {inv.store_items.type === 'FRAME' && !inv.store_items.image_url && (
                                    <div className="w-24 h-24 rounded-2xl border-4" style={inv.store_items.config}>
                                    </div>
                                )}

                                {inv.is_equipped && (
                                    <div className="absolute top-4 right-4 animate-in zoom-in duration-300">
                                        <div className="bg-green-500 text-black px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg shadow-green-500/20">
                                            ACTIVE
                                        </div>
                                    </div>
                                )}
                            </div>
                            <h4 className="text-white font-black text-lg mb-4">{inv.store_items.name}</h4>
                            <button
                                onClick={() => toggleEquip(inv.id, inv.is_equipped, inv.store_items.type)}
                                className={`w-full py-4 rounded-xl font-black text-sm uppercase tracking-widest transition-all ${inv.is_equipped ? 'bg-red-600/10 text-red-500 hover:bg-red-600 hover:text-white' : 'bg-green-600 text-white hover:bg-green-500'}`}
                            >
                                {inv.is_equipped ? 'إيقاف التفعيل' : 'تفعيل الآن'}
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const Rankings = () => {
    const [players, setPlayers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchRankings = async () => {
            const { data } = await supabase
                .from('leaderboard')
                .select('*')
                .order('score', { ascending: false })
                .limit(20);
            if (data) setPlayers(data);
            setLoading(false);
        };
        fetchRankings();
    }, []);

    return (
        <div className="space-y-8 animate-in slide-in-from-bottom-10 duration-700">
            <header>
                <h1 className="text-4xl font-black italic text-white tracking-tighter mb-2">لوحة الصدارة</h1>
                <p className="text-gray-500 font-bold text-sm tracking-widest uppercase">Global Member Rankings</p>
            </header>

            <div className="glass-card rounded-[2.5rem] border border-white/5 overflow-hidden">
                <table className="w-full text-right">
                    <thead className="bg-white/5 border-b border-white/5">
                        <tr className="text-gray-400 font-black uppercase text-[10px] tracking-widest">
                            <th className="p-6 text-center">الرتبة</th>
                            <th className="p-6">المنافس</th>
                            <th className="p-6 text-center">النقاط</th>
                            <th className="p-6 text-center">الفوز</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {players.map((player, index) => (
                            <tr key={player.id} className="hover:bg-white/5 transition-all group">
                                <td className="p-6 text-center">
                                    <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl font-black ${index === 0 ? 'bg-yellow-500 text-black' : 'bg-white/5 text-gray-500'}`}>
                                        {index + 1}
                                    </div>
                                </td>
                                <td className="p-6">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-zinc-900 border border-white/10 overflow-hidden">
                                            {player.avatar_url ? <img src={player.avatar_url} className="w-full h-full object-cover" /> : <User size={20} className="m-auto mt-2 text-gray-700" />}
                                        </div>
                                        <span className="text-white font-black group-hover:text-red-500 transition-colors">{player.username}</span>
                                    </div>
                                </td>
                                <td className="p-6 text-center text-kick-green font-black">{player.score?.toLocaleString()}</td>
                                <td className="p-6 text-center text-white font-bold">{player.wins || 0}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {loading && (
                    <div className="py-20 flex flex-col items-center justify-center">
                        <Zap size={40} className="text-red-500 animate-pulse mb-4" />
                        <span className="text-gray-500 font-black italic">GATHERING LEGENDS...</span>
                    </div>
                )}
            </div>
        </div>
    );
};

const SettingsSection = ({ userData }: any) => {
    const [displayName, setDisplayName] = useState(userData.display_name);
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const { error } = await supabase
                .from('users')
                .update({ display_name: displayName })
                .eq('id', userData.id);

            if (error) throw error;

            // Also update local storage so changes reflect on refresh
            const stored = localStorage.getItem('iabs_user');
            if (stored) {
                const parsed = JSON.parse(stored);
                parsed.name = displayName;
                localStorage.setItem('iabs_user', JSON.stringify(parsed));
            }

            alert('تم حفظ التعديلات بنجاح!');
        } catch (e) {
            console.error(e);
            alert('حدث خطأ أثناء الحفظ.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-8 animate-in slide-in-from-bottom-10 duration-700">
            <header>
                <h1 className="text-4xl font-black italic text-white tracking-tighter mb-2">إعدادات الحساب</h1>
                <p className="text-gray-500 font-bold text-sm tracking-widest uppercase">Profile & Security Settings</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6 bg-white/[0.02] border border-white/5 p-8 rounded-[2.5rem]">
                    <h4 className="text-white font-black text-lg mb-4">المعلومات الشخصية</h4>
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-gray-500 text-[10px] font-black uppercase tracking-widest">الاسم المعروض</label>
                            <input
                                type="text"
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                                className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-white font-bold focus:border-red-500 outline-none transition-all"
                            />
                        </div>
                        <div className="bg-white/5 p-4 rounded-2xl border border-dashed border-white/10 opacity-50">
                            <span className="text-gray-500 text-[10px] font-black uppercase block mb-1">حساب Kick (لا يمكن تغييره)</span>
                            <span className="text-white font-bold">{userData.kick_username}</span>
                        </div>
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="w-full bg-red-600 hover:bg-red-500 text-white font-black py-4 rounded-2xl transition-all active:scale-95 disabled:opacity-50"
                        >
                            {isSaving ? 'جاري الحفظ...' : 'حفظ التعديلات'}
                        </button>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-gradient-to-br from-blue-600/10 to-transparent border border-blue-500/10 p-8 rounded-[2.5rem] flex flex-col items-center justify-center text-center h-full">
                        <Shield size={40} className="text-blue-500 mb-6" />
                        <h4 className="text-white font-black text-xl mb-2">الأمان والمصادقة</h4>
                        <p className="text-gray-500 font-bold text-xs mb-8">حسابك محمي بنظام iABS للمصادقة المتقدمة. تم ربط جهازك بنجاح.</p>
                        <div className="flex gap-4">
                            <div className="px-5 py-3 bg-white/5 rounded-xl border border-white/10">
                                <span className="text-[10px] font-black text-green-500 uppercase tracking-widest">Active Session</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Helper Components
const StatsCard = ({ label, value, icon: Icon, color }: any) => (
    <div className="bg-white/[0.03] border border-white/10 p-6 rounded-[2rem] flex items-center gap-6 group hover:bg-white/[0.05] transition-all">
        <div className={`w-16 h-16 rounded-2xl bg-black/40 flex items-center justify-center ${color} border border-white/5 group-hover:scale-110 transition-transform`}>
            <Icon size={28} />
        </div>
        <div>
            <div className="text-gray-500 text-[10px] font-black uppercase tracking-widest mb-1">{label}</div>
            <div className="text-white font-black text-2xl tracking-tighter">{value}</div>
        </div>
    </div>
);

const ActivityItem = ({ label, time, points, type }: any) => (
    <div className="flex items-center justify-between p-4 bg-black/20 rounded-2xl border border-white/5 hover:border-white/10 transition-all">
        <div className="flex items-center gap-4">
            <div className={`w-2 h-2 rounded-full ${type === 'purchase' ? 'bg-red-500' : type === 'reward' ? 'bg-green-500' : 'bg-blue-500'}`}></div>
            <div>
                <div className="text-white font-bold text-sm">{label}</div>
                <div className="text-gray-600 text-[10px] font-black uppercase">{time}</div>
            </div>
        </div>
        {points !== "0" && (
            <div className={`font-black text-sm ${points.startsWith('-') ? 'text-red-500' : 'text-green-500'}`}>
                {points}
            </div>
        )}
    </div>
);
