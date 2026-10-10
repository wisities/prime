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
