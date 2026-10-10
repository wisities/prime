import { TorScopeItem } from '../types/proposal';

/**
 * Extracts raw text from a Microsoft Word (.docx) file using mammoth
 */
export async function readDocxFile(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const mammoth = await import('mammoth');
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value || '';
}

/**
 * Extracts raw text from a PDF (.pdf) file using pdfjs-dist
 */
export async function readPdfFile(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdfjsLib = await import('pdfjs-dist');
  
  if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '4.0.379'}/pdf.worker.min.mjs`;
  }

  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  let fullText = '';

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map((item: any) => item.str).join(' ');
    fullText += `--- หน้าที่ ${i} ---\n${pageText}\n\n`;
  }

  return fullText;
}

/**
 * Parses raw text using Thai government TOR regex patterns
 * to identify hierarchical clauses up to Level 5.
 */
export function parseTorTextRules(rawText: string): TorScopeItem[] {
  const items: TorScopeItem[] = [];
  const lines = rawText.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);

  // Pattern matches: "ข้อ 4", "ข้อ 4.1", "ข้อ 4.1.1", "4.1", "4.1.2.3.1"
  const clauseRegex = /^(?:ข้อ\s*)?(\d+(?:\.\d+){0,4})\s*(?:[:.-]|\s+)\s*(.+)$/i;

  let currentItem: Partial<TorScopeItem> | null = null;
  let bufferText: string[] = [];

  const flushCurrentItem = () => {
    if (currentItem && currentItem.clauseNumber) {
      const fullText = bufferText.join(' ').trim() || currentItem.title || 'รายละเอียดตามประกาศขอบเขตงานของหน่วยงาน';
      items.push({
        id: `scope-imported-${Date.now()}-${items.length}`,
        clauseNumber: currentItem.clauseNumber,
        title: fullText,
        requirement: fullText,
        level: Math.min(5, Math.max(1, currentItem.level || 1)),
        startMonth: 1,
        startWeek: 1,
        durationDays: 30,
        durationWeeks: 4,
        responsibleRole: 'ทีมงานผู้เชี่ยวชาญ',
        proposedMethodology: '',
        toolsAndTechnology: '',
        deliverable: '',
      });
      bufferText = [];
    }
  };

  for (const line of lines) {
    const match = line.match(clauseRegex);
    if (match) {
      flushCurrentItem();

      const numStr = match[1];
      const rest = match[2];

      // Calculate level based on number of dots
      const dotCount = (numStr.match(/\./g) || []).length;
      const level = Math.min(5, dotCount + 1);

      currentItem = {
        clauseNumber: `ข้อ ${numStr}`,
        title: rest.substring(0, 80),
        level,
      };

      if (rest.length > 80) {
        bufferText.push(rest.substring(80));
      }
    } else {
      if (currentItem) {
        bufferText.push(line);
      }
    }
  }

  flushCurrentItem();

  // If regex found fewer than 2 items, create a structured fallback from chunks
  if (items.length < 2) {
    const paragraphs = rawText.split(/\n\s*\n/).filter((p) => p.trim().length > 30);
    return paragraphs.slice(0, 10).map((p, idx) => {
      const firstSentence = p.split(/[.!?\n]/)[0].substring(0, 60);
      return {
        id: `scope-imported-${Date.now()}-${idx}`,
        clauseNumber: `ข้อ 4.${idx + 1}`,
        title: firstSentence || `หัวข้อขอบเขตงานลำดับที่ ${idx + 1}`,
        requirement: p.trim(),
        level: idx === 0 ? 1 : 2,
        startMonth: 1,
        startWeek: 1,
        durationDays: 30,
        durationWeeks: 4,
        responsibleRole: 'ทีมงานผู้เชี่ยวชาญ',
        proposedMethodology: '',
        toolsAndTechnology: '',
        deliverable: '',
      };
    });
  }

  return items;
}

/**
 * AI-assisted TOR structuring using Google Gemini API
 */
export async function parseTorTextWithGemini(
  rawText: string,
  apiKey: string
): Promise<TorScopeItem[]> {
  if (!apiKey) {
    throw new Error('กรุณาระบุ Gemini API Key สำหรับการประมวลผลด้วย AI');
  }

  const prompt = `
คุณคือผู้เชี่ยวชาญการวิเคราะห์เอกสารขอบเขตงาน (TOR) โครงการจัดซื้อจัดจ้างภาครัฐของประเทศไทย
โปรดอ่านข้อความ TOR ด้านล่างนี้ และสกัดเฉพาะหัวข้อ "ขอบเขตการดำเนินงาน (Scope of Work)" 
จำแนกโครงสร้างข้อหลักและข้อย่อยตั้งแต่ระดับ 1 ถึง 5 (Level 1 ถึง Level 5) 

กฎการสกัด:
1. Level 1: ข้อหลัก (เช่น ข้อ 4. ขอบเขตงาน หรือ ข้อ 1.)
2. Level 2: ข้อย่อยระดับ 1 (เช่น ข้อ 4.1)
3. Level 3: ข้อย่อยระดับ 2 (เช่น ข้อ 4.1.1)
4. Level 4: ข้อย่อยระดับ 3 (เช่น ข้อ 4.1.1.1)
5. Level 5: ข้อย่อยระดับ 4 (เช่น ข้อ 4.1.1.1.1)
6. สกัด "clauseNumber" (เช่น "ข้อ 4.1"), "title" (ชื่อหัวข้อสั้นกระชับ), "requirement" (รายละเอียดข้อกำหนดของหน่วยงาน), และ "estimatedDays" (จำนวนวันที่เหมาะสมในการทำงานข้อนั้น)

ข้อความ TOR:
${rawText.substring(0, 30000)}

โปรดตอบกลับในรูปแบบ JSON Array เท่านั้น ตามโครงสร้างนี้:
[
  {
    "clauseNumber": "ข้อ 4.1",
    "title": "ชื่อหัวข้อ",
    "requirement": "รายละเอียดข้อกำหนดทั้งหมดตาม TOR",
    "level": 2,
    "estimatedDays": 30
  }
]
`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
      },
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || `API error ${response.status}`);
  }

  const result = await response.json();
  const text = result?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) return [];

  const parsed = JSON.parse(text);
  return parsed.map((item: any, idx: number) => ({
    id: `scope-ai-${Date.now()}-${idx}`,
    clauseNumber: item.clauseNumber
      ? (item.clauseNumber.startsWith('ข้อ') ? item.clauseNumber : `ข้อ ${item.clauseNumber}`)
      : `ข้อ 4.${idx + 1}`,
    title: item.requirement || item.title || 'ขอบเขตงานตาม TOR',
    requirement: item.requirement || item.title || 'ขอบเขตงานตาม TOR',
    level: Math.min(5, Math.max(1, item.level || 2)),
    startMonth: Math.min(6, Math.max(1, Math.ceil((idx + 1) / 3))),
    startWeek: ((idx % 4) + 1),
    durationDays: item.estimatedDays || 30,
    durationWeeks: Math.max(1, Math.round((item.estimatedDays || 30) / 7)),
    responsibleRole: 'ทีมงานผู้เชี่ยวชาญ',
    proposedMethodology: '',
    toolsAndTechnology: '',
    deliverable: '',
  }));
}

export interface ExtractedProjectMetadata {
  projectCode?: string;
  projectTitle?: string;
  clientAgency?: string;
  budgetAmount?: number;
  announcementDate?: string;
  submissionDeadline?: string;
  egpUrl?: string;
  confidenceScore?: number;
}

const THAI_MONTHS: Record<string, string> = {
  'มกราคม': '01', 'ม.ค.': '01',
  'กุมภาพันธ์': '02', 'ก.พ.': '02',
  'มีนาคม': '03', 'มี.ค.': '03',
  'เมษายน': '04', 'เม.ย.': '04',
  'พฤษภาคม': '05', 'พ.ค.': '05',
  'มิถุนายน': '06', 'มิ.ย.': '06',
  'กรกฎาคม': '07', 'ก.ค.': '07',
  'สิงหาคม': '08', 'ส.ค.': '08',
  'กันยายน': '09', 'ก.ย.': '09',
  'ตุลาคม': '10', 'ต.ค.': '10',
  'พฤศจิกายน': '11', 'พ.ย.': '11',
  'ธันวาคม': '12', 'ธ.ค.': '12',
};

function formatThaiDateToIso(dayStr: string, monthStr: string, yearStr: string): string | null {
  const day = parseInt(dayStr, 10);
  const month = THAI_MONTHS[monthStr.trim()];
  let year = parseInt(yearStr, 10);
  if (!month || isNaN(day) || isNaN(year)) return null;
  if (year > 2400) year -= 543;
  return `${year}-${month}-${String(day).padStart(2, '0')}`;
}

/**
 * Extracts key metadata (projectCode, title, agency, budget, dates)
 * from raw text of Thai government procurement announcements / TORs.
 */
export function extractProjectMetadataFromText(rawText: string): ExtractedProjectMetadata {
  const result: ExtractedProjectMetadata = {};
  const cleanText = rawText.replace(/\r/g, '');
  const lines = cleanText.split('\n').map((l) => l.trim()).filter(Boolean);
  const first100Lines = lines.slice(0, 100).join('\n');

  // 1. Project Code (เลขที่โครงการ / รหัสโครงการ / 11-digit e-GP code)
  const codeRegex = /(?:เลขที่โครงการ|รหัสโครงการ|เลขที่ประกาศ|รหัสประกาศ)\s*[:]?\s*([0-9A-Za-z/-]{6,25})/i;
  const codeMatch = cleanText.match(codeRegex);
  if (codeMatch && codeMatch[1]) {
    result.projectCode = codeMatch[1].trim();
  } else {
    // Fallback: 11-digit e-GP code (usually starts with 6x like 67, 68, 69)
    const egp11Match = first100Lines.match(/(?:\b|\D)(6\d{10})(?:\b|\D)/);
    if (egp11Match) {
      result.projectCode = egp11Match[1];
    }
  }

  // 2. Project Title (เรื่อง ประกวดราคา... / โครงการ...)
  const titleRegex = /(?:เรื่อง|โครงการ)\s*(?:[:]\s*)?(?:ประกวดราคา(?:จ้าง|ซื้อ|เช่า)?(?:ด้วยวิธีประกวดราคาอิเล็กทรอนิกส์\s*\(e-bidding\))?|จ้าง|ซื้อ|เช่า)?\s*([^\n\r]{10,250})/i;
  const titleMatch = cleanText.match(titleRegex);
  if (titleMatch && titleMatch[1]) {
    let title = titleMatch[1].trim();
    // Clean trailing boilerplate
    title = title.replace(/\s*(?:ด้วยวิธี|ตามประกาศ|ประจำปีงบประมาณ|วงเงินงบประมาณ).*$/i, '').trim();
    if (title.length > 5) {
      result.projectTitle = title.startsWith('โครงการ') ? title : `โครงการ${title}`;
    }
  }

  // 3. Client Agency (กรม, สำนักงาน, กระทรวง, องค์การ, มหาวิทยาลัย, เทศบาล)
  const agencyRegex = /(?:หน่วยงาน|ผู้ว่าจ้าง|เจ้าของโครงการ)\s*[:]?\s*([^\n\r]{5,100})/i;
  const agencyMatch = cleanText.match(agencyRegex);
  if (agencyMatch && agencyMatch[1]) {
    result.clientAgency = agencyMatch[1].trim();
  } else {
    // Scan early lines for standard government entity names
    for (const line of lines.slice(0, 25)) {
      const match = line.match(/^(?:ประกาศ)?\s*(กรม[^\s]+|สำนักงาน[^\s]+|กระทรวง[^\s]+|มหาวิทยาลัย[^\s]+|องค์การ[^\s]+|เทศบาล[^\s]+|กรุงเทพมหานคร[^\s]*|การประปา[^\s]+|การไฟฟ้า[^\s]+)(?:\s+[^\n\r]+)?$/);
      if (match) {
        result.clientAgency = line.replace(/^ประกาศ\s*/, '').trim();
        break;
      }
    }
  }

  // 4. Budget Amount (วงเงินงบประมาณ / ราคากลาง)
  const budgetRegex = /(?:วงเงินงบประมาณ(?:ที่ได้รับจัดสรร)?|งบประมาณ(?:ที่ได้รับจัดสรร)?|ราคากลาง|วงเงิน)\s*(?:เป็นเงิน|จำนวน)?\s*([0-9,]+(?:\.[0-9]{2})?)\s*บาท/i;
  const budgetMatch = cleanText.match(budgetRegex);
  if (budgetMatch && budgetMatch[1]) {
    const num = parseFloat(budgetMatch[1].replace(/,/g, ''));
    if (!isNaN(num) && num > 0) {
      result.budgetAmount = num;
    }
  }

  // 5. Announcement Date (ประกาศ ณ วันที่ DD Month YYYY)
  const announceDateRegex = /(?:ประกาศ ณ วันที่|ลงวันที่|ประกาศวันที่|วันที่)\s*(\d{1,2})\s+([ก-๙.]+)\s+(?:พ\.ศ\.\s*)?(\d{4})/i;
  const announceMatch = cleanText.match(announceDateRegex);
  if (announceMatch) {
    const isoDate = formatThaiDateToIso(announceMatch[1], announceMatch[2], announceMatch[3]);
    if (isoDate) result.announcementDate = isoDate;
  }

  // 6. Submission Deadline (ยื่นข้อเสนอในวันที่ DD Month YYYY ระหว่างเวลา HH.mm น. ถึง HH.mm น.)
  const deadlineRegex = /(?:ยื่นข้อเสนอ|เสนอราคา).{0,50}?ในวันที่\s*(\d{1,2})\s+([ก-๙.]+)\s+(?:พ\.ศ\.\s*)?(\d{4})(?:\s*(?:ระหว่างเวลา|เวลา)\s*([0-9.:]+)(?:\s*(?:ถึง|-)\s*([0-9.:]+))?\s*น\.)?/i;
  const deadlineMatch = cleanText.match(deadlineRegex);
  if (deadlineMatch) {
    const isoDate = formatThaiDateToIso(deadlineMatch[1], deadlineMatch[2], deadlineMatch[3]);
    if (isoDate) {
      // Pick end time if range (e.g. 09.00 ถึง 12.00 -> 12:00)
      let timeStr = '12:00';
      const targetTime = deadlineMatch[5] || deadlineMatch[4];
      if (targetTime) {
        const timeClean = targetTime.replace('.', ':');
        const parts = timeClean.split(':');
        if (parts.length >= 2) {
          timeStr = `${parts[0].padStart(2, '0')}:${parts[1].padEnd(2, '0')}`;
        }
      }
      result.submissionDeadline = `${isoDate}T${timeStr}`;
    }
  }

  // 7. e-GP URL if referenced in text
  const urlRegex = /(https?:\/\/(?:process\d\.gprocurement\.go\.th|www\.gprocurement\.go\.th)[^\s'"<>]+)/i;
  const urlMatch = cleanText.match(urlRegex);
  if (urlMatch) {
    result.egpUrl = urlMatch[1];
  }

  return result;
}

/**
 * Reads a PDF or DOCX file, extracts full text, and extracts metadata.
 */
export async function extractProjectMetadataFromFile(
  file: File
): Promise<{ metadata: ExtractedProjectMetadata; rawText: string }> {
  let rawText = '';
  const isPdf = file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf';
  const isDocx = file.name.toLowerCase().endsWith('.docx') || file.type.includes('wordprocessingml');

  if (isPdf) {
    rawText = await readPdfFile(file);
  } else if (isDocx) {
    rawText = await readDocxFile(file);
  } else {
    rawText = await file.text();
  }

  const metadata = extractProjectMetadataFromText(rawText);
  return { metadata, rawText };
}

