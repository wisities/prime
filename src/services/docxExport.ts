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
  ISectionOptions,
  HorizontalPositionRelativeFrom,
  VerticalPositionRelativeFrom,
  HorizontalPositionAlign,
  VerticalPositionAlign,
  TextWrappingType,
} from 'docx';
import saveAs from 'file-saver';
import { ProposalData, ReportImageBlock, TorScopeItem } from '../types/proposal';
import { normalizeDocumentStructure } from '../data/defaultData';
import { normalizeTorItemImageBlocks } from '../utils/imageBlockUtils';
import { generateDefaultConceptualDiagram } from '../utils/ganttRenderer';

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

function getImageDimensionsFromBytes(bytes: Uint8Array): { width: number; height: number } | null {
  try {
    // PNG format (bytes 16-23 contain width & height in big-endian)
    if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 && bytes.length >= 24) {
      const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
      return { width: view.getUint32(16), height: view.getUint32(20) };
    }
    // JPEG format (scan for SOF markers 0xC0, 0xC1, 0xC2)
    if (bytes[0] === 0xff && bytes[1] === 0xd8) {
      let offset = 2;
      const len = bytes.length;
      const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
      while (offset < len) {
        if (bytes[offset] !== 0xff) break;
        const marker = bytes[offset + 1];
        if (marker === 0xc0 || marker === 0xc1 || marker === 0xc2) {
          return { height: view.getUint16(offset + 5), width: view.getUint16(offset + 7) };
        }
        offset += 2 + view.getUint16(offset + 2);
      }
    }
  } catch (e) {
    // ignore parsing errors
  }
  return null;
}

const FONT_FAMILY = 'TH Sarabun New';
const COLOR_PRIMARY = '0F2744'; // Navy
const COLOR_SECONDARY = '1E3A8A';
const COLOR_TEXT = '1E293B';
const COLOR_MUTED = '64748B';

// Helper function to render unlimited 6-inch single and 3-inch paired images to docx
function renderImageBlocksToDocx(
  blocks?: ReportImageBlock[],
  defaultPrefix: string = 'ภาพที่'
): (Paragraph | Table)[] {
  if (!blocks || !Array.isArray(blocks) || blocks.length === 0) return [];
  const elements: (Paragraph | Table)[] = [];

  blocks.forEach((block, bIdx) => {
    if (block.type === 'single' && block.url) {
      try {
        const imgBytes = base64ToUint8Array(block.url);
        elements.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 140, after: 60 },
            children: [
              new ImageRun({
                data: imgBytes,
                transformation: { width: 576, height: 260 }, // กว้าง 6 นิ้ว (576 px) กึ่งกลาง
              } as any),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 140 },
            children: [
              new TextRun({
                text: block.caption || `${defaultPrefix}-${bIdx + 1} ภาพแสดงรายละเอียดการดำเนินงาน`,
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
    } else if (block.type === 'pair' && (block.leftUrl || block.rightUrl)) {
      try {
        const leftCellChildren: Paragraph[] = [];
        const rightCellChildren: Paragraph[] = [];

        if (block.leftUrl) {
          const leftBytes = base64ToUint8Array(block.leftUrl);
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
                  text: block.leftCaption || 'ภาพประกอบ (กว้าง 3 นิ้ว)',
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

        if (block.rightUrl) {
          const rightBytes = base64ToUint8Array(block.rightUrl);
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
                  text: block.rightCaption || 'ภาพประกอบ (กว้าง 3 นิ้ว)',
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

        elements.push(twoColTable);
      } catch (e) {
        console.error('Failed to embed two-column images', e);
      }
    }
  });

  return elements;
}

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
function createH3(title: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 160, after: 80, line: 240, lineRule: LineRuleType.AUTO },
    children: [
      new TextRun({
        text: title,
        font: FONT_FAMILY,
        size: 32, // 16pt
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
  options?: {
    align?: (typeof AlignmentType)[keyof typeof AlignmentType];
    bold?: boolean;
    bg?: string;
    color?: string;
    logoBase64?: string;
  }
): TableCell {
  const paraChildren: Paragraph[] = [];

  if (options?.logoBase64) {
    try {
      const logoBytes = base64ToUint8Array(options.logoBase64);
      paraChildren.push(
        new Paragraph({
          alignment: options.align || AlignmentType.LEFT,
          spacing: { before: 20, after: 40 },
          children: [
            new ImageRun({
              data: logoBytes,
              transformation: { width: 70, height: 35 },
            } as any),
          ],
        })
      );
    } catch (e) {
      console.warn('Failed to embed logo in table cell', e);
    }
  }

  const lines = (text || '').split(/\r?\n/);
  lines.forEach((l, idx) => {
    paraChildren.push(
      new Paragraph({
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
            color: options?.color || COLOR_TEXT,
          }),
        ],
      })
    );
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

function createCenteredClientLogo(logoBase64?: string, clientName?: string): Paragraph[] {
  const elements: Paragraph[] = [];
  if (logoBase64) {
    try {
      const logoBytes = base64ToUint8Array(logoBase64);
      elements.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 120, after: 40, line: 240, lineRule: LineRuleType.AUTO },
          children: [
            new ImageRun({
              data: logoBytes,
              transformation: { width: 140, height: 65 },
            } as any),
          ],
        })
      );
    } catch (e) {
      console.warn('Failed to embed client logo', e);
    }
  }

  if (clientName) {
    elements.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 20, after: 100, line: 240, lineRule: LineRuleType.AUTO },
        children: [
          new TextRun({
            text: `ตราสัญลักษณ์ / หน่วยงานผู้ว่าจ้าง: ${clientName}`,
            font: FONT_FAMILY,
            size: 24, // 12pt
            italics: true,
            color: COLOR_MUTED,
          }),
        ],
      })
    );
  }

  return elements;
}

function createProjectDetailTable(fields: { label: string; value: string }[]): Table {
  const thinBorder = {
    style: BorderStyle.SINGLE,
    size: 1,
    color: 'CBD5E1',
  };
  const tableBorders = {
    top: thinBorder,
    bottom: thinBorder,
    left: thinBorder,
    right: thinBorder,
    insideHorizontal: thinBorder,
    insideVertical: thinBorder,
  };

  const rows = fields.map((f) => {
    return new TableRow({
      cantSplit: true,
      children: [
        new TableCell({
          width: { size: 26, type: WidthType.PERCENTAGE },
          shading: { fill: 'F1F5F9' },
          margins: { top: 80, bottom: 80, left: 140, right: 140 },
          children: [
            new Paragraph({
              spacing: { line: 240, lineRule: LineRuleType.AUTO },
              children: [
                new TextRun({
                  text: f.label,
                  font: FONT_FAMILY,
                  size: 28, // 14pt
                  bold: true,
                  color: COLOR_PRIMARY,
                }),
              ],
            }),
          ],
        }),
        new TableCell({
          width: { size: 74, type: WidthType.PERCENTAGE },
          margins: { top: 80, bottom: 80, left: 140, right: 140 },
          children: (f.value || '-')
            .split(/\r?\n/)
            .map((valLine) =>
              new Paragraph({
                spacing: { before: 20, after: 20, line: 240, lineRule: LineRuleType.AUTO },
                children: [
                  new TextRun({
                    text: valLine,
                    font: FONT_FAMILY,
                    size: 28, // 14pt
                    color: COLOR_TEXT,
                  }),
                ],
              })
            ),
        }),
      ],
    });
  });

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: tableBorders,
    rows,
  });
}


/**
 * Builds a 100% native Word Table for Gantt Chart (ตาราง Word แท้ๆ)
 * Features:
 * - TableHeader repeated across every page in Word automatically
 * - Shaded timeline week cells showing active project phases (Level 1-5 colors)
 * - cantSplit preventing awkward mid-row breaks
 * - No canvas screenshots/images needed
 */
function buildNativeWordGanttTable(
  scopeItems: TorScopeItem[],
  totalMonths: number = 6,
  startGlobalIndex: number = 0
): Table {
  const safeMonths = Math.max(1, totalMonths || 6);
  const totalWeeks = safeMonths * 4;
  const isCompact = safeMonths > 6;

  const col1Width = isCompact ? 28 : 34; // % for scope items label & metadata
  const weekColWidth = (100 - col1Width) / totalWeeks; // percentage per week

  const thinBorder = {
    style: BorderStyle.SINGLE,
    size: 1,
    color: 'CBD5E1',
  };

  const cellBorders = {
    top: thinBorder,
    bottom: thinBorder,
    left: thinBorder,
    right: thinBorder,
  };

  // Header Row 1: Months
  const header1Cells: TableCell[] = [
    new TableCell({
      width: { size: col1Width, type: WidthType.PERCENTAGE },
      shading: { fill: '0F2744' },
      margins: { top: 100, bottom: 100, left: 120, right: 120 },
      borders: cellBorders,
      children: [
        new Paragraph({
          alignment: AlignmentType.LEFT,
          spacing: { line: 240, lineRule: LineRuleType.AUTO },
          children: [
            new TextRun({
              text: 'ขอบเขตงานตาม TOR และผู้รับผิดชอบ',
              bold: true,
              color: 'FFFFFF',
              font: FONT_FAMILY,
              size: 24, // 12pt
            }),
          ],
        }),
      ],
    }),
  ];

  for (let m = 1; m <= safeMonths; m++) {
    header1Cells.push(
      new TableCell({
        width: { size: weekColWidth * 4, type: WidthType.PERCENTAGE },
        columnSpan: 4,
        shading: { fill: '0F2744' },
        margins: { top: 100, bottom: 100, left: 40, right: 40 },
        borders: cellBorders,
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { line: 240, lineRule: LineRuleType.AUTO },
            children: [
              new TextRun({
                text: `เดือนที่ ${m}`,
                bold: true,
                color: 'FFFFFF',
                font: FONT_FAMILY,
                size: 22, // 11pt
              }),
            ],
          }),
        ],
      })
    );
  }

  // Header Row 2: Weeks
  const header2Cells: TableCell[] = [
    new TableCell({
      width: { size: col1Width, type: WidthType.PERCENTAGE },
      shading: { fill: '1E3E62' },
      margins: { top: 70, bottom: 70, left: 120, right: 120 },
      borders: cellBorders,
      children: [
        new Paragraph({
          alignment: AlignmentType.LEFT,
          spacing: { line: 240, lineRule: LineRuleType.AUTO },
          children: [
            new TextRun({
              text: 'จำแนกข้อหลักและข้อย่อย (ระดับ 1 - 5)',
              bold: false,
              color: 'CBD5E1',
              font: FONT_FAMILY,
              size: 20, // 10pt
            }),
          ],
        }),
      ],
    }),
  ];

  for (let w = 1; w <= totalWeeks; w++) {
    const weekInMonth = ((w - 1) % 4) + 1;
    const isMonthBoundary = (w - 1) % 4 === 0;
    header2Cells.push(
      new TableCell({
        width: { size: weekColWidth, type: WidthType.PERCENTAGE },
        shading: { fill: isMonthBoundary ? '254B75' : '1E3E62' },
        margins: { top: 60, bottom: 60, left: 10, right: 10 },
        borders: cellBorders,
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { line: 240, lineRule: LineRuleType.AUTO },
            children: [
              new TextRun({
                text: isCompact ? `${weekInMonth}` : `W${weekInMonth}`,
                bold: isMonthBoundary,
                color: 'FFFFFF',
                font: FONT_FAMILY,
                size: 18, // 9pt
              }),
            ],
          }),
        ],
      })
    );
  }

  const tableRows: TableRow[] = [
    new TableRow({
      tableHeader: true,
      cantSplit: true,
      children: header1Cells,
    }),
    new TableRow({
      tableHeader: true,
      cantSplit: true,
      children: header2Cells,
    }),
  ];

  const levelColors = [
    '0F2744', // Level 1 (Navy)
    '1E40AF', // Level 2 (Blue)
    '0D9488', // Level 3 (Teal)
    '7C3AED', // Level 4 (Purple)
    'D97706', // Level 5 (Amber)
  ];

  (scopeItems || []).forEach((item, index) => {
    const isLevel1 = (item.level || 1) === 1;
    const barFill = levelColors[((item.level || 1) - 1) % levelColors.length];

    const startMonth = Math.max(1, item.startMonth || 1);
    const startWeek = Math.max(1, Math.min(4, item.startWeek || 1));
    const startWeekAbsolute = (startMonth - 1) * 4 + (startWeek - 1);
    const durationWeeks = Math.max(1, item.durationWeeks || Math.round((item.durationDays || 7) / 7));
    const endWeekAbsolute = startWeekAbsolute + durationWeeks;

    const indentSpaces = '  '.repeat(Math.max(0, (item.level || 1) - 1));
    const clauseStr = formatTorClauseNumber(item.clauseNumber);

    const firstCellChildren = [
      new Paragraph({
        alignment: AlignmentType.LEFT,
        spacing: { before: 20, after: 20, line: 240, lineRule: LineRuleType.AUTO },
        children: [
          new TextRun({
            text: `${indentSpaces}${clauseStr} ${item.title}`,
            bold: isLevel1,
            color: isLevel1 ? '0F2744' : '1E293B',
            font: FONT_FAMILY,
            size: isLevel1 ? 22 : 20, // 11pt / 10pt
          }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.LEFT,
        spacing: { before: 0, after: 20, line: 240, lineRule: LineRuleType.AUTO },
        children: [
          new TextRun({
            text: `${indentSpaces}${item.durationDays || 1} วัน (~${durationWeeks} วีค) | ด.${startMonth} W${startWeek} | ${item.responsibleRole || '-'}`,
            color: '64748B',
            font: FONT_FAMILY,
            size: 18, // 9pt
          }),
        ],
      }),
    ];

    const isEven = (startGlobalIndex + index) % 2 === 0;

    const rowCells: TableCell[] = [
      new TableCell({
        width: { size: col1Width, type: WidthType.PERCENTAGE },
        shading: { fill: isEven ? 'F8FAFC' : 'FFFFFF' },
        margins: { top: 60, bottom: 60, left: 100, right: 100 },
        borders: cellBorders,
        children: firstCellChildren,
      }),
    ];

    for (let w = 1; w <= totalWeeks; w++) {
      const weekIdx = w - 1;
      const isActive = weekIdx >= startWeekAbsolute && weekIdx < endWeekAbsolute;
      const isFirstActiveWeek = weekIdx === startWeekAbsolute;

      rowCells.push(
        new TableCell({
          width: { size: weekColWidth, type: WidthType.PERCENTAGE },
          shading: { fill: isActive ? barFill : (isEven ? 'F8FAFC' : 'FFFFFF') },
          margins: { top: 40, bottom: 40, left: 5, right: 5 },
          borders: cellBorders,
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { line: 240, lineRule: LineRuleType.AUTO },
              children: [
                new TextRun({
                  text: isActive
                    ? (isFirstActiveWeek && durationWeeks > 1
                        ? `${item.durationDays}ว`
                        : (durationWeeks === 1 ? `${item.durationDays}ว` : (isCompact ? '' : '▪')))
                    : '',
                  bold: true,
                  color: 'FFFFFF',
                  font: FONT_FAMILY,
                  size: 16, // 8pt
                }),
              ],
            }),
          ],
        })
      );
    }

    tableRows.push(
      new TableRow({
        cantSplit: true,
        children: rowCells,
      })
    );
  });

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: tableRows,
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
  const docStructure = normalizeDocumentStructure(data.documentStructure);
  const autoRenumber = docStructure.autoRenumber ?? true;

  const hasCustomImagesInS3 = !!section3.conceptualDiagramImage || (!!section3.imageBlocks && section3.imageBlocks.length > 0);
  const conceptualImageBase64 = section3.conceptualDiagramImage || (hasCustomImagesInS3 ? undefined : generateDefaultConceptualDiagram());

  // Create Header / Footer generators with support for full-page A4 Backgrounds (Header & Footer graphics)
  const createCommonHeader = (isLandscape: boolean = false) => {
    const children: Paragraph[] = [];
    const bgImageBase64 = isLandscape ? cover.landscapeBgImage : cover.portraitBgImage;

    if (bgImageBase64) {
      try {
        const bgBytes = base64ToUint8Array(bgImageBase64);
        // A4 Portrait = 794 x 1123 px, A4 Landscape = 1123 x 794 px at 96 DPI
        const width = isLandscape ? 1123 : 794;
        const height = isLandscape ? 794 : 1123;

        children.push(
          new Paragraph({
            children: [
              new ImageRun({
                data: bgBytes,
                transformation: { width, height },
                floating: {
                  horizontalPosition: {
                    relative: HorizontalPositionRelativeFrom.PAGE,
                    align: HorizontalPositionAlign.LEFT,
                    offset: 0,
                  },
                  verticalPosition: {
                    relative: VerticalPositionRelativeFrom.PAGE,
                    align: VerticalPositionAlign.TOP,
                    offset: 0,
                  },
                  wrap: {
                    type: TextWrappingType.NONE,
                  },
                  behindDocument: true,
                },
              } as any),
            ],
          })
        );
      } catch (e) {
        console.warn('Failed to embed background image in header', e);
      }
    }

    if (!cover.hideDefaultHeaderFooter) {
      children.push(
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
        })
      );
    }

    return new Header({ children });
  };

  const createCommonFooter = () => {
    if (cover.hideDefaultHeaderFooter) {
      return new Footer({ children: [] });
    }
    return new Footer({
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
  };

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

  // Cover Title (หน้าหัวข้อโครงการ - กรณีมีรูปปกหน้า จะถูกแทรกเป็นหน้า A4 เต็มหน้าก่อนหน้านี้)
  part1Children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 500, after: 200 },
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
  const s1Config = docStructure.sections.find((s) => s.id === 'section1');
  if (s1Config && s1Config.enabled) {
    part1Children.push(
      createSectionHeader('ส่วนที่ 1', 'บทนำ ภาพรวมโครงการ และขอบเขตงานตามประกาศจัดจ้าง', true)
    );

    const activeS1Headings = s1Config.headings
      .filter((h) => h.enabled)
      .sort((a, b) => a.order - b.order);

    activeS1Headings.forEach((h, hIdx) => {
      const numPrefix = autoRenumber ? `1.${hIdx + 1}` : h.originalCode;
      if (h.id === 's1_background') {
        part1Children.push(
          createH2(`${numPrefix} ความเป็นมาและความสำคัญ`),
          ...createBodyParagraphs(section1.background)
        );
      } else if (h.id === 's1_objectives') {
        part1Children.push(createH2(`${numPrefix} วัตถุประสงค์ของโครงการ`));
        section1.objectives.forEach((obj, idx) => {
          const cleanObj = obj.replace(/^\(\d+\.\d+\)\s*/, '').replace(/^1\.\d+\.\d+\s*/, '');
          part1Children.push(
            new Paragraph({
              alignment: AlignmentType.LEFT,
              indent: { firstLine: 450 },
              spacing: { after: 60, before: 0, line: 240, lineRule: LineRuleType.AUTO },
              children: [
                new TextRun({
                  text: `${numPrefix}.${idx + 1} ${cleanObj}`,
                  font: FONT_FAMILY,
                  size: 32,
                  color: COLOR_TEXT,
                }),
              ],
            })
          );
        });
      } else if (h.id === 's1_expected_benefits') {
        part1Children.push(createH2(`${numPrefix} ประโยชน์ที่คาดว่าจะได้รับ`));
        section1.expectedBenefits.forEach((benefit, idx) => {
          const cleanBenefit = benefit.replace(/^\(\d+\.\d+\)\s*/, '').replace(/^2\.\d+\.\d+\s*/, '').replace(/^1\.\d+\.\d+\s*/, '');
          part1Children.push(
            new Paragraph({
              alignment: AlignmentType.LEFT,
              indent: { firstLine: 450 },
              spacing: { after: 60, before: 0, line: 240, lineRule: LineRuleType.AUTO },
              children: [
                new TextRun({
                  text: `${numPrefix}.${idx + 1} ${cleanBenefit}`,
                  font: FONT_FAMILY,
                  size: 32,
                  color: COLOR_TEXT,
                }),
              ],
            })
          );
        });
      } else if (h.id === 's1_target_audience') {
        part1Children.push(
          createH2(`${numPrefix} กลุ่มเป้าหมายและกรอบระยะเวลาดำเนินงาน`),
          createP(`กลุ่มเป้าหมายผู้ใช้งาน: ${section1.targetAudience}`, { firstLineIndent: 450, align: AlignmentType.LEFT }),
          createP(`ระยะเวลาดำเนินการรวม: ${section1.projectDurationDays} วัน (${section1.projectDurationMonths} เดือน / ${section1.projectDurationMonths * 4} สัปดาห์)`, { firstLineIndent: 450, align: AlignmentType.LEFT }),
          createP(`วงเงินงบประมาณโครงการ: ${section1.budgetAmount.toLocaleString()} บาท`, { firstLineIndent: 450, align: AlignmentType.LEFT })
        );
      } else if (h.id === 's1_scope') {
        part1Children.push(
          createH2(`${numPrefix} ขอบเขตงานตามประกาศจัดจ้าง`),
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
      }
    });

    if (section1.imageBlocks && section1.imageBlocks.length > 0) {
      part1Children.push(...renderImageBlocksToDocx(section1.imageBlocks, 'ภาพที่ 1'));
    }
  }

  // =========================================================================
  // SECTION 2 (LANDSCAPE - แนวนอน): 2.1 แผนภูมิแกนต์ Gantt Chart & งวดงาน
  // =========================================================================
  const part2Children: (Paragraph | Table)[] = [];
  const s2Config = docStructure.sections.find((s) => s.id === 'section2');
  if (s2Config && s2Config.enabled) {
    part2Children.push(
      createSectionHeader('ส่วนที่ 2', 'แผนการดำเนินงานตลอดโครงการ (Work Plan & Weekly Gantt Chart)'),
      ...createBodyParagraphs(section2.workPlanOverview)
    );

    const activeS2Headings = s2Config.headings
      .filter((h) => h.enabled)
      .sort((a, b) => a.order - b.order);

    activeS2Headings.forEach((h, hIdx) => {
      const numPrefix = autoRenumber ? `2.${hIdx + 1}` : h.originalCode;
      if (h.id === 's2_gantt') {
        const scopeItems = section1.scopeItems || [];
        const totalMonths = section1.projectDurationMonths || 6;

        part2Children.push(
          createH2(`${numPrefix} แผนภูมิแกนต์ (Gantt Chart) แสดงการปฏิบัติงานรายสัปดาห์ตลอดโครงการ`)
        );

        if (scopeItems.length === 0) {
          part2Children.push(
            createP('ยังไม่ได้ระบุรายการขอบเขตงานสำหรับแผนภูมิแกนต์', { italic: true, color: COLOR_MUTED })
          );
        } else {
          // สร้างตาราง Word แท้ๆ (Native Word Table) ต่อเนื่องตลอดโครงการ
          // หัวตารางเดือน (Header Row 1) และหัวตารางสัปดาห์ (Header Row 2) มี tableHeader: true ทำให้ Word ทำซ้ำหัวตารางอัตโนมัติทุกหน้าที่ขึ้นใหม่
          // ทุกแถวมี cantSplit: true ป้องกันการแตกครึ่งบรรทัด และให้ตารางขึ้นเต็มหน้ากระดาษแล้วตัดขึ้นหน้าใหม่เรื่อยๆ จนครบทุกข้อ
          const table = buildNativeWordGanttTable(scopeItems, totalMonths);
          part2Children.push(table);

          // หมายเหตุท้ายตาราง
          part2Children.push(
            new Paragraph({
              alignment: AlignmentType.LEFT,
              spacing: { before: 80, after: 120 },
              children: [
                new TextRun({
                  text: `* หมายเหตุ: แผนภูมิแกนต์ตารางมาตรฐาน Word (Native Table) รายสัปดาห์ (1 เดือน = 4 วีค) | รวมทั้งสิ้น ${scopeItems.length} รายการ (ระบบแสดงหัวตารางเดือนและสัปดาห์ซ้ำที่ด้านบนสุดของทุกหน้ากระดาษโดยอัตโนมัติ)`,
                  font: FONT_FAMILY,
                  size: 18,
                  italics: true,
                  color: COLOR_MUTED,
                }),
              ],
            })
          );
        }
      } else if (h.id === 's2_timeline') {
        // ให้ตารางกำหนดช่วงเวลาการทำงานขึ้นหน้าใหม่ เพื่อไม่ให้ชนหรือติดใต้แผนภูมิแกนต์
        part2Children.push(
          new Paragraph({
            children: [new PageBreak()],
          }),
          createH2(`${numPrefix} ตารางกำหนดช่วงเวลาการทำงานตามขอบเขตงาน TOR (รายสัปดาห์และจำนวนวัน)`)
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
      } else if (h.id === 's2_milestones') {
        part2Children.push(
          new Paragraph({
            children: [new PageBreak()],
          }),
          createH2(`${numPrefix} แผนการส่งมอบงานและการเบิกจ่ายเงิน (Milestones & Deliverables)`)
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
      }
    });

    if (section2.imageBlocks && section2.imageBlocks.length > 0) {
      part2Children.push(...renderImageBlocksToDocx(section2.imageBlocks, 'ภาพที่ 2'));
    }
  }

  // =========================================================================
  // SECTION 3 (Portrait - แนวตั้ง): ส่วนที่ 3 ตอบ TOR, ส่วนที่ 4 ทีมงาน, ส่วนที่ 5 บริษัท & ปกหลัง
  // =========================================================================
  const part3Children: (Paragraph | Table)[] = [];
  const s3Config = docStructure.sections.find((s) => s.id === 'section3');
  if (s3Config && s3Config.enabled) {
    part3Children.push(
      createSectionHeader('ส่วนที่ 3', 'กรอบแนวคิดและวิธีการดำเนินงานตามข้อกำหนด (TOR Mapping)', true)
    );

    const activeS3Headings = s3Config.headings
      .filter((h) => h.enabled)
      .sort((a, b) => a.order - b.order);

    activeS3Headings.forEach((h, hIdx) => {
      const numPrefix = autoRenumber ? `3.${hIdx + 1}` : h.originalCode;
      if (h.id === 's3_framework') {
        part3Children.push(
          createH2(`${numPrefix} แผนภาพกรอบแนวคิดการดำเนินงาน (Conceptual Framework Diagram)`),
          ...createBodyParagraphs(section3.frameworkOverview)
        );

        // 3.1 Images Rendering:
        // ภาพแรกมีหัวข้อ: บังคับกว้าง 6 นิ้ว (576 px), สูงไม่เกิน 19 ซม. (718 px)
        // ภาพถัดไป: แสดงเต็มหน้า (ขึ้นหน้าใหม่ด้วย PageBreak), กว้าง 6 นิ้ว (576 px), สูงไม่เกิน 23 ซม. (870 px)
        let hasRenderedFirstImage = false;

        if (conceptualImageBase64) {
          try {
            const conceptualBytes = base64ToUint8Array(conceptualImageBase64);
            const dims = getImageDimensionsFromBytes(conceptualBytes);
            let imgHeight = 718; // 19 cm max
            if (dims && dims.width > 0) {
              const scaled = Math.round(576 * (dims.height / dims.width));
              imgHeight = Math.min(718, scaled);
            } else {
              imgHeight = 350;
            }

            part3Children.push(
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 140, after: 80 },
                children: [
                  new ImageRun({
                    data: conceptualBytes,
                    transformation: { width: 576, height: imgHeight }, // กว้าง 6 นิ้ว สูงไม่เกิน 19 ซม.
                  } as any),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { after: 200 },
                children: [
                  new TextRun({
                    text: section3.conceptualDiagramCaption || `ภาพที่ ${numPrefix}-1 แผนภาพกรอบแนวคิดการดำเนินงาน`,
                    font: FONT_FAMILY,
                    size: 26,
                    italics: true,
                    color: COLOR_MUTED,
                  }),
                ],
              })
            );
            hasRenderedFirstImage = true;
          } catch (e) {
            console.error('Failed to embed conceptual diagram', e);
          }
        }

        if (section3.imageBlocks && section3.imageBlocks.length > 0) {
          section3.imageBlocks.forEach((block, bIdx) => {
            const isFirst = !hasRenderedFirstImage && bIdx === 0;
            const maxCmHeight = isFirst ? 718 : 870; // ภาพแรกสูงไม่เกิน 19 ซม. (718 px), ภาพถัดไปสูงไม่เกิน 23 ซม. (870 px)

            if (block.type === 'single' && block.url) {
              try {
                const subBytes = base64ToUint8Array(block.url);
                const dims = getImageDimensionsFromBytes(subBytes);
                let imgHeight = maxCmHeight;
                if (dims && dims.width > 0) {
                  const scaled = Math.round(576 * (dims.height / dims.width));
                  imgHeight = Math.min(maxCmHeight, scaled);
                } else {
                  imgHeight = isFirst ? 350 : 700;
                }

                // ภาพถัดไปแสดงเต็มหน้า (ขึ้นหน้าใหม่ด้วย PageBreak)
                if (!isFirst) {
                  part3Children.push(
                    new Paragraph({
                      children: [new PageBreak()],
                    })
                  );
                }

                part3Children.push(
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { before: isFirst ? 140 : 100, after: 80 },
                    children: [
                      new ImageRun({
                        data: subBytes,
                        transformation: { width: 576, height: imgHeight }, // กว้าง 6 นิ้ว สูงไม่เกิน 19 หรือ 23 ซม.
                      } as any),
                    ],
                  }),
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 180 },
                    children: [
                      new TextRun({
                        text: block.caption || `ภาพที่ ${numPrefix}-${hasRenderedFirstImage ? bIdx + 2 : bIdx + 1} แผนภาพรายละเอียดการดำเนินงาน`,
                        font: FONT_FAMILY,
                        size: 26,
                        italics: true,
                        color: COLOR_MUTED,
                      }),
                    ],
                  })
                );
                if (isFirst) hasRenderedFirstImage = true;
              } catch (e) {
                console.error('Failed to embed Section 3.1 image block', e);
              }
            } else if (block.type === 'pair' && (block.leftUrl || block.rightUrl)) {
              if (!isFirst) {
                part3Children.push(
                  new Paragraph({
                    children: [new PageBreak()],
                  })
                );
              }
              part3Children.push(
                ...renderImageBlocksToDocx([block], `ภาพที่ ${numPrefix}-${hasRenderedFirstImage ? bIdx + 2 : bIdx + 1}`)
              );
              if (isFirst) hasRenderedFirstImage = true;
            }
          });
        }
      } else if (h.id === 's3_methodology') {
        part3Children.push(
          createH2(`${numPrefix} วิธีการดำเนินงาน`)
        );

        (section1.scopeItems || []).forEach((item, idx) => {
          part3Children.push(
            new Paragraph({
              heading: HeadingLevel.HEADING_3,
              spacing: { before: 200, after: 100, line: 240, lineRule: LineRuleType.AUTO },
              children: [
                new TextRun({
                  text: `${numPrefix}.${idx + 1} ${formatTorClauseNumber(item.clauseNumber)}: ${item.title}`,
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

          // ภาพประกอบในหัวข้อนี้ (ไม่จำกัดจำนวน: รองรับทั้งภาพเดี่ยว 6 นิ้ว และภาพคู่ 3 นิ้ว)
          const itemBlocks = normalizeTorItemImageBlocks(item);
          if (itemBlocks.length > 0) {
            part3Children.push(
              ...renderImageBlocksToDocx(itemBlocks, `ภาพที่ ${numPrefix}.${idx + 1}`)
            );
          }

          part3Children.push(new Paragraph({ spacing: { after: 120 }, children: [] }));
        });
      }
    });
  }

  // =========================================================================
  // SECTION 4 (LANDSCAPE - แนวนอน): 4.1 คณะผู้ดำเนินงาน, 4.2 บริหารความเสี่ยง, 4.3 Compliance Matrix
  // =========================================================================
  const part4Children: (Paragraph | Table)[] = [];
  const s4Config = docStructure.sections.find((s) => s.id === 'section4');
  if (s4Config && s4Config.enabled) {
    part4Children.push(
      createSectionHeader('ส่วนที่ 4', 'คณะผู้ดำเนินงาน แนวทางบริหารความเสี่ยง และตารางเปรียบเทียบข้อเสนอ')
    );

    const activeS4Headings = s4Config.headings
      .filter((h) => h.enabled)
      .sort((a, b) => a.order - b.order);

    activeS4Headings.forEach((h, hIdx) => {
      const numPrefix = autoRenumber ? `4.${hIdx + 1}` : h.originalCode;
      if (h.id === 's4_team_overview') {
        part4Children.push(
          createH2(`${numPrefix} โครงสร้างบุคลากรและคณะผู้ดำเนินงาน`),
          ...createBodyParagraphs(section4.teamOverview)
        );

        const teamRows = [
          createHeaderRow([
            createHeaderCell('ลำดับ', 6),
            createHeaderCell('ชื่อ - นามสกุล', 24),
            createHeaderCell('ตำแหน่งในโครงการ', 26),
            createHeaderCell('อายุงาน', 16),
            createHeaderCell('วุฒิการศึกษา', 28),
          ]),
        ];

        section4.teamMembers.forEach((member, idx) => {
          teamRows.push(
            createDataRow([
              createDataCell(String(idx + 1), 6, { align: AlignmentType.CENTER, bold: true }),
              createDataCell(member.name, 24, { bold: true }),
              createDataCell(member.proposedRole, 26),
              createDataCell(
                `${member.experienceYears} ปี${member.startWorkYearBE ? `\n(เริ่มงาน พ.ศ. ${member.startWorkYearBE})` : ''}`,
                16,
                { align: AlignmentType.CENTER }
              ),
              createDataCell(
                `${member.education}${member.certifications ? `\n• ใบรับรอง: ${member.certifications}` : ''}`,
                28
              ),
            ])
          );
        });

        part4Children.push(
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: teamRows,
          })
        );

        if (section4.imageBlocks && section4.imageBlocks.length > 0) {
          part4Children.push(...renderImageBlocksToDocx(section4.imageBlocks, `ภาพที่ ${numPrefix}`));
        }
      } else if (h.id === 's4_team_cv') {
        // 4.1.2 ประวัติส่วนตัวและประสบการณ์การทำงานรายบุคคล (Detailed Curriculum Vitae - CV)
        part4Children.push(
          new Paragraph({ spacing: { before: 240, after: 120 } }),
          createH3(`${numPrefix} ประวัติส่วนตัวและประสบการณ์การทำงานรายบุคคล (Curriculum Vitae - CV)`),
          ...createBodyParagraphs(
            'คณะผู้ดำเนินงานที่ได้รับการคัดเลือกเข้าร่วมโครงการ มีคุณวุฒิ ประสบการณ์ และประวัติด้านวิชาชีพตรงตามขอบเขตงาน (TOR) โดยมีรายละเอียดประวัติส่วนตัวและผลงานรายบุคคลดังต่อไปนี้'
          )
        );

        section4.teamMembers.forEach((member, idx) => {
          let photoParagraph: Paragraph;
          if (member.photoUrl) {
            try {
              const imgType = member.photoUrl.startsWith('data:image/png') ? 'png' : 'jpg';
              photoParagraph = new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new ImageRun({
                    type: imgType,
                    data: member.photoUrl,
                    transformation: {
                      width: 108,
                      height: 144,
                    },
                  }),
                ],
              });
            } catch (e) {
              console.error('Failed to parse member photo base64:', e);
              photoParagraph = new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 180, after: 180 },
                children: [
                  new TextRun({
                    text: '[ รูปถ่าย 1.5 นิ้ว ]',
                    font: FONT_FAMILY,
                    size: 20,
                    color: COLOR_MUTED,
                  }),
                ],
              });
            }
          } else {
            photoParagraph = new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { before: 180, after: 180 },
              children: [
                new TextRun({
                  text: '[ รูปถ่ายขนาด 1.5 นิ้ว ]\n(หน้าตรงทางการ)',
                  font: FONT_FAMILY,
                  size: 20,
                  color: COLOR_MUTED,
                }),
              ],
            });
          }

          const leftPhotoCell = new TableCell({
            width: { size: 24, type: WidthType.PERCENTAGE },
            verticalAlign: AlignmentType.CENTER,
            shading: { fill: 'F8FAFC' },
            margins: { top: 120, bottom: 120, left: 120, right: 120 },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' },
              bottom: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' },
              left: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' },
              right: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' },
            },
            children: [
              photoParagraph,
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 60 },
                children: [
                  new TextRun({
                    text: `ลำดับที่ ${idx + 1}`,
                    font: FONT_FAMILY,
                    size: 20,
                    bold: true,
                    color: COLOR_PRIMARY,
                  }),
                ],
              }),
            ],
          });

          const rightInfoParagraphs: Paragraph[] = [
            new Paragraph({
              spacing: { before: 40, after: 60 },
              children: [
                new TextRun({
                  text: member.name,
                  font: FONT_FAMILY,
                  size: 28,
                  bold: true,
                  color: COLOR_PRIMARY,
                }),
              ],
            }),
            new Paragraph({
              spacing: { before: 30, after: 30 },
              children: [
                new TextRun({ text: '• ตำแหน่งในโครงการ: ', font: FONT_FAMILY, size: 24, bold: true, color: COLOR_TEXT }),
                new TextRun({ text: member.proposedRole, font: FONT_FAMILY, size: 24, bold: true, color: COLOR_SECONDARY }),
              ],
            }),
            new Paragraph({
              spacing: { before: 30, after: 30 },
              children: [
                new TextRun({ text: '• อายุงานและประสบการณ์: ', font: FONT_FAMILY, size: 24, bold: true, color: COLOR_TEXT }),
                new TextRun({
                  text: `${member.experienceYears} ปี${member.startWorkYearBE ? ` (เริ่มงานปี พ.ศ. ${member.startWorkYearBE})` : ''}`,
                  font: FONT_FAMILY,
                  size: 24,
                  color: COLOR_TEXT,
                }),
              ],
            }),
            new Paragraph({
              spacing: { before: 30, after: 30 },
              children: [
                new TextRun({ text: '• วุฒิการศึกษา: ', font: FONT_FAMILY, size: 24, bold: true, color: COLOR_TEXT }),
                new TextRun({ text: member.education, font: FONT_FAMILY, size: 24, color: COLOR_TEXT }),
              ],
            }),
            new Paragraph({
              spacing: { before: 30, after: 30 },
              children: [
                new TextRun({ text: '• ใบรับรองมาตรฐานวิชาชีพ: ', font: FONT_FAMILY, size: 24, bold: true, color: COLOR_TEXT }),
                new TextRun({ text: member.certifications || '-', font: FONT_FAMILY, size: 24, color: COLOR_TEXT }),
              ],
            }),
            new Paragraph({
              spacing: { before: 40, after: 30 },
              children: [
                new TextRun({ text: '• ประวัติส่วนตัว: ', font: FONT_FAMILY, size: 24, bold: true, color: COLOR_TEXT }),
                new TextRun({
                  text: member.personalBio || 'มีความรู้ความสามารถและประสบการณ์ตรงในการพัฒนาระบบเทคโนโลยีสารสนเทศภาครัฐ',
                  font: FONT_FAMILY,
                  size: 24,
                  color: COLOR_TEXT,
                }),
              ],
            }),
            new Paragraph({
              spacing: { before: 30, after: 30 },
              children: [
                new TextRun({ text: '• หน้าที่ความรับผิดชอบในโครงการ: ', font: FONT_FAMILY, size: 24, bold: true, color: COLOR_TEXT }),
                new TextRun({ text: member.responsibilities, font: FONT_FAMILY, size: 24, color: COLOR_TEXT }),
              ],
            }),
            new Paragraph({
              spacing: { before: 30, after: 30 },
              children: [
                new TextRun({ text: '• ประสบการณ์และผลงานเด่น: ', font: FONT_FAMILY, size: 24, bold: true, color: COLOR_TEXT }),
                new TextRun({ text: member.highlightProjects, font: FONT_FAMILY, size: 24, color: COLOR_TEXT }),
              ],
            }),
          ];

          const rightInfoCell = new TableCell({
            width: { size: 76, type: WidthType.PERCENTAGE },
            margins: { top: 120, bottom: 120, left: 160, right: 120 },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' },
              bottom: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' },
              left: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' },
              right: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' },
            },
            children: rightInfoParagraphs,
          });

          const cvCardTable = new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [leftPhotoCell, rightInfoCell],
              }),
            ],
          });

          part4Children.push(
            cvCardTable,
            new Paragraph({ spacing: { after: 180 }, children: [] })
          );
        });
      } else if (h.id === 's4_risk') {
        part4Children.push(
          new Paragraph({ spacing: { before: 200, after: 120 } }),
          createH2(`${numPrefix} แผนการบริหารจัดการความเสี่ยงโครงการ (Risk Management Plan)`),
          ...createBodyParagraphs(
            'เพื่อให้การดำเนินโครงการบรรลุวัตถุประสงค์ตามกรอบระยะเวลาและงบประมาณที่กำหนด บริษัทฯ ได้วิเคราะห์และกำหนดมาตรการบริหารความเสี่ยงครอบคลุมทั้ง 5 มิติดังนี้'
          )
        );

        const riskRows = [
          createHeaderRow([
            createHeaderCell('หมวดความเสี่ยง', 18),
            createHeaderCell('ประเด็นความเสี่ยง', 26),
            createHeaderCell('โอกาส/ผลกระทบ', 16),
            createHeaderCell('มาตรการป้องกันและแผนรองรับ', 40),
          ]),
        ];

        section4.riskItems.forEach((r) => {
          riskRows.push(
            createDataRow([
              createDataCell(r.category, 18, { bold: true }),
              createDataCell(r.riskTitle, 26),
              createDataCell(`${r.likelihood} / ${r.impact}`, 16, { align: AlignmentType.CENTER }),
              createDataCell(r.mitigationPlan, 40),
            ])
          );
        });

        part4Children.push(
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: riskRows,
          })
        );
      } else if (h.id === 's4_compliance') {
        part4Children.push(
          new Paragraph({ spacing: { before: 240, after: 120 } }),
          createH2(`${numPrefix} ตารางเปรียบเทียบข้อเสนอโครงการกับข้อกำหนด TOR (Compliance Matrix)`),
          ...createBodyParagraphs(
            section4.complianceMatrixOverview ||
              'ตารางเปรียบเทียบการตอบสนองข้อกำหนด TOR โดยระบุสถานะการยอมรับปฏิบัติตาม และรายละเอียดข้อเสนอทางเทคนิคที่บริษัทฯ เสนอให้เหนือกว่าเกณฑ์มาตรฐานที่ TOR กำหนด'
          )
        );

        const compRows = [
          createHeaderRow([
            createHeaderCell('ข้อกำหนดตามประกาศจัดจ้าง (TOR)', 38),
            createHeaderCell('สถานะการตอบสนอง', 26),
            createHeaderCell('รายละเอียดข้อเสนอทางเทคนิค / สิ่งที่เสนอดีกว่า TOR', 36),
          ]),
        ];

        (section1.scopeItems || []).forEach((item) => {
          const isExceed = item.complianceStatus === 'exceed';
          const statusText = isExceed
            ? '★ ยอมรับและเสนอแนวทางดีกว่า TOR'
            : '✓ ยอมรับและปฏิบัติตาม TOR ครบถ้วน';
          const statusColor = isExceed ? 'B45309' : '1E40AF';
          const noteText =
            item.complianceNote ||
            (isExceed ? 'เสนอแนวทางและระดับมาตรฐานสูงกว่าเกณฑ์ที่กำหนด' : 'ปฏิบัติตามมาตรฐาน TOR อย่างเคร่งครัด');

          compRows.push(
            createDataRow([
              createDataCell(`${formatTorClauseNumber(item.clauseNumber)}: ${item.title || item.requirement}`, 38, {
                bold: item.level === 1,
              }),
              createDataCell(statusText, 26, {
                align: AlignmentType.CENTER,
                bold: true,
                color: statusColor,
              }),
              createDataCell(noteText, 36, {
                color: isExceed ? 'B45309' : undefined,
                bold: isExceed,
              }),
            ])
          );
        });

        part4Children.push(
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: compRows,
          })
        );
      }
    });
  }

  // =========================================================================
  // SECTION 5A (PORTRAIT - แนวตั้ง): 5.1 ข้อมูลบริษัท, โลโก้, รูปสำนักงาน, 5.2 มาตรฐาน
  // SECTION 5B (LANDSCAPE - แนวนอน): 5.3 ผลงานและประสบการณ์ที่เกี่ยวข้อง (ตารางสัญญาจ้าง)
  // SECTION 6 (PORTRAIT - แนวตั้ง): ภาคผนวก ก & ปกหลัง
  // =========================================================================
  const part5AChildren: (Paragraph | Table)[] = [];
  const part5BChildren: (Paragraph | Table)[] = [];
  const part6Children: (Paragraph | Table)[] = [];

  const s5Config = docStructure.sections.find((s) => s.id === 'section5');
  if (s5Config && s5Config.enabled) {
    const is5AActive = s5Config.headings.some(
      (h) => (h.id === 's5_profile' || h.id === 's5_certifications') && h.enabled
    );
    if (is5AActive) {
      part5AChildren.push(
        createSectionHeader('ส่วนที่ 5', 'ประวัติและประสบการณ์ของบริษัทที่เกี่ยวข้อง')
      );
    }

    const activeS5Headings = s5Config.headings
      .filter((h) => h.enabled)
      .sort((a, b) => a.order - b.order);

    const currentYearBE = 2568;
    const selectedProjects = (section5.pastProjects || []).filter((p) => p.isSelected);

    const torReferenceProjects = selectedProjects.filter(
      (p) => (p.projectType || 'tor_reference') === 'tor_reference' &&
        (section5.maxYearsFilter > 0 ? currentYearBE - p.completionYearBE <= section5.maxYearsFilter : true)
    );

    const supplementaryProjects = selectedProjects.filter(
      (p) => p.projectType === 'supplementary'
    );

    const has53 = activeS5Headings.some((h) => h.id === 's5_tor_reference' || h.id === 's5_supplementary');
    if (has53) {
      part5BChildren.push(
        createH2('5.3 ผลงานและประสบการณ์ที่เกี่ยวข้อง')
      );
    }

    activeS5Headings.forEach((h, hIdx) => {
      const numPrefix = autoRenumber ? `5.${hIdx + 1}` : h.originalCode;
      if (h.id === 's5_profile') {
        part5AChildren.push(
          createH2(`${numPrefix} ข้อมูลทั่วไปของ บริษัท ไพร์มดิจิทัลคอนซัลแทนท์ จำกัด`)
        );
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

        if (section5.imageBlocks && section5.imageBlocks.length > 0) {
          part5AChildren.push(...renderImageBlocksToDocx(section5.imageBlocks, `ภาพที่ ${numPrefix}`));
        }
      } else if (h.id === 's5_certifications') {
        part5AChildren.push(
          createH2(`${numPrefix} มาตรฐานและการรับรองคุณภาพ`)
        );
        section5.certifications.forEach((cert) => {
          part5AChildren.push(createP(`✓ ${cert}`, { spaceAfter: 60, firstLineIndent: 450, align: AlignmentType.LEFT }));
        });
      } else if (h.id === 's5_tor_reference') {
        part5BChildren.push(
          new Paragraph({
            heading: HeadingLevel.HEADING_3,
            spacing: { before: 140, after: 80, line: 240, lineRule: LineRuleType.AUTO },
            children: [
              new TextRun({
                text: `${autoRenumber ? '5.3.1' : numPrefix} ผลงานอ้างอิงหลักตามเกณฑ์ TOR (ย้อนหลังไม่เกิน ${section5.maxYearsFilter} ปี พ.ศ. ${currentYearBE - section5.maxYearsFilter} - ${currentYearBE})`,
                font: FONT_FAMILY,
                size: 30,
                bold: true,
                color: COLOR_PRIMARY,
              }),
            ],
          }),
          ...createBodyParagraphs(`บริษัทฯ ขอเสนอผลงานที่มีขอบเขตงานและลักษณะงานสอดคล้องกับข้อกำหนดของ TOR โดยเป็นผลงานที่แล้วเสร็จย้อนหลังไม่เกิน ${section5.maxYearsFilter} ปี พร้อมทั้งได้แนบสำเนาสัญญาจ้างและหนังสือรับรองผลงานไว้ในภาคผนวก ก ของข้อเสนอนี้อย่างครบถ้วน`)
        );

        // 1) ตารางสรุปโครงการที่ใช้อ้างอิง (ลำดับ, ชื่อโครงการ, หน่วยงาน, ปี, มูลค่าสัญญา, หลักฐาน)
        const torRefRows = [
          createHeaderRow([
            createHeaderCell('ลำดับ', 6),
            createHeaderCell('ชื่อโครงการ', 34),
            createHeaderCell('หน่วยงาน', 22),
            createHeaderCell('ปี', 8),
            createHeaderCell('มูลค่าสัญญา', 15),
            createHeaderCell('หลักฐาน', 15),
          ]),
        ];

        torReferenceProjects.forEach((proj, idx) => {
          const hasCert = !!proj.certificateFileUrl;
          torRefRows.push(
            createDataRow([
              createDataCell(String(idx + 1), 6, { align: AlignmentType.CENTER, bold: true }),
              createDataCell(proj.projectName, 34, { bold: true }),
              createDataCell(proj.clientName, 22),
              createDataCell(`พ.ศ. ${proj.completionYearBE}`, 8, { align: AlignmentType.CENTER }),
              createDataCell(`${proj.contractValue.toLocaleString()} บาท`, 15, { align: AlignmentType.RIGHT, bold: true }),
              createDataCell(hasCert ? '✓ มีแนบในภาคผนวก ก' : (proj.certificateFileName || 'หนังสือรับรองผลงาน'), 15, { align: AlignmentType.CENTER, bold: hasCert }),
            ])
          );
        });

        part5BChildren.push(
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: torRefRows,
          })
        );

        // 2) รายละเอียดโครงการแต่ละโครงการตามตารางข้างต้น
        //    (ชื่อโครงการ -> โลโกหน่วยงาน ตรงกลางหน้า -> รายละเอียดโครงการ -> ภาพประกอบ)
        torReferenceProjects.forEach((proj, idx) => {
          // (ก) ชื่อโครงการ
          part5BChildren.push(
            new Paragraph({
              heading: HeadingLevel.HEADING_3,
              spacing: { before: 240, after: 80, line: 240, lineRule: LineRuleType.AUTO },
              children: [
                new TextRun({
                  text: `5.3.1.${idx + 1} โครงการที่ ${idx + 1}: ${proj.projectName}`,
                  font: FONT_FAMILY,
                  size: 30,
                  bold: true,
                  color: COLOR_PRIMARY,
                }),
              ],
            })
          );

          // (ข) โลโกหน่วยงาน (ตรงกลางหน้า)
          part5BChildren.push(...createCenteredClientLogo(proj.clientLogoUrl, proj.clientName));

          // (ค) รายละเอียดโครงการ (ตารางคุณสมบัติ 2 คอลัมน์ และข้อความพรรณา/ตาราง/บูลเล็ต)
          part5BChildren.push(
            createProjectDetailTable([
              { label: 'ชื่อโครงการ', value: proj.projectName },
              { label: 'หน่วยงานผู้ว่าจ้าง', value: proj.clientName },
              { label: 'ปีที่แล้วเสร็จ', value: `พ.ศ. ${proj.completionYearBE}` },
              { label: 'มูลค่าสัญญา', value: `${proj.contractValue.toLocaleString()} บาท` },
              { label: 'ระยะเวลาดำเนินงาน', value: proj.periodDuration || '-' },
              {
                label: 'หลักฐานสัญญา/รับรอง',
                value: proj.certificateFileUrl
                  ? 'มีแนบสำเนาสัญญาจ้าง/หนังสือรับรองผลงานในภาคผนวก ก ของเล่มข้อเสนอนี้'
                  : (proj.certificateFileName || 'หนังสือรับรองผลงาน / สำเนาสัญญาจ้าง'),
              },
            ]),
            new Paragraph({
              spacing: { before: 140, after: 60, line: 240, lineRule: LineRuleType.AUTO },
              children: [
                new TextRun({
                  text: 'รายละเอียดโครงการและขอบเขตการดำเนินงาน:',
                  font: FONT_FAMILY,
                  size: 28, // 14pt
                  bold: true,
                  color: COLOR_PRIMARY,
                }),
              ],
            }),
            ...renderMethodologyParagraphsAndTables(proj.description)
          );


          // (ง) ภาพประกอบ
          const blocksToRender: ReportImageBlock[] = [];
          if (proj.imageBlocks !== undefined) {
            blocksToRender.push(...proj.imageBlocks);
          } else if (proj.projectImageUrl) {
            blocksToRender.push({
              id: `img-${proj.id}`,
              type: 'single',
              url: proj.projectImageUrl,
              caption: proj.projectImageCaption || `ภาพที่ 5-1.${idx + 1} ภาพหน้าจอระบบ/ผลงาน: ${proj.projectName}`,
            });
          }

          if (blocksToRender.length > 0) {
            part5BChildren.push(
              ...renderImageBlocksToDocx(blocksToRender, `ภาพที่ 5-1.${idx + 1}`)
            );
          }
        });
      } else if (h.id === 's5_supplementary') {
        if (supplementaryProjects.length > 0) {
          part5BChildren.push(
            new Paragraph({
              pageBreakBefore: true,
              heading: HeadingLevel.HEADING_3,
              spacing: { before: 200, after: 80, line: 240, lineRule: LineRuleType.AUTO },
              children: [
                new TextRun({
                  text: `${autoRenumber ? '5.3.2' : numPrefix} ผลงานและประสบการณ์เสริมที่สอดคล้องกับงานจ้างโครงการนี้ (Supplementary Experience)`,
                  font: FONT_FAMILY,
                  size: 30,
                  bold: true,
                  color: COLOR_PRIMARY,
                }),
              ],
            }),
            ...createBodyParagraphs('ผลงานเพิ่มเติมที่มีกิจกรรม เทคโนโลยี หรือแนวทางการดำเนินงานที่สอดคล้องและเป็นประโยชน์ต่อโครงการจ้างนี้เพื่อประกอบการพิจารณาความพร้อมและความเชี่ยวชาญ')
          );

          // 1) ตารางสรุปโครงการผลงานเสริม (ลำดับ, ชื่อโครงการ, หน่วยงาน, ปี, มูลค่าสัญญา, หลักฐาน / กิจกรรมที่สอดคล้อง)
          const suppRows = [
            createHeaderRow([
              createHeaderCell('ลำดับ', 6),
              createHeaderCell('ชื่อโครงการ', 32),
              createHeaderCell('หน่วยงาน', 20),
              createHeaderCell('ปี', 8),
              createHeaderCell('มูลค่าสัญญา', 16),
              createHeaderCell('หลักฐาน / กิจกรรมที่สอดคล้อง', 18),
            ]),
          ];

          supplementaryProjects.forEach((proj, idx) => {
            const hasCert = !!proj.certificateFileUrl;
            suppRows.push(
              createDataRow([
                createDataCell(String(idx + 1), 6, { align: AlignmentType.CENTER, bold: true }),
                createDataCell(proj.projectName, 32, { bold: true }),
                createDataCell(proj.clientName, 20),
                createDataCell(`พ.ศ. ${proj.completionYearBE}`, 8, { align: AlignmentType.CENTER }),
                createDataCell(`${proj.contractValue.toLocaleString()} บาท`, 16, { align: AlignmentType.RIGHT }),
                createDataCell(proj.relevanceNote || (hasCert ? '✓ มีแนบในภาคผนวก ก' : 'หนังสือรับรองผลงาน'), 18),
              ])
            );
          });

          part5BChildren.push(
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              rows: suppRows,
            })
          );

          // 2) รายละเอียดโครงการแต่ละโครงการผลงานเสริม (นำเสนอเหมือนกัน)
          //    (ชื่อโครงการ -> โลโกหน่วยงาน ตรงกลางหน้า -> รายละเอียดโครงการ -> ภาพประกอบ)
          supplementaryProjects.forEach((proj, idx) => {
            // (ก) ชื่อโครงการ
            part5BChildren.push(
              new Paragraph({
                heading: HeadingLevel.HEADING_3,
                spacing: { before: 240, after: 80, line: 240, lineRule: LineRuleType.AUTO },
                children: [
                  new TextRun({
                    text: `5.3.2.${idx + 1} โครงการเสริมที่ ${idx + 1}: ${proj.projectName}`,
                    font: FONT_FAMILY,
                    size: 30,
                    bold: true,
                    color: COLOR_PRIMARY,
                  }),
                ],
              })
            );

            // (ข) โลโกหน่วยงาน (ตรงกลางหน้า)
            part5BChildren.push(...createCenteredClientLogo(proj.clientLogoUrl, proj.clientName));

            // (ค) รายละเอียดโครงการ (ตารางคุณสมบัติ 2 คอลัมน์ และข้อความพรรณา/ตาราง/บูลเล็ต)
            part5BChildren.push(
              createProjectDetailTable([
                { label: 'ชื่อโครงการ', value: proj.projectName },
                { label: 'หน่วยงานผู้ว่าจ้าง', value: proj.clientName },
                { label: 'ปีที่แล้วเสร็จ', value: `พ.ศ. ${proj.completionYearBE}` },
                { label: 'มูลค่าสัญญา', value: `${proj.contractValue.toLocaleString()} บาท` },
                { label: 'ระยะเวลาดำเนินงาน', value: proj.periodDuration || '-' },
                { label: 'กิจกรรมและประเด็นที่สอดคล้องกับงานจ้าง', value: proj.relevanceNote || '-' },
                {
                  label: 'หลักฐานสัญญา/รับรอง',
                  value: proj.certificateFileUrl
                    ? 'มีแนบสำเนาสัญญา/หนังสือรับรองผลงาน'
                    : (proj.certificateFileName || 'หนังสือรับรองผลงาน / สัญญาจ้าง'),
                },
              ]),
              new Paragraph({
                spacing: { before: 140, after: 60, line: 240, lineRule: LineRuleType.AUTO },
                children: [
                  new TextRun({
                    text: 'รายละเอียดโครงการและขอบเขตการดำเนินงาน:',
                    font: FONT_FAMILY,
                    size: 28, // 14pt
                    bold: true,
                    color: COLOR_PRIMARY,
                  }),
                ],
              }),
              ...renderMethodologyParagraphsAndTables(proj.description)
            );


            // (ง) ภาพประกอบ
            const blocksToRender: ReportImageBlock[] = [];
            if (proj.imageBlocks !== undefined) {
              blocksToRender.push(...proj.imageBlocks);
            } else if (proj.projectImageUrl) {
              blocksToRender.push({
                id: `img-${proj.id}`,
                type: 'single',
                url: proj.projectImageUrl,
                caption: proj.projectImageCaption || `ภาพที่ 5-2.${idx + 1} ภาพผลงานเสริม: ${proj.projectName}`,
              });
            }

            if (blocksToRender.length > 0) {
              part5BChildren.push(
                ...renderImageBlocksToDocx(blocksToRender, `ภาพที่ 5-2.${idx + 1}`)
              );
            }
          });
        }
      } else if (h.id === 's5_appendix_certs') {
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
      }
    });
  }

  // 1. หน้าปก A4 เต็มหน้า (แทรกก่อนหน้าหัวข้อโครงการ)
  let frontCoverSection: ISectionOptions | null = null;
  if (cover.coverImage) {
    try {
      const coverBytes = base64ToUint8Array(cover.coverImage);
      frontCoverSection = {
        properties: {
          page: {
            size: { orientation: PageOrientation.PORTRAIT },
            margin: { top: 0, bottom: 0, left: 0, right: 0 },
          },
        },
        headers: { default: new Header({ children: [] }) },
        footers: { default: new Footer({ children: [] }) },
        children: [
          new Paragraph({
            spacing: { before: 0, after: 0, line: 0 },
            children: [
              new ImageRun({
                data: coverBytes,
                transformation: { width: 794, height: 1123 }, // A4 Portrait 794 x 1123 px at 96 DPI
                floating: {
                  horizontalPosition: {
                    relative: HorizontalPositionRelativeFrom.PAGE,
                    align: HorizontalPositionAlign.LEFT,
                    offset: 0,
                  },
                  verticalPosition: {
                    relative: VerticalPositionRelativeFrom.PAGE,
                    align: VerticalPositionAlign.TOP,
                    offset: 0,
                  },
                  wrap: {
                    type: TextWrappingType.NONE,
                  },
                },
              } as any),
            ],
          }),
        ],
      };
    } catch (e) {
      console.warn('Failed to embed full-page front cover', e);
    }
  }

  // 2. ปกหลัง (ถ้ามีภาพปกหลัง จะทำเป็นหน้า A4 เต็มหน้าในหน้าสุดท้าย)
  let backCoverSection: ISectionOptions | null = null;
  if (cover.includeBackCover && cover.backCoverImage) {
    try {
      const backBytes = base64ToUint8Array(cover.backCoverImage);
      backCoverSection = {
        properties: {
          page: {
            size: { orientation: PageOrientation.PORTRAIT },
            margin: { top: 0, bottom: 0, left: 0, right: 0 },
          },
        },
        headers: { default: new Header({ children: [] }) },
        footers: { default: new Footer({ children: [] }) },
        children: [
          new Paragraph({
            spacing: { before: 0, after: 0, line: 0 },
            children: [
              new ImageRun({
                data: backBytes,
                transformation: { width: 794, height: 1123 }, // A4 Portrait 794 x 1123 px at 96 DPI
                floating: {
                  horizontalPosition: {
                    relative: HorizontalPositionRelativeFrom.PAGE,
                    align: HorizontalPositionAlign.LEFT,
                    offset: 0,
                  },
                  verticalPosition: {
                    relative: VerticalPositionRelativeFrom.PAGE,
                    align: VerticalPositionAlign.TOP,
                    offset: 0,
                  },
                  wrap: {
                    type: TextWrappingType.NONE,
                  },
                },
              } as any),
            ],
          }),
        ],
      };
    } catch (e) {
      console.warn('Failed to embed full-page back cover', e);
    }
  } else if (cover.includeBackCover && !cover.backCoverImage) {
    // ปกหลังเริ่มต้นแบบทางการของบริษัท
    part6Children.push(new Paragraph({ children: [new PageBreak()] }));
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

  // Construct sections array dynamically
  const docSections: ISectionOptions[] = [];

  // Section 0: หน้าปก A4 เต็มหน้า (ถ้ามี - แทรกก่อนหน้าหัวข้อโครงการ)
  if (frontCoverSection) {
    docSections.push(frontCoverSection);
  }

  // Section 1: Portrait (หน้าหัวข้อโครงการและข้อมูลผู้ว่าจ้าง, สารบัญ, และ ส่วนที่ 1)
  docSections.push({
    properties: {
      page: {
        size: { orientation: PageOrientation.PORTRAIT },
        margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 },
      },
      titlePage: true, // First page (Title page) does not have letterhead background
    },
    headers: {
      default: createCommonHeader(false),
      first: new Header({ children: [] }),
    },
    footers: {
      default: createCommonFooter(),
      first: new Footer({ children: [] }),
    },
    children: part1Children,
  });

  if (part2Children.length > 0) {
    docSections.push({
      properties: {
        page: {
          size: { orientation: PageOrientation.LANDSCAPE },
          margin: { top: 1000, bottom: 1000, left: 1080, right: 1080 },
        },
      },
      headers: { default: createCommonHeader(true) },
      footers: { default: createCommonFooter() },
      children: part2Children,
    });
  }

  if (part3Children.length > 0) {
    docSections.push({
      properties: {
        page: {
          size: { orientation: PageOrientation.PORTRAIT },
          margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 },
        },
      },
      headers: { default: createCommonHeader(false) },
      footers: { default: createCommonFooter() },
      children: part3Children,
    });
  }

  if (part4Children.length > 0) {
    docSections.push({
      properties: {
        page: {
          size: { orientation: PageOrientation.LANDSCAPE },
          margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 },
        },
      },
      headers: { default: createCommonHeader(true) },
      footers: { default: createCommonFooter() },
      children: part4Children,
    });
  }

  if (part5AChildren.length > 0) {
    docSections.push({
      properties: {
        page: {
          size: { orientation: PageOrientation.PORTRAIT },
          margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 },
        },
      },
      headers: { default: createCommonHeader(false) },
      footers: { default: createCommonFooter() },
      children: part5AChildren,
    });
  }

  if (part5BChildren.length > 0) {
    docSections.push({
      properties: {
        page: {
          size: { orientation: PageOrientation.LANDSCAPE },
          margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 },
        },
      },
      headers: { default: createCommonHeader(true) },
      footers: { default: createCommonFooter() },
      children: part5BChildren,
    });
  }

  if (part6Children.length > 0) {
    docSections.push({
      properties: {
        page: {
          size: { orientation: PageOrientation.PORTRAIT },
          margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 },
        },
      },
      headers: { default: createCommonHeader(false) },
      footers: { default: createCommonFooter() },
      children: part6Children,
    });
  }

  // Section สุดท้าย: ปกหลัง A4 เต็มหน้า (ถ้ามี)
  if (backCoverSection) {
    docSections.push(backCoverSection);
  }

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
    sections: docSections,
  });

  const blob = await Packer.toBlob(doc);
  const fileName = `ข้อเสนอโครงการ_${cover.projectTitle.replace(/[\/\\?%*:|"<>]/g, '_').substring(0, 40)}_${cover.projectCode}.docx`;
  saveAs(blob, fileName);
}
