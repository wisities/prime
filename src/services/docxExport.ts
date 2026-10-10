import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  Header,
  Footer,
  PageNumber,
  ImageRun,
  BorderStyle,
  HeadingLevel,
  PageBreak,
  TableOfContents,
  PageOrientation,
  LineRuleType,
} from 'docx';
import saveAs from 'file-saver';
import { ProposalData } from '../types/proposal';
import { generateGanttChartImage, generateDefaultConceptualDiagram } from '../utils/ganttRenderer';

function base64ToUint8Array(base64: string): Uint8Array {
  const pureBase64 = base64.includes(',') ? base64.split(',')[1] : base64;
  const binaryString = atob(pureBase64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

const FONT_FAMILY = 'TH Sarabun New';
const COLOR_PRIMARY = '0F2744'; // Navy
const COLOR_SECONDARY = '1E3A8A';
const COLOR_TEXT = '1E293B';
const COLOR_MUTED = '64748B';

// Helper for Thai standard body paragraphs (มีย่อหน้า 0.5 นิ้ว / 720 twips, AlignmentType.LEFT ป้องกันตัวอักษรยืด, Line Spacing = Single)
function createBodyParagraphs(
  text: string,
  options?: {
    bold?: boolean;
    size?: number; // half-points (32 = 16pt)
    color?: string;
    align?: (typeof AlignmentType)[keyof typeof AlignmentType];
    firstLineIndent?: number; // default 720 (0.5 inch / 1.27 cm)
    spaceAfter?: number;
    spaceBefore?: number;
    italic?: boolean;
  }
): Paragraph[] {
  if (!text) return [];
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) return [];

  return lines.map((line) => {
    return new Paragraph({
      alignment: options?.align ?? AlignmentType.LEFT,
      indent: {
        firstLine: options?.firstLineIndent ?? 720, // ย่อหน้ามาตรฐาน 0.5 นิ้ว (1.27 ซม.)
      },
      spacing: {
        after: options?.spaceAfter ?? 100,
        before: options?.spaceBefore ?? 0,
        line: 240, // Line Spacing = Single (240 twips)
        lineRule: LineRuleType.AUTO,
      },
      children: [
        new TextRun({
          text: line,
          font: FONT_FAMILY,
          size: options?.size ?? 32, // 16pt (TH Sarabun New)
          bold: options?.bold ?? false,
          italics: options?.italic ?? false,
          color: options?.color ?? COLOR_TEXT,
        }),
      ],
    });
  });
}

// Helper for Thai standard paragraph (lists, metadata, single lines)
function createP(
  text: string,
  options?: {
    bold?: boolean;
    size?: number; // half-points (32 = 16pt)
    color?: string;
    align?: (typeof AlignmentType)[keyof typeof AlignmentType];
    spaceAfter?: number;
    spaceBefore?: number;
    italic?: boolean;
    indentLeft?: number;
    firstLineIndent?: number;
  }
): Paragraph {
  return new Paragraph({
    alignment: options?.align || AlignmentType.LEFT,
    indent: {
      left: options?.indentLeft,
      firstLine: options?.firstLineIndent,
    },
    spacing: {
      after: options?.spaceAfter ?? 80,
      before: options?.spaceBefore ?? 0,
      line: 240, // Line Spacing = Single (240 twips)
      lineRule: LineRuleType.AUTO,
    },
    children: [
      new TextRun({
        text,
        font: FONT_FAMILY,
        size: options?.size ?? 32, // 16pt
        bold: options?.bold ?? false,
        italics: options?.italic ?? false,
        color: options?.color ?? COLOR_TEXT,
      }),
    ],
  });
}

function createSectionHeader(
  sectionNum: string,
  sectionTitle: string,
  pageBreakBefore: boolean = false
): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    alignment: AlignmentType.CENTER,
    pageBreakBefore,
    spacing: { before: 260, after: 180, line: 240, lineRule: LineRuleType.AUTO },
    children: [
      new TextRun({
        text: sectionNum,
        font: FONT_FAMILY,
        size: 40, // 20pt
        bold: true,
        color: COLOR_PRIMARY,
      }),
      new TextRun({
        text: sectionTitle,
        font: FONT_FAMILY,
        size: 40, // 20pt
        bold: true,
        color: COLOR_PRIMARY,
        break: 1, // Shift+Enter to next line
      }),
    ],
  });
}

function formatTorClauseNumber(clause: string): string {
  const trimmed = (clause || '').trim();
  if (!trimmed) return 'ข้อ ';
  if (trimmed.startsWith('ข้อ')) return trimmed;
  return `ข้อ ${trimmed}`;
}

function createH1(title: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 240, after: 140, line: 240, lineRule: LineRuleType.AUTO },
    children: [
      new TextRun({
        text: title,
        font: FONT_FAMILY,
        size: 38, // 19pt
        bold: true,
        color: COLOR_PRIMARY,
      }),
    ],
  });
}

function createH2(title: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 180, after: 100, line: 240, lineRule: LineRuleType.AUTO },
    children: [
      new TextRun({
        text: title,
        font: FONT_FAMILY,
        size: 34, // 17pt
        bold: true,
        color: COLOR_SECONDARY,
      }),
    ],
  });
}

function createHeaderCell(text: string, widthPercent: number): TableCell {
  return new TableCell({
    width: { size: widthPercent, type: WidthType.PERCENTAGE },
    shading: { fill: '0F2744' },
    margins: { top: 120, bottom: 120, left: 140, right: 140 },
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { line: 240, lineRule: LineRuleType.AUTO },
        children: [
          new TextRun({
            text,
            font: FONT_FAMILY,
            size: 28, // 14pt
            bold: true,
            color: 'FFFFFF',
          }),
        ],
      }),
    ],
  });
}

function createDataCell(
  text: string,
  widthPercent: number,
  options?: { align?: (typeof AlignmentType)[keyof typeof AlignmentType]; bold?: boolean; bg?: string }
): TableCell {
  const lines = (text || '').split(/\r?\n/);
  const paraChildren = lines.map((l, idx) => {
    return new Paragraph({
      alignment: options?.align || AlignmentType.LEFT,
      spacing: {
        after: idx === lines.length - 1 ? 0 : 40,
        before: 0,
        line: 240,
        lineRule: LineRuleType.AUTO,
      },
      children: [
        new TextRun({
          text: l,
          font: FONT_FAMILY,
          size: 28, // 14pt
          bold: options?.bold ?? false,
          color: COLOR_TEXT,
        }),
      ],
    });
  });

  return new TableCell({
    width: { size: widthPercent, type: WidthType.PERCENTAGE },
    shading: options?.bg ? { fill: options.bg } : undefined,
    margins: { top: 100, bottom: 100, left: 140, right: 140 },
    children: paraChildren.length > 0 ? paraChildren : [new Paragraph({ children: [] })],
  });
}

function createHeaderRow(cells: TableCell[]): TableRow {
  return new TableRow({
    tableHeader: true, // Repeat header row across pages in Word
    cantSplit: true,
    children: cells,
  });
}

function createDataRow(cells: TableCell[]): TableRow {
  return new TableRow({
    cantSplit: true, // Prevent row from splitting across page breaks
    children: cells,
  });
}

function renderMethodologyParagraphsAndTables(text: string): (Paragraph | Table)[] {
  const result: (Paragraph | Table)[] = [];
  const lines = (text || 'บริษัทฯ มุ่งมั่นปฏิบัติงานตามมาตรฐานสากลและส่งมอบตามเกณฑ์ที่กำหนด')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // ตรวจสอบว่าเป็นตาราง Markdown หรือไม่ (ขึ้นต้นและลงท้ายด้วย |)
    if (line.startsWith('|') && line.endsWith('|')) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].startsWith('|') && lines[i].endsWith('|')) {
        tableLines.push(lines[i]);
        i++;
      }

      // กรองเส้นแบ่ง header |---|---| ออก (ถ้ามี)
      const contentRows = tableLines.filter((tl) => !/^\|[\s\-:|]+\|$/.test(tl));
      if (contentRows.length > 0) {
        const parsedRows = contentRows.map((rowStr) =>
          rowStr
            .split('|')
            .slice(1, -1)
            .map((c) => c.trim())
        );

        const colCount = Math.max(...parsedRows.map((r) => r.length), 1);

        // ตรวจสอบว่าคอลัมน์แรกเป็นคอลัมน์ลำดับหรือไม่ ("ลำดับ", "ขั้นตอน", "ที่", "ข้อ", "#", "No." หรือตัวเลขสั้นๆ)
        const firstColHeader = (parsedRows[0]?.[0] || '').trim();
        const isSequenceCol =
          /^(ลำดับ|ขั้นตอน|ที่|ข้อ|ลำดับที่|no\.?|#|order|item|seq)$/i.test(firstColHeader) ||
          (parsedRows.length > 1 && parsedRows.slice(1).every((r) => !r[0] || r[0].length <= 4));

        const colWidths: number[] = [];
        if (isSequenceCol && colCount > 1) {
          // กำหนดความกว้างคอลัมน์ลำดับให้พอดีกับเนื้อหา (10% สำหรับ 2-3 คอลัมน์, 8% สำหรับ 4+ คอลัมน์)
          const firstWidth = colCount >= 4 ? 8 : 10;
          colWidths.push(firstWidth);
          const remainingWidth = 100 - firstWidth;
          const otherColWidth = Math.floor(remainingWidth / (colCount - 1));
          for (let c = 1; c < colCount; c++) {
            if (c === colCount - 1) {
              colWidths.push(100 - colWidths.reduce((a, b) => a + b, 0));
            } else {
              colWidths.push(otherColWidth);
            }
          }
        } else {
          const equalWidth = Math.floor(100 / colCount);
          for (let c = 0; c < colCount; c++) {
            if (c === colCount - 1) {
              colWidths.push(100 - colWidths.reduce((a, b) => a + b, 0));
            } else {
              colWidths.push(equalWidth);
            }
          }
        }

        const docxRows: TableRow[] = [];
        parsedRows.forEach((rowCells, rIdx) => {
          // แถวแรกของตารางเป็น Header Row เสมอ (สีเข้ม 0F2744 ตัวอักษรสีขาว และ Repeat Header Row ข้ามหน้า)
          const isHeader = rIdx === 0;
          const cells: TableCell[] = [];
          for (let c = 0; c < colCount; c++) {
            const cellText = rowCells[c] || '';
            const width = colWidths[c] || Math.floor(100 / colCount);
            if (isHeader) {
              cells.push(createHeaderCell(cellText, width));
            } else {
              const isSeq = isSequenceCol && c === 0;
              cells.push(
                createDataCell(cellText, width, {
                  align: isSeq ? AlignmentType.CENTER : AlignmentType.LEFT,
                  bold: isSeq,
                })
              );
            }
          }
          if (isHeader) {
            docxRows.push(createHeaderRow(cells));
          } else {
            docxRows.push(createDataRow(cells));
          }
        });

        result.push(
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            margins: { top: 80, bottom: 80 },
            rows: docxRows,
          })
        );
      }
      continue;
    }

    // ตรวจสอบว่าเป็นหัวข้อย่อยหรือบูลเล็ต
    const isBullet = line.startsWith('-') || line.startsWith('•') || line.startsWith('*');
    if (isBullet) {
      const cleanLine = line.replace(/^[-•*]\s*/, '');
      result.push(
        new Paragraph({
          bullet: { level: 0 },
          alignment: AlignmentType.LEFT,
          spacing: { before: 40, after: 40, line: 240, lineRule: LineRuleType.AUTO },
          children: [
            new TextRun({
              text: cleanLine,
              font: FONT_FAMILY,
              size: 32,
            }),
          ],
        })
      );
    } else {
      // ย่อหน้าข้อความพรรณาตามปกติ (มีย่อหน้า AlignmentType.LEFT ป้องกันตัวอักษรยืดผิดปกติ Line Spacing = Single)
      result.push(
        new Paragraph({
          alignment: AlignmentType.LEFT,
          indent: { firstLine: 720 },
          spacing: { before: 40, after: 80, line: 240, lineRule: LineRuleType.AUTO },
          children: [
            new TextRun({
              text: line,
              font: FONT_FAMILY,
              size: 32,
            }),
          ],
        })
      );
    }
    i++;
  }

  return result;
}

export async function exportProposalToDocx(data: ProposalData): Promise<void> {
  const { cover, section1, section2, section3, section4, section5 } = data;

  // Render weekly Gantt chart image as PNG (optimized for Landscape width)
  const ganttImageBase64 = generateGanttChartImage(
    section1.scopeItems || [],
    section1.projectDurationMonths || 6,
    cover.projectTitle
  );

  const conceptualImageBase64 = section3.conceptualDiagramImage || generateDefaultConceptualDiagram();

  // Create Header / Footer generators
  const createCommonHeader = () =>
    new Header({
      children: [
        new Paragraph({
          alignment: AlignmentType.RIGHT,
          children: [
            new TextRun({
              text: `${cover.projectTitle} | บริษัท ไพร์มดิจิทัลคอนซัลแทนท์ จำกัด`,
              font: FONT_FAMILY,
              size: 20,
              color: '94A3B8',
            }),
          ],
        }),
      ],
    });

  const createCommonFooter = () =>
    new Footer({
      children: [
        new Paragraph({
          alignment: AlignmentType.RIGHT,
          children: [
            new TextRun({
              text: 'หน้า ',
              font: FONT_FAMILY,
              size: 22,
              color: '64748B',
            }),
            new TextRun({
              children: [PageNumber.CURRENT],
              font: FONT_FAMILY,
              size: 22,
              color: '64748B',
            }),
            new TextRun({
              text: ' จาก ',
              font: FONT_FAMILY,
              size: 22,
              color: '64748B',
            }),
            new TextRun({
              children: [PageNumber.TOTAL_PAGES],
              font: FONT_FAMILY,
              size: 22,
              color: '64748B',
            }),
          ],
        }),
      ],
    });

  // =========================================================================
  // SECTION 1 (Portrait - แนวตั้ง): หน้าปก, สารบัญ, และ ส่วนที่ 1 บทนำ & ขอบเขตงาน TOR
  // =========================================================================
  const part1Children: (Paragraph | Table | TableOfContents)[] = [];

  // รหัสเอกสาร
  part1Children.push(
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { after: 300, before: 100 },
      children: [
        new TextRun({
          text: `รหัสเอกสาร: ${cover.projectCode || 'PRIME-DOC-001'}`,
          font: FONT_FAMILY,
          size: 26,
          color: COLOR_MUTED,
        }),
      ],
    })
  );

  // Cover image
  if (cover.coverImage) {
    try {
      const coverBytes = base64ToUint8Array(cover.coverImage);
      part1Children.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
          children: [
            new ImageRun({
              data: coverBytes,
              transformation: { width: 550, height: 260 },
            } as any),
          ],
        })
      );
    } catch (e) {
      console.warn('Failed to embed custom cover image', e);
    }
  }

  // Cover Title
  part1Children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: cover.coverImage ? 200 : 700, after: 200 },
      children: [
        new TextRun({
          text: 'เอกสารข้อเสนอด้านเทคนิค',
          font: FONT_FAMILY,
          size: 44, // 22pt
          bold: true,
          color: COLOR_PRIMARY,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 350 },
      children: [
        new TextRun({
          text: cover.projectTitle,
          font: FONT_FAMILY,
          size: 38, // 19pt
          bold: true,
          color: 'B45309', // Amber Accent
        }),
      ],
    })
  );

  // Cover Metadata Table
  const coverMetaTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 8, color: 'CBD5E1' },
      bottom: { style: BorderStyle.SINGLE, size: 8, color: 'CBD5E1' },
      left: { style: BorderStyle.NONE },
      right: { style: BorderStyle.NONE },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: 'F1F5F9' },
      insideVertical: { style: BorderStyle.NONE },
    },
    rows: [
      new TableRow({
        children: [
          createDataCell('หน่วยงานผู้ว่าจ้าง:', 28, { bold: true }),
          createDataCell(`${cover.clientAgency} (${cover.clientDepartment})`, 72),
        ],
      }),
      new TableRow({
        children: [
          createDataCell('เสนอโดย:', 28, { bold: true }),
          createDataCell(`${cover.submitterCompany}\n${cover.submitterSubtext}`, 72, { bold: true }),
        ],
      }),
      new TableRow({
        children: [
          createDataCell('วงเงินงบประมาณ:', 28, { bold: true }),
          createDataCell(cover.budgetFormatted || `${section1.budgetAmount.toLocaleString()} บาท`, 72),
        ],
      }),
      new TableRow({
        children: [
          createDataCell('วันที่ยื่นข้อเสนอ:', 28, { bold: true }),
          createDataCell(cover.submissionDate, 72),
        ],
      }),
    ],
  });

  part1Children.push(coverMetaTable);
  part1Children.push(new Paragraph({ children: [new PageBreak()] }));

  // Table of Contents
  if (cover.includeTOC) {
    part1Children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 200, after: 200 },
        children: [
          new TextRun({
            text: 'สารบัญ (Table of Contents)',
            font: FONT_FAMILY,
            size: 38,
            bold: true,
            color: COLOR_PRIMARY,
          }),
        ],
      }),
      new TableOfContents('สารบัญเนื้อหา', {
        hyperlink: true,
        headingStyleRange: '1-3',
      }),
      new Paragraph({ children: [new PageBreak()] })
    );
  }

  // ส่วนที่ 1: บทนำ
  part1Children.push(
    createSectionHeader('ส่วนที่ 1', 'บทนำ ภาพรวมโครงการ และขอบเขตงานตามประกาศจัดจ้าง', true),
    createH2('1.1 ความเป็นมาและความสำคัญ'),
    ...createBodyParagraphs(section1.background),
    createH2('1.2 วัตถุประสงค์ของโครงการ')
  );

  section1.objectives.forEach((obj, idx) => {
    const cleanObj = obj.replace(/^\(\d+\.\d+\)\s*/, '').replace(/^1\.\d+\.\d+\s*/, '');
    part1Children.push(
      new Paragraph({
        alignment: AlignmentType.LEFT,
        indent: { firstLine: 450 },
        spacing: { after: 60, before: 0, line: 240, lineRule: LineRuleType.AUTO },
        children: [
          new TextRun({
            text: `1.2.${idx + 1} ${cleanObj}`,
            font: FONT_FAMILY,
            size: 32,
            color: COLOR_TEXT,
          }),
        ],
      })
    );
  });

  part1Children.push(createH2('1.3 ประโยชน์ที่คาดว่าจะได้รับ'));
  section1.expectedBenefits.forEach((benefit, idx) => {
    const cleanBenefit = benefit.replace(/^\(\d+\.\d+\)\s*/, '').replace(/^2\.\d+\.\d+\s*/, '').replace(/^1\.\d+\.\d+\s*/, '');
    part1Children.push(
      new Paragraph({
        alignment: AlignmentType.LEFT,
        indent: { firstLine: 450 },
        spacing: { after: 60, before: 0, line: 240, lineRule: LineRuleType.AUTO },
        children: [
          new TextRun({
            text: `1.3.${idx + 1} ${cleanBenefit}`,
            font: FONT_FAMILY,
            size: 32,
            color: COLOR_TEXT,
          }),
        ],
      })
    );
  });

  part1Children.push(
    createH2('1.4 กลุ่มเป้าหมายและกรอบระยะเวลาดำเนินงาน'),
    createP(`กลุ่มเป้าหมายผู้ใช้งาน: ${section1.targetAudience}`, { firstLineIndent: 450, align: AlignmentType.LEFT }),
    createP(`ระยะเวลาดำเนินการรวม: ${section1.projectDurationDays} วัน (${section1.projectDurationMonths} เดือน / ${section1.projectDurationMonths * 4} สัปดาห์)`, { firstLineIndent: 450, align: AlignmentType.LEFT }),
    createP(`วงเงินงบประมาณโครงการ: ${section1.budgetAmount.toLocaleString()} บาท`, { firstLineIndent: 450, align: AlignmentType.LEFT }),
    createH2('1.5 ขอบเขตงานตามประกาศจัดจ้าง'),
    ...createBodyParagraphs(section1.projectScopeOverview)
  );

  // Hierarchical Scope items (Level 1 to 5)
  (section1.scopeItems || []).forEach((item) => {
    const isLevel1 = item.level === 1;
    const indentLeft = (item.level - 1) * 720;
    const torText = (item.requirement || item.title || '').trim();

    part1Children.push(
      new Paragraph({
        alignment: AlignmentType.LEFT,
        indent: isLevel1 ? undefined : { left: indentLeft, firstLine: 720 },
        spacing: { before: isLevel1 ? 120 : 60, after: 60, line: 240, lineRule: LineRuleType.AUTO },
        children: [
          new TextRun({
            text: `${formatTorClauseNumber(item.clauseNumber)} `,
            font: FONT_FAMILY,
            size: isLevel1 ? 30 : 28,
            bold: true,
            color: isLevel1 ? COLOR_PRIMARY : COLOR_SECONDARY,
          }),
          new TextRun({
            text: torText,
            font: FONT_FAMILY,
            size: isLevel1 ? 30 : 28,
            bold: isLevel1,
            color: COLOR_TEXT,
          }),
        ],
      })
    );
  });

  // =========================================================================
  // SECTION 2 (LANDSCAPE - แนวนอน): 2.1 แผนภูมิแกนต์ Gantt Chart & งวดงาน
  // =========================================================================
  const part2Children: (Paragraph | Table)[] = [];

  part2Children.push(
    createSectionHeader('ส่วนที่ 2', 'แผนการดำเนินงานตลอดโครงการ (Work Plan & Weekly Gantt Chart)'),
    ...createBodyParagraphs(section2.workPlanOverview),
    createH2('2.1 แผนภูมิแกนต์ (Gantt Chart) แสดงการปฏิบัติงานรายสัปดาห์ตลอดโครงการ')
  );

  // Embed Weekly Gantt Chart Image in Landscape (width: 850px for wide A4 page)
  try {
    const ganttBytes = base64ToUint8Array(ganttImageBase64);
    part2Children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 140, after: 180 },
        children: [
          new ImageRun({
            data: ganttBytes,
            transformation: { width: 850, height: Math.min(460, 110 + (section1.scopeItems || []).length * 28) },
          } as any),
        ],
      })
    );
  } catch (e) {
    console.error('Failed to embed Gantt chart in landscape', e);
  }

  // Task Timeline Table in Landscape
  part2Children.push(
    createH2('2.2 ตารางกำหนดช่วงเวลาการทำงานตามขอบเขตงาน TOR (รายสัปดาห์และจำนวนวัน)')
  );

  const taskRows = [
    createHeaderRow([
      createHeaderCell('ระดับ / ข้อกำหนด TOR', 42),
      createHeaderCell('ช่วงเวลาเริ่มต้น', 18),
      createHeaderCell('ระยะเวลาทำงาน', 16),
      createHeaderCell('ผู้รับผิดชอบหลัก', 24),
    ]),
  ];

  (section1.scopeItems || []).forEach((item) => {
    taskRows.push(
      createDataRow([
        createDataCell(`${formatTorClauseNumber(item.clauseNumber)} ${item.title}`, 42, { bold: item.level === 1 }),
        createDataCell(`เดือนที่ ${item.startMonth} (สัปดาห์ W${item.startWeek})`, 18, { align: AlignmentType.CENTER }),
        createDataCell(`${item.durationDays} วัน (~${Math.max(1, Math.round(item.durationDays / 7))} วีค)`, 16, { align: AlignmentType.CENTER, bold: true }),
        createDataCell(item.responsibleRole || '-', 24),
      ])
    );
  });

  part2Children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: taskRows,
    })
  );

  // Milestones table in Landscape
  part2Children.push(
    createH2('2.3 แผนการส่งมอบงานและการเบิกจ่ายเงิน (Milestones & Deliverables)')
  );

  const milestoneRows = [
    createHeaderRow([
      createHeaderCell('งวดงาน', 12),
      createHeaderCell('ชื่อและขอบเขตงวดงาน', 32),
      createHeaderCell('ระยะเวลาส่งมอบ', 20),
      createHeaderCell('ร้อยละ / วงเงิน', 16),
      createHeaderCell('เอกสารและผลงานที่ส่งมอบ', 20),
    ]),
  ];

  section2.milestones.forEach((m) => {
    milestoneRows.push(
      createDataRow([
        createDataCell(`งวดที่ ${m.installment}`, 12, { align: AlignmentType.CENTER, bold: true }),
        createDataCell(m.title, 32),
        createDataCell(m.timeframe, 20),
        createDataCell(`${m.percentage}%\n(${m.amount.toLocaleString()} บาท)`, 16, { align: AlignmentType.RIGHT, bold: true }),
        createDataCell(m.deliverables.join('\n• '), 20),
      ])
    );
  });

  part2Children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: milestoneRows,
    })
  );

  // =========================================================================
  // SECTION 3 (Portrait - แนวตั้ง): ส่วนที่ 3 ตอบ TOR, ส่วนที่ 4 ทีมงาน, ส่วนที่ 5 บริษัท & ปกหลัง
  // =========================================================================
  const part3Children: (Paragraph | Table)[] = [];

  part3Children.push(
    createSectionHeader('ส่วนที่ 3', 'กรอบแนวคิดและวิธีการดำเนินงานตามข้อกำหนด (TOR Mapping)', true),
    createH2('3.1 แผนภาพกรอบแนวคิดการดำเนินงาน (Conceptual Framework Diagram)'),
    ...createBodyParagraphs(section3.frameworkOverview)
  );

  try {
    const conceptualBytes = base64ToUint8Array(conceptualImageBase64);
    part3Children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 140, after: 80 },
        children: [
          new ImageRun({
            data: conceptualBytes,
            transformation: { width: 620, height: 300 },
          } as any),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
        children: [
          new TextRun({
            text: section3.conceptualDiagramCaption,
            font: FONT_FAMILY,
            size: 26,
            italics: true,
            color: COLOR_MUTED,
          }),
        ],
      })
    );
  } catch (e) {
    console.error('Failed to embed conceptual diagram', e);
  }

  part3Children.push(
    createH2('3.2 วิธีการดำเนินงาน')
  );

  (section1.scopeItems || []).forEach((item, idx) => {
    part3Children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        spacing: { before: 200, after: 100, line: 240, lineRule: LineRuleType.AUTO },
        children: [
          new TextRun({
            text: `3.2.${idx + 1} ${formatTorClauseNumber(item.clauseNumber)}: ${item.title}`,
            font: FONT_FAMILY,
            size: 32,
            bold: true,
            color: COLOR_PRIMARY,
          }),
        ],
      })
    );

    // เนื้อหาคำอธิบายพรรณาวิธีการดำเนินงาน, บูลเล็ตพ้อยต์, หรือตารางขั้นตอนการทำงาน
    part3Children.push(
      ...renderMethodologyParagraphsAndTables(item.proposedMethodology)
    );

    // แบบที่ 1: ภาพอธิบายการทำงาน 1 รูป กว้าง 6 นิ้ว (576 px) จัดกึ่งกลาง
    const showSingle =
      (item.imageLayout === 'single_centered' || item.imageLayout === 'both') &&
      Boolean(item.singleImage?.url);

    if (showSingle && item.singleImage?.url) {
      try {
        const imgBytes = base64ToUint8Array(item.singleImage.url);
        part3Children.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 140, after: 60 },
            children: [
              new ImageRun({
                data: imgBytes,
                transformation: { width: 576, height: 260 }, // กว้าง 6 นิ้ว (576 px)
              } as any),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 140 },
            children: [
              new TextRun({
                text: item.singleImage.caption || `ภาพที่ 3.2.${idx + 1}-1 ภาพอธิบายขั้นตอนและวิธีการดำเนินงาน`,
                font: FONT_FAMILY,
                size: 26,
                italics: true,
                color: COLOR_MUTED,
              }),
            ],
          })
        );
      } catch (e) {
        console.error('Failed to embed single image', e);
      }
    }

    // แบบที่ 2: ภาพประกอบการทำงาน แทรกในตาราง 2 คอลัมน์ ขนาดภาพละ กว้าง 3 นิ้ว (288 px)
    const showTwoCols =
      (item.imageLayout === 'two_columns' || item.imageLayout === 'both') &&
      Boolean(item.twoColumnImageLeft?.url || item.twoColumnImageRight?.url);

    if (showTwoCols) {
      try {
        const leftCellChildren: Paragraph[] = [];
        const rightCellChildren: Paragraph[] = [];

        if (item.twoColumnImageLeft?.url) {
          const leftBytes = base64ToUint8Array(item.twoColumnImageLeft.url);
          leftCellChildren.push(
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { after: 40 },
              children: [
                new ImageRun({
                  data: leftBytes,
                  transformation: { width: 288, height: 160 }, // กว้าง 3 นิ้ว (288 px)
                } as any),
              ],
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({
                  text: item.twoColumnImageLeft.caption || 'ภาพประกอบ (กว้าง 3 นิ้ว)',
                  font: FONT_FAMILY,
                  size: 24,
                  italics: true,
                  color: COLOR_MUTED,
                }),
              ],
            })
          );
        } else {
          leftCellChildren.push(new Paragraph({ children: [] }));
        }

        if (item.twoColumnImageRight?.url) {
          const rightBytes = base64ToUint8Array(item.twoColumnImageRight.url);
          rightCellChildren.push(
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { after: 40 },
              children: [
                new ImageRun({
                  data: rightBytes,
                  transformation: { width: 288, height: 160 }, // กว้าง 3 นิ้ว (288 px)
                } as any),
              ],
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({
                  text: item.twoColumnImageRight.caption || 'ภาพประกอบ (กว้าง 3 นิ้ว)',
                  font: FONT_FAMILY,
                  size: 24,
                  italics: true,
                  color: COLOR_MUTED,
                }),
              ],
            })
          );
        } else {
          rightCellChildren.push(new Paragraph({ children: [] }));
        }

        const twoColTable = new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: {
            top: { style: BorderStyle.NONE },
            bottom: { style: BorderStyle.NONE },
            left: { style: BorderStyle.NONE },
            right: { style: BorderStyle.NONE },
            insideHorizontal: { style: BorderStyle.NONE },
            insideVertical: { style: BorderStyle.NONE },
          },
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  width: { size: 50, type: WidthType.PERCENTAGE },
                  margins: { top: 60, bottom: 60, left: 60, right: 60 },
                  children: leftCellChildren,
                }),
                new TableCell({
                  width: { size: 50, type: WidthType.PERCENTAGE },
                  margins: { top: 60, bottom: 60, left: 60, right: 60 },
                  children: rightCellChildren,
                }),
              ],
            }),
          ],
        });

        part3Children.push(twoColTable);
      } catch (e) {
        console.error('Failed to embed two-column images', e);
      }
    }

    part3Children.push(new Paragraph({ spacing: { after: 120 }, children: [] }));
  });

  // =========================================================================
  // SECTION 4 (LANDSCAPE - แนวนอน): 4.1 คณะผู้ดำเนินงาน, 4.2 บริหารความเสี่ยง, 4.3 Compliance Matrix
  // =========================================================================
  const part4Children: (Paragraph | Table)[] = [];

  part4Children.push(
    createSectionHeader('ส่วนที่ 4', 'คณะผู้ดำเนินงาน แนวทางบริหารความเสี่ยง และตารางเปรียบเทียบข้อเสนอ'),
    createH2('4.1 โครงสร้างบุคลากรและคณะผู้ดำเนินงาน'),
    ...createBodyParagraphs(section4.teamOverview)
  );

  const teamRows = [
    createHeaderRow([
      createHeaderCell('ลำดับ', 6),
      createHeaderCell('ชื่อ - นามสกุล', 20),
      createHeaderCell('ตำแหน่งที่เสนอในโครงการ', 24),
      createHeaderCell('วุฒิการศึกษาและใบรับรอง', 26),
      createHeaderCell('ประสบการณ์และผลงานเด่น', 24),
    ]),
  ];

  section4.teamMembers.forEach((member, idx) => {
    teamRows.push(
      createDataRow([
        createDataCell(String(idx + 1), 6, { align: AlignmentType.CENTER, bold: true }),
        createDataCell(`${member.name}\n(อายุงาน ${member.experienceYears} ปี)`, 20, { bold: true }),
        createDataCell(`${member.proposedRole}\n• หน้าที่: ${member.responsibilities}`, 24),
        createDataCell(`${member.education}\n• ใบรับรอง: ${member.certifications}`, 26),
        createDataCell(member.highlightProjects, 24),
      ])
    );
  });

  part4Children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: teamRows,
    })
  );

  part4Children.push(
    createH2('4.2 แผนการบริหารจัดการความเสี่ยงโครงการ (Risk Management Plan)'),
    ...createBodyParagraphs(section4.riskManagementOverview)
  );

  const riskRows = [
    createHeaderRow([
      createHeaderCell('หมวดหมู่', 14),
      createHeaderCell('ประเด็นความเสี่ยง', 24),
      createHeaderCell('โอกาส x ผลกระทบ', 14),
      createHeaderCell('มาตรการป้องกันและลดความเสี่ยง (Mitigation)', 26),
      createHeaderCell('แผนรองรับกรณีเกิดเหตุ (Contingency)', 22),
    ]),
  ];

  section4.riskItems.forEach((risk) => {
    riskRows.push(
      createDataRow([
        createDataCell(risk.category, 14, { bold: true }),
        createDataCell(risk.riskTitle, 24),
        createDataCell(`${risk.likelihood} / ${risk.impact}`, 14, { align: AlignmentType.CENTER }),
        createDataCell(risk.mitigationPlan, 26),
        createDataCell(risk.contingencyPlan, 22),
      ])
    );
  });

  part4Children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: riskRows,
    })
  );

  // 4.3 ตารางเปรียบเทียบข้อเสนอโครงการกับข้อกำหนด TOR (Compliance Matrix)
  part4Children.push(
    createH2('4.3 ตารางเปรียบเทียบข้อเสนอโครงการกับข้อกำหนดของหน่วยงาน (TOR Compliance Matrix)'),
    ...createBodyParagraphs(
      section4.complianceMatrixOverview ||
        'บริษัท ไพร์มดิจิทัลคอนซัลแทนท์ จำกัด ยืนยันการปฏิบัติตามข้อกำหนดในขอบเขตงาน (TOR) ทุกประการ โดยในบางรายการสำคัญ บริษัทฯ ได้นำเสนอเทคโนโลยีและมาตรฐานที่ยกระดับให้มีประสิทธิภาพและความมั่นคงปลอดภัยสูงกว่าเกณฑ์ที่ TOR กำหนด ดังรายละเอียดต่อไปนี้'
    )
  );

  const complianceRows = [
    createHeaderRow([
      createHeaderCell('ข้อกำหนดตามประกาศจัดจ้าง (TOR)', 40),
      createHeaderCell('การดำเนินการ', 22),
      createHeaderCell('หมายเหตุ / รายละเอียดที่เสนอดีกว่า TOR', 38),
    ]),
  ];

  (section1.scopeItems || []).forEach((item) => {
    const isExceed = item.complianceStatus === 'exceed';
    const actionText = isExceed
      ? 'ยอมรับและเสนอแนวทางดีกว่า TOR'
      : 'ยอมรับและดำเนินการตาม TOR';
    const noteText = isExceed
      ? (item.complianceNote || 'บริษัทฯ เสนอแนวทาง เทคโนโลยี และระดับมาตรฐานการบริการ (SLA) ที่สูงกว่าเกณฑ์ที่กำหนด')
      : (item.complianceNote || '-');

    complianceRows.push(
      createDataRow([
        createDataCell(
          (item.requirement && item.requirement !== item.title)
            ? `${formatTorClauseNumber(item.clauseNumber)} ${item.title}\n• ${item.requirement}`
            : `${formatTorClauseNumber(item.clauseNumber)} ${item.title || item.requirement}`,
          40,
          { bold: item.level === 1 }
        ),
        createDataCell(
          actionText,
          22,
          {
            align: AlignmentType.CENTER,
            bold: true,
            bg: isExceed ? 'FEF3C7' : 'EFF6FF',
          }
        ),
        createDataCell(
          noteText,
          38,
          {
            bold: isExceed,
          }
        ),
      ])
    );
  });

  part4Children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: complianceRows,
    })
  );

  // =========================================================================
  // SECTION 5A (PORTRAIT - แนวตั้ง): 5.1 ข้อมูลบริษัท, โลโก้, รูปสำนักงาน, 5.2 มาตรฐาน
  // =========================================================================
  const part5AChildren: (Paragraph | Table)[] = [];

  part5AChildren.push(
    createSectionHeader('ส่วนที่ 5', 'ประวัติและประสบการณ์ของบริษัทที่เกี่ยวข้อง'),
    createH2('5.1 ข้อมูลทั่วไปของ บริษัท ไพร์มดิจิทัลคอนซัลแทนท์ จำกัด')
  );

  // Logo & Office images in Section 5.1
  if (section5.companyLogoUrl) {
    try {
      const logoBytes = base64ToUint8Array(section5.companyLogoUrl);
      part5AChildren.push(
        new Paragraph({
          alignment: AlignmentType.LEFT,
          spacing: { before: 80, after: 120 },
          children: [
            new ImageRun({
              data: logoBytes,
              transformation: { width: 160, height: 70 },
            } as any),
          ],
        })
      );
    } catch (e) {
      console.warn('Failed to embed company logo', e);
    }
  }

  part5AChildren.push(
    ...createBodyParagraphs(section5.companyProfile),
    createP(`ทุนจดทะเบียน: ${section5.registeredCapital}`, { firstLineIndent: 450, align: AlignmentType.LEFT, spaceAfter: 60 }),
    createP(`วิสัยทัศน์และพันธกิจ: ${section5.visionMission}`, { firstLineIndent: 450, align: AlignmentType.LEFT, spaceAfter: 100 })
  );

  if (section5.companyOfficeImageUrl) {
    try {
      const officeBytes = base64ToUint8Array(section5.companyOfficeImageUrl);
      part5AChildren.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 100, after: 60 },
          children: [
            new ImageRun({
              data: officeBytes,
              transformation: { width: 480, height: 220 },
            } as any),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 140 },
          children: [
            new TextRun({
              text: section5.companyOfficeImageCaption || 'ภาพสำนักงานและสถานที่ปฏิบัติงาน บริษัท ไพร์มดิจิทัลคอนซัลแทนท์ จำกัด',
              font: FONT_FAMILY,
              size: 24,
              italics: true,
              color: COLOR_MUTED,
            }),
          ],
        })
      );
    } catch (e) {
      console.warn('Failed to embed office image', e);
    }
  }

  part5AChildren.push(
    createH2('5.2 มาตรฐานและการรับรองคุณภาพ')
  );

  section5.certifications.forEach((cert) => {
    part5AChildren.push(createP(`✓ ${cert}`, { spaceAfter: 60, firstLineIndent: 450, align: AlignmentType.LEFT }));
  });

  // =========================================================================
  // SECTION 5B (LANDSCAPE - แนวนอน): 5.3 ผลงานและประสบการณ์ที่เกี่ยวข้อง (ตารางสัญญาจ้าง)
  // =========================================================================
  const part5BChildren: (Paragraph | Table)[] = [];

  const currentYearBE = 2568;
  const selectedProjects = (section5.pastProjects || []).filter((p) => p.isSelected);

  const torReferenceProjects = selectedProjects.filter(
    (p) => (p.projectType || 'tor_reference') === 'tor_reference' &&
      (section5.maxYearsFilter > 0 ? currentYearBE - p.completionYearBE <= section5.maxYearsFilter : true)
  );

  const supplementaryProjects = selectedProjects.filter(
    (p) => p.projectType === 'supplementary'
  );

  // 5.3.1 ผลงานอ้างอิงหลักตามเกณฑ์ TOR
  part5BChildren.push(
    createH2(`5.3 ผลงานและประสบการณ์ที่เกี่ยวข้อง`),
    new Paragraph({
      heading: HeadingLevel.HEADING_3,
      spacing: { before: 140, after: 80, line: 240, lineRule: LineRuleType.AUTO },
      children: [
        new TextRun({
          text: `5.3.1 ผลงานอ้างอิงหลักตามเกณฑ์ TOR (ย้อนหลังไม่เกิน ${section5.maxYearsFilter} ปี พ.ศ. ${currentYearBE - section5.maxYearsFilter} - ${currentYearBE})`,
          font: FONT_FAMILY,
          size: 30,
          bold: true,
          color: COLOR_PRIMARY,
        }),
      ],
    }),
    ...createBodyParagraphs(`บริษัทฯ ขอเสนอผลงานที่มีขอบเขตงานและลักษณะงานสอดคล้องกับข้อกำหนดของ TOR โดยเป็นผลงานที่แล้วเสร็จย้อนหลังไม่เกิน ${section5.maxYearsFilter} ปี พร้อมทั้งได้แนบสำเนาสัญญาจ้างและหนังสือรับรองผลงานไว้ในภาคผนวก ก ของข้อเสนอนี้อย่างครบถ้วน`)
  );

  const torRefRows = [
    createHeaderRow([
      createHeaderCell('ลำดับ', 5),
      createHeaderCell('ชื่อโครงการและลักษณะงาน', 33),
      createHeaderCell('หน่วยงานผู้ว่าจ้าง', 18),
      createHeaderCell('ปี พ.ศ.', 8),
      createHeaderCell('มูลค่าสัญญา (บาท)', 18),
      createHeaderCell('หลักฐานสัญญา/รับรอง', 18),
    ]),
  ];

  torReferenceProjects.forEach((proj, idx) => {
    const hasCert = !!proj.certificateFileUrl;
    torRefRows.push(
      createDataRow([
        createDataCell(String(idx + 1), 5, { align: AlignmentType.CENTER, bold: true }),
        createDataCell(`${proj.projectName}\n• ${proj.description}`, 33, { bold: true }),
        createDataCell(proj.clientName, 18),
        createDataCell(String(proj.completionYearBE), 8, { align: AlignmentType.CENTER }),
        createDataCell(`${proj.contractValue.toLocaleString()} บาท`, 18, { align: AlignmentType.RIGHT, bold: true }),
        createDataCell(hasCert ? '✓ มีแนบในภาคผนวก ก' : 'หนังสือรับรองผลงาน', 18, { align: AlignmentType.CENTER, bold: hasCert }),
      ])
    );
  });

  part5BChildren.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: torRefRows,
    })
  );

  // Embed project screenshot images if present (Landscape width up to 560px)
  torReferenceProjects.forEach((proj, idx) => {
    if (proj.projectImageUrl) {
      try {
        const pImgBytes = base64ToUint8Array(proj.projectImageUrl);
        part5BChildren.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 120, after: 40 },
            children: [
              new ImageRun({
                data: pImgBytes,
                transformation: { width: 560, height: 250 },
              } as any),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 120 },
            children: [
              new TextRun({
                text: proj.projectImageCaption || `ภาพที่ 5-1.${idx + 1} ภาพหน้าจอระบบ/ผลงาน: ${proj.projectName}`,
                font: FONT_FAMILY,
                size: 24,
                italics: true,
                color: COLOR_MUTED,
              }),
            ],
          })
        );
      } catch (e) {
        console.warn('Failed to embed project image', e);
      }
    }
  });

  // 5.3.2 ผลงานเสริมที่สอดคล้อง (ขึ้นหน้าใหม่ตามความต้องการของผู้ใช้)
  if (supplementaryProjects.length > 0) {
    part5BChildren.push(
      new Paragraph({
        pageBreakBefore: true,
        heading: HeadingLevel.HEADING_3,
        spacing: { before: 200, after: 80, line: 240, lineRule: LineRuleType.AUTO },
        children: [
          new TextRun({
            text: `5.3.2 ผลงานและประสบการณ์เสริมที่สอดคล้องกับงานจ้างโครงการนี้ (Supplementary Experience)`,
            font: FONT_FAMILY,
            size: 30,
            bold: true,
            color: COLOR_PRIMARY,
          }),
        ],
      }),
      ...createBodyParagraphs('ผลงานเพิ่มเติมที่มีกิจกรรม เทคโนโลยี หรือแนวทางการดำเนินงานที่สอดคล้องและเป็นประโยชน์ต่อโครงการจ้างนี้เพื่อประกอบการพิจารณาความพร้อมและความเชี่ยวชาญ')
    );

    const suppRows = [
      createHeaderRow([
        createHeaderCell('ลำดับ', 5),
        createHeaderCell('ชื่อโครงการและผู้ว่าจ้าง', 27),
        createHeaderCell('กิจกรรมและประเด็นที่สอดคล้องกับงานจ้างโครงการนี้', 44),
        createHeaderCell('ปี พ.ศ.', 8),
        createHeaderCell('มูลค่าสัญญา', 16),
      ]),
    ];

    supplementaryProjects.forEach((proj, idx) => {
      suppRows.push(
        createDataRow([
          createDataCell(String(idx + 1), 5, { align: AlignmentType.CENTER, bold: true }),
          createDataCell(`${proj.projectName}\n• ผู้ว่าจ้าง: ${proj.clientName}`, 27, { bold: true }),
          createDataCell(proj.relevanceNote || proj.description, 44),
          createDataCell(String(proj.completionYearBE), 8, { align: AlignmentType.CENTER }),
          createDataCell(`${proj.contractValue.toLocaleString()} บาท`, 16, { align: AlignmentType.RIGHT }),
        ])
      );
    });

    part5BChildren.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: suppRows,
      })
    );

    supplementaryProjects.forEach((proj, idx) => {
      if (proj.projectImageUrl) {
        try {
          const pImgBytes = base64ToUint8Array(proj.projectImageUrl);
          part5BChildren.push(
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { before: 120, after: 40 },
              children: [
                new ImageRun({
                  data: pImgBytes,
                  transformation: { width: 560, height: 250 },
                } as any),
              ],
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { after: 120 },
              children: [
                new TextRun({
                  text: proj.projectImageCaption || `ภาพที่ 5-2.${idx + 1} ภาพผลงานเสริม: ${proj.projectName}`,
                  font: FONT_FAMILY,
                  size: 24,
                  italics: true,
                  color: COLOR_MUTED,
                }),
              ],
            })
          );
        } catch (e) {
          console.warn('Failed to embed supplementary project image', e);
        }
      }
    });
  }

  // =========================================================================
  // SECTION 6 (PORTRAIT - แนวตั้ง): ภาคผนวก ก & ปกหลัง
  // =========================================================================
  const part6Children: (Paragraph | Table)[] = [];

  const projectsWithCerts = torReferenceProjects.filter((p) => !!p.certificateFileUrl);
  if (projectsWithCerts.length > 0) {
    part6Children.push(
      createH1('ภาคผนวก ก: สำเนาสัญญาจ้างและหนังสือรับรองผลงานอ้างอิงตามเกณฑ์ TOR'),
      ...createBodyParagraphs('เอกสารสำเนาสัญญาจ้างและหนังสือรับรองผลงานโครงการที่แล้วเสร็จ เพื่อประกอบการพิจารณาคุณสมบัติและผลงานตามประกาศจัดจ้างของหน่วยงานภาครัฐ')
    );

    projectsWithCerts.forEach((proj, idx) => {
      part6Children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 180, after: 60 },
          children: [
            new TextRun({
              text: `เอกสารแนบ ก.${idx + 1}: ${proj.projectName}`,
              font: FONT_FAMILY,
              size: 28,
              bold: true,
              color: COLOR_PRIMARY,
            }),
          ],
        }),
        createP(`หน่วยงานผู้ว่าจ้าง: ${proj.clientName} | ปีที่แล้วเสร็จ: พ.ศ. ${proj.completionYearBE} | มูลค่าสัญญา: ${proj.contractValue.toLocaleString()} บาท`, { spaceAfter: 80, align: AlignmentType.LEFT })
      );

      try {
        const certBytes = base64ToUint8Array(proj.certificateFileUrl!);
        part6Children.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 80, after: 60 },
            children: [
              new ImageRun({
                data: certBytes,
                transformation: { width: 520, height: 420 },
              } as any),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: `สำเนาสัญญาจ้างหรือหนังสือรับรองผลงาน: ${proj.projectName}`,
                font: FONT_FAMILY,
                size: 24,
                italics: true,
                color: COLOR_MUTED,
              }),
            ],
          })
        );
      } catch (e) {
        console.warn('Failed to embed certificate image in appendix', e);
      }
    });
  }

  // ปกหลัง
  if (cover.includeBackCover) {
    part6Children.push(new Paragraph({ children: [new PageBreak()] }));

    if (cover.backCoverImage) {
      try {
        const backBytes = base64ToUint8Array(cover.backCoverImage);
        part6Children.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 200, after: 200 },
            children: [
              new ImageRun({
                data: backBytes,
                transformation: { width: 550, height: 400 },
              } as any),
            ],
          })
        );
      } catch (e) {
        console.warn('Failed to embed custom back cover', e);
      }
    } else {
      part6Children.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 1800, after: 200 },
          children: [
            new TextRun({
              text: 'บริษัท ไพร์มดิจิทัลคอนซัลแทนท์ จำกัด',
              font: FONT_FAMILY,
              size: 40,
              bold: true,
              color: COLOR_PRIMARY,
            }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 150 },
          children: [
            new TextRun({
              text: 'Prime Digital Consultant Co., Ltd.',
              font: FONT_FAMILY,
              size: 28,
              bold: true,
              color: 'B45309',
            }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 100 },
          children: [
            new TextRun({
              text: 'มุ่งมั่นสร้างสรรค์นวัตกรรมดิจิทัลภาครัฐ เพื่อประโยชน์สูงสุดของประชาชน',
              font: FONT_FAMILY,
              size: 28,
              italics: true,
              color: COLOR_MUTED,
            }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 400 },
          children: [
            new TextRun({
              text: 'โทรศัพท์: 02-XXX-XXXX | อีเมล: contact@primedigital.co.th | เว็บไซต์: www.primedigital.co.th',
              font: FONT_FAMILY,
              size: 24,
              color: COLOR_MUTED,
            }),
          ],
        })
      );
    }
  }

  // =========================================================================
  // Construct Multi-Section Document with Dynamic Orientations:
  // Section 1: Portrait (ปก, สารบัญ, ส่วนที่ 1)
  // Section 2: Landscape (ส่วนที่ 2: Gantt Chart, แผนงาน)
  // Section 3: Portrait (ส่วนที่ 3: กรอบแนวคิด 3.1 & วิธีการ 3.2)
  // Section 4: Landscape (ส่วนที่ 4: 4.1 ทีมงาน, 4.2 ความเสี่ยง, 4.3 Compliance Matrix)
  // Section 5A: Portrait (ส่วนที่ 5: 5.1 ข้อมูลบริษัท, 5.2 มาตรฐาน)
  // Section 5B: Landscape (ส่วนที่ 5.3: ตารางผลงานอ้างอิง TOR 5.3.1 & 5.3.2)
  // Section 6: Portrait (ภาคผนวก ก สำเนาสัญญา & ปกหลัง)
  // =========================================================================
  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: FONT_FAMILY,
            size: 32,
            color: COLOR_TEXT,
          },
          paragraph: {
            spacing: {
              line: 240,
              lineRule: LineRuleType.AUTO,
            },
          },
        },
      },
    },
    sections: [
      // Section 1: Portrait (Cover, TOC, Section 1)
      {
        properties: {
          page: {
            size: { orientation: PageOrientation.PORTRAIT },
            margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 },
          },
        },
        headers: { default: createCommonHeader() },
        footers: { default: createCommonFooter() },
        children: part1Children,
      },

      // Section 2: LANDSCAPE (ส่วนที่ 2: Gantt Chart & แผนงาน)
      {
        properties: {
          page: {
            size: { orientation: PageOrientation.LANDSCAPE },
            margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 },
          },
        },
        headers: { default: createCommonHeader() },
        footers: { default: createCommonFooter() },
        children: part2Children,
      },

      // Section 3: Portrait (ส่วนที่ 3: 3.1 กรอบแนวคิด & 3.2 วิธีการดำเนินงานตาม TOR)
      {
        properties: {
          page: {
            size: { orientation: PageOrientation.PORTRAIT },
            margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 },
          },
        },
        headers: { default: createCommonHeader() },
        footers: { default: createCommonFooter() },
        children: part3Children,
      },

      // Section 4: LANDSCAPE (ส่วนที่ 4: คณะผู้ดำเนินงาน 4.1, บริหารความเสี่ยง 4.2, Compliance Matrix 4.3)
      {
        properties: {
          page: {
            size: { orientation: PageOrientation.LANDSCAPE },
            margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 },
          },
        },
        headers: { default: createCommonHeader() },
        footers: { default: createCommonFooter() },
        children: part4Children,
      },

      // Section 5A: Portrait (ส่วนที่ 5: 5.1 ข้อมูลบริษัท, โลโก้, รูปสำนักงาน, 5.2 มาตรฐาน)
      {
        properties: {
          page: {
            size: { orientation: PageOrientation.PORTRAIT },
            margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 },
          },
        },
        headers: { default: createCommonHeader() },
        footers: { default: createCommonFooter() },
        children: part5AChildren,
      },

      // Section 5B: LANDSCAPE (ส่วนที่ 5.3: ผลงานและประสบการณ์ที่เกี่ยวข้อง 5.3.1, 5.3.2)
      {
        properties: {
          page: {
            size: { orientation: PageOrientation.LANDSCAPE },
            margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 },
          },
        },
        headers: { default: createCommonHeader() },
        footers: { default: createCommonFooter() },
        children: part5BChildren,
      },

      // Section 6: Portrait (ภาคผนวก ก & ปกหลัง)
      {
        properties: {
          page: {
            size: { orientation: PageOrientation.PORTRAIT },
            margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 },
          },
        },
        headers: { default: createCommonHeader() },
        footers: { default: createCommonFooter() },
        children: part6Children,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const fileName = `ข้อเสนอโครงการ_${cover.projectTitle.replace(/[\/\\?%*:|"<>]/g, '_').substring(0, 40)}_${cover.projectCode}.docx`;
  saveAs(blob, fileName);
}
