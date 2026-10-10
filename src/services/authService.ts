import { supabase, isSupabaseConfigured } from './supabaseClient';
import { User } from '@supabase/supabase-js';

export interface AllowedUser {
  id: string;
  email: string;
  name?: string;
  addedBy?: string;
  createdAt: string;
}

const LOCAL_STORAGE_ALLOWED_KEY = 'prime_allowed_users_v1';

// ค่าเริ่มต้นในเครื่อง (กรณีตารางเพิ่งสร้างหรือใช้งานออฟไลน์)
const DEFAULT_INITIAL_ALLOWED: AllowedUser[] = [];

/**
 * ดึงรายชื่อ Gmail ที่ได้รับสิทธิ์ทั้งหมด
 */
export async function fetchAllowedUsers(): Promise<AllowedUser[]> {
  if (isSupabaseConfigured() && supabase) {
    try {
      const { data, error } = await supabase
        .from('allowed_users')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        const mapped: AllowedUser[] = data.map((item: any) => ({
          id: item.id,
          email: (item.email || '').trim().toLowerCase(),
          name: item.name || '',
          addedBy: item.added_by || '',
          createdAt: item.created_at || new Date().toISOString(),
        }));

        // แคชเก็บไว้ใน LocalStorage
        try {
          localStorage.setItem(LOCAL_STORAGE_ALLOWED_KEY, JSON.stringify(mapped));
        } catch {}

        return mapped;
      }
    } catch (err) {
      console.warn('Failed to fetch allowed_users from Supabase:', err);
    }
  }

  // Fallback to LocalStorage
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_ALLOWED_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}

  return DEFAULT_INITIAL_ALLOWED;
}

/**
 * ตรวจสอบว่าอีเมลนี้มีสิทธิ์เข้าใช้งานหรือไม่
 */
export async function checkEmailPermission(email: string): Promise<boolean> {
  const normalized = (email || '').trim().toLowerCase();
  if (!normalized) return false;

  const allowedList = await fetchAllowedUsers();

  // หากเป็นระบบใหม่ที่ยังไม่มีรายชื่อใครเลย (0 คน) ให้ถือว่าเป็น First-time admin
  if (allowedList.length === 0) {
    return true;
  }

  return allowedList.some((u) => u.email.toLowerCase() === normalized);
}

/**
 * เพิ่ม Gmail เข้าสู่รายชื่อผู้มีสิทธิ์
 */
export async function addAllowedUser(
  email: string,
  name?: string,
  addedBy?: string
): Promise<{ success: boolean; message?: string }> {
  const normalizedEmail = (email || '').trim().toLowerCase();

  if (!normalizedEmail || !normalizedEmail.includes('@')) {
    return { success: false, message: 'กรุณากรอกอีเมลที่ถูกต้อง' };
  }

  const currentList = await fetchAllowedUsers();
  if (currentList.some((u) => u.email.toLowerCase() === normalizedEmail)) {
    return { success: false, message: 'อีเมลนี้มีสิทธิ์ในระบบอยู่แล้ว' };
  }

  const newUser: AllowedUser = {
    id: `user-${Date.now()}`,
    email: normalizedEmail,
    name: name?.trim() || '',
    addedBy: addedBy || 'Admin',
    createdAt: new Date().toISOString(),
  };

  if (isSupabaseConfigured() && supabase) {
    try {
      const { error } = await supabase.from('allowed_users').insert([
        {
          email: normalizedEmail,
          name: newUser.name,
          added_by: newUser.addedBy,
          created_at: newUser.createdAt,
        },
      ]);

      if (error) {
        console.error('Failed to insert into allowed_users:', error);
        // หากเกิด error จาก table ยังไม่สร้าง ให้บันทึกลง LocalStorage แทน
      }
    } catch (err) {
      console.warn('Supabase add user error:', err);
    }
  }

  // อัปเดตแคชใน LocalStorage เสมอ
  const updated = [newUser, ...currentList];
  try {
    localStorage.setItem(LOCAL_STORAGE_ALLOWED_KEY, JSON.stringify(updated));
  } catch {}

  return { success: true };
}

/**
 * ลบ Gmail ออกจากรายชื่อผู้มีสิทธิ์
 */
export async function removeAllowedUser(email: string): Promise<{ success: boolean }> {
  const normalized = (email || '').trim().toLowerCase();

  if (isSupabaseConfigured() && supabase) {
    try {
      await supabase.from('allowed_users').delete().eq('email', normalized);
    } catch (err) {
      console.warn('Supabase remove user error:', err);
    }
  }

  const currentList = await fetchAllowedUsers();
  const filtered = currentList.filter((u) => u.email.toLowerCase() !== normalized);
  try {
    localStorage.setItem(LOCAL_STORAGE_ALLOWED_KEY, JSON.stringify(filtered));
  } catch {}

  return { success: true };
}

/**
 * สั่ง Login ด้วย Google OAuth ผ่าน Supabase
 */
export async function signInWithGoogle(): Promise<{ error?: any }> {
  if (!isSupabaseConfigured() || !supabase) {
    return { error: new Error('Supabase ยังไม่ได้เชื่อมต่อ กรุณาตรวจสอบ Environment Variables') };
  }

  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin,
      queryParams: {
        access_type: 'offline',
        prompt: 'select_account',
      },
    },
  });

  return { error };
}

/**
 * สั่ง Logout ออกจากระบบ
 */
export async function signOut(): Promise<void> {
  if (supabase) {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn('Sign out error:', e);
    }
  }
}

/**
 * ดึง User ปัจจุบัน
 */
export async function getCurrentUser(): Promise<User | null> {
  if (!isSupabaseConfigured() || !supabase) return null;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  } catch {
    return null;
  }
}
