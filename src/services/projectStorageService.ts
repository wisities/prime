import { BiddingProject, ProjectAttachment } from '../types/proposal';
import { DEFAULT_BIDDING_PROJECTS } from '../data/defaultData';
import { supabase, isSupabaseConfigured } from './supabaseClient';

const LOCAL_STORAGE_KEY = 'prime_bidding_projects_v2';

// --- IndexedDB for unlimited, large attachment storage ---
const DB_NAME = 'PrimeProposalAttachmentsDB';
const DB_VERSION = 1;
const STORE_NAME = 'attachment_data';

function openIndexedDB(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !window.indexedDB) return Promise.resolve(null);
  return new Promise((resolve) => {
    try {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = (e: any) => {
        const db = e.target.result as IDBDatabase;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function storeAttachmentInIDB(id: string, dataUrl: string): Promise<void> {
  if (!id || !dataUrl) return;
  const db = await openIndexedDB();
  if (!db) return;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put({ id, dataUrl });
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

export async function getAttachmentFromIDB(id: string): Promise<string | null> {
  if (!id) return null;
  const db = await openIndexedDB();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result?.dataUrl || null);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

/**
 * ปรับปรุงและซิงค์ยอดงบประมาณให้ตรงกันทุกระดับ (project.budgetAmount, section1.budgetAmount, cover.budgetFormatted)
 */
export function normalizeProjectBudget(p: BiddingProject): BiddingProject {
  const pCopy = { ...p };
  const pData = pCopy.proposalData ? { ...pCopy.proposalData } : ({} as any);
  const effBudget = pCopy.budgetAmount || pData.section1?.budgetAmount || 0;

  if (effBudget > 0) {
    pCopy.budgetAmount = effBudget;
    if (pData.section1) {
      if (!pData.section1.budgetAmount || pData.section1.budgetAmount === 0) {
        pData.section1 = { ...pData.section1, budgetAmount: effBudget };
      }
      if (pData.section1.projectDurationDays === undefined || pData.section1.projectDurationDays === null) {
        pData.section1.projectDurationDays = 180;
      }
      if (pData.section1.projectDurationMonths === undefined || pData.section1.projectDurationMonths === null) {
        pData.section1.projectDurationMonths = Math.max(1, Math.round(pData.section1.projectDurationDays / 30));
      }
    } else {
      pData.section1 = {
        background: '',
        objectives: [],
        expectedBenefits: [],
        targetAudience: '',
        projectScopeOverview: '',
        scopeItems: [],
        budgetAmount: effBudget,
        projectDurationDays: 180,
        projectDurationMonths: 6,
      };
    }
    if (pData.cover) {
      if (!pData.cover.budgetFormatted || pData.cover.budgetFormatted.trim() === '' || pData.cover.budgetFormatted === '0 บาท') {
        pData.cover = { ...pData.cover, budgetFormatted: `${effBudget.toLocaleString()} บาท` };
      }
    }
  }
  pCopy.proposalData = pData;
  return pCopy;
}

/**
 * โหลดข้อมูลโครงการทั้งหมด
 * - หากเชื่อมต่อ Supabase สำเร็จ: โหลดจากฐานข้อมูล Cloud PostgreSQL
 * - หากยังไม่ได้เชื่อมต่อหรือเกิดปัญหาเครือข่าย: โหลดจาก LocalStorage สำรอง
 * - ดึงข้อมูลไฟล์แนบขนาดใหญ่จาก IndexedDB โดยอัตโนมัติ
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

        const mapped: BiddingProject[] = cloudProjects.map((cp: any) => {
          const rawProj: BiddingProject = {
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
          };
          return normalizeProjectBudget(rawProj);
        });

        // เติมเต็ม dataUrl จาก IndexedDB สำหรับไฟล์ที่ไม่มี public url
        for (const p of mapped) {
          for (const a of p.attachments) {
            if (!a.dataUrl || a.dataUrl.startsWith('idb://')) {
              const idbUrl = await getAttachmentFromIDB(a.id);
              if (idbUrl) a.dataUrl = idbUrl;
            }
          }
        }

        // แคชเก็บไว้ใน LocalStorage ด้วยเพื่อความต่อเนื่อง (ตัด base64 ขนาดใหญ่ออกป้องกันโควตาเต็ม)
        try {
          const sanitized = mapped.map((p) => ({
            ...p,
            attachments: (p.attachments || []).map((a) => ({
              ...a,
              dataUrl: a.dataUrl && a.dataUrl.length < 30000 ? a.dataUrl : undefined,
            })),
          }));
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(sanitized));
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
      const parsed: BiddingProject[] = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // เติมเต็ม dataUrl จาก IndexedDB สำหรับไฟล์แนบทั้งหมด และปรับยอดงบประมาณให้สมบูรณ์
        const normalizedList = parsed.map(normalizeProjectBudget);
        for (const p of normalizedList) {
          if (p.attachments) {
            for (const a of p.attachments) {
              if (!a.dataUrl || a.dataUrl.startsWith('idb://')) {
                const idbUrl = await getAttachmentFromIDB(a.id);
                if (idbUrl) a.dataUrl = idbUrl;
              }
            }
          }
        }
        return { projects: normalizedList, source: 'local' };
      }
    }
  } catch (e) {
    console.warn('LocalStorage read error:', e);
  }

  return { projects: DEFAULT_BIDDING_PROJECTS.map(normalizeProjectBudget), source: 'local' };
}

/**
 * บันทึกหรืออัปเดตโครงการลงฐานข้อมูล
 * - บันทึกไฟล์แนบลง IndexedDB ถาวร (ไม่จำกัดจำนวนไฟล์ ไม่จำกัดขนาด)
 * - บันทึกโครงสร้างโครงการลง LocalStorage (sanitize dataUrl ป้องกันโควตาเต็ม)
 * - ซิงค์โครงการและอัปโหลดไฟล์ขึ้น Supabase Cloud & Supabase Storage
 */
export async function saveProject(rawProject: BiddingProject): Promise<boolean> {
  const project = normalizeProjectBudget(rawProject);

  // บันทึกไฟล์แนบทุกไฟล์ลงใน IndexedDB ถาวร
  if (project.attachments && project.attachments.length > 0) {
    for (const att of project.attachments) {
      if (att.dataUrl && att.dataUrl.startsWith('data:')) {
        await storeAttachmentInIDB(att.id, att.dataUrl);
      }
    }
  }

  // 1. บันทึกลง LocalStorage เสมอเพื่อความเร็วและความปลอดภัย (ตัด base64 ขนาดใหญ่ออก)
  try {
    const sanitizedProject: BiddingProject = {
      ...project,
      attachments: (project.attachments || []).map((att) => ({
        ...att,
        dataUrl: att.dataUrl && att.dataUrl.length < 30000 ? att.dataUrl : undefined,
      })),
    };

    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    let list: BiddingProject[] = saved ? JSON.parse(saved) : [];
    const index = list.findIndex((p) => p.id === sanitizedProject.id);
    if (index >= 0) {
      list[index] = sanitizedProject;
    } else {
      list = [sanitizedProject, ...list];
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

      // ซิงค์ไฟล์แนบทั้งหมดของโครงการลงตาราง project_attachments และ Supabase Storage
      if (project.attachments && project.attachments.length > 0) {
        for (const att of project.attachments) {
          try {
            let fileUrl = att.dataUrl;

            // หากเป็น base64 dataUrl ให้พยายามอัปโหลดขึ้น Supabase Storage เพื่อเก็บเป็น publicUrl
            if (fileUrl && fileUrl.startsWith('data:')) {
              try {
                const cleanFileName = att.name.replace(/[^a-zA-Z0-9._-]/g, '_');
                const storagePath = `${project.id}/${Date.now()}_${cleanFileName}`;

                // Convert base64 dataUrl to Blob
                const res = await fetch(fileUrl);
                const blob = await res.blob();

                try {
                  await supabase.storage.createBucket('project-attachments', { public: true });
                } catch {}

                const { data: uploadData, error: upErr } = await supabase.storage
                  .from('project-attachments')
                  .upload(storagePath, blob, {
                    contentType: att.type || 'application/octet-stream',
                    upsert: true,
                  });

                if (!upErr && uploadData) {
                  const { data: pubData } = supabase.storage
                    .from('project-attachments')
                    .getPublicUrl(storagePath);
                  if (pubData?.publicUrl) {
                    fileUrl = pubData.publicUrl;
                    att.dataUrl = fileUrl;
                  }
                }
              } catch (storageErr) {
                console.warn('Storage bucket upload fallback:', storageErr);
              }
            }

            await supabase.from('project_attachments').upsert(
              {
                id: att.id,
                project_id: project.id,
                name: att.name,
                size: att.size,
                type: att.type || 'application/octet-stream',
                category: att.category,
                file_url: fileUrl || null,
                uploaded_at: att.uploadedAt || new Date().toISOString(),
              },
              { onConflict: 'id' }
            );
          } catch (attErr) {
            console.warn('Attachment upsert error:', attErr);
          }
        }
      }

      // ลบไฟล์แนบที่ถูกผู้ใช้ลบออกแล้ว (มีใน Cloud แต่ไม่มีในโครงการปัจจุบัน)
      try {
        const currentIds = new Set((project.attachments || []).map((a) => a.id));
        const { data: cloudRows } = await supabase
          .from('project_attachments')
          .select('id')
          .eq('project_id', project.id);
        const staleIds = (cloudRows || [])
          .map((r: any) => r.id as string)
          .filter((id) => !currentIds.has(id));
        if (staleIds.length > 0) {
          await supabase.from('project_attachments').delete().in('id', staleIds);
        }
      } catch (cleanupErr) {
        console.warn('Attachment cleanup error:', cleanupErr);
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
  const attachmentId = `att-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
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

  // บันทึกลง IndexedDB เพื่อให้สามารถเปิดดู/ดาวน์โหลดแบบออฟไลน์ได้ทันที
  await storeAttachmentInIDB(attachmentId, fileUrl || base64DataUrl);

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

export interface TableAuditStatus {
  name: string;
  label: string;
  exists: boolean;
  count: number;
  status: 'ok' | 'missing' | 'error';
  detail?: string;
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
  tables?: TableAuditStatus[];
  allTablesReady?: boolean;
}

/**
 * ฟังก์ชันสำหรับทดสอบการเชื่อมต่อกับ Supabase และตรวจสอบโครงสร้างตารางทุกตาราง
 */
export async function testSupabaseConnection(): Promise<SupabaseTestResult> {
  const configured = isSupabaseConfigured();
  const client = supabase;
  if (!configured || !client) {
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

  const tableDefinitions = [
    { name: 'bidding_projects', label: 'โครงการและข้อเสนอ (bidding_projects)' },
    { name: 'project_attachments', label: 'ไฟล์แนบและ TOR (project_attachments)' },
    { name: 'master_team_library', label: 'คลังบุคลากรกลาง (master_team_library)' },
    { name: 'master_projects_library', label: 'คลังผลงานย้อนหลัง (master_projects_library)' },
    { name: 'master_bom_catalog', label: 'คลังถอดแบบ BOM (master_bom_catalog)' },
    { name: 'master_company_profile', label: 'ข้อมูลบริษัทกลาง (master_company_profile)' },
    { name: 'allowed_users', label: 'ผู้มีสิทธิ์ใช้งาน Google (allowed_users)' },
  ];

  try {
    // ตรวจสอบทุกตารางพร้อมกันแบบ Parallel
    const auditedTables: TableAuditStatus[] = await Promise.all(
      tableDefinitions.map(async (def) => {
        try {
          const { count, error } = await client
            .from(def.name)
            .select('*', { count: 'exact', head: true });

          if (error) {
            const isMissing =
              error.code === '42P01' ||
              error.message?.includes('relation') ||
              error.message?.includes('does not exist');

            return {
              name: def.name,
              label: def.label,
              exists: !isMissing,
              count: 0,
              status: isMissing ? 'missing' : 'error',
              detail: error.message,
            };
          }

          return {
            name: def.name,
            label: def.label,
            exists: true,
            count: count ?? 0,
            status: 'ok',
          };
        } catch (tableErr: any) {
          return {
            name: def.name,
            label: def.label,
            exists: false,
            count: 0,
            status: 'error',
            detail: tableErr?.message || 'Check failed',
          };
        }
      })
    );

    const mainTable = auditedTables.find((t) => t.name === 'bidding_projects');
    const tableExists = Boolean(mainTable?.exists && mainTable.status === 'ok');
    const allTablesReady = auditedTables.every((t) => t.exists && t.status === 'ok');
    const projectCount = mainTable?.count ?? 0;

    // ตรวจสอบ Storage bucket 'project-attachments'
    let storageExists = false;
    try {
      const { error: listErr } = await client.storage
        .from('project-attachments')
        .list('', { limit: 1 });

      if (!listErr || !listErr.message?.toLowerCase().includes('not found')) {
        storageExists = true;
      }
    } catch {
      storageExists = true;
    }

    if (!tableExists) {
      return {
        isConfigured: true,
        connected: false,
        url: supabaseUrl,
        tableExists: false,
        storageExists,
        projectCount: 0,
        tables: auditedTables,
        allTablesReady: false,
        message: 'เชื่อมต่อ Supabase ได้แล้ว แต่ยังไม่พบตาราง "bidding_projects" กรุณารันไฟล์ supabase_schema.sql ใน SQL Editor ของ Supabase',
        errorDetail: mainTable?.detail,
      };
    }

    const missingTables = auditedTables.filter((t) => !t.exists);
    const successMsg = allTablesReady
      ? `เชื่อมต่อ Supabase Cloud สำเร็จ 100%! โครงสร้างตารางครบทั้ง 7 ตาราง และพบข้อมูลโครงการทั้งหมด ${projectCount} โครงการ`
      : `เชื่อมต่อตารางโครงการได้แล้ว แต่ยังมีบางตารางยังไม่ได้สร้าง (${missingTables.map((t) => t.name).join(', ')}) กรุณารัน supabase_schema.sql เพิ่มเติม`;

    return {
      isConfigured: true,
      connected: true,
      url: supabaseUrl,
      tableExists: true,
      storageExists,
      projectCount,
      tables: auditedTables,
      allTablesReady,
      message: successMsg,
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

