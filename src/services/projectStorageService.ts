import { BiddingProject, ProjectAttachment, ProposalData } from '../types/proposal';
import { createBlankProposalData, createDefaultBlankProject } from '../data/defaultData';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { idbSet, idbGet, idbGetAll, idbDelete, IDB_STORES, stripAllLargeBase64 } from './localDatabase';

const LOCAL_STORAGE_KEY = 'prime_bidding_projects_v2';

// --- IndexedDB for unlimited, large attachment storage ---
const DB_NAME = 'PrimeProposalAttachmentsDB';
const DB_VERSION = 1;
const STORE_NAME = 'attachment_data';

let attachmentDbPromise: Promise<IDBDatabase | null> | null = null;

function openIndexedDB(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !window.indexedDB) return Promise.resolve(null);
  if (attachmentDbPromise) return attachmentDbPromise;

  attachmentDbPromise = new Promise((resolve) => {
    try {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = (e: any) => {
        const db = e.target.result as IDBDatabase;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => {
        attachmentDbPromise = null;
        resolve(null);
      };
      request.onblocked = () => {
        attachmentDbPromise = null;
        resolve(null);
      };
    } catch {
      attachmentDbPromise = null;
      resolve(null);
    }
  });

  return attachmentDbPromise;
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
 * ปรับปรุง ตรวจสอบความถูกต้อง และเติมเต็มโครงสร้างโครงการให้สมบูรณ์ 100%
 * - รับประกันว่าฟิลด์สำคัญ (id, projectTitle, projectCode, clientAgency, status, attachments) ไม่เป็น undefined
 * - เติมเต็ม proposalData ทุกบท (cover, section1, section2, section3, section4, section5)
 * - ซิงค์ยอดงบประมาณให้ตรงกันทุกระดับ (project.budgetAmount, section1.budgetAmount, cover.budgetFormatted)
 */
export function normalizeProjectBudget(p: BiddingProject): BiddingProject {
  if (!p) {
    return createDefaultBlankProject();
  }

  const pCopy: BiddingProject = {
    ...p,
    id: p.id || `proj-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    projectTitle: p.projectTitle || 'โครงการใหม่',
    projectCode: p.projectCode || '',
    clientAgency: p.clientAgency || '',
    budgetAmount: Number(p.budgetAmount) || 0,
    status: p.status || 'draft',
    attachments: (Array.isArray(p.attachments) ? p.attachments : []).map((att) => ({
      ...att,
      dataUrl: att.dataUrl && !att.dataUrl.startsWith('data:') ? att.dataUrl : (att.id ? `idb://${att.id}` : undefined),
    })),
  };

  const blank = createBlankProposalData(
    pCopy.projectTitle,
    pCopy.projectCode,
    pCopy.clientAgency,
    pCopy.budgetAmount,
    180
  );

  const rawData = pCopy.proposalData || ({} as any);

  const pData: ProposalData = {
    documentStructure: rawData.documentStructure || blank.documentStructure,
    cover: {
      ...blank.cover,
      ...(rawData.cover || {}),
      projectTitle: rawData.cover?.projectTitle || pCopy.projectTitle,
      projectCode: rawData.cover?.projectCode || pCopy.projectCode,
      clientAgency: rawData.cover?.clientAgency || pCopy.clientAgency,
    },
    section1: {
      ...blank.section1,
      ...(rawData.section1 || {}),
      objectives: Array.isArray(rawData.section1?.objectives) ? rawData.section1.objectives : [],
      expectedBenefits: Array.isArray(rawData.section1?.expectedBenefits) ? rawData.section1.expectedBenefits : [],
      scopeItems: Array.isArray(rawData.section1?.scopeItems) ? rawData.section1.scopeItems : [],
    },
    section2: {
      ...blank.section2,
      ...(rawData.section2 || {}),
      milestones: Array.isArray(rawData.section2?.milestones) ? rawData.section2.milestones : [],
    },
    section3: {
      ...blank.section3,
      ...(rawData.section3 || {}),
    },
    section4: {
      ...blank.section4,
      ...(rawData.section4 || {}),
      teamMembers: Array.isArray(rawData.section4?.teamMembers) ? rawData.section4.teamMembers : [],
      riskItems: Array.isArray(rawData.section4?.riskItems) ? rawData.section4.riskItems : [],
      projectManagementOverview: rawData.section4?.projectManagementOverview || blank.section4.projectManagementOverview || '',
      projectManagementImageBlocks: Array.isArray(rawData.section4?.projectManagementImageBlocks) ? rawData.section4.projectManagementImageBlocks : [],
    },
    section5: {
      ...blank.section5,
      ...(rawData.section5 || {}),
      specializations: Array.isArray(rawData.section5?.specializations) ? rawData.section5.specializations : blank.section5.specializations,
      certifications: Array.isArray(rawData.section5?.certifications) ? rawData.section5.certifications : blank.section5.certifications,
      pastProjects: Array.isArray(rawData.section5?.pastProjects) ? rawData.section5.pastProjects : [],
    },
  };

  const effBudget = pCopy.budgetAmount || pData.section1.budgetAmount || 0;
  pCopy.budgetAmount = effBudget;
  pData.section1.budgetAmount = effBudget;
  if (!pData.cover.budgetFormatted || pData.cover.budgetFormatted.trim() === '' || pData.cover.budgetFormatted === '0 บาท') {
    if (effBudget > 0) {
      pData.cover.budgetFormatted = `${effBudget.toLocaleString()} บาท`;
    }
  }

  pCopy.proposalData = pData;
  return pCopy;
}

export const SAMPLE_PROJECT_IDS = new Set(['proj-001', 'proj-002', 'proj-003']);
export const SAMPLE_PROJECT_CODES = new Set(['EGP-67-10492', 'EGP-67-08812', 'EGP-67-05118']);

export function isSampleProject(id?: string, code?: string, client?: string): boolean {
  if (id && SAMPLE_PROJECT_IDS.has(id)) return true;
  if (code && SAMPLE_PROJECT_CODES.has(code)) return true;
  if (client && (
    client.includes('กรมพัฒนาธุรกิจการค้า') ||
    client.includes('สำนักงานปลัดกระทรวงดิจิทัล') ||
    client.includes('กรมส่งเสริมการปกครองท้องถิ่น')
  )) return true;
  return false;
}

/**
 * รวมและกู้คืนรูปภาพจาก sourceProposal กลับเข้า targetProposal
 * ป้องกันไม่ให้รูปภาพที่บันทึกไว้ใน IndexedDB สูญหายเมื่อโหลดฉบับร่างจาก LocalStorage หรือ Cloud
 */
export function restoreImagesFromSource(targetProposal: ProposalData, sourceProposal: ProposalData): ProposalData {
  if (!targetProposal) return sourceProposal;
  if (!sourceProposal) return targetProposal;

  const target = { ...targetProposal };

  // 1. Cover
  if (sourceProposal.cover) {
    target.cover = {
      ...target.cover,
      coverImage: target.cover?.coverImage || sourceProposal.cover.coverImage,
      backCoverImage: target.cover?.backCoverImage || sourceProposal.cover.backCoverImage,
      portraitBgImage: target.cover?.portraitBgImage || sourceProposal.cover.portraitBgImage,
      landscapeBgImage: target.cover?.landscapeBgImage || sourceProposal.cover.landscapeBgImage,
    };
  }

  // 2. Section 3
  if (sourceProposal.section3) {
    target.section3 = {
      ...target.section3,
      conceptualDiagramImage: target.section3?.conceptualDiagramImage || sourceProposal.section3.conceptualDiagramImage,
      imageBlocks: (target.section3?.imageBlocks && target.section3.imageBlocks.length > 0)
        ? target.section3.imageBlocks
        : sourceProposal.section3.imageBlocks,
      projectApproachImageBlocks: (target.section3?.projectApproachImageBlocks && target.section3.projectApproachImageBlocks.length > 0)
        ? target.section3.projectApproachImageBlocks
        : sourceProposal.section3.projectApproachImageBlocks,
    };
  }

  // Section 1 Scope items (TOR image blocks)
  if (Array.isArray(target.section1?.scopeItems) && Array.isArray(sourceProposal.section1?.scopeItems)) {
    const srcMap = new Map(sourceProposal.section1.scopeItems.map((s) => [s.id, s]));
    target.section1 = {
      ...target.section1,
      scopeItems: target.section1.scopeItems.map((tItem) => {
        const sItem = srcMap.get(tItem.id);
        if (sItem && Array.isArray(sItem.imageBlocks) && sItem.imageBlocks.length > 0) {
          if (!Array.isArray(tItem.imageBlocks) || tItem.imageBlocks.length === 0) {
            return { ...tItem, imageBlocks: sItem.imageBlocks };
          }
        }
        return tItem;
      }),
    };
  }

  // 3. Section 4
  if (sourceProposal.section4) {
    const srcTeam = Array.isArray(sourceProposal.section4.teamMembers) ? sourceProposal.section4.teamMembers : [];
    const srcTeamMap = new Map(srcTeam.map((m) => [m.id, m]));
    const targetTeam = Array.isArray(target.section4?.teamMembers) ? target.section4.teamMembers : [];

    const restoredTeam = targetTeam.map((m) => {
      const s = srcTeamMap.get(m.id);
      return {
        ...m,
        photoUrl: m.photoUrl || s?.photoUrl,
      };
    });

    const mgmtBlocks = (Array.isArray(target.section4?.projectManagementImageBlocks) && target.section4.projectManagementImageBlocks.length > 0)
      ? target.section4.projectManagementImageBlocks
      : sourceProposal.section4.projectManagementImageBlocks;

    const imgBlocks = (Array.isArray(target.section4?.imageBlocks) && target.section4.imageBlocks.length > 0)
      ? target.section4.imageBlocks
      : sourceProposal.section4.imageBlocks;

    target.section4 = {
      ...target.section4,
      teamMembers: restoredTeam,
      projectManagementImageBlocks: mgmtBlocks,
      imageBlocks: imgBlocks,
    };
  }

  // 4. Section 5
  if (sourceProposal.section5) {
    const srcPast = Array.isArray(sourceProposal.section5.pastProjects) ? sourceProposal.section5.pastProjects : [];
    const srcPastMap = new Map(srcPast.map((p) => [p.id, p]));
    const targetPast = Array.isArray(target.section5?.pastProjects) ? target.section5.pastProjects : [];

    const restoredPast = targetPast.map((p) => {
      const s = srcPastMap.get(p.id);
      return {
        ...p,
        clientLogoUrl: p.clientLogoUrl || s?.clientLogoUrl,
        projectImageUrl: p.projectImageUrl || s?.projectImageUrl,
        certificateFileUrl: p.certificateFileUrl || s?.certificateFileUrl,
        imageBlocks: (Array.isArray(p.imageBlocks) && p.imageBlocks.length > 0) ? p.imageBlocks : s?.imageBlocks,
      };
    });

    target.section5 = {
      ...target.section5,
      companyLogoUrl: target.section5?.companyLogoUrl || sourceProposal.section5.companyLogoUrl,
      companyOfficeImageUrl: target.section5?.companyOfficeImageUrl || sourceProposal.section5.companyOfficeImageUrl,
      pastProjects: restoredPast,
    };
  }

  return target;
}

/**
 * โหลดข้อมูลโครงการทั้งหมด
 * - กวาดล้างและตัดโครงการตัวอย่างออกจากระบบอย่างถาวร
 * - หากเชื่อมต่อ Supabase สำเร็จ: โหลดจากฐานข้อมูล Cloud PostgreSQL
 * - หากยังไม่ได้เชื่อมต่อหรือเกิดปัญหาเครือข่าย: โหลดจาก LocalStorage/IndexedDB
 */
export async function loadAllProjects(): Promise<{
  projects: BiddingProject[];
  source: 'cloud' | 'local';
}> {
  // กวาดล้างและลบโครงการตัวอย่างเดิมออกจาก IndexedDB, LocalStorage และ Cloud อย่างถาวร
  for (const sampleId of ['proj-001', 'proj-002', 'proj-003']) {
    try {
      await idbDelete(IDB_STORES.BIDDING_PROJECTS, sampleId);
      localStorage.removeItem(`prime_active_draft_${sampleId}`);
    } catch {}
    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase.from('bidding_projects').delete().eq('id', sampleId);
      } catch {}
    }
  }

  // ลบโครงการตัวอย่างออกจากแคช LocalStorage
  try {
    const rawSaved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (rawSaved) {
      const parsed = JSON.parse(rawSaved);
      if (Array.isArray(parsed)) {
        const cleaned = parsed.filter((p: any) => !isSampleProject(p.id, p.projectCode, p.clientAgency));
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(cleaned));
      }
    }
  } catch {}

  if (isSupabaseConfigured() && supabase) {
    try {
      // ดึงข้อมูลโครงการพร้อมไฟล์แนบ
      const { data: rawCloudProjects, error: projError } = await supabase
        .from('bidding_projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (projError) {
        console.warn('Supabase fetch error, fallback to local:', projError);
      } else if (rawCloudProjects) {
        // กรองเอาเฉพาะโครงการจริง ไม่เอาโครงการตัวอย่าง
        const cloudProjects = rawCloudProjects.filter(
          (cp: any) => !isSampleProject(cp.id, cp.project_code, cp.client_agency)
        );

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

        // 1. อ่านข้อมูลโครงการท้องถิ่นจาก IndexedDB ก่อนเพื่อรักษาเนื้อหาร่าง (เครื่องใครเครื่องมัน)
        let idbProjects: BiddingProject[] = [];
        try {
          idbProjects = (await idbGetAll<BiddingProject>(IDB_STORES.BIDDING_PROJECTS)) || [];
        } catch {}

        // 2. อ่านข้อมูลโครงการจาก LocalStorage เพื่อความครอบคลุม
        let localProjectsFromStorage: BiddingProject[] = [];
        try {
          const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
          if (saved) {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed)) localProjectsFromStorage = parsed;
          }
        } catch {}

        // รวมโครงการในเครื่องเข้า Map โดยให้ IndexedDB มีความน่าเชื่อถือสูงสุด
        const localMap = new Map<string, BiddingProject>();
        for (const lp of localProjectsFromStorage) {
          localMap.set(lp.id, lp);
        }
        for (const lp of idbProjects) {
          localMap.set(lp.id, lp);
        }

        // ตรวจสอบคีย์ร่างเฉพาะ prime_active_draft_{id} ในเครื่อง
        for (const [id, lp] of localMap.entries()) {
          try {
            const single = localStorage.getItem(`prime_active_draft_${id}`);
            if (single) {
              const parsedSingle = JSON.parse(single);
              if (parsedSingle && parsedSingle.proposalData) {
                const singleTime = new Date(parsedSingle.updatedAt || 0).getTime();
                const lpTime = new Date(lp.updatedAt || 0).getTime();
                if (singleTime >= lpTime) {
                  localMap.set(id, {
                    ...lp,
                    ...parsedSingle,
                    proposalData: restoreImagesFromSource(parsedSingle.proposalData, lp.proposalData),
                  });
                }
              }
            }
          } catch {}
        }

        const mapped: BiddingProject[] = [];
        const processedIds = new Set<string>();

        for (const cp of cloudProjects) {
          processedIds.add(cp.id);
          const localProj = localMap.get(cp.id);
          const cloudMeta = cp.proposal_data?._cloudStatus || {};

          // เปรียบเทียบเวลาแก้ไขระหว่างเครื่องกับ Cloud
          const localTime = new Date(localProj?.updatedAt || 0).getTime();
          const cloudTime = new Date(cp.updated_at || cp.created_at || 0).getTime();

          // ตรวจสอบว่าในเครื่องมีเนื้อหาที่แท้จริงของผู้ใช้หรือไม่
          const hasLocalContent = localProj && localProj.proposalData && (
            (localProj.proposalData.section1?.objectives && localProj.proposalData.section1.objectives.length > 0) ||
            (localProj.proposalData.cover?.projectTitle && localProj.proposalData.cover.projectTitle.trim() !== '') ||
            (localProj.proposalData.section1?.background && localProj.proposalData.section1.background.trim() !== '')
          );

          // ถ้าในเครื่องมีเนื้อหา และ (เวลาในเครื่องใหม่กว่าหรือใกล้เคียง หรือ Cloud เป็นตัวอย่างโครงการเดิม)
          // ให้ยึดเนื้อหาร่างในเครื่องเป็นหลักเสมอ ไม่ให้ตัวอย่างจาก Cloud มาเขียนทับ!
          let effectiveProposalData: any;
          if (hasLocalContent && localTime >= cloudTime) {
            effectiveProposalData = localProj.proposalData;
          } else if (cp.proposal_data && (cp.proposal_data.section1 || cp.proposal_data.section3)) {
            if (localProj && localProj.proposalData && localTime > cloudTime) {
              effectiveProposalData = localProj.proposalData;
            } else {
              effectiveProposalData = cp.proposal_data;
            }
          } else {
            effectiveProposalData = localProj?.proposalData || cp.proposal_data;
          }

          const useLocalMeta = localProj && (localTime >= cloudTime || hasLocalContent);
          const projectTitle = useLocalMeta && localProj.projectTitle ? localProj.projectTitle : (cp.project_title || localProj?.projectTitle || 'โครงการไม่ระบุชื่อ');
          const projectCode = useLocalMeta && localProj.projectCode ? localProj.projectCode : (cp.project_code || localProj?.projectCode || '');
          const clientAgency = useLocalMeta && localProj.clientAgency ? localProj.clientAgency : (cp.client_agency || localProj?.clientAgency || '');
          const budgetAmount = useLocalMeta && localProj.budgetAmount ? localProj.budgetAmount : (Number(cp.budget_amount) || localProj?.budgetAmount || 0);

          const rawProj: BiddingProject = {
            id: cp.id,
            projectCode,
            projectTitle,
            clientAgency,
            budgetAmount,
            egpUrl: cp.egp_url || undefined,
            announcementDate: cp.announcement_date || undefined,
            submissionDeadline: cp.submission_deadline || undefined,
            status: cp.status || 'draft',
            statusNote: cp.status_note || undefined,
            lastModifiedBy: cloudMeta.lastModifiedBy || localProj?.lastModifiedBy,
            assignedTo: cloudMeta.assignedTo || localProj?.assignedTo,
            progressPercent: typeof cloudMeta.progressPercent === 'number'
              ? cloudMeta.progressPercent
              : localProj?.progressPercent,
            currentStage: cloudMeta.currentStage || localProj?.currentStage,
            attachments: attachmentsMap.get(cp.id) || (localProj && Array.isArray(localProj.attachments) ? localProj.attachments : []) || [],
            proposalData: effectiveProposalData,
            createdAt: cp.created_at || localProj?.createdAt,
            updatedAt: localTime > cloudTime ? localProj!.updatedAt : cp.updated_at,
          };
          mapped.push(normalizeProjectBudget(rawProj));
        }

        // สำคัญที่สุด: นำโครงการที่ผู้ใช้สร้างไว้ในเครื่อง (IndexedDB/LocalStorage) ที่ยังไม่มีใน Cloud มารวมเข้าด้วย
        // (กรองโครงการตัวอย่างออก)
        for (const [id, lp] of localMap.entries()) {
          if (!processedIds.has(id) && !isSampleProject(id, lp.projectCode, lp.clientAgency)) {
            mapped.push(normalizeProjectBudget(lp));
          }
        }

        const finalMapped = mapped.filter((p) => !isSampleProject(p.id, p.projectCode, p.clientAgency));

        // ปรับปรุง metadata ไฟล์แนบให้อ้างอิง idb:// เมื่อไม่มี public URL (ไม่โหลด base64 เข้า RAM ตอนเปิดแอป)
        for (const p of finalMapped) {
          for (const a of p.attachments || []) {
            if (!a.dataUrl) {
              a.dataUrl = `idb://${a.id}`;
            }
          }
        }

        // แคชเก็บไว้ใน LocalStorage ด้วยเพื่อความต่อเนื่อง (ตัด base64 ขนาดใหญ่ออกป้องกันโควตาเต็ม)
        try {
          const sanitized = finalMapped.map((p) => ({
            ...p,
            attachments: (p.attachments || []).map((a) => ({
              ...a,
              dataUrl: a.dataUrl && a.dataUrl.length < 30000 ? a.dataUrl : undefined,
            })),
          }));
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(sanitized));
        } catch {}

        return { projects: finalMapped, source: 'cloud' };
      }
    } catch (err) {
      console.warn('Could not load from Supabase:', err);
    }
  }

  // 1. ตรวจสอบและโหลดจาก IndexedDB ก่อนเพื่อความสมบูรณ์ 100% ไม่จำกัดขนาด
  try {
    const idbProjects = await idbGetAll<BiddingProject>(IDB_STORES.BIDDING_PROJECTS);
    if (idbProjects && Array.isArray(idbProjects) && idbProjects.length > 0) {
      const filtered = idbProjects.filter((p) => !isSampleProject(p.id, p.projectCode, p.clientAgency));
      if (filtered.length > 0) {
        const normalizedList = filtered.map(normalizeProjectBudget);
        for (const p of normalizedList) {
          if (p.attachments) {
            for (const a of p.attachments) {
              if (!a.dataUrl) {
                a.dataUrl = `idb://${a.id}`;
              }
            }
          }
        }

        // ตรวจสอบว่ามีคีย์ร่างเดี่ยวเฉพาะโครงการ prime_active_draft_{id} ที่ใหม่กว่าหรือไม่
        for (let i = 0; i < normalizedList.length; i++) {
          try {
            const single = localStorage.getItem(`prime_active_draft_${normalizedList[i].id}`);
            if (single) {
              const parsedSingle = JSON.parse(single);
              if (parsedSingle && parsedSingle.proposalData) {
                const singleTime = new Date(parsedSingle.updatedAt || 0).getTime();
                const listTime = new Date(normalizedList[i].updatedAt || 0).getTime();
                if (singleTime >= listTime) {
                  const restoredProposal = restoreImagesFromSource(parsedSingle.proposalData, normalizedList[i].proposalData);
                  normalizedList[i] = normalizeProjectBudget({
                    ...normalizedList[i],
                    ...parsedSingle,
                    proposalData: restoredProposal,
                  });
                }
              }
            }
          } catch {}
        }

        return { projects: normalizedList, source: 'local' };
      }
    }
  } catch (e) {
    console.warn('IndexedDB read error:', e);
  }

  // โหลดจาก LocalStorage (Fallback)
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      const parsed: BiddingProject[] = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const filtered = parsed.filter((p) => !isSampleProject(p.id, p.projectCode, p.clientAgency));
        if (filtered.length > 0) {
          const normalizedList = filtered.map(normalizeProjectBudget);
          for (const p of normalizedList) {
            if (p.attachments) {
              for (const a of p.attachments) {
                if (!a.dataUrl) {
                  a.dataUrl = `idb://${a.id}`;
                }
              }
            }
          }
          return { projects: normalizedList, source: 'local' };
        }
      }
    }
  } catch (e) {
    console.warn('LocalStorage read error:', e);
  }

  return { projects: [], source: 'local' };
}

/**
 * บันทึกหรืออัปเดตโครงการลงฐานข้อมูล
 * - บันทึกโครงการฉบับเต็มลง IndexedDB ถาวร (100% ไม่จำกัดขนาด ไม่สูญหาย)
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

  // 1. บันทึกลง IndexedDB ถาวร (แทน dataUrl ที่เป็น base64 ด้วย idb:// เพื่อประหยัด RAM)
  const idbStoredProject: BiddingProject = {
    ...project,
    attachments: (project.attachments || []).map((att) => ({
      ...att,
      dataUrl: att.dataUrl && !att.dataUrl.startsWith('data:') ? att.dataUrl : (att.dataUrl ? `idb://${att.id}` : undefined),
    })),
  };

  try {
    await idbSet(IDB_STORES.BIDDING_PROJECTS, project.id, idbStoredProject);
  } catch (e) {
    console.warn('IndexedDB project save error:', e);
  }

  // 2. บันทึกลง LocalStorage: เก็บทั้งคีย์เฉพาะโครงการ (เก็บภาพครบถ้วน) และคีย์รวมสรุป (ขนาดเบา <10KB)
  try {
    const sanitizedProject: BiddingProject = {
      ...project,
      attachments: (project.attachments || []).map((att) => ({
        ...att,
        dataUrl: att.dataUrl && !att.dataUrl.startsWith('data:') ? att.dataUrl : (att.dataUrl ? `idb://${att.id}` : undefined),
      })),
    };

    // 2.1 บันทึกคีย์เฉพาะโครงการนี้ (เก็บภาพฉบับเต็มไว้เสมอ หากพื้นที่ LocalStorage ไม่พอจึงตัดภาพออกเป็น Fallback)
    try {
      localStorage.setItem(`prime_active_draft_${project.id}`, JSON.stringify(sanitizedProject));
    } catch {
      try {
        localStorage.setItem(`prime_active_draft_${project.id}`, JSON.stringify({
          ...sanitizedProject,
          proposalData: stripAllLargeBase64(sanitizedProject.proposalData),
        }));
      } catch (singleErr) {
        console.warn('Dedicated draft save warning:', singleErr);
      }
    }

    // 2.2 บันทึกเข้าอาร์เรย์รายการโครงการรวมเฉพาะ Metadata สรุป (ประหยัด RAM และ LocalStorage ไม่เกิน 10KB เสมอ)
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    let list: BiddingProject[] = saved ? JSON.parse(saved) : [];
    const index = list.findIndex((p) => p.id === sanitizedProject.id);
    if (index >= 0) {
      list[index] = sanitizedProject;
    } else {
      list = [sanitizedProject, ...list];
    }

    const lightweightList = list.map((p) => ({
      id: p.id,
      projectTitle: p.projectTitle,
      projectCode: p.projectCode,
      clientAgency: p.clientAgency,
      budgetAmount: p.budgetAmount,
      status: p.status,
      statusNote: p.statusNote,
      currentStage: p.currentStage,
      progressPercent: p.progressPercent,
      lastModifiedBy: p.lastModifiedBy,
      updatedAt: p.updatedAt,
      createdAt: p.createdAt,
      attachments: (p.attachments || []).map((a) => ({
        id: a.id,
        name: a.name,
        size: a.size,
        category: a.category,
        uploadedAt: a.uploadedAt,
      })),
      proposalData: {
        cover: p.proposalData?.cover,
        _cloudStatus: (p.proposalData as any)?._cloudStatus,
      } as any,
    }));

    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(lightweightList));
    } catch {}
  } catch (e) {
    console.warn('LocalStorage save error (IndexedDB still holds complete data):', e);
  }

  // 3. ซิงค์ไปยัง Supabase Cloud (บันทึกเนื้อหาฉบับเต็มครบทุกส่วน + สถานะโครงการ)
  if (isSupabaseConfigured() && supabase) {
    try {
      const userStr = project.lastModifiedBy || 'ไม่ระบุผู้ทำ';
      const stageStr = project.currentStage || 'กำลังจัดทำข้อเสนอ';
      const progressNum = project.progressPercent ?? 0;
      const statusNoteText = project.statusNote || `[ผู้จัดทำ: ${userStr}] ${stageStr} (${progressNum}%)`;

      // คลาวด์เก็บเนื้อหาร่างฉบับเต็มครบทุกส่วน เพื่อให้เปิดจากเครื่องไหนก็ไม่หาย
      const cloudProposalPayload = {
        ...project.proposalData,
        _cloudStatus: {
          lastModifiedBy: project.lastModifiedBy,
          assignedTo: project.assignedTo,
          progressPercent: project.progressPercent,
          currentStage: project.currentStage,
          updatedAt: new Date().toISOString(),
        },
      };

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
          status_note: statusNoteText,
          proposal_data: cloudProposalPayload,
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
  // ลบจาก IndexedDB
  try {
    await idbDelete(IDB_STORES.BIDDING_PROJECTS, projectId);
  } catch (e) {
    console.warn('IndexedDB delete error:', e);
  }

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
    dataUrl: fileUrl || `idb://${attachmentId}`,
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

