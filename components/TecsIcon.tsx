import React from 'react';
import { getAssetUrl } from '../utils/assets';

const tecshLogo = getAssetUrl('photo/image.png') || '';

const TecshIcon = ({ size = 40, color = "#FFFFFF" }: { size?: number; color?: string }) => {
    return (
        <div className="flex flex-col items-center justify-center" style={{ width: size * 1.5 }}>
            {/* The Phoenix Logo Image */}
            <img
                src={tecshLogo}
                style={{
                    width: size,
                    height: 'auto',
                    // If white color is requested (default for buttons), we invert the logo color to white for visibility
                    filter: color === '#FFFFFF' ? 'brightness(0) invert(1) drop-shadow(0 0 8px rgba(255,255,255,0.4))' : 'none'
                }}
                alt="Tecsh Phoenix"
            />

            {/* The TECSH text below */}
            <div style={{
                color: color,
                fontSize: size * 0.3,
                fontWeight: 900,
                marginTop: '-2px',
                fontFamily: "'Tajawal', sans-serif",
                lineHeight: 1,
                letterSpacing: '0.05em',
                textShadow: color === '#FFFFFF' ? '0 0 10px rgba(255,255,255,0.3)' : 'none'
            }}>
                TECSH
            </div>
        </div>
    );
};

export default TecshIcon;
