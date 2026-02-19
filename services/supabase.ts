
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_KEY || 'placeholder';

if (!process.env.EXPO_PUBLIC_SUPABASE_URL) {
  console.warn('⚠️ Supabase credentials missing. Please add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_KEY to your GitHub Repository Secrets.');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export const adminService = {
  // User Management
  async getAllProfiles() {
    const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    return { data: data || [], error };
  },

  async getBannedUsers() {
    const { data, error } = await supabase.from('profiles').select('*').eq('is_banned', true);
    return { data: data || [], error };
  },

  async toggleUserBan(username: string, banStatus: boolean, reason: string = 'Administrative Decision') {
    const { error } = await supabase.from('profiles').update({ is_banned: banStatus }).eq('username', username);
    if (!error) {
      if (banStatus) {
        await supabase.from('bans').insert([{ username, reason, banned_by: 'ADMIN_CORE' }]);
      } else {
        await supabase.from('bans').delete().eq('username', username);
      }
      await this.logAction('SYSTEM', `BAN_${banStatus ? 'ADDED' : 'REMOVED'}`, { username, reason });
    }
    return { error };
  },

  async adjustCredits(username: string, amount: number) {
    const { data: profile } = await supabase.from('profiles').select('credits').eq('username', username).single();
    if (profile) {
      const newCredits = Math.max(0, (profile.credits || 0) + amount);
      const { error } = await supabase.from('profiles').update({ credits: newCredits }).eq('username', username);
      if (!error) await this.logAction('SYSTEM', 'CREDITS_ADJUST', { username, amount, final: newCredits });
      return { error };
    }
    return { error: 'Profile not found' };
  },

  // Announcements
  async getAnnouncements() {
    const { data, error } = await supabase.from('announcements').select('*').order('created_at', { ascending: false });
    return { data: data || [], error };
  },

  async addAnnouncement(content: string) {
    return await supabase.from('announcements').insert([
      { content, is_active: true, created_at: new Date().toISOString() }
    ]);
  },

  async deleteAnnouncement(id: string) {
    return await supabase.from('announcements').delete().eq('id', id);
  },

  // Promo Codes
  async getPromoCodes() {
    const { data, error } = await supabase.from('promo_codes').select('*').order('created_at', { ascending: false });
    return { data: data || [], error };
  },

  async addPromoCode(code: string, amount: number, maxUses: number) {
    return await supabase.from('promo_codes').insert([{ code, reward_amount: amount, max_uses: maxUses, is_active: true, current_uses: 0 }]);
  },

  async deletePromoCode(id: string) {
    return await supabase.from('promo_codes').delete().eq('id', id);
  },

  async togglePromoActive(id: string, isActive: boolean) {
    return await supabase.from('promo_codes').update({ is_active: isActive }).eq('id', id);
  },

  // Arena Status
  async getArenaStatus() {
    const { data, error } = await supabase.from('arena_status').select('*');
    const status: any = {};
    data?.forEach(item => { status[item.key] = item.value; });
    return { status, error };
  },

  async updateArenaStatus(key: string, value: any) {
    return await supabase.from('arena_status').update({ value, updated_at: new Date().toISOString() }).eq('key', key);
  },

  // Logs
  async getAuditLogs(limit = 50) {
    const { data, error } = await supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(limit);
    return { data: data || [], error };
  },

  async logAction(admin: string, action: string, details: any) {
    return await supabase.from('audit_logs').insert([{ admin_username: admin, action, details }]);
  }
};

export const leaderboardService = {
  // جلب المتصدرين
  async getTopPlayers(limit = 20) {
    const { data, error } = await supabase
      .from('leaderboard')
      .select('*, profiles(avatar_url, is_banned, credits)')
      .order('score', { ascending: false })
      .limit(limit);

    if (error) return [];
    return (data || []).map(item => ({
      ...item,
      avatar_url: item.profiles?.avatar_url || item.avatar_url,
      is_banned: item.profiles?.is_banned,
      credits: item.profiles?.credits
    }));
  },

  async getPlayersWithPoints() {
    const { data, error } = await supabase
      .from('leaderboard')
      .select('*, profiles(avatar_url, is_banned, credits)')
      .or('score.gt.0,wins.gt.0')
      .order('score', { ascending: false });
    if (error) return [];
    return (data || []).map(item => ({
      ...item,
      avatar_url: item.profiles?.avatar_url || item.avatar_url,
      is_banned: item.profiles?.is_banned,
      credits: item.profiles?.credits
    }));
  },

  async getAllRankedPlayers() {
    const { data: lb } = await supabase
      .from('leaderboard')
      .select('*, profiles(avatar_url, is_banned, credits)')
      .order('score', { ascending: false });
    const { data: profs } = await supabase
      .from('profiles')
      .select('*')
      .gt('credits', 0);
    const byUser: Record<string, any> = {};
    (lb || []).forEach(item => {
      byUser[item.username] = {
        ...item,
        score: item.score || 0,
        wins: item.wins || 0,
        avatar_url: item.profiles?.avatar_url || item.avatar_url,
        is_banned: item.profiles?.is_banned,
        credits: item.profiles?.credits
      };
    });
    (profs || []).forEach(p => {
      if (byUser[p.username]) {
        // User exists in leaderboard, ensure profile data is up-to-date
        byUser[p.username] = {
          ...byUser[p.username],
          // Prefer profile data over joined data if available
          credits: p.credits,
          avatar_url: p.avatar_url || byUser[p.username].avatar_url,
          is_banned: p.is_banned
        };
      } else {
        // User not in leaderboard, add them
        byUser[p.username] = {
          id: p.id,
          username: p.username,
          score: 0,
          wins: 0,
          avatar_url: p.avatar_url,
          is_banned: p.is_banned,
          credits: p.credits
        };
      }
    });
    const combined = Object.values(byUser);
    combined.sort((a: any, b: any) => {
      if ((b.score || 0) !== (a.score || 0)) return (b.score || 0) - (a.score || 0);
      return (b.credits || 0) - (a.credits || 0);
    });
    return combined;
  },

  async checkIsBanned(username: string): Promise<boolean> {
    const { data } = await supabase.from('profiles').select('is_banned').eq('username', username).maybeSingle();
    return data?.is_banned || false;
  },

  async claimPromoCode(username: string, code: string) {
    const { data: promo, error: promoError } = await supabase.from('promo_codes').select('*').eq('code', code).eq('is_active', true).single();
    if (promoError || !promo) return { error: 'كود غير صالح' };
    if (promo.current_uses >= promo.max_uses) return { error: 'انتهت صلاحية الكود' };

    // 1. Update Profile (Wallet/Credits)
    const { data: profile } = await supabase.from('profiles').select('*').eq('username', username).maybeSingle();

    if (!profile) {
      const { error: insertError } = await supabase.from('profiles').insert([{
        username,
        credits: promo.reward_amount
      }]);
      if (insertError) return { error: 'فشل إنشاء ملف المستخدم' };
    } else {
      const { error: updateError } = await supabase.from('profiles').update({
        credits: (profile.credits || 0) + promo.reward_amount
      }).eq('username', username);
      if (updateError) return { error: 'فشل التحديث' };
    }

    // 2. Update Leaderboard (Score/Points) because user expects to see it in "Legends Arena"
    const { data: lbEntry } = await supabase.from('leaderboard').select('*').eq('username', username).maybeSingle();

    if (lbEntry) {
      await supabase.from('leaderboard').update({
        score: (lbEntry.score || 0) + promo.reward_amount
      }).eq('id', lbEntry.id);
    } else {
      await supabase.from('leaderboard').insert([{
        username,
        score: promo.reward_amount,
        wins: 0
      }]);
    }

    await supabase.from('promo_codes').update({ current_uses: promo.current_uses + 1 }).eq('id', promo.id);
    await adminService.logAction('SYSTEM_AUTO', 'PROMO_REDEEM', { username, code, amount: promo.reward_amount });
    return { success: true, amount: promo.reward_amount };
  },

  // تسجيل فوز تلقائي من الألعاب
  async recordWin(username: string, avatarUrl: string, points: number = 10) {
    if (!username || username === 'Unknown') return;

    // التأكد من وجود بروفايل أولاً
    const { data: profile } = await supabase.from('profiles').select('*').eq('username', username).maybeSingle();
    if (!profile) {
      await supabase.from('profiles').insert([{ username, avatar_url: avatarUrl }]);
    } else if (profile.is_banned) {
      return; // لا تسجل للاعب محظور
    }

    const { data: existing } = await supabase
      .from('leaderboard')
      .select('*')
      .eq('username', username)
      .maybeSingle();

    if (existing) {
      await supabase
        .from('leaderboard')
        .update({
          wins: (existing.wins || 0) + 1,
          score: (existing.score || 0) + points,
          last_win_at: new Date().toISOString()
        })
        .eq('id', existing.id);
    } else {
      await supabase
        .from('leaderboard')
        .insert([{
          username,
          wins: 1,
          score: points
        }]);
    }
  },

  // وظائف الإدارة: إضافة/تنقيص يدوي
  async adjustPlayerStats(username: string, scoreDelta: number, winsDelta: number) {
    const { data: existing } = await supabase
      .from('leaderboard')
      .select('*')
      .eq('username', username)
      .maybeSingle();

    if (existing) {
      return await supabase
        .from('leaderboard')
        .update({
          score: Math.max(0, (existing.score || 0) + scoreDelta),
          wins: Math.max(0, (existing.wins || 0) + winsDelta)
        })
        .eq('id', existing.id);
    } else {
      return await supabase
        .from('leaderboard')
        .insert([{
          username,
          score: Math.max(0, scoreDelta),
          wins: Math.max(0, winsDelta)
        }]);
    }
  },

  async verifyAdminPassword(inputPassword: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('app_config')
      .select('value')
      .eq('key', 'admin_password')
      .single();
    if (error || !data) return false;
    return data.value === inputPassword;
  },

  async resetLeaderboard() {
    await adminService.logAction('SYSTEM', 'RESET_LEADERBOARD', {});
    return await supabase.from('leaderboard').delete().neq('username', 'SYSTEM_ADMIN');
  }
};
