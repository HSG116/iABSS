import React, { useState, useEffect } from 'react';
import { User, Loader2 } from 'lucide-react';
import { getAssetUrl } from '../utils/assets';
import { chatService } from '../services/chatService';
import { supabase } from '../services/supabase';

interface ProAvatarProps {
    url?: string;
    username: string;
    frameUrl?: string;
    size?: string;
    className?: string;
    forceRefresh?: number; // Optional trigger to refresh
}

const frameCache: Record<string, string | null> = {};
const avatarCache: Record<string, string | null> = {};

export const ProAvatar: React.FC<ProAvatarProps> = ({
    url,
    username,
    frameUrl: initialFrameUrl,
    size = "w-14 h-14",
    className = "",
    forceRefresh = 0
}) => {
    const [src, setSrc] = useState<string | undefined>(url || undefined);
    const [frameUrl, setFrameUrl] = useState<string | undefined>(initialFrameUrl);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const uLower = (username || '').toLowerCase().trim().replace('@', '');

    // 1. Avatar Resolution
    useEffect(() => {
        const fetchAvatar = async () => {
            if (!uLower) return;

            // Direct Prop
            if (url && url.length > 5) {
                setSrc(url);
                return;
            }

            // Memory Cache
            if (avatarCache[uLower]) {
                setSrc(avatarCache[uLower]!);
                return;
            }

            // LocalStorage Cache
            const stored = localStorage.getItem(`av_${uLower}`);
            if (stored && stored.length > 5) {
                setSrc(stored);
                avatarCache[uLower] = stored;
                return;
            }

            // Database
            try {
                const { data } = await supabase
                    .from('profiles')
                    .select('avatar_url')
                    .ilike('username', uLower)
                    .maybeSingle();

                if (data?.avatar_url) {
                    setSrc(data.avatar_url);
                    localStorage.setItem(`av_${uLower}`, data.avatar_url);
                    avatarCache[uLower] = data.avatar_url;
                    return;
                }
            } catch (e) { }

            // Kick Fetch
            const live = await chatService.fetchKickAvatar(uLower);
            if (live) {
                setSrc(live);
                localStorage.setItem(`av_${uLower}`, live);
                avatarCache[uLower] = live;
            }
        };

        fetchAvatar();
    }, [url, uLower, forceRefresh]);

    // 2. Frame Resolution
    useEffect(() => {
        if (!uLower) return;

        // Prop priority
        if (initialFrameUrl !== undefined) {
            setFrameUrl(initialFrameUrl);
            // Also update local cache if it's a real URL
            if (initialFrameUrl) {
                frameCache[uLower] = initialFrameUrl;
            }
            return;
        }

        const syncFrame = async () => {
            // In-memory cache
            if (frameCache[uLower] !== undefined) {
                setFrameUrl(frameCache[uLower] || undefined);
            } else {
                const stored = localStorage.getItem(`frame_${uLower}`);
                if (stored) {
                    const val = stored === 'none' ? undefined : stored;
                    setFrameUrl(val);
                    frameCache[uLower] = val || null;
                }
            }

            // Database sync
            try {
                const { data } = await supabase
                    .from('profiles')
                    .select('active_frame_url')
                    .ilike('username', uLower)
                    .maybeSingle();

                const fresh = data?.active_frame_url || null;
                if (frameCache[uLower] !== fresh) {
                    frameCache[uLower] = fresh;
                    setFrameUrl(fresh || undefined);
                    localStorage.setItem(`frame_${uLower}`, fresh || 'none');
                }
            } catch (e) { }
        };

        syncFrame();

        // Real-time subscription
        const channel = supabase
            .channel(`frame_sync_${uLower}`)
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'profiles' },
                (payload) => {
                    const updatedUser = payload.new.username?.toLowerCase();
                    if (updatedUser === uLower || (!updatedUser && payload.old?.username?.toLowerCase() === uLower)) {
                        const next = payload.new.active_frame_url || null;
                        if (frameCache[uLower] !== next) {
                            frameCache[uLower] = next;
                            setFrameUrl(next || undefined);
                            localStorage.setItem(`frame_${uLower}`, next || 'none');
                        }
                    }
                }
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [initialFrameUrl, uLower, forceRefresh]);

    const handleAvatarError = async () => {
        if (isRefreshing || !uLower) return;
        setIsRefreshing(true);
        try {
            const fresh = await chatService.fetchKickAvatar(uLower);
            if (fresh) {
                setSrc(fresh);
                localStorage.setItem(`av_${uLower}`, fresh);
                avatarCache[uLower] = fresh;
                await supabase.from('profiles').update({ avatar_url: fresh }).ilike('username', uLower);
            }
        } catch (e) { } finally {
            setIsRefreshing(false);
        }
    };

    const resolveFramePath = (path: string) => {
        if (!path) return '';
        if (path.startsWith('http')) return path;

        // Handle names like "1.png" correctly
        let cleanPath = path;
        if (path.startsWith('/')) cleanPath = path.substring(1);

        // If it looks like a filename in frame/ directory or is a known frame
        if (/^\d+\.png$/.test(cleanPath) || !cleanPath.includes('/')) {
            if (!cleanPath.startsWith('frame/')) {
                return `/frame/${cleanPath}`;
            }
        }

        return getAssetUrl(cleanPath) || '';
    };

    return (
        <div
            className={`relative ${size} flex-shrink-0 ${className}`}
            style={{ overflow: 'visible', zIndex: 10 }}
        >
            {/* Avatar Base */}
            <div className="absolute inset-[8%] rounded-full overflow-hidden border-2 border-white/10 bg-zinc-950 shadow-inner z-0">
                {src ? (
                    <img
                        src={src}
                        className="w-full h-full object-cover"
                        onError={handleAvatarError}
                        alt=""
                        referrerPolicy="no-referrer"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center font-black text-white/10 text-xl bg-white/5 uppercase select-none">
                        {uLower ? uLower[0] : '?'}
                    </div>
                )}
                {isRefreshing && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm">
                        <Loader2 className="animate-spin text-white w-4 h-4" />
                    </div>
                )}
            </div>

            {/* Frame Layer */}
            {frameUrl && (
                <div
                    className="absolute pointer-events-none"
                    style={{
                        inset: '-20%',
                        zIndex: 100,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}
                >
                    <img
                        src={resolveFramePath(frameUrl)}
                        className="w-full h-full object-contain filter drop-shadow-[0_0_20px_rgba(0,0,0,0.8)]"
                        alt="Frame"
                        onError={() => {
                            console.warn("Frame failed:", frameUrl);
                            setFrameUrl(undefined);
                        }}
                        style={{ transform: 'scale(1.15)' }}
                    />
                </div>
            )}
        </div>
    );
};
