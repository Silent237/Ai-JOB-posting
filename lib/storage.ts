import fs from 'fs';
import path from 'path';
import JSZip from 'jszip';
import { getActiveUserId, getWritableBaseDir } from '@/lib/db';

export function sanitizeFolderName(name: string): string {
  return name.replace(/[^a-zA-Z0-9_-]/g, '_').replace(/_+/g, '_');
}

export function saveCompanyApplicationFiles(
  companyName: string,
  resumeTex: string,
  resumePdfBytes?: Buffer,
  coverLetterPdfBytes?: Buffer,
  coverLetterTex?: string,
  jobDescriptionText?: string,
  candidateName: string = 'Candidate',
  userId?: string
): { folderPath: string; zipBuffer?: Buffer } {
  const targetUser = userId || getActiveUserId();
  const cleanCompany = sanitizeFolderName(companyName) || 'Company';
  const cleanCandidate = sanitizeFolderName(candidateName) || 'Candidate';

  const baseDir = getWritableBaseDir();
  const companyFolder = path.join(baseDir, 'Applications', targetUser, cleanCompany);

  try {
    if (!fs.existsSync(companyFolder)) {
      fs.mkdirSync(companyFolder, { recursive: true });
    }

    // 1. Save Resume.tex
    fs.writeFileSync(path.join(companyFolder, 'Resume.tex'), resumeTex, 'utf-8');

    // 2. Save Job_Description.txt
    if (jobDescriptionText) {
      fs.writeFileSync(path.join(companyFolder, 'Job_Description.txt'), jobDescriptionText, 'utf-8');
    }

    // 3. Save Cover_Letter.tex if available
    if (coverLetterTex) {
      fs.writeFileSync(path.join(companyFolder, 'Cover_Letter.tex'), coverLetterTex, 'utf-8');
    }

    // 4. Save Candidate Named PDF & Standard Copy
    if (resumePdfBytes) {
      fs.writeFileSync(path.join(companyFolder, `${cleanCandidate}_Resume.pdf`), resumePdfBytes);
      fs.writeFileSync(path.join(companyFolder, 'Resume.pdf'), resumePdfBytes);
    }

    // 5. Save Candidate Named Cover Letter PDF & Standard Copy
    if (coverLetterPdfBytes) {
      fs.writeFileSync(path.join(companyFolder, `${cleanCandidate}_Cover_Letter.pdf`), coverLetterPdfBytes);
      fs.writeFileSync(path.join(companyFolder, 'Cover_Letter.pdf'), coverLetterPdfBytes);
    }
  } catch (e) {
    console.error('Storage write error:', e);
  }

  return { folderPath: companyFolder };
}

export async function createCompanyZip(companyName: string, userId?: string): Promise<Buffer> {
  const targetUser = userId || getActiveUserId();
  const cleanCompany = sanitizeFolderName(companyName);
  const baseDir = getWritableBaseDir();

  let companyFolder = path.join(baseDir, 'Applications', targetUser, cleanCompany);
  if (!fs.existsSync(companyFolder)) {
    companyFolder = path.join(process.cwd(), 'Applications', cleanCompany);
  }

  const zip = new JSZip();

  try {
    if (fs.existsSync(companyFolder)) {
      const files = fs.readdirSync(companyFolder);
      files.forEach(file => {
        const filePath = path.join(companyFolder, file);
        if (fs.statSync(filePath).isFile()) {
          const content = fs.readFileSync(filePath);
          zip.file(file, content);
        }
      });
    }
  } catch (e) {
    console.error('Zip creation error:', e);
  }

  const zipUint8Array = await zip.generateAsync({ type: 'nodebuffer' });
  return zipUint8Array;
}
