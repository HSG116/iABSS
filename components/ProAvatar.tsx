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

// Global session cache to prevent redundant DB calls
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

    // 1. Avatar Fetching Logic
    useEffect(() => {
        const fetchAvatarFull = async () => {
            if (!username) return;
            const uLower = username.toLowerCase().trim().replace('@', '');

            // Try Mem/Local Cache
            const cachedAv = localStorage.getItem(`av_${uLower}`);
            if (cachedAv && cachedAv.length > 10) {
                setSrc(cachedAv);
                return;
            }

            // Quick DB Fallback
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

            // Live Fetch via ChatService
            const realAvatar = await chatService.fetchKickAvatar(uLower);
            if (realAvatar) {
                setSrc(realAvatar);
                localStorage.setItem(`av_${uLower}`, realAvatar);
            }
        };

        if (url && url.length > 10) {
            setSrc(url);
        } else {
            fetchAvatarFull();
        }
    }, [url, username]);

    // 2. Frame Fetching Logic
    useEffect(() => {
        if (initialFrameUrl) {
            setFrameUrl(initialFrameUrl);
            return;
        }

        if (!username) return;
        const uLower = username.toLowerCase().trim().replace('@', '');

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

        // Refresh from DB
        fetchUserFrame(uLower);
    }, [initialFrameUrl, username]);

    const fetchUserFrame = async (uLower: string) => {
        try {
            const { data } = await supabase
                .from('profiles')
                .select('active_frame_url')
                .ilike('username', uLower)
                .maybeSingle();

            const foundFrame = data?.active_frame_url || null;

            // Avoid state update if same to prevent re-renders
            if (frameCache[uLower] !== foundFrame) {
                frameCache[uLower] = foundFrame;
                setFrameUrl(foundFrame || undefined);
                localStorage.setItem(`frame_${uLower}`, foundFrame || 'none');
            }
        } catch (e) {
            console.warn("Frame fetch failed", e);
        }
    };

    const handleFix = async () => {
        if (isRefreshing || !username) return;
        setIsRefreshing(true);
        try {
            const realAvatar = await chatService.fetchKickAvatar(username);
            if (realAvatar) {
                setSrc(realAvatar);
                localStorage.setItem(`av_${username.toLowerCase()}`, realAvatar);
                await supabase.from('profiles').update({ avatar_url: realAvatar }).eq('username', username);
            }
        } catch (e) { } finally {
            setIsRefreshing(false);
        }
    };

    return (
        <div
            className={`relative ${size} flex-shrink-0 ${className}`}
            style={{ overflow: 'visible' }} // Critical for frames
        >
            {/* Inner Circular Avatar Container */}
            <div className={`w-[84%] h-[84%] absolute inset-[8%] rounded-full overflow-hidden border-2 border-white/10 bg-zinc-900 shadow-inner z-0`}>
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

            {/* Outer Frame Decoration - Styled for visibility */}
            {frameUrl && (
                <div
                    className="absolute z-50 pointer-events-none"
                    style={{
                        top: '-18%',
                        left: '-18%',
                        right: '-18%',
                        bottom: '-18%',
                        transform: 'scale(1.1)'
                    }}
                >
                    <img
                        src={getAssetUrl(frameUrl)}
                        className="w-full h-full object-contain filter drop-shadow-[0_0_15px_rgba(0,0,0,0.8)]"
                        alt="User Frame"
                        onError={() => setFrameUrl(undefined)}
                        style={{ display: 'block' }}
                    />
                </div>
            )}
        </div>
    );
};
