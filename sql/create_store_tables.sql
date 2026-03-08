-- ============================================
-- iABS Store & Inventory System
-- ============================================

-- 1. Add points to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS points BIGINT DEFAULT 0;

-- 2. Create Item Types Enum
DO $$ BEGIN
    CREATE TYPE item_type AS ENUM ('FRAME', 'EFFECT', 'BADGE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. Create Store Items table
CREATE TABLE IF NOT EXISTS store_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    type item_type NOT NULL,
    price BIGINT NOT NULL DEFAULT 0,
    image_url TEXT,
    config JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Create User Inventory table
CREATE TABLE IF NOT EXISTS user_inventory (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    item_id UUID REFERENCES store_items(id) ON DELETE CASCADE,
    is_equipped BOOLEAN DEFAULT false,
    acquired_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, item_id)
);

-- 5. Create Transactions table
CREATE TABLE IF NOT EXISTS transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    amount BIGINT NOT NULL,
    type TEXT NOT NULL, -- 'PURCHASE', 'REWARD', 'REFUND'
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. RLS Policies

ALTER TABLE store_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Store Items: Anyone can view
CREATE POLICY "Allow public read store_items" ON store_items FOR SELECT USING (true);

-- User Inventory: Users can view their own inventory
CREATE POLICY "Allow users to read own inventory" ON user_inventory
    FOR SELECT USING (auth.uid() = user_id OR true); -- 'OR true' for simplified public access if not using Supabase Auth

-- Transactions: Users can view their own transactions
CREATE POLICY "Allow users to read own transactions" ON transactions
    FOR SELECT USING (auth.uid() = user_id OR true);

-- 7. Initial Seed Data (Premium Selection)
INSERT INTO store_items (name, description, type, price, image_url, config)
VALUES 
('الإطار البرونزي', 'إطار كلاسيكي للمبتدئين في هب عزيز', 'FRAME', 500, 'برونزي .png', '{"borderColor": "#cd7f32"}'),
('الإطار الفضي', 'إطار فضي مميز للمنافسين الطموحين', 'FRAME', 1500, 'سلفر .png', '{"borderColor": "#c0c0c0"}'),
('الإطار الذهبي', 'إطار الذهب الفاخر للأعضاء المتألقين', 'FRAME', 3000, 'قولد.png', '{"borderColor": "#ffd700"}'),
('إطار الدايموند', 'إطار الألماس النادر والمبهر', 'FRAME', 4500, 'دايموند .png', '{"borderColor": "#b9f2ff"}'),
('الإطار النخبوي', 'الإطار الحصري للأساطير والنخبة فقط', 'FRAME', 7000, 'نخبوي.png', '{"borderColor": "#ff0000", "boxShadow": "0 0 20px #ff0000"}'),
('Diamond Sparkle', 'توهج الألماس الفريد', 'EFFECT', 2000, '', '{"animation": "pulse", "color": "#60a5fa"}'),
('Eagle Badge', 'وسام الصقر الجارح', 'BADGE', 300, '', '{"icon": "Zap", "color": "#f87171"}'),
('Crown of Kings', 'تاج الملوك الذهبي', 'BADGE', 5000, '', '{"icon": "Crown", "color": "#fbbf24"}'),
('Ghostly Aura', 'هالة الشبح الغامضة', 'EFFECT', 1200, '', '{"opacity": "0.5", "filter": "blur(2px)"}');

