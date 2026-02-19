import React from 'react';

const TecshIcon = ({ size = 40, color = "#FFFFFF" }: { size?: number; color?: string }) => {
    return (
        <div style={{ width: size, height: size * 1.3, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <svg
                width={size}
                height={size * 0.9}
                viewBox="0 0 100 100"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
            >
                {/* Head */}
                <path d="M50 25 C52 22 55 20 54 18 C53 16 49 16 48 18 C47 20 48 23 50 25 Z" fill={color} />

                {/* Main Wings Layer 1 (Top) */}
                <path d="M50 30 C65 20 85 10 95 15 C85 25 70 40 50 60 C30 40 15 25 5 15 C15 10 35 20 50 30 Z" fill={color} />

                {/* Wings Layer 2 (Middle) */}
                <path d="M50 40 C65 35 85 30 98 40 C85 50 70 60 50 75 C30 60 15 50 2 40 C15 30 35 35 50 40 Z" fill={color} opacity="0.9" />

                {/* Body / Tail */}
                <path d="M50 60 L60 85 L50 95 L40 85 Z" fill={color} />

                {/* Tail side feathers */}
                <path d="M50 75 L65 85 L55 88 L50 75 Z" fill={color} opacity="0.8" />
                <path d="M50 75 L35 85 L45 88 L50 75 Z" fill={color} opacity="0.8" />
            </svg>
            <div style={{
                color: color,
                fontSize: size * 0.28,
                fontWeight: 900,
                marginTop: size * 0.02,
                fontFamily: "'Tajawal', sans-serif",
                lineHeight: 1,
                letterSpacing: '0.05em'
            }}>
                TECSH
            </div>
        </div>
    );
};

export default TecshIcon;
