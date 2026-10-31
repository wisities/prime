import { PDFDocument } from 'pdf-lib';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { PastProject } from '../types/proposal';

export interface AppendixExportProgress {
  current: number;
  total: number;
  projectName: string;
  statusText: string;
}

/**
 * Helper to convert Data URL, Base64, or remote URL to Uint8Array bytes
 */
async function getBytesFromSource(sourceUrl: string): Promise<Uint8Array | null> {
  if (!sourceUrl) return null;

  try {
    if (sourceUrl.startsWith('data:')) {
      const pureBase64 = sourceUrl.includes(',') ? sourceUrl.split(',')[1] : sourceUrl;
      const binary = atob(pureBase64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      return bytes;
    } else if (sourceUrl.startsWith('http://') || sourceUrl.startsWith('https://')) {
      const resp = await fetch(sourceUrl);
      if (!resp.ok) return null;
      const ab = await resp.arrayBuffer();
      return new Uint8Array(ab);
    } else {
      // Pure base64
      const binary = atob(sourceUrl);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      return bytes;
    }
  } catch (err) {
    console.warn('getBytesFromSource failed:', err);
    return null;
  }
}

/**
 * Checks if source is a PDF
 */
function isPdfSource(url?: string, fileName?: string): boolean {
  if (!url && !fileName) return false;
  if (url && (url.startsWith('data:application/pdf') || /\.pdf(\?.*)?$/i.test(url))) return true;
  if (fileName && /\.pdf$/i.test(fileName)) return true;
  return false;
}

/**
 * Sanitize filename for safe zip packaging
 */
function sanitizeFileName(name: string): string {
  return (name || 'เอกสาร')
    .replace(/[\\/:*?"<>|]/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 80);
}

/**
 * Embeds an image (PNG or JPG) into a new single-page A4 PDF document
 */
async function createPdfFromImage(imageBytes: Uint8Array, isPng: boolean): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  // Standard A4: 595.28 x 841.89 points
  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const page = doc.addPage([pageWidth, pageHeight]);

  let embeddedImage;
  if (isPng) {
    embeddedImage = await doc.embedPng(imageBytes);
  } else {
    embeddedImage = await doc.embedJpg(imageBytes);
  }

  const margin = 36; // 0.5 inch margin
  const maxWidth = pageWidth - margin * 2;
  const maxHeight = pageHeight - margin * 2;

  const dims = embeddedImage.scaleToFit(maxWidth, maxHeight);

  const x = (pageWidth - dims.width) / 2;
  const y = (pageHeight - dims.height) / 2;

  page.drawImage(embeddedImage, {
    x,
    y,
    width: dims.width,
    height: dims.height,
  });

  return await doc.save();
}

/**
 * Merges two PDF documents into one, with certPdf first, then contractPdf
 */
async function mergeTwoPdfs(certBytes: Uint8Array, contractBytes: Uint8Array): Promise<Uint8Array> {
  const mergedPdf = await PDFDocument.create();

  // 1. Add Certificate pages first
  try {
    const certDoc = await PDFDocument.load(certBytes, { ignoreEncryption: true });
    const certPages = await mergedPdf.copyPages(certDoc, certDoc.getPageIndices());
    certPages.forEach((p) => mergedPdf.addPage(p));
  } catch (e) {
    console.warn('Failed to load certificate PDF for merging:', e);
  }

  // 2. Add Contract pages second
  try {
    const contractDoc = await PDFDocument.load(contractBytes, { ignoreEncryption: true });
    const contractPages = await mergedPdf.copyPages(contractDoc, contractDoc.getPageIndices());
    contractPages.forEach((p) => mergedPdf.addPage(p));
  } catch (e) {
    console.warn('Failed to load contract PDF for merging:', e);
  }

  return await mergedPdf.save();
}

/**
 * Exports all selected past projects' contracts and completion certificates
 * as a ZIP package containing 1 merged PDF per project.
 */
export async function exportAppendixZip(
  pastProjects: PastProject[],
  projectTitle: string = 'โครงการ',
  onProgress?: (progress: AppendixExportProgress) => void
): Promise<{ success: boolean; totalFiles: number; message?: string }> {
  const selected = (pastProjects || []).filter((p) => p.isSelected);
  if (selected.length === 0) {
    return { success: false, totalFiles: 0, message: 'ไม่มีโครงการผลงานอ้างอิงที่ถูกเลือก' };
  }

  const zip = new JSZip();
  let fileCount = 0;
  const manifestRows: string[] = [];

  manifestRows.push('========================================================================');
  manifestRows.push(`สารบัญเอกสารแนบภาคผนวก: สำเนาสัญญาจ้างและหนังสือรับรองผลงาน`);
  manifestRows.push(`สำหรับโครงการ: ${projectTitle}`);
  manifestRows.push(`วันที่ส่งออก: ${new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}`);
  manifestRows.push('========================================================================\n');

  for (let idx = 0; idx < selected.length; idx++) {
    const proj = selected[idx];
    const itemNum = String(idx + 1).padStart(2, '0');
    const pCode = proj.projectCode || `PRJ-${itemNum}`;
    const cleanTitle = sanitizeFileName(proj.projectName);

    onProgress?.({
      current: idx + 1,
      total: selected.length,
      projectName: proj.projectName,
      statusText: `กำลังเตรียมเอกสารโครงการที่ ${idx + 1}/${selected.length}: ${proj.projectName}`,
    });

    const hasCert = !!proj.certificateFileUrl;
    const hasContract = !!proj.contractFileUrl;

    if (!hasCert && !hasContract) {
      manifestRows.push(`[${itemNum}] ${pCode} - ${proj.projectName}: (ยังไม่ได้แนบสำเนาสัญญาหรือหนังสือรับรอง)`);
      continue;
    }

    let certBytes: Uint8Array | null = null;
    let contractBytes: Uint8Array | null = null;

    if (hasCert) {
      const rawBytes = await getBytesFromSource(proj.certificateFileUrl!);
      if (rawBytes) {
        if (isPdfSource(proj.certificateFileUrl, proj.certificateFileName)) {
          certBytes = rawBytes;
        } else {
          // Convert image to PDF page
          const isPng = proj.certificateFileUrl!.startsWith('data:image/png') || /\.png$/i.test(proj.certificateFileName || '');
          try {
            certBytes = await createPdfFromImage(rawBytes, isPng);
          } catch (imgErr) {
            console.warn('Image to PDF conversion error:', imgErr);
          }
        }
      }
    }

    if (hasContract) {
      const rawBytes = await getBytesFromSource(proj.contractFileUrl!);
      if (rawBytes) {
        if (isPdfSource(proj.contractFileUrl, proj.contractFileName)) {
          contractBytes = rawBytes;
        } else {
          // Convert image to PDF page
          const isPng = proj.contractFileUrl!.startsWith('data:image/png') || /\.png$/i.test(proj.contractFileName || '');
          try {
            contractBytes = await createPdfFromImage(rawBytes, isPng);
          } catch (imgErr) {
            console.warn('Image to PDF conversion error:', imgErr);
          }
        }
      }
    }

    let finalPdfBytes: Uint8Array | null = null;
    let fileSuffix = '';

    if (certBytes && contractBytes) {
      // Merge: Certificate FIRST, then Contract
      finalPdfBytes = await mergeTwoPdfs(certBytes, contractBytes);
      fileSuffix = 'หนังสือรับรองและสัญญาจ้าง';
      manifestRows.push(`[${itemNum}] ${pCode} - ${proj.projectName}: แนบครบทั้งหนังสือรับรองผลงาน (ขึ้นก่อน) และสำเนาสัญญาจ้าง`);
    } else if (certBytes && !contractBytes) {
      finalPdfBytes = certBytes;
      fileSuffix = 'หนังสือรับรองผลงาน';
      manifestRows.push(`[${itemNum}] ${pCode} - ${proj.projectName}: แนบเฉพาะหนังสือรับรองผลงาน`);
    } else if (!certBytes && contractBytes) {
      finalPdfBytes = contractBytes;
      fileSuffix = 'สำเนาสัญญาจ้าง';
      manifestRows.push(`[${itemNum}] ${pCode} - ${proj.projectName}: แนบเฉพาะสำเนาสัญญาจ้าง`);
    }

    if (finalPdfBytes) {
      const pdfFileName = `${itemNum}_[${pCode}]_${cleanTitle}_${fileSuffix}.pdf`;
      zip.file(pdfFileName, finalPdfBytes);
      fileCount++;
    }
  }

  manifestRows.push('\n------------------------------------------------------------------------');
  manifestRows.push(`รวมเอกสารภาคผนวกทั้งสิ้น: ${fileCount} ไฟล์โครงการ`);
  manifestRows.push('หมายเหตุ: เอกสารในแต่ละไฟล์ PDF ถูกจัดเรียงโดยนำหนังสือรับรองผลงานขึ้นต้น แล้วตามด้วยสำเนาสัญญาจ้าง');
  manifestRows.push('========================================================================');

  zip.file('00_สารบัญเอกสารแนบภาคผนวก.txt', manifestRows.join('\n'));

  if (fileCount === 0) {
    return {
      success: false,
      totalFiles: 0,
      message: 'ไม่พบไฟล์สำเนาสัญญาหรือหนังสือรับรองผลงานในโครงการที่เลือก',
    };
  }

  onProgress?.({
    current: selected.length,
    total: selected.length,
    projectName: 'กำลังบีบอัดไฟล์ ZIP...',
    statusText: 'กำลังจัดเตรียมไฟล์ ZIP เพื่อดาวน์โหลด...',
  });

  const zipBlob = await zip.generateAsync({ type: 'blob' }, (metadata) => {
    onProgress?.({
      current: selected.length,
      total: selected.length,
      projectName: 'สร้างไฟล์ ZIP',
      statusText: `กำลังบีบอัดข้อมูล: ${Math.round(metadata.percent)}%`,
    });
  });

  const cleanProjectName = sanitizeFileName(projectTitle);
  const zipFileName = `${cleanProjectName}_ภาคผนวก_สัญญาและหนังสือรับรอง.zip`;
  saveAs(zipBlob, zipFileName);

  return {
    success: true,
    totalFiles: fileCount,
    message: `ส่งออกเอกสารภาคผนวก ${fileCount} โครงการสำเร็จในไฟล์ ${zipFileName}`,
  };
}
