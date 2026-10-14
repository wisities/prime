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

-- ==============================================================================
-- 6. ตาราง Master Library: บุคลากรกลาง (Prime Digital Talent Pool)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.master_team_library (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    proposed_role TEXT,
    education TEXT,
    certifications TEXT,
    experience_years INT DEFAULT 0,
    start_work_year_be INT,
    responsibilities TEXT,
    highlight_projects TEXT,
    personal_bio TEXT,
    photo_url TEXT,
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- 7. ตาราง Master Library: ผลงานโครงการย้อนหลังของบริษัท (Company Past Projects Track Record)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.master_projects_library (
    id TEXT PRIMARY KEY,
    project_name TEXT NOT NULL,
    client_name TEXT,
    contract_value NUMERIC(15, 2) DEFAULT 0,
    completion_year_be INT,
    period_duration TEXT,
    category TEXT,
    project_type TEXT DEFAULT 'tor_reference',
    description TEXT,
    relevance_note TEXT,
    certificate_file_url TEXT,
    certificate_file_name TEXT,
    project_image_url TEXT,
    project_image_caption TEXT,
    client_logo_url TEXT,
    image_blocks JSONB,
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- 8. ตาราง Master Library: คลังรายการถอดแบบและอัตราค่าใช้จ่ายกลาง (Master BOM & Cost Catalog)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.master_bom_catalog (
    id TEXT PRIMARY KEY,
    category TEXT NOT NULL,
    title TEXT NOT NULL,
    responsible_role TEXT,
    unit TEXT DEFAULT 'ชุด',
    default_rate NUMERIC(15, 2) DEFAULT 0,
    default_quantity NUMERIC(15, 2) DEFAULT 1,
    description TEXT,
    deliverable TEXT,
    is_standard BOOLEAN DEFAULT false,
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- 9. ตาราง Master Library: ข้อมูลบริษัทกลาง (Master Company Profile)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.master_company_profile (
    id TEXT PRIMARY KEY DEFAULT 'default_company',
    company_name TEXT NOT NULL,
    established_year_be INT DEFAULT 2558,
    registered_capital TEXT,
    company_profile TEXT,
    vision_mission TEXT,
    specializations JSONB DEFAULT '[]'::jsonb,
    certifications JSONB DEFAULT '[]'::jsonb,
    max_years_filter INT DEFAULT 5,
    company_logo_url TEXT,
    company_office_image_url TEXT,
    company_office_image_caption TEXT,
    image_blocks JSONB DEFAULT '[]'::jsonb,
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 10. สร้าง Index สำหรับค้นหา Master Library
CREATE INDEX IF NOT EXISTS idx_master_team_name ON public.master_team_library(name);
CREATE INDEX IF NOT EXISTS idx_master_projects_name ON public.master_projects_library(project_name);
CREATE INDEX IF NOT EXISTS idx_master_projects_value ON public.master_projects_library(contract_value);
CREATE INDEX IF NOT EXISTS idx_master_bom_category ON public.master_bom_catalog(category);
CREATE INDEX IF NOT EXISTS idx_master_bom_title ON public.master_bom_catalog(title);

-- 11. ตั้งค่าสิทธิ์ Row Level Security (RLS) สำหรับ Master Library
ALTER TABLE public.master_team_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.master_projects_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.master_bom_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.master_company_profile ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to master_team_library" 
    ON public.master_team_library FOR SELECT USING (true);

CREATE POLICY "Allow public insert/update/delete to master_team_library" 
    ON public.master_team_library FOR ALL USING (true);

CREATE POLICY "Allow public read access to master_projects_library" 
    ON public.master_projects_library FOR SELECT USING (true);

CREATE POLICY "Allow public insert/update/delete to master_projects_library" 
    ON public.master_projects_library FOR ALL USING (true);

CREATE POLICY "Allow public read access to master_bom_catalog" 
    ON public.master_bom_catalog FOR SELECT USING (true);

CREATE POLICY "Allow public insert/update/delete to master_bom_catalog" 
    ON public.master_bom_catalog FOR ALL USING (true);

CREATE POLICY "Allow public read access to master_company_profile" 
    ON public.master_company_profile FOR SELECT USING (true);

CREATE POLICY "Allow public insert/update/delete to master_company_profile" 
    ON public.master_company_profile FOR ALL USING (true);

-- ==============================================================================
-- 12. Migration Scripts (สำหรับฐานข้อมูลเดิมที่เคยรันตารางไว้แล้ว)
-- ==============================================================================
-- รันคำสั่งด้านล่างนี้ใน Supabase SQL Editor หากเคยรันสคริปต์เวอร์ชันก่อนหน้า:

-- A. อัปเกรดตารางผลงานโครงการให้รองรับโลโก้ลูกค้าและบล็อกภาพคู่ 3 นิ้ว
ALTER TABLE public.master_projects_library ADD COLUMN IF NOT EXISTS client_logo_url TEXT;
ALTER TABLE public.master_projects_library ADD COLUMN IF NOT EXISTS image_blocks JSONB;

-- B. สร้างตารางข้อมูลบริษัทกลาง (Master Company Profile) หากยังไม่มี
CREATE TABLE IF NOT EXISTS public.master_company_profile (
    id TEXT PRIMARY KEY DEFAULT 'default_company',
    company_name TEXT NOT NULL,
    established_year_be INT DEFAULT 2558,
    registered_capital TEXT,
    company_profile TEXT,
    vision_mission TEXT,
    specializations JSONB DEFAULT '[]'::jsonb,
    certifications JSONB DEFAULT '[]'::jsonb,
    max_years_filter INT DEFAULT 5,
    company_logo_url TEXT,
    company_office_image_url TEXT,
    company_office_image_caption TEXT,
    image_blocks JSONB DEFAULT '[]'::jsonb,
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.master_company_profile ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public read access to master_company_profile') THEN
        CREATE POLICY "Allow public read access to master_company_profile" ON public.master_company_profile FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public insert/update/delete to master_company_profile') THEN
        CREATE POLICY "Allow public insert/update/delete to master_company_profile" ON public.master_company_profile FOR ALL USING (true);
    END IF;
END $$;
