-- ==============================================================================
-- Schema SQL สำหรับระบบจัดทำข้อเสนอโครงการภาครัฐ (Prime Proposal Management System)
-- สำหรับรันใน Supabase SQL Editor (1-Click Run)
-- ==============================================================================

-- 1. สร้างตาราง bidding_projects สำหรับจัดเก็บข้อมูลโครงการและเนื้อหาข้อเสนอ
CREATE TABLE IF NOT EXISTS public.bidding_projects (
    id TEXT PRIMARY KEY,
    project_code VARCHAR(100) NOT NULL,
    project_title TEXT NOT NULL,
    client_agency TEXT NOT NULL,
    budget_amount NUMERIC(15, 2) DEFAULT 0,
    egp_url TEXT,
    announcement_date DATE,
    submission_deadline TIMESTAMP WITH TIME ZONE,
    status VARCHAR(30) NOT NULL DEFAULT 'draft', -- 'draft', 'submitted', 'cancelled'
    status_note TEXT,
    proposal_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. สร้างตาราง project_attachments สำหรับเก็บข้อมูลเอกสารประกาศจัดจ้างและไฟล์ TOR
CREATE TABLE IF NOT EXISTS public.project_attachments (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES public.bidding_projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    size BIGINT NOT NULL DEFAULT 0,
    type VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL, -- 'announcement', 'tor', 'other'
    storage_path TEXT,
    file_url TEXT,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. สร้าง Index เพื่อเพิ่มความเร็วในการค้นหา
CREATE INDEX IF NOT EXISTS idx_bidding_projects_status ON public.bidding_projects(status);
CREATE INDEX IF NOT EXISTS idx_bidding_projects_code ON public.bidding_projects(project_code);
CREATE INDEX IF NOT EXISTS idx_project_attachments_project_id ON public.project_attachments(project_id);

-- 4. ตั้งค่าสิทธิ์ Row Level Security (RLS) เพื่อความปลอดภัย
ALTER TABLE public.bidding_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_attachments ENABLE ROW LEVEL SECURITY;

-- นโยบายการเข้าถึง (เปิดให้อ่าน/เขียนสำหรับผู้ใช้ระบบของบริษัท)
CREATE POLICY "Allow public read access to bidding_projects" 
    ON public.bidding_projects FOR SELECT USING (true);

CREATE POLICY "Allow public insert/update/delete to bidding_projects" 
    ON public.bidding_projects FOR ALL USING (true);

CREATE POLICY "Allow public read access to project_attachments" 
    ON public.project_attachments FOR SELECT USING (true);

CREATE POLICY "Allow public insert/update/delete to project_attachments" 
    ON public.project_attachments FOR ALL USING (true);

-- 5. สร้าง Storage Bucket สำหรับเก็บไฟล์ PDF และ Word (TOR & ประกาศจัดจ้าง)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('project-attachments', 'project-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- นโยบาย Storage ให้ดาวน์โหลดและอัปโหลดไฟล์ได้
CREATE POLICY "Public Access to project-attachments"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'project-attachments');

CREATE POLICY "Public Upload to project-attachments"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'project-attachments');

CREATE POLICY "Public Delete from project-attachments"
    ON storage.objects FOR DELETE
    USING (bucket_id = 'project-attachments');
