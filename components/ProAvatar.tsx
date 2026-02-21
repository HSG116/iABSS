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

// Global cache for frames to avoid redundant DB calls
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
        setSrc(url);
    }, [url]);

    useEffect(() => {
        if (initialFrameUrl) {
            setFrameUrl(initialFrameUrl);
        } else if (username) {
            // Try to get from cache or DB
            const uLower = username.toLowerCase();
            if (frameCache[uLower] !== undefined) {
                setFrameUrl(frameCache[uLower] || undefined);
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
            <div className={`w-[85%] h-[85%] absolute inset-[7.5%] rounded-2xl overflow-hidden border-2 border-white/10 transition-all flex-shrink-0 bg-zinc-900 shadow-lg`}>
                {src ? (
                    <img
                        src={src}
                        className="w-full h-full object-cover"
                        onError={handleFix}
                        alt={username}
                        referrerPolicy="no-referrer"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center opacity-20 bg-black/40">
                        <User className="w-1/2 h-1/2" />
                    </div>
                )}
                {isRefreshing && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm">
                        <Loader2 className="animate-spin text-white w-4 h-4" />
                    </div>
                )}
            </div>
            {frameUrl && (
                <div className="absolute inset-0 z-10 pointer-events-none scale-110">
                    <img src={getAssetUrl(frameUrl)} className="w-full h-full object-contain" alt="" />
                </div>
            )}
        </div>
    );
};
