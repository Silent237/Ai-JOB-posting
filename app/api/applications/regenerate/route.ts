import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getDB, saveDB } from '@/lib/db';
import { compileLaTeXToPDF } from '@/lib/pdf-compiler';
import { saveCompanyApplicationFiles, sanitizeFolderName } from '@/lib/storage';

export async function POST() {
  try {
    const db = getDB();
    let recompiledCount = 0;

    for (const app of db.applications) {
      const cleanCompany = sanitizeFolderName(app.company);
      const outputDir = path.join(process.cwd(), 'Applications', cleanCompany);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      // Re-compile Resume.pdf using the updated clean PDF compiler
      const resumePdfPath = await compileLaTeXToPDF(app.tailoredLaTeX, outputDir, 'Resume');
      let coverPdfPath = '';

      if (app.coverLetterLaTeX) {
        coverPdfPath = await compileLaTeXToPDF(app.coverLetterLaTeX, outputDir, 'Cover_Letter');
      }

      const resumePdfBytes = fs.existsSync(resumePdfPath) ? fs.readFileSync(resumePdfPath) : undefined;
      const coverLetterPdfBytes = fs.existsSync(coverPdfPath) ? fs.readFileSync(coverPdfPath) : undefined;

      saveCompanyApplicationFiles(
        app.company,
        app.tailoredLaTeX,
        resumePdfBytes,
        coverLetterPdfBytes,
        app.coverLetterLaTeX,
        app.jobDescription
      );

      recompiledCount++;
    }

    return NextResponse.json({ success: true, count: recompiledCount, message: `Successfully re-compiled and updated ${recompiledCount} application PDFs with pixel-perfect engine!` });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
