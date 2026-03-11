import React, { useState, useEffect, useRef } from 'react';
import { User, Plus, X, Trash2, Loader2, Star, Minus, ExternalLink } from 'lucide-react';
import { supabase } from '../services/supabase';
import { chatService } from '../services/chatService';
import { ProAvatar } from './ProAvatar';

interface Sponsor {
    id: string;
    name: string;
    kickUsername: string;
    avatarUrl: string;
    isLoading?: boolean;
    isFixing?: boolean;
}

const CSS = `
@keyframes spw-scroll {
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}
@keyframes spw-gleam {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(400%); }
}
@keyframes spw-enter {
  0% { opacity:0; transform: translateY(8px) scale(0.9); }
  100% { opacity:1; transform: translateY(0) scale(1); }
}
`;

export const SponsorsWidget: React.FC = () => {
    const [sponsors, setSponsors] = useState<Sponsor[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [newName, setNewName] = useState('');
    const [newKick, setNewKick] = useState('');
    const [newAvatarUrl, setNewAvatarUrl] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    const [hovId, setHovId] = useState<string | null>(null);
    const [scale, setScale] = useState(() => {
        try { return parseFloat(localStorage.getItem('iabs_sp_scale') || '1.9'); } catch { return 1.9; }
    });
    const injected = useRef(false);

    const fixAvatar = async (sp: Sponsor) => {
        if (!sp.kickUsername || sp.isFixing) return;
        setSponsors(prev => prev.map(s => s.id === sp.id ? { ...s, isFixing: true } : s));
        try {
            const freshAvatar = await chatService.fetchKickAvatar(sp.kickUsername);
            if (freshAvatar) {
                await supabase.from('sponsors').update({ avatar_url: freshAvatar }).eq('id', sp.id);
                setSponsors(prev => prev.map(s => s.id === sp.id ? { ...s, avatarUrl: freshAvatar, isFixing: false } : s));
            } else {
                setSponsors(prev => prev.map(s => s.id === sp.id ? { ...s, isFixing: false } : s));
            }
        } catch (e) {
            setSponsors(prev => prev.map(s => s.id === sp.id ? { ...s, isFixing: false } : s));
        }
    };

    // Initial Load & Realtime Sync
    useEffect(() => {
        const load = async () => {
            const { data } = await supabase.from('sponsors').select('*').order('created_at', { ascending: true });
            if (data) {
                const loadedSponsors = data.map(d => ({
                    id: d.id,
                    name: d.name,
                    kickUsername: d.kick_username,
                    avatarUrl: d.avatar_url
                }));
                setSponsors(loadedSponsors);
            }
        };
        load();

        const channel = supabase.channel('sp_sync')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'sponsors' }, () => {
                load();
            })
            .subscribe();

        if (!injected.current) {
            injected.current = true;
            const s = document.createElement('style');
            s.textContent = CSS;
            document.head.appendChild(s);
        }

        return () => { supabase.removeChannel(channel); };
    }, []);

    // AUTO-FIX: watch sponsors and fix those missing avatars immediately
    useEffect(() => {
        sponsors.forEach(sp => {
            if (sp.kickUsername && !sp.avatarUrl && !sp.isFixing) {
                fixAvatar(sp);
            }
        });
    }, [sponsors]);

    useEffect(() => { localStorage.setItem('iabs_sp_scale', String(scale)); }, [scale]);

    const addSponsor = async () => {
        if (!newName.trim() && !newKick.trim() && !newAvatarUrl.trim()) return;
        setIsAdding(true);

        try {
            let avatar = newAvatarUrl.trim();
            if (!avatar && newKick.trim()) {
                avatar = await chatService.fetchKickAvatar(newKick.trim());
            }

            await supabase.from('sponsors').insert({
                name: newName.trim() || newKick.trim() || 'راعي',
                kick_username: newKick.trim(),
                avatar_url: avatar
            });

            setNewName(''); setNewKick(''); setNewAvatarUrl(''); setShowForm(false);
        } catch (e) {
            console.error(e);
        } finally {
            setIsAdding(false);
        }
    };

    const deleteSponsor = async (id: string) => {
        await supabase.from('sponsors').delete().eq('id', id);
    };

    const doMarquee = sponsors.length > 4;
    const cards = doMarquee ? [...sponsors, ...sponsors] : sponsors;

    return (
        <div style={{ position: 'fixed', bottom: 0, left: 0, zIndex: 200, direction: 'ltr', transform: `scale(${scale})`, transformOrigin: 'bottom left' }}>

            {/* ══ ADD FORM (floats above) ══ */}
            <div style={{
                position: 'absolute', bottom: '100%', left: 0, marginBottom: '8px',
                maxHeight: showForm ? '300px' : '0', opacity: showForm ? 1 : 0,
                transform: showForm ? 'translateY(0) scale(1)' : 'translateY(8px) scale(0.95)',
                transition: 'all 0.35s cubic-bezier(0.4,0,0.2,1)', overflow: 'hidden',
                pointerEvents: showForm ? 'auto' : 'none', transformOrigin: 'bottom left',
            }}>
                <div style={{
                    padding: '14px', minWidth: '260px', direction: 'rtl',
                    background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '14px',
                    boxShadow: '0 -10px 40px rgba(0,0,0,0.7), 0 0 1px rgba(220,38,38,0.4)',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                        <div style={{ width: '24px', height: '24px', borderRadius: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#dc2626' }}>
                            <Plus size={12} color="#fff" />
                        </div>
                        <span style={{ fontSize: '12px', fontWeight: 900, color: '#fff' }}>إضافة راعي</span>
                    </div>
                    <input type="text" value={newName} onChange={e => setNewName(e.target.value)} placeholder="اسم الراعي..." dir="rtl"
                        style={{ width: '100%', padding: '8px 12px', fontSize: '12px', fontWeight: 700, color: '#fff', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', outline: 'none', marginBottom: '6px', boxSizing: 'border-box', textAlign: 'right' }}
                    />
                    <input type="text" value={newKick} onChange={e => setNewKick(e.target.value)} placeholder="يوزر الكيك (اختياري)..." dir="ltr"
                        style={{ width: '100%', padding: '8px 12px', fontSize: '12px', fontWeight: 700, color: '#53fc18', fontFamily: 'monospace', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', outline: 'none', marginBottom: '6px', boxSizing: 'border-box' }}
                    />
                    <input type="text" value={newAvatarUrl} onChange={e => setNewAvatarUrl(e.target.value)} placeholder="رابط صورة (اختياري)..." dir="ltr"
                        style={{ width: '100%', padding: '8px 12px', fontSize: '12px', fontWeight: 700, color: '#38bdf8', fontFamily: 'monospace', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', outline: 'none', marginBottom: '8px', boxSizing: 'border-box' }}
                        onKeyDown={e => { if (e.key === 'Enter') addSponsor(); }}
                    />
                    <button onClick={addSponsor} disabled={isAdding || (!newName.trim() && !newKick.trim() && !newAvatarUrl.trim())}
                        style={{ width: '100%', padding: '8px', borderRadius: '8px', border: 'none', background: '#dc2626', color: '#fff', fontSize: '11px', fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', opacity: (!newName.trim() && !newKick.trim() && !newAvatarUrl.trim()) ? 0.3 : 1 }}
                    >
                        {isAdding ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                        <span>إضافة</span>
                    </button>
                </div>
            </div>

            {/* ══ BOTTOM BAR ══ */}
            <div style={{ display: 'flex', alignItems: 'stretch', height: '48px' }}>

                {/* ── TAB (slanted left edge only) ── */}
                <div onClick={() => setShowForm(!showForm)} style={{
                    position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    width: '110px', cursor: 'pointer', flexShrink: 0, zIndex: 2, overflow: 'hidden',
                    background: 'linear-gradient(180deg, #c42020 0%, #8b1515 100%)',
                    clipPath: 'polygon(12% 0%, 100% 0%, 100% 100%, 0% 100%)',
                }}>
                    <div style={{ position: 'absolute', top: 0, width: '30%', height: '100%', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.18), transparent)', animation: 'spw-gleam 3s ease-in-out infinite', pointerEvents: 'none' }} />
                    <span style={{ fontSize: '14px', fontWeight: 900, color: '#fff', position: 'relative', zIndex: 1, textShadow: '0 1px 6px rgba(0,0,0,0.5)' }}>الرعاة</span>
                    <span style={{ fontSize: '6px', fontWeight: 800, color: 'rgba(255,200,200,0.45)', letterSpacing: '2.5px', position: 'relative', zIndex: 1, marginTop: '1px' }}>SPONSORS</span>
                </div>

                {/* ── BAR ── */}
                <div style={{
                    position: 'relative', display: 'flex', alignItems: 'center', flex: 1,
                    minWidth: '280px', maxWidth: '70vw',
                    background: 'linear-gradient(180deg, #111 0%, #090909 100%)',
                    borderTop: '2px solid #dc2626',
                    borderRadius: '0 12px 0 0',
                    overflow: 'hidden',
                }}>

                    {/* ── ZOOM CONTROLS ── */}
                    <div style={{
                        display: 'flex', alignItems: 'center', flexShrink: 0, alignSelf: 'stretch',
                        borderRight: '1px solid rgba(255,255,255,0.05)', padding: '0 4px', gap: '0',
                    }}>
                        <button onClick={() => setScale(p => Math.max(0.5, +(p - 0.1).toFixed(1)))} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: '#555', display: 'flex' }} title="تصغير">
                            <Minus size={10} />
                        </button>
                        <span style={{ fontSize: '8px', color: '#444', fontFamily: 'monospace', padding: '0 2px', userSelect: 'none', minWidth: '24px', textAlign: 'center' }}>
                            {Math.round(scale * 100)}%
                        </span>
                        <button onClick={() => setScale(p => Math.min(2, +(p + 0.1).toFixed(1)))} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: '#555', display: 'flex' }} title="تكبير">
                            <Plus size={10} />
                        </button>
                    </div>

                    {/* ── SPONSOR CARDS AREA ── */}
                    <div style={{ flex: 1, overflow: 'hidden', height: '100%', display: 'flex', alignItems: 'center' }}>
                        {sponsors.length === 0 ? (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', gap: '6px', opacity: 0.2 }}>
                                <Star size={12} color="#ef4444" />
                                <span style={{ fontSize: '11px', fontWeight: 700, color: '#666', whiteSpace: 'nowrap' }}>اضغط على الرعاة لإضافة</span>
                            </div>
                        ) : (
                            <div
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '8px', padding: '0 12px', height: '100%',
                                    ...(doMarquee ? { width: 'max-content', animation: `spw-scroll ${sponsors.length * 5}s linear infinite` } : {}),
                                }}
                                onMouseEnter={e => { if (doMarquee) (e.currentTarget as HTMLElement).style.animationPlayState = 'paused'; }}
                                onMouseLeave={e => { if (doMarquee) (e.currentTarget as HTMLElement).style.animationPlayState = 'running'; }}
                            >
                                {cards.map((sp, i) => {
                                    const uid = `${sp.id}_${i}`;
                                    const hov = hovId === uid;
                                    return (
                                        <React.Fragment key={uid}>
                                            <div
                                                onMouseEnter={() => setHovId(uid)}
                                                onMouseLeave={() => setHovId(null)}
                                                style={{
                                                    display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0,
                                                    padding: '6px 14px', height: '42px', borderRadius: '14px',
                                                    background: hov ? 'rgba(220,38,38,0.15)' : 'rgba(255,255,255,0.03)',
                                                    border: hov ? '1.5px solid rgba(220,38,38,0.4)' : '1px solid rgba(255,255,255,0.06)',
                                                    boxShadow: hov ? '0 0 20px rgba(220,38,38,0.2)' : 'none',
                                                    transform: hov ? 'translateY(-2px) scale(1.02)' : 'none',
                                                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                                    cursor: 'default',
                                                    position: 'relative',
                                                    overflow: 'hidden',
                                                    animation: !doMarquee ? `spw-enter 0.5s cubic-bezier(0.4, 0, 0.2, 1) ${i * 100}ms both` : undefined,
                                                }}
                                            >
                                                <div style={{
                                                    position: 'absolute', top: 0, left: 0, width: '2px', height: '100%',
                                                    background: '#dc2626', opacity: hov ? 1 : 0.3, transition: 'opacity 0.3s'
                                                }} />

                                                    <div className="overflow-visible" style={{ position: 'relative', flexShrink: 0 }}>
                                                        <ProAvatar
                                                            url={sp.avatarUrl}
                                                            username={sp.kickUsername || sp.name}
                                                            size="w-8 h-8"
                                                            className="overflow-visible"
                                                        />
                                                    </div>

                                                <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, maxWidth: '120px', gap: '1px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                        <span style={{
                                                            fontSize: '12px', fontWeight: 900, color: hov ? '#fff' : '#eee',
                                                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                                            transition: 'color 0.3s', lineHeight: 1.1, direction: 'rtl', textAlign: 'right',
                                                            textShadow: hov ? '0 0 8px rgba(255,255,255,0.3)' : 'none'
                                                        }}>{sp.name}</span>
                                                        {hov && <Star size={8} fill="#dc2626" color="#dc2626" className="animate-pulse" />}
                                                    </div>
                                                    {sp.kickUsername && (
                                                        <a href={`https://kick.com/${sp.kickUsername}`} target="_blank" rel="noopener noreferrer"
                                                            onClick={e => e.stopPropagation()}
                                                            style={{
                                                                fontSize: '9px', fontWeight: 700, color: hov ? '#53fc18' : 'rgba(83,252,24,0.4)',
                                                                textDecoration: 'none', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                                                lineHeight: 1, transition: 'color 0.3s', fontFamily: 'monospace'
                                                            }}
                                                        >kick.com/{sp.kickUsername}</a>
                                                    )}
                                                </div>

                                                {i < sponsors.length && (
                                                    <button onClick={() => deleteSponsor(sp.id)} title="حذف"
                                                        style={{
                                                            flexShrink: 0, width: '18px', height: '18px', borderRadius: '5px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                            background: 'transparent', border: 'none', color: '#dc2626', cursor: 'pointer',
                                                            opacity: hov ? 0.8 : 0, transition: 'opacity 0.2s',
                                                        }}
                                                    ><Trash2 size={10} /></button>
                                                )}
                                            </div>

                                            {i < cards.length - 1 && (
                                                <div style={{ width: '3px', height: '3px', borderRadius: '50%', flexShrink: 0, background: 'rgba(220,38,38,0.2)' }} />
                                            )}
                                        </React.Fragment>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    <button onClick={() => setShowForm(!showForm)}
                        style={{
                            flexShrink: 0, width: '36px', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: showForm ? 'rgba(220,38,38,0.12)' : 'transparent',
                            border: 'none', borderLeft: '1px solid rgba(255,255,255,0.04)',
                            color: showForm ? '#e88' : 'rgba(255,255,255,0.12)', cursor: 'pointer', transition: 'all 0.25s',
                        }}
                    >
                        {showForm ? <X size={15} /> : <Plus size={15} />}
                    </button>
                </div>
            </div>
        </div>
    );
};
