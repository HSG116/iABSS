import React, { useState, useEffect, useCallback } from 'react';
import { User, Loader2 } from 'lucide-react';
import { getAssetUrl } from '../utils/assets';
import { chatService } from '../services/chatService';
import { supabase } from '../services/supabase';

interface ProAvatarProps {
    url?: string;
    username: string;
    frameUrl?: string; // Manual override if needed
    size?: string;
    className?: string;
}

// Global cache to prevent repeated API calls in the same session
const frameCache: Record<string, string | null> = {};
const avatarMemCache: Record<string, string | null> = {};

export const ProAvatar: React.FC<ProAvatarProps> = ({
    url,
    username,
    frameUrl: initialFrameUrl,
    size = "w-14 h-14",
    className = ""
}) => {
    const [src, setSrc] = useState<string | undefined>(url && url.length > 10 ? url : undefined);
    const [frameUrl, setFrameUrl] = useState<string | undefined>(initialFrameUrl);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const uLower = (username || '').toLowerCase().trim().replace('@', '');

    // --- AVATAR LOGIC ---
    useEffect(() => {
        const resolveAvatar = async () => {
            if (!uLower) return;

            // 1. Initial State: URL provided?
            if (url && url.length > 10) {
                setSrc(url);
                return;
            }

            // 2. Memory Cache?
            if (avatarMemCache[uLower]) {
                setSrc(avatarMemCache[uLower]!);
                return;
            }

            // 3. Local Storage Cache?
            const cachedAv = localStorage.getItem(`av_${uLower}`);
            if (cachedAv && cachedAv.length > 10) {
                setSrc(cachedAv);
                avatarMemCache[uLower] = cachedAv;
            }

            // 4. Database Check (Profiles table)
            try {
                const { data } = await supabase
                    .from('profiles')
                    .select('avatar_url')
                    .ilike('username', uLower)
                    .maybeSingle();

                if (data?.avatar_url && data.avatar_url.length > 10) {
                    setSrc(data.avatar_url);
                    localStorage.setItem(`av_${uLower}`, data.avatar_url);
                    avatarMemCache[uLower] = data.avatar_url;
                    return;
                }
            } catch (e) { }

            // 5. Last Resort: Live Fetch via Kick Proxy
            if (!src) {
                const liveAv = await chatService.fetchKickAvatar(uLower);
                if (liveAv) {
                    setSrc(liveAv);
                    localStorage.setItem(`av_${uLower}`, liveAv);
                    avatarMemCache[uLower] = liveAv;
                }
            }
        };

        resolveAvatar();
    }, [url, uLower]);

    // --- FRAME LOGIC ---
    useEffect(() => {
        if (initialFrameUrl) {
            setFrameUrl(initialFrameUrl);
            return;
        }

        if (!uLower) return;

        // Check cache
        if (frameCache[uLower] !== undefined) {
            setFrameUrl(frameCache[uLower] || undefined);
        } else {
            const cached = localStorage.getItem(`frame_${uLower}`);
            if (cached) {
                const val = cached === 'none' ? undefined : cached;
                setFrameUrl(val);
                frameCache[uLower] = val || null;
            }
        }

        // Fetch fresh
        refreshFrame();

        // Subscribe to changes
        const channel = supabase
            .channel(`profile_ch_${uLower}`)
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'profiles' },
                (payload) => {
                    if (payload.new.username?.toLowerCase() === uLower) {
                        const nextFrame = payload.new.active_frame_url || null;
                        if (frameCache[uLower] !== nextFrame) {
                            frameCache[uLower] = nextFrame;
                            setFrameUrl(nextFrame || undefined);
                            localStorage.setItem(`frame_${uLower}`, nextFrame || 'none');
                        }
                    }
                }
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [initialFrameUrl, uLower]);

    const refreshFrame = async () => {
        try {
            const { data } = await supabase
                .from('profiles')
                .select('active_frame_url')
                .ilike('username', uLower)
                .maybeSingle();

            const fresh = data?.active_frame_url || null;
            if (frameCache[uLower] !== fresh) {
                frameCache[uLower] = fresh;
                setSrc(prev => prev); // Small trigger to ensure render
                setFrameUrl(fresh || undefined);
                localStorage.setItem(`frame_${uLower}`, fresh || 'none');
            }
        } catch (e) { }
    };

    const handleAvatarError = async () => {
        if (isRefreshing || !uLower) return;
        setIsRefreshing(true);
        try {
            const freshAv = await chatService.fetchKickAvatar(uLower);
            if (freshAv) {
                setSrc(freshAv);
                localStorage.setItem(`av_${uLower}`, freshAv);
                avatarMemCache[uLower] = freshAv;
                // Update DB too
                await supabase.from('profiles').update({ avatar_url: freshAv }).ilike('username', uLower);
            }
        } catch (e) { } finally {
            setIsRefreshing(false);
        }
    };

    return (
        <div
            className={`relative ${size} flex-shrink-0 ${className}`}
            style={{
                overflow: 'visible',
                zIndex: 10,
                isolation: 'isolate'
            }}
        >
            {/* AVATAR CIRCLE */}
            <div
                className="absolute inset-[8%] rounded-full overflow-hidden border-2 border-white/10 bg-zinc-950 shadow-inner"
                style={{ zIndex: 1 }}
            >
                {src ? (
                    <img
                        src={src}
                        className="w-full h-full object-cover"
                        onError={handleAvatarError}
                        alt={uLower}
                        referrerPolicy="no-referrer"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center font-black text-white/10 text-xl bg-white/5 uppercase select-none">
                        {uLower ? uLower[0] : '?'}
                    </div>
                )}

                {isRefreshing && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-[2px]">
                        <Loader2 className="animate-spin text-white w-4 h-4" />
                    </div>
                )}
            </div>

            {/* FRAME LAYER - HIGHEST PRIORITY */}
            {frameUrl && (
                <div
                    className="absolute pointer-events-none"
                    style={{
                        inset: '-20%', // Wider inset to prevent clipping
                        zIndex: 100, // Topmost
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}
                >
                    <img
                        src={getAssetUrl(frameUrl)}
                        className="w-full h-full object-contain filter drop-shadow-[0_0_15px_rgba(0,0,0,0.8)]"
                        alt="Frame"
                        onError={() => setFrameUrl(undefined)}
                        style={{
                            transform: 'scale(1.15)',
                            display: 'block'
                        }}
                    />
                </div>
            )}
        </div>
    );
};
