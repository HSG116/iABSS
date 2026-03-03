import React, { useState, useEffect } from 'react';
import { User, Loader2 } from 'lucide-react';
import { getAssetUrl } from '../utils/assets';
import { chatService } from '../services/chatService';
import { supabase } from '../services/supabase';

interface ProAvatarProps {
    url?: string;
    username: string;
    frameUrl?: string; // Manual override
    size?: string;
    className?: string;
}

// Session cache to avoid blinky updates
const frameCache: Record<string, string | null> = {};

export const ProAvatar: React.FC<ProAvatarProps> = ({
    url,
    username,
    frameUrl: initialFrameUrl,
    size = "w-14 h-14",
    className = ""
}) => {
    const [src, setSrc] = useState(url);
    const [frameUrl, setFrameUrl] = useState<string | undefined>(initialFrameUrl);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // 1. Avatar Handling
    useEffect(() => {
        const fetchAvatar = async () => {
            if (!username) return;
            const uLower = username.toLowerCase().trim().replace('@', '');

            // Check Local Cache
            const cachedAv = localStorage.getItem(`av_${uLower}`);
            if (cachedAv && cachedAv.length > 10) {
                setSrc(cachedAv);
                return;
            }

            // DB Check
            try {
                const { data } = await supabase
                    .from('profiles')
                    .select('avatar_url')
                    .ilike('username', uLower)
                    .maybeSingle();

                if (data?.avatar_url) {
                    setSrc(data.avatar_url);
                    localStorage.setItem(`av_${uLower}`, data.avatar_url);
                    return;
                }
            } catch (e) { }

            // Live Fetch
            const realAv = await chatService.fetchKickAvatar(uLower);
            if (realAv) {
                setSrc(realAv);
                localStorage.setItem(`av_${uLower}`, realAv);
            }
        };

        if (url && url.length > 5) {
            setSrc(url);
        } else {
            fetchAvatar();
        }
    }, [url, username]);

    // 2. Frame Handling + Real-time Subscription
    useEffect(() => {
        if (initialFrameUrl) {
            setFrameUrl(initialFrameUrl);
            return;
        }

        if (!username) return;
        const uLower = username.toLowerCase().trim().replace('@', '');

        // Immediate Load from Cache
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

        // Fetch Fresh + Subscribe
        loadAndSubscribe(uLower);

        // Cleanup subscription
        return () => {
            supabase.channel(`profile_${uLower}`).unsubscribe();
        };
    }, [initialFrameUrl, username]);

    const loadAndSubscribe = async (uLower: string) => {
        // Initial Fetch
        const fetchOnce = async () => {
            try {
                const { data } = await supabase
                    .from('profiles')
                    .select('active_frame_url')
                    .ilike('username', uLower)
                    .maybeSingle();

                const fresh = data?.active_frame_url || null;
                updateFrameState(uLower, fresh);
            } catch (e) { }
        };

        fetchOnce();

        // Subscribe to changes (Real-time update if user equips frame in dashboard)
        supabase
            .channel(`profile_${uLower}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'profiles',
                    filter: `username=ilike.${uLower}`
                },
                (payload) => {
                    const newFrame = payload.new.active_frame_url || null;
                    updateFrameState(uLower, newFrame);
                }
            )
            .subscribe();
    };

    const updateFrameState = (uLower: string, fresh: string | null) => {
        if (frameCache[uLower] !== fresh) {
            frameCache[uLower] = fresh;
            setFrameUrl(fresh || undefined);
            localStorage.setItem(`frame_${uLower}`, fresh || 'none');
        }
    };

    const handleFix = async () => {
        if (isRefreshing || !username) return;
        setIsRefreshing(true);
        try {
            const real = await chatService.fetchKickAvatar(username);
            if (real) {
                setSrc(real);
                localStorage.setItem(`av_${username.toLowerCase()}`, real);
                await supabase.from('profiles').update({ avatar_url: real }).eq('username', username);
            }
        } catch (e) { } finally {
            setIsRefreshing(false);
        }
    };

    return (
        <div
            className={`relative ${size} flex-shrink-0 ${className}`}
            style={{ overflow: 'visible' }} // Ensure no clipping
        >
            {/* 1. Avatar Circle */}
            <div className="absolute inset-[8%] rounded-full overflow-hidden border-2 border-white/10 bg-zinc-900 z-0 shadow-lg">
                {src ? (
                    <img
                        src={src}
                        className="w-full h-full object-cover"
                        onError={handleFix}
                        alt={username}
                        referrerPolicy="no-referrer"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center font-black text-white/20 text-xl bg-white/5 uppercase">
                        {username ? username[0] : '?'}
                    </div>
                )}
                {isRefreshing && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <Loader2 className="animate-spin text-white w-4 h-4" />
                    </div>
                )}
            </div>

            {/* 2. Frame Layer - Top Priority Visibility */}
            {frameUrl && (
                <div
                    className="absolute z-50 pointer-events-none"
                    style={{
                        top: '-15%',
                        left: '-15%',
                        right: '-15%',
                        bottom: '-15%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}
                >
                    <img
                        src={getAssetUrl(frameUrl)}
                        className="w-full h-full object-contain filter drop-shadow-[0_0_15px_rgba(0,0,0,0.8)]"
                        alt="Frame"
                        onError={() => {
                            console.warn("Frame load error for", username);
                            setFrameUrl(undefined);
                        }}
                    />
                </div>
            )}
        </div>
    );
};
