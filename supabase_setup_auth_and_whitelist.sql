-- =========================================================================================
-- SQL Setup: ตารางจัดการสิทธิ์การเข้าใช้งานระบบ (User Access Control / Gmail Whitelist)
-- คัดลอกคำสั่งด้านล่างนี้ไปวางและกด Run ใน Supabase Dashboard -> SQL Editor
-- =========================================================================================

-- 1. สร้างตาราง allowed_users เก็บรายชื่อ Gmail ที่ได้รับอนุญาต
CREATE TABLE IF NOT EXISTS allowed_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  added_by TEXT DEFAULT 'Admin',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. เปิดใช้งาน Row Level Security (RLS)
ALTER TABLE allowed_users ENABLE ROW LEVEL SECURITY;

-- 3. กำหนด Policy อนุญาตให้อ่านและจัดการข้อมูลได้
DROP POLICY IF EXISTS "Allow read allowed_users" ON allowed_users;
CREATE POLICY "Allow read allowed_users" 
  ON allowed_users 
  FOR SELECT 
  USING (true);

DROP POLICY IF EXISTS "Allow insert allowed_users" ON allowed_users;
CREATE POLICY "Allow insert allowed_users" 
  ON allowed_users 
  FOR INSERT 
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update allowed_users" ON allowed_users;
CREATE POLICY "Allow update allowed_users" 
  ON allowed_users 
  FOR UPDATE 
  USING (true);

DROP POLICY IF EXISTS "Allow delete allowed_users" ON allowed_users;
CREATE POLICY "Allow delete allowed_users" 
  ON allowed_users 
  FOR DELETE 
  USING (true);

-- 4. (ทางเลือก) เพิ่มอีเมลแรกของผู้ดูแลระบบทันที (เปลี่ยน your-email@gmail.com เป็นอีเมลของคุณ)
-- INSERT INTO allowed_users (email, name, added_by) 
-- VALUES ('your-email@gmail.com', 'ผู้ดูแลระบบหลัก', 'System')
-- ON CONFLICT (email) DO NOTHING;
