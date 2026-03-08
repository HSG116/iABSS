import React, { useState, useEffect } from 'react';
import { User, Loader2 } from 'lucide-react';
import { getAssetUrl, getFrameUrl } from '../utils/assets';
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

            // Direct Prop - check if it looks like a stale Kick URL
            if (url && url.length > 5) {
                const isStaleKick = url.includes('kick.com/api/') || (url.includes('kick.com/storage') && !url.includes('files.kick.com'));
                if (!isStaleKick) {
                    setSrc(url);
                    return;
                }
                // If it's a stale Kick URL, we continue to check cache then database then fetch
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
        console.warn(`[ProAvatar] Avatar load error for ${uLower}, attempting recovery...`);
        try {
            // First check if we have a cached alternative that isn't the current one
            const stored = localStorage.getItem(`av_${uLower}`);
            if (stored && stored !== src) {
                setSrc(stored);
                setIsRefreshing(false);
                return;
            }

            const fresh = await chatService.fetchKickAvatar(uLower);
            if (fresh) {
                console.log(`[ProAvatar] Successfully recovered avatar for ${uLower}: ${fresh}`);
                setSrc(fresh);
                localStorage.setItem(`av_${uLower}`, fresh);
                avatarCache[uLower] = fresh;
                // Try to update DB, but don't fail if permissions are missing
                try {
                    await supabase.from('profiles').update({ avatar_url: fresh }).ilike('username', uLower);
                } catch (dbErr) {
                    console.warn(`[ProAvatar] Could not persist new avatar to DB (probably permissions): ${dbErr}`);
                }
            } else {
                setSrc(undefined); // Clear to show fallback
            }
        } catch (e) {
            console.error(`[ProAvatar] Recovery failed for ${uLower}:`, e);
            setSrc(undefined);
        } finally {
            setIsRefreshing(false);
        }
    };

    // Frame Resolution helper moved to utils/assets.ts

    return (
        <div
            className={`relative ${size} flex-shrink-0 flex items-center justify-center ${className}`}
            style={{ overflow: 'visible', zIndex: 10 }}
        >
            {/* Avatar Base */}
            <div className="w-[84%] h-[84%] rounded-full overflow-hidden border-2 border-white/10 bg-zinc-950 shadow-inner relative z-0 flex-shrink-0">
                {src ? (
                    <img
                        src={src}
                        className="w-full h-full object-cover"
                        onError={handleAvatarError}
                        alt=""
                        referrerPolicy="no-referrer"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center font-black text-white/10 text-3xl bg-white/5 uppercase select-none">
                        <User size={size.includes('w-10') ? 20 : 32} className="opacity-20" />
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
                    className="absolute inset-0 pointer-events-none flex items-center justify-center z-[100]"
                >
                    <img
                        src={getFrameUrl(frameUrl)}
                        className="w-[125%] h-[125%] max-w-none object-contain filter drop-shadow-[0_0_20px_rgba(0,0,0,0.8)]"
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
