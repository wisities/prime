import { TorScopeItem } from '../types/proposal';

const GEMINI_LOCAL_STORAGE_KEY = 'prime_gemini_api_key';
// Primary model: gemini-2.5-flash (fast, high intelligence, cost-effective/free tier)
const GEMINI_MODEL = 'gemini-2.5-flash';

/**
 * Gets the current Gemini API key from localStorage or Vite environment variable.
 */
export function getGeminiApiKey(): string {
  const localKey = localStorage.getItem(GEMINI_LOCAL_STORAGE_KEY);
  if (localKey && localKey.trim()) {
    return localKey.trim();
  }
  const envKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (envKey && typeof envKey === 'string' && envKey.trim()) {
    return envKey.trim();
  }
  return '';
}

/**
 * Checks if a Gemini API key is configured and available.
 */
export function isGeminiAvailable(): boolean {
  return getGeminiApiKey().length > 0;
}

/**
 * Saves the Gemini API key into localStorage.
 */
export function saveGeminiApiKey(key: string): void {
  const trimmed = key.trim();
  if (trimmed) {
    localStorage.setItem(GEMINI_LOCAL_STORAGE_KEY, trimmed);
  } else {
    localStorage.removeItem(GEMINI_LOCAL_STORAGE_KEY);
  }
}

/**
 * Removes the Gemini API key from localStorage.
 */
export function clearGeminiApiKey(): void {
  localStorage.removeItem(GEMINI_LOCAL_STORAGE_KEY);
}

/**
 * Tests connection with Google Gemini API using the provided key.
 */
export async function testGeminiConnection(keyToTest?: string): Promise<{
  success: boolean;
  message: string;
  modelUsed?: string;
}> {
  const key = keyToTest?.trim() || getGeminiApiKey();
  if (!key) {
    return { success: false, message: 'กรุณากรอก Gemini API Key ก่อนทดสอบ' };
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${key}`;

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: 'ทักทายสั้นๆ เป็นภาษาไทย 1 ประโยค ยืนยันว่าระบบเชื่อมต่อสำเร็จ' }],
          },
        ],
      }),
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      const errMsg = errJson?.error?.message || `HTTP ${res.status}: ${res.statusText}`;
      return {
        success: false,
        message: `การเชื่อมต่อล้มเหลว: ${errMsg}`,
      };
    }

    const data = await res.json();
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || 'เชื่อมต่อสำเร็จ';

    return {
      success: true,
      message: `เชื่อมต่อสำเร็จ! AI ตอบกลับ: "${reply}"`,
      modelUsed: GEMINI_MODEL,
    };
  } catch (err: any) {
    return {
      success: false,
      message: `ไม่สามารถส่งคำขอไปยัง Gemini ได้: ${err.message || 'โปรดตรวจสอบการเชื่อมต่ออินเทอร์เน็ต'}`,
    };
  }
}

/**
 * General helper to generate text using Gemini API
 */
export async function generateWithGemini(
  prompt: string,
  systemInstruction?: string,
  jsonMode: boolean = false
): Promise<string> {
  const key = getGeminiApiKey();
  if (!key) {
    throw new Error('ยังไม่ได้ตั้งค่า Gemini API Key กรุณาตั้งค่าที่ปุ่ม AI Gemini ด้านบน');
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${key}`;

  const requestBody: any = {
    contents: [
      {
        parts: [{ text: prompt }],
      },
    ],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 8192,
    },
  };

  if (systemInstruction) {
    requestBody.systemInstruction = {
      parts: [{ text: systemInstruction }],
    };
  }

  if (jsonMode) {
    requestBody.generationConfig.responseMimeType = 'application/json';
  }

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  });

  if (!res.ok) {
    const errJson = await res.json().catch(() => ({}));
    const errMsg = errJson?.error?.message || `HTTP ${res.status}`;
    throw new Error(`Gemini API Error: ${errMsg}`);
  }

  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

/**
 * Parses and extracts hierarchical TOR scope items using Gemini AI.
 * Handles large text intelligently and produces structured JSON.
 */
export async function parseTorWithGemini(rawText: string): Promise<TorScopeItem[]> {
  const systemInstruction = `คุณคือผู้เชี่ยวชาญด้านการวิเคราะห์เอกสารข้อกำหนดและขอบเขตงาน (TOR) สำหรับงานประกวดราคาและข้อเสนอโครงการภาครัฐของไทย
หน้าที่ของคุณคือการอ่านข้อความจากเอกสาร TOR แล้วสกัดเฉพาะ "ข้อกำหนดขอบเขตงาน (Scope of Work / Scope Items)" ให้ออกมาเป็นรายการ JSON Array
ห้ามรวมส่วนที่ไม่ใช่ขอบเขตงาน (เช่น คุณสมบัติผู้ยื่นข้อเสนอ, เอกสารหลักฐาน, ค่าปรับ) เว้นแต่เกี่ยวข้องกับขอบเขตงานโดยตรง`;

  // Truncate to first ~35,000 chars if exceedingly long to fit within token guidelines
  const trimmedText = rawText.length > 35000 ? rawText.substring(0, 35000) + '\n...(ข้อความถูกตัดทอนให้พอดีกับการประมวลผล)...' : rawText;

  const prompt = `กรุณาวิเคราะห์ข้อความ TOR ด้านล่างนี้ และสกัดข้อกำหนดขอบเขตงานให้ออกมาเป็น JSON Array ตามโครงสร้างต่อไปนี้:
[
  {
    "clauseNumber": "ข้อ 1 หรือ ข้อ 1.1 หรือ ข้อ 1.1.1",
    "title": "หัวข้อหรือชื่อกิจกรรมหลัก (สั้น กระชับ)",
    "requirement": "รายละเอียดข้อกำหนดทั้งหมดตาม TOR ของข้อนี้",
    "level": 1 ถึง 5 (1 = หัวข้อหลัก, 2 = ข้อย่อย, 3 = ข้อย่อยระดับ 3),
    "durationDays": จำนวนวันโดยประมาณ (ตัวเลข เช่น 30 หรือ 60),
    "deliverable": "ผลสัมฤทธิ์หรือสิ่งที่ต้องส่งมอบ (ถ้ามีระบุในข้อ)",
    "responsibleRole": "บทบาทผู้รับผิดชอบหลัก เช่น ทีมพัฒนาระบบ, ผู้จัดการโครงการ, วิศวกรข้อมูล",
    "proposedMethodology": "แนวทางปฏิบัติเบื้องต้นที่ตอบโจทย์ข้อนี้"
  }
]

ข้อความเอกสาร TOR:
${trimmedText}`;

  const jsonString = await generateWithGemini(prompt, systemInstruction, true);
  
  try {
    const parsed = JSON.parse(jsonString);
    if (!Array.isArray(parsed)) {
      throw new Error('ผลลัพธ์จาก AI ไม่ใช่รายการ Array');
    }

    return parsed.map((item: any, idx: number) => ({
      id: `scope-ai-${Date.now()}-${idx}`,
      clauseNumber: item.clauseNumber || `ข้อ ${idx + 1}`,
      title: item.title || item.requirement?.substring(0, 80) || `ขอบเขตงานที่ ${idx + 1}`,
      requirement: item.requirement || item.title || '',
      level: Math.min(5, Math.max(1, Number(item.level) || 1)),
      startMonth: 1,
      startWeek: 1,
      durationDays: Number(item.durationDays) || 30,
      durationWeeks: Math.ceil((Number(item.durationDays) || 30) / 7),
      responsibleRole: item.responsibleRole || 'ทีมผู้เชี่ยวชาญ',
      proposedMethodology: item.proposedMethodology || '',
      toolsAndTechnology: '',
      deliverable: item.deliverable || '',
    }));
  } catch (err: any) {
    console.error('Failed to parse Gemini JSON output:', err, jsonString);
    throw new Error(`ไม่สามารถแปลงข้อมูลจาก AI ได้: ${err.message}`);
  }
}

/**
 * AI Proposal Copilot: Drafts Section 1 Background & Objectives
 */
export async function aiDraftSection1(projectTitle: string, clientAgency: string, scopeSummary: string): Promise<{
  background: string;
  objectives: string[];
  expectedBenefits: string[];
}> {
  const systemInstruction = `คุณคือนักเขียนข้อเสนอโครงการมืออาชีพสำหรับงานประกวดราคาภาครัฐของไทย (Thailand Government Proposal Specialist)
ใช้ภาษาทางการ น่าเชื่อถือ สละสลวย ถูกต้องตามแบบแผนราชการ`;

  const prompt = `ช่วยร่างเนื้อหาส่วนที่ 1 สำหรับโครงการ:
ชื่อโครงการ: "${projectTitle}"
หน่วยงานผู้ว่าจ้าง: "${clientAgency}"
สรุปขอบเขตงานเบื้องต้น: "${scopeSummary}"

ให้ตอบกลับเป็น JSON Format เท่านั้น:
{
  "background": "ความเป็นมาและความสำคัญของโครงการ (ประมาณ 2-3 ย่อหน้าอย่างละเอียด เป็นทางการ)",
  "objectives": ["วัตถุประสงค์ข้อที่ 1", "วัตถุประสงค์ข้อที่ 2", "วัตถุประสงค์ข้อที่ 3"],
  "expectedBenefits": ["ประโยชน์ที่คาดว่าจะได้รับข้อที่ 1", "ประโยชน์ที่คาดว่าจะได้รับข้อที่ 2", "ประโยชน์ที่คาดว่าจะได้รับข้อที่ 3"]
}`;

  const jsonString = await generateWithGemini(prompt, systemInstruction, true);
  return JSON.parse(jsonString);
}

/**
 * AI Proposal Copilot: Drafts Section 2 Methodology & Strategy
 */
export async function aiDraftMethodology(projectTitle: string, clientAgency: string, scopeCount: number): Promise<string> {
  const systemInstruction = `คุณคือ Solution Architect และผู้เชี่ยวชาญการวางแผนกลยุทธ์การดำเนินงานโครงการภาครัฐของไทย
เขียนเนื้อหาด้วยภาษาทางการ เชิงวิชาการและแนวปฏิบัติมาตรฐานสากล (Best Practices) เช่น Agile, DevOps, ITIL, CMMI หรือ PMBOK`;

  const prompt = `ช่วยเขียน "ระเบียบวิธีและแนวทางการดำเนินงาน (Methodology & Strategic Approach)" สำหรับโครงการ:
ชื่อโครงการ: "${projectTitle}"
หน่วยงานผู้ว่าจ้าง: "${clientAgency}"
จำนวนข้อกำหนดขอบเขตงาน: ${scopeCount} ข้อ

เนื้อหาควรครอบคลุม:
1. ปรัชญาและแนวคิดหลักในการดำเนินโครงการ (Project Execution Philosophy)
2. กระบวนการทำงานแบบบูรณาการ (Integrated Workflow Framework)
3. มาตรฐานการควบคุมคุณภาพและการส่งมอบงาน (Quality Assurance & Deliverable Governance)
ความยาวประมาณ 3-4 ย่อหน้าอย่างสมบูรณ์`;

  return await generateWithGemini(prompt, systemInstruction, false);
}

/**
 * AI Proposal Copilot: Analyzes and drafts Risk Management Matrix (Section 4)
 */
export async function aiDraftRisks(projectTitle: string, scopeItems: TorScopeItem[]): Promise<Array<{
  riskTitle: string;
  category: string;
  severity: 'low' | 'medium' | 'high';
  likelihood: 'low' | 'medium' | 'high';
  mitigationPlan: string;
  contingencyPlan: string;
}>> {
  const systemInstruction = `คุณคือผู้เชี่ยวชาญด้านการบริหารความเสี่ยงโครงการ (Project Risk Management Specialist ตามมาตรฐาน ISO 31000)`;

  const scopeSnippet = scopeItems.slice(0, 15).map((s) => `- ${s.clauseNumber}: ${s.title}`).join('\n');

  const prompt = `ช่วยประเมินความเสี่ยงและมาตรการป้องกันสำหรับโครงการ "${projectTitle}" จากขอบเขตงานต่อไปนี้:
${scopeSnippet}

กรุณาตอบเป็น JSON Array ของความเสี่ยงสำคัญ 4-6 ด้าน (เช่น ด้านเทคนิค, บุคลากร, การบริหารเวลา, ความปลอดภัยของข้อมูล):
[
  {
    "riskTitle": "ชื่อความเสี่ยงที่อาจเกิดขึ้น",
    "category": "Technical หรือ Schedule หรือ Operational หรือ Resource",
    "severity": "low หรือ medium หรือ high",
    "likelihood": "low หรือ medium หรือ high",
    "mitigationPlan": "มาตรการป้องกันเชิงรุก (Proactive Mitigation)",
    "contingencyPlan": "แผนรองรับกรณีเกิดปัญหาขึ้นจริง (Contingency Action)"
  }
]`;

  const jsonString = await generateWithGemini(prompt, systemInstruction, true);
  return JSON.parse(jsonString);
}
