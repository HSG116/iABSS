-- ============================================
-- iABS Games Management System
-- ============================================

-- 1. Create Games table
CREATE TABLE IF NOT EXISTS games (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    icon_name TEXT, -- The name of the icon component or lucide icon name
    view_id TEXT NOT NULL UNIQUE, -- The ViewState string (e.g., 'FAWAZIR_SELECT')
    is_primary BOOLEAN DEFAULT false,
    is_visible BOOLEAN DEFAULT true, -- خيار إخفاء اللعبة
    has_obs BOOLEAN DEFAULT false,
    is_coming_soon BOOLEAN DEFAULT false,
    coming_soon_text TEXT DEFAULT 'قريباً',
    position INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Index for position for faster sorting
CREATE INDEX IF NOT EXISTS games_position_idx ON games (position);

-- 3. RLS Policies
ALTER TABLE games ENABLE ROW LEVEL SECURITY;

-- Anyone can view the games
CREATE POLICY "Allow public read games" ON games FOR SELECT USING (true);

-- Explicitly allow ALL for everyone (Simplified for public dashboard)
-- In production, you would check for admin role/session
CREATE POLICY "Allow all actions for games" ON games FOR ALL USING (true) WITH CHECK (true);

-- 4. Initial Seed Data
INSERT INTO games (title, icon_name, view_id, is_primary, has_obs, is_coming_soon, position)
VALUES 
('ابدأ الفوازير', 'Sparkles', 'FAWAZIR_SELECT', true, false, false, 1),
('الكراسي الموسيقية', 'Armchair', 'MUSICAL_CHAIRS', true, false, false, 2),
('صائد الماوس باد', 'TecshIcon', 'GRID_HUNT', true, false, false, 3),
('تخمين الصورة', 'ImageIcon', 'BLUR_GUESS', false, false, false, 4),
('عجلة الحظ', 'Zap', 'SPIN_WHEEL', false, false, false, 5),
('سحب الجوائز', 'Gift', 'RAFFLE', false, false, false, 6),
('تحدي الأعلام', 'Flag', 'FLAG_QUIZ', false, false, false, 7),
('حرب الفرق', 'Users2', 'TEAM_BATTLE', false, false, false, 8),
('سباق الكتابة', 'Keyboard', 'TYPING_RACE', false, false, false, 9),
('حرب المصاقيل', 'Swords', 'MASAQIL_WAR', false, false, false, 10),
('تحدي الأكواب', 'Coffee', 'CUP_SHUFFLE', false, false, false, 11),
('حرب الألوان', 'PaintBucket', 'TERRITORY_WAR', false, false, false, 12),
('صادق أم كذاب', 'AlertTriangle', 'TRUTH_OR_LIE', false, true, false, 13),
('تحدي الرسم', 'PaintBucket', 'DRAWING_CHALLENGE', false, true, false, 14),
('حرب الفواكه', 'Sword', 'FRUIT_WAR', false, false, false, 15),
('جولة الشعارات', 'Globe', 'LOGO_ROUND', false, false, false, 16),
('تخمين الكلمات', 'Brain', 'FORBIDDEN_WORDS', false, true, false, 17),
('لعبة التصويت', 'Vote', 'VOTING_GAME', false, true, false, 18),
('القنبلة الموقوتة', 'Bomb', 'TIME_BOMB', false, false, false, 19),
('جسر الزجاج', 'Footprints', 'GLASS_BRIDGE_V2', false, false, false, 21),
('أرضية الحمم', 'Flame', 'FLOOR_IS_LAVA', false, false, false, 22),
('فك الشفرة', 'Smile', 'EMOJI_CODE', false, false, false, 23);

-- Add coming soon game
INSERT INTO games (title, icon_name, view_id, is_primary, has_obs, is_coming_soon, coming_soon_text, position)
VALUES ('السكرابل السريع', 'Type', 'WORD_BUILDER', false, false, true, 'تحت التطوير', 20);
