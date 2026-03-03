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
}

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

    // 1. Avatar Logic
    useEffect(() => {
        const fetchAvatar = async () => {
            if (!username) return;
            const uLower = username.toLowerCase().trim().replace('@', '');

            const cachedAv = localStorage.getItem(`av_${uLower}`);
            if (cachedAv && cachedAv.length > 10) {
                setSrc(cachedAv);
                return;
            }

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

    // 2. Frame Logic
    useEffect(() => {
        if (!username) return;
        const uLower = username.toLowerCase().trim().replace('@', '');

        // Respect initial prop if it exists and isn't empty
        if (initialFrameUrl) {
            setFrameUrl(initialFrameUrl);
            return;
        }

        // Check local cache
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

        loadAndRefresh(uLower);

        // Real-time subscription to profile updates
        const channel = supabase
            .channel(`profile_updates_${uLower}`)
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'profiles' },
                (payload) => {
                    if (payload.new.username?.toLowerCase() === uLower) {
                        const freshFrame = payload.new.active_frame_url || null;
                        updateFrame(uLower, freshFrame);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [initialFrameUrl, username]);

    const loadAndRefresh = async (uLower: string) => {
        try {
            const { data } = await supabase
                .from('profiles')
                .select('active_frame_url')
                .ilike('username', uLower)
                .maybeSingle();

            updateFrame(uLower, data?.active_frame_url || null);
        } catch (e) {
            console.error("[ProAvatar] Frame refresh error:", e);
        }
    };

    const updateFrame = (uLower: string, fresh: string | null) => {
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
            style={{
                overflow: 'visible',
                zIndex: 10
            }}
        >
            {/* 1. Circle Container */}
            <div
                className="absolute inset-[8%] rounded-full overflow-hidden border-2 border-white/10 bg-zinc-900 shadow-xl"
                style={{ zIndex: 5 }}
            >
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

            {/* 2. Frame Layer - High zIndex and absolute position */}
            {frameUrl && (
                <div
                    className="absolute pointer-events-none"
                    style={{
                        inset: '-18%', // Increased size to ensure it wraps well
                        zIndex: 100, // Forces it to the top
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}
                >
                    <img
                        src={getAssetUrl(frameUrl)}
                        className="w-full h-full object-contain filter drop-shadow-[0_0_20px_rgba(0,0,0,0.9)]"
                        alt="Frame"
                        onError={() => {
                            console.warn("[ProAvatar] Frame failed to load:", frameUrl);
                            setFrameUrl(undefined);
                        }}
                        style={{ transform: 'scale(1.1)' }} // Slight scale up
                    />
                </div>
            )}
        </div>
    );
};
