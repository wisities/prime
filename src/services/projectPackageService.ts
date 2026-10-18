import JSZip from 'jszip';
import saveAs from 'file-saver';
import { BiddingProject, ProposalData } from '../types/proposal';

export interface ProjectPackageManifest {
  version: string;
  app: string;
  exportedAt: string;
  projectId: string;
  projectCode: string;
  projectTitle: string;
  hasCertificates: boolean;
  certificateCount: number;
}

/**
 * Exports a complete BiddingProject as a compressed .prime archive package
 * containing full proposal data, images, and attached certificate/contract PDFs.
 * This file can be transferred to any computer via email, LINE, thumb drive, etc.
 */
export async function exportProjectPackage(project: BiddingProject): Promise<void> {
  const zip = new JSZip();

  const selectedWithCerts = (project.proposalData?.section5?.pastProjects || []).filter(
    (p) => p.isSelected && !!p.certificateFileUrl
  );

  const manifest: ProjectPackageManifest = {
    version: '2.0',
    app: 'Prime Proposal Report',
    exportedAt: new Date().toISOString(),
    projectId: project.id,
    projectCode: project.projectCode || 'PROJECT',
    projectTitle: project.projectTitle || 'ข้อเสนอโครงการ',
    hasCertificates: selectedWithCerts.length > 0,
    certificateCount: selectedWithCerts.length,
  };

  zip.file('manifest.json', JSON.stringify(manifest, null, 2));
  zip.file('project.json', JSON.stringify(project, null, 2));

  // Also include a standalone certificates folder inside the archive for convenience
  if (selectedWithCerts.length > 0) {
    const certsFolder = zip.folder('ภาคผนวก_ก_สำเนาสัญญาและหนังสือรับรอง');
    if (certsFolder) {
      selectedWithCerts.forEach((proj, idx) => {
        if (!proj.certificateFileUrl) return;
        try {
          const isPdf =
            proj.certificateFileUrl.startsWith('data:application/pdf') ||
            (proj.certificateFileName || '').toLowerCase().endsWith('.pdf');
          const ext = isPdf ? 'pdf' : 'png';
          const cleanName = (proj.certificateFileName || `${proj.projectName || `โครงการที่_${idx + 1}`}`)
            .replace(/[/\\?%*:|"<>]/g, '_');
          const fileName = cleanName.endsWith(`.${ext}`) ? cleanName : `${cleanName}.${ext}`;

          const pureBase64 = proj.certificateFileUrl.includes(',')
            ? proj.certificateFileUrl.split(',')[1]
            : proj.certificateFileUrl;

          certsFolder.file(`${idx + 1}_${fileName}`, pureBase64, { base64: true });
        } catch (e) {
          console.warn('Failed to add certificate to package folder', e);
        }
      });
    }
  }

  const blob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  const cleanCode = (project.projectCode || 'PROJECT').replace(/[/\\?%*:|"<>]/g, '_');
  const cleanTitle = (project.projectTitle || 'Proposal').substring(0, 30).replace(/[/\\?%*:|"<>]/g, '_');
  const packageFileName = `แพ็กเกจโครงการ_${cleanCode}_${cleanTitle}.prime`;

  saveAs(blob, packageFileName);
}

/**
 * Imports a .prime package (or legacy .json project file) into a BiddingProject object
 * ready to be loaded and saved into local storage and IndexedDB.
 */
export async function importProjectPackage(file: File): Promise<BiddingProject> {
  const isZipBased = file.name.endsWith('.prime') || file.name.endsWith('.zip');

  if (isZipBased) {
    const zip = await JSZip.loadAsync(file);
    const projectJsonFile = zip.file('project.json');
    if (!projectJsonFile) {
      throw new Error('ไฟล์แพ็กเกจ .prime ไม่ถูกต้อง: ไม่พบข้อมูล project.json');
    }

    const content = await projectJsonFile.async('string');
    const project: BiddingProject = JSON.parse(content);

    if (!project || !project.proposalData) {
      throw new Error('ข้อมูลโครงการภายในแพ็กเกจไม่สมบูรณ์');
    }

    return project;
  }

  // Handle plain .json files for backward compatibility
  const text = await file.text();
  const parsed = JSON.parse(text);

  if (Array.isArray(parsed) && parsed.length > 0) {
    return parsed[0];
  }

  if (parsed && (parsed.proposalData || parsed.projectTitle)) {
    return parsed;
  }

  throw new Error('รูปแบบไฟล์โครงการไม่ถูกต้อง ไม่สามารถนำเข้าได้');
}

/**
 * Creates a standalone ZIP package containing:
 * 1. The Word (.docx) proposal document
 * 2. A folder of all attached contract & certificate PDFs/images
 */
export async function exportProposalWithAnnexZip(
  docxBlob: Blob,
  docxFileName: string,
  proposalData: ProposalData
): Promise<void> {
  const zip = new JSZip();

  // 1. Add DOCX
  zip.file(docxFileName, docxBlob);

  // 2. Add Certificates folder
  const selectedWithCerts = (proposalData.section5?.pastProjects || []).filter(
    (p) => p.isSelected && !!p.certificateFileUrl
  );

  if (selectedWithCerts.length > 0) {
    const annexFolder = zip.folder('ภาคผนวก_ก_สำเนาสัญญาและหนังสือรับรองผลงาน');
    if (annexFolder) {
      selectedWithCerts.forEach((proj, idx) => {
        if (!proj.certificateFileUrl) return;
        try {
          const isPdf =
            proj.certificateFileUrl.startsWith('data:application/pdf') ||
            (proj.certificateFileName || '').toLowerCase().endsWith('.pdf');
          const ext = isPdf ? 'pdf' : 'png';
          const rawName = proj.certificateFileName || `เอกสารรับรอง_${proj.projectName || `ลำดับ_${idx + 1}`}`;
          const cleanName = rawName.replace(/[/\\?%*:|"<>]/g, '_');
          const fileName = cleanName.endsWith(`.${ext}`) ? cleanName : `${cleanName}.${ext}`;

          const pureBase64 = proj.certificateFileUrl.includes(',')
            ? proj.certificateFileUrl.split(',')[1]
            : proj.certificateFileUrl;

          annexFolder.file(`ก.${idx + 1}_${fileName}`, pureBase64, { base64: true });
        } catch (e) {
          console.warn('Failed to embed certificate in ZIP', e);
        }
      });
    }
  }

  const zipBlob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  const zipName = docxFileName.replace(/\.docx$/i, '_พร้อมภาคผนวกสัญญา.zip');
  saveAs(zipBlob, zipName);
}
