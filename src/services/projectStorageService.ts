import { BiddingProject, ProjectAttachment } from '../types/proposal';
import { DEFAULT_BIDDING_PROJECTS } from '../data/defaultData';
import { supabase, isSupabaseConfigured } from './supabaseClient';

const LOCAL_STORAGE_KEY = 'prime_bidding_projects_v2';

/**
 * โหลดข้อมูลโครงการทั้งหมด
 * - หากเชื่อมต่อ Supabase สำเร็จ: โหลดจากฐานข้อมูล Cloud PostgreSQL
 * - หากยังไม่ได้เชื่อมต่อหรือเกิดปัญหาเครือข่าย: โหลดจาก LocalStorage สำรอง
 */
export async function loadAllProjects(): Promise<{
  projects: BiddingProject[];
  source: 'cloud' | 'local';
}> {
  if (isSupabaseConfigured() && supabase) {
    try {
      // ดึงข้อมูลโครงการพร้อมไฟล์แนบ
      const { data: cloudProjects, error: projError } = await supabase
        .from('bidding_projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (projError) {
        console.warn('Supabase fetch error, fallback to local:', projError);
      } else if (cloudProjects) {
        // หากเชื่อมต่อตารางได้ แต่ตารางยังว่างเปล่า (0 โครงการ)
        // ให้อัปโหลดข้อมูลโครงการที่มีอยู่ในเครื่องขึ้น Cloud อัตโนมัติทันที
        if (cloudProjects.length === 0) {
          const localProjects = (() => {
            try {
              const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
              if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed) && parsed.length > 0) return parsed;
              }
            } catch {}
            return DEFAULT_BIDDING_PROJECTS;
          })();

          for (const proj of localProjects) {
            await saveProject(proj);
          }
          return { projects: localProjects, source: 'cloud' };
        }

        // ดึงรายการไฟล์แนบ
        const { data: cloudAttachments } = await supabase
          .from('project_attachments')
          .select('*');

        const attachmentsMap = new Map<string, ProjectAttachment[]>();
        if (cloudAttachments) {
          cloudAttachments.forEach((att: any) => {
            const list = attachmentsMap.get(att.project_id) || [];
            list.push({
              id: att.id,
              name: att.name,
              size: Number(att.size) || 0,
              type: att.type,
              uploadedAt: att.uploaded_at,
              category: att.category,
              dataUrl: att.file_url,
            });
            attachmentsMap.set(att.project_id, list);
          });
        }

        const mapped: BiddingProject[] = cloudProjects.map((cp: any) => ({
          id: cp.id,
          projectCode: cp.project_code,
          projectTitle: cp.project_title,
          clientAgency: cp.client_agency,
          budgetAmount: Number(cp.budget_amount) || 0,
          egpUrl: cp.egp_url || undefined,
          announcementDate: cp.announcement_date || undefined,
          submissionDeadline: cp.submission_deadline || undefined,
          status: cp.status || 'draft',
          statusNote: cp.status_note || undefined,
          attachments: attachmentsMap.get(cp.id) || [],
          proposalData: cp.proposal_data || {},
          createdAt: cp.created_at,
          updatedAt: cp.updated_at,
        }));

        // แคชเก็บไว้ใน LocalStorage ด้วยเพื่อความต่อเนื่อง
        try {
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(mapped));
        } catch {}

        return { projects: mapped, source: 'cloud' };
      }
    } catch (err) {
      console.warn('Could not load from Supabase:', err);
    }
  }

  // โหลดจาก LocalStorage (Fallback)
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return { projects: parsed, source: 'local' };
      }
    }
  } catch (e) {
    console.warn('LocalStorage read error:', e);
  }

  return { projects: DEFAULT_BIDDING_PROJECTS, source: 'local' };
}

/**
 * บันทึกหรืออัปเดตโครงการลงฐานข้อมูล
 */
export async function saveProject(project: BiddingProject): Promise<boolean> {
  // 1. บันทึกลง LocalStorage เสมอเพื่อความเร็วและความปลอดภัย
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    let list: BiddingProject[] = saved ? JSON.parse(saved) : [];
    const index = list.findIndex((p) => p.id === project.id);
    if (index >= 0) {
      list[index] = project;
    } else {
      list = [project, ...list];
    }
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
  } catch (e) {
    console.warn('LocalStorage save error:', e);
  }

  // 2. ซิงค์ไปยัง Supabase Cloud
  if (isSupabaseConfigured() && supabase) {
    try {
      const { error } = await supabase.from('bidding_projects').upsert(
        {
          id: project.id,
          project_code: project.projectCode,
          project_title: project.projectTitle,
          client_agency: project.clientAgency,
          budget_amount: project.budgetAmount,
          egp_url: project.egpUrl || null,
          announcement_date: project.announcementDate || null,
          submission_deadline: project.submissionDeadline || null,
          status: project.status,
          status_note: project.statusNote || null,
          proposal_data: project.proposalData,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      );

      if (error) {
        console.error('Supabase project upsert error:', error);
        return false;
      }

      // ซิงค์ไฟล์แนบทั้งหมดของโครงการลงตาราง project_attachments
      if (project.attachments && project.attachments.length > 0) {
        for (const att of project.attachments) {
          try {
            await supabase.from('project_attachments').upsert(
              {
                id: att.id,
                project_id: project.id,
                name: att.name,
                size: att.size,
                type: att.type || 'application/octet-stream',
                category: att.category,
                file_url: att.dataUrl || null,
                uploaded_at: att.uploadedAt || new Date().toISOString(),
              },
              { onConflict: 'id' }
            );
          } catch (attErr) {
            console.warn('Attachment upsert error:', attErr);
          }
        }
      }

      return true;
    } catch (err) {
      console.error('Supabase save error:', err);
      return false;
    }
  }

  return true;
}

/**
 * ลบโครงการออกจากระบบ
 */
export async function deleteProject(projectId: string): Promise<boolean> {
  // ลบจาก LocalStorage
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      const list: BiddingProject[] = JSON.parse(saved);
      const filtered = list.filter((p) => p.id !== projectId);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(filtered));
    }
  } catch (e) {
    console.warn('LocalStorage delete error:', e);
  }

  // ลบจาก Supabase
  if (isSupabaseConfigured() && supabase) {
    try {
      const { error } = await supabase.from('bidding_projects').delete().eq('id', projectId);
      if (error) console.error('Supabase delete error:', error);
    } catch (err) {
      console.error('Supabase delete error:', err);
    }
  }

  return true;
}

/**
 * อัปโหลดไฟล์แนบเข้า Supabase Storage Bucket พร้อมบันทึกตาราง attachments
 */
export async function uploadAttachmentFile(
  projectId: string,
  file: File,
  category: 'announcement' | 'tor' | 'other'
): Promise<ProjectAttachment> {
  const attachmentId = `att-${Date.now()}`;
  let fileUrl: string | undefined = undefined;

  // อ่าน base64 เพื่อใช้ในการ parse Word/PDF ฝั่ง Client ได้ทันที
  const base64DataUrl = await new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(file);
  });

  // อัปโหลดขึ้น Supabase Storage (หากเปิดใช้งาน)
  if (isSupabaseConfigured() && supabase) {
    try {
      const cleanFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const storagePath = `${projectId}/${Date.now()}_${cleanFileName}`;

      try {
        await supabase.storage.createBucket('project-attachments', { public: true });
      } catch {}

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('project-attachments')
        .upload(storagePath, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (!uploadError && uploadData) {
        const { data: publicUrlData } = supabase.storage
          .from('project-attachments')
          .getPublicUrl(storagePath);
        fileUrl = publicUrlData.publicUrl;

        // บันทึกลงตาราง project_attachments
        await supabase.from('project_attachments').insert({
          id: attachmentId,
          project_id: projectId,
          name: file.name,
          size: file.size,
          type: file.type || 'application/octet-stream',
          category,
          storage_path: storagePath,
          file_url: fileUrl,
          uploaded_at: new Date().toISOString(),
        });
      } else {
        console.warn('Supabase storage upload error:', uploadError);
      }
    } catch (storageErr) {
      console.warn('Supabase upload exception:', storageErr);
    }
  }

  return {
    id: attachmentId,
    name: file.name,
    size: file.size,
    type: file.type || 'application/octet-stream',
    uploadedAt: new Date().toISOString(),
    category,
    dataUrl: fileUrl || base64DataUrl,
  };
}

export interface SupabaseTestResult {
  isConfigured: boolean;
  connected: boolean;
  url?: string;
  tableExists: boolean;
  storageExists: boolean;
  projectCount: number;
  message: string;
  errorDetail?: string;
}

/**
 * ฟังก์ชันสำหรับทดสอบการเชื่อมต่อกับ Supabase และตรวจสอบโครงสร้างตาราง
 */
export async function testSupabaseConnection(): Promise<SupabaseTestResult> {
  const configured = isSupabaseConfigured();
  if (!configured || !supabase) {
    return {
      isConfigured: false,
      connected: false,
      tableExists: false,
      storageExists: false,
      projectCount: 0,
      message: 'ยังไม่พบการตั้งค่า Environment Variables (VITE_SUPABASE_URL และ VITE_SUPABASE_ANON_KEY)',
    };
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';

  try {
    // 1. ทดสอบการเชื่อมต่อตาราง bidding_projects
    const { data, count, error } = await supabase
      .from('bidding_projects')
      .select('id', { count: 'exact' });

    if (error) {
      const isMissingTable =
        error.code === '42P01' ||
        error.message?.includes('relation') ||
        error.message?.includes('does not exist');

      return {
        isConfigured: true,
        connected: false,
        url: supabaseUrl,
        tableExists: false,
        storageExists: false,
        projectCount: 0,
        message: isMissingTable
          ? 'เชื่อมต่อ Supabase ได้แล้ว แต่ยังไม่พบตาราง "bidding_projects" กรุณารันไฟล์ supabase_schema.sql ใน SQL Editor ของ Supabase'
          : `เกิดข้อผิดพลาดในการเชื่อมต่อฐานข้อมูล: ${error.message}`,
        errorDetail: error.message,
      };
    }

    // 2. ทดสอบ Storage bucket 'project-attachments'
    let storageExists = false;
    try {
      const { error: listErr } = await supabase.storage
        .from('project-attachments')
        .list('', { limit: 1 });

      // หากเข้าถึงได้ หรือ error ไม่ใช่ Bucket not found แปลว่า Bucket มีอยู่จริงและพร้อมใช้งาน
      if (!listErr || !listErr.message?.toLowerCase().includes('not found')) {
        storageExists = true;
      }
    } catch {
      storageExists = true;
    }

    const countNum = count ?? (data ? data.length : 0);

    return {
      isConfigured: true,
      connected: true,
      url: supabaseUrl,
      tableExists: true,
      storageExists,
      projectCount: countNum,
      message: `เชื่อมต่อ Supabase Cloud สำเร็จ 100%! พบข้อมูลโครงการทั้งหมด ${countNum} โครงการ`,
    };
  } catch (err: any) {
    return {
      isConfigured: true,
      connected: false,
      url: supabaseUrl,
      tableExists: false,
      storageExists: false,
      projectCount: 0,
      message: `ไม่สามารถเชื่อมต่อ Supabase ได้: ${err.message || 'Network error'}`,
      errorDetail: err.message,
    };
  }
}

