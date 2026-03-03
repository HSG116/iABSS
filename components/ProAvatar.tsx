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

// Global/Session cache for frames
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

    useEffect(() => {
        if (url) {
            setSrc(url);
        } else if (username) {
            // Check local storage / session cache
            const uLower = username.toLowerCase();
            const cachedAv = localStorage.getItem(`av_${uLower}`);
            if (cachedAv) {
                setSrc(cachedAv);
            } else {
                chatService.fetchKickAvatar(username).then(av => {
                    if (av) {
                        setSrc(av);
                        localStorage.setItem(`av_${uLower}`, av);
                    }
                });
            }
        }
    }, [url, username]);

    useEffect(() => {
        if (initialFrameUrl) {
            setFrameUrl(initialFrameUrl);
        } else if (username) {
            const uLower = username.toLowerCase();

            // 1. Memory Cache
            if (frameCache[uLower] !== undefined) {
                setFrameUrl(frameCache[uLower] || undefined);
                return;
            }

            // 2. Local Storage Cache (Persistent)
            const cached = localStorage.getItem(`frame_${uLower}`);
            if (cached !== null) {
                const url = cached === 'none' ? undefined : cached;
                setFrameUrl(url);
                frameCache[uLower] = url || null;
                // Still fetch in background to refresh
                fetchUserFrame(uLower);
            } else {
                fetchUserFrame(uLower);
            }
        }
    }, [initialFrameUrl, username]);

    const fetchUserFrame = async (uLower: string) => {
        try {
            const { data } = await supabase
                .from('profiles')
                .select('active_frame_url')
                .ilike('username', uLower)
                .maybeSingle();

            const foundFrame = data?.active_frame_url || null;
            frameCache[uLower] = foundFrame;
            setFrameUrl(foundFrame || undefined);
            localStorage.setItem(`frame_${uLower}`, foundFrame || 'none');
        } catch (e) {
            console.warn("Error fetching frame for", username);
        }
    };

    const handleFix = async () => {
        if (isRefreshing) return;
        setIsRefreshing(true);
        try {
            const realAvatar = await chatService.fetchKickAvatar(username);
            if (realAvatar) {
                setSrc(realAvatar);
                localStorage.setItem(`av_${username.toLowerCase()}`, realAvatar);
                await supabase.from('profiles').update({ avatar_url: realAvatar }).eq('username', username);
            }
        } catch (e) {
            console.warn("Failed to fix avatar for", username);
        } finally {
            setIsRefreshing(false);
        }
    };

    return (
        <div className={`relative ${size} flex-shrink-0 ${className}`}>
            {/* Avatar Container */}
            <div className={`w-[82%] h-[82%] absolute inset-[9%] rounded-full overflow-hidden border-2 border-white/10 transition-all flex-shrink-0 bg-zinc-900 shadow-lg z-0`}>
                {src ? (
                    <img
                        src={src}
                        className="w-full h-full object-cover"
                        onError={handleFix}
                        alt={username}
                        referrerPolicy="no-referrer"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center font-black text-white/30 text-xl bg-white/5 uppercase">
                        {username ? username[0] : '?'}
                    </div>
                )}
                {isRefreshing && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm">
                        <Loader2 className="animate-spin text-white w-4 h-4" />
                    </div>
                )}
            </div>

            {/* Frame Layer - Increased scale and ensured z-index */}
            {frameUrl && (
                <div className="absolute inset-x-[-15%] inset-y-[-15%] z-20 pointer-events-none">
                    <img
                        src={getAssetUrl(frameUrl)}
                        className="w-full h-full object-contain filter drop-shadow-[0_0_10px_rgba(0,0,0,0.5)]"
                        alt=""
                        onError={() => setFrameUrl(undefined)}
                    />
                </div>
            )}
        </div>
    );
};
