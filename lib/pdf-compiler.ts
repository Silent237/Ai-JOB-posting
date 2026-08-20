import { exec } from 'child_process';
import util from 'util';
import fs from 'fs';
import path from 'path';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { getProfile } from './db';
import { stripLatex } from './latex-parser';

const execPromise = util.promisify(exec);

export async function compileLaTeXToPDF(latexContent: string, outputDir: string, filenameBase: string): Promise<string> {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const texPath = path.join(outputDir, `${filenameBase}.tex`);
  const pdfPath = path.join(outputDir, `${filenameBase}.pdf`);

  fs.writeFileSync(texPath, latexContent, 'utf-8');

  // 1. Attempt native pdflatex or tectonic if available
  try {
    const cwd = outputDir;
    await execPromise(`pdflatex -interaction=nonstopmode -output-directory="${cwd}" "${texPath}"`, { timeout: 10000 });
    if (fs.existsSync(pdfPath)) {
      return pdfPath;
    }
  } catch {}

  try {
    const cwd = outputDir;
    await execPromise(`tectonic -o "${cwd}" "${texPath}"`, { timeout: 10000 });
    if (fs.existsSync(pdfPath)) {
      return pdfPath;
    }
  } catch {}

  // 2. High-fidelity Pixel-Perfect PDF Renderer
  const pdfDoc = await PDFDocument.create();
  let page = pdfDoc.addPage([595.28, 841.89]); // A4 Size (595.28 x 841.89 pt)
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const { width, height } = page.getSize();
  const margin = 40;
  const contentWidth = width - margin * 2;
  let y = height - margin;

  const profile = getProfile();
  const candidateName = profile?.name || 'Vinayak Srivastava';
  const email = profile?.email || 'vinayaksrivastava063@gmail.com';
  const phone = profile?.phone || '7275095741';
  const linkedin = profile?.linkedin || 'linkedin.com/in/vinayak-srivastava-silent';
  const github = profile?.github || 'github.com/Silent237';

  // --- HEADER SECTION ---
  page.drawText(candidateName, {
    x: margin,
    y,
    size: 21,
    font: boldFont,
    color: rgb(0.086, 0.156, 0.47), // #162878 (hdrblue)
  });
  y -= 16;

  const contactText = `Email: ${email}   |   Mobile: ${phone}`;
  page.drawText(contactText, {
    x: margin,
    y,
    size: 9,
    font,
    color: rgb(0.25, 0.25, 0.25),
  });
  y -= 12;

  const linksText = `LinkedIn: ${linkedin}   |   GitHub: ${github}`;
  page.drawText(linksText, {
    x: margin,
    y,
    size: 9,
    font,
    color: rgb(0.1, 0.05, 0.67), // #1A0DAB linkblue
  });
  y -= 14;

  // Header Divider Bar
  page.drawLine({
    start: { x: margin, y },
    end: { x: width - margin, y },
    thickness: 1.5,
    color: rgb(0.086, 0.156, 0.47),
  });
  y -= 18;

  // Clean raw TeX artifacts from body text
  const docMatch = latexContent.match(/\\begin\{document\}([\s\S]*?)\\end\{document\}/i);
  const bodySource = docMatch ? docMatch[1] : latexContent;
  const cleanBodyText = stripLatex(bodySource);

  // Split into clean structural lines
  const lines = cleanBodyText
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0);

  const isSectionHeader = (line: string) => {
    const u = line.toUpperCase();
    return (
      u === 'SUMMARY' ||
      u === 'TECHNICAL SKILLS' ||
      u === 'PROFESSIONAL EXPERIENCE' ||
      u === 'PROJECTS' ||
      u === 'EDUCATION'
    );
  };

  // Find index of first actual content section to skip old LaTeX header artifacts completely
  const firstSectionIdx = lines.findIndex(l => isSectionHeader(l));
  const bodyLines = firstSectionIdx >= 0 ? lines.slice(firstSectionIdx) : lines;

  const isCompanyHeader = (line: string) => {
    return (
      line.startsWith('WeKnow Technologies') ||
      line.startsWith('Outlier') ||
      line.startsWith('Oasis Infobyte') ||
      line.startsWith('Drycode Pvt. Limited') ||
      line.startsWith('School of Management Sciences')
    );
  };

  for (let i = 0; i < bodyLines.length; i++) {
    const line = bodyLines[i];

    // Page break handling (A4 page limit safeguard)
    if (y < margin + 35) {
      page = pdfDoc.addPage([595.28, 841.89]);
      y = height - margin;
    }

    if (isSectionHeader(line)) {
      y -= 8;
      // Section Heading (hdrpurple #5E238C)
      page.drawText(line.toUpperCase(), {
        x: margin,
        y,
        size: 11,
        font: boldFont,
        color: rgb(0.368, 0.137, 0.549),
      });
      y -= 3;
      page.drawLine({
        start: { x: margin, y },
        end: { x: width - margin, y },
        thickness: 0.75,
        color: rgb(0.75, 0.75, 0.82),
      });
      y -= 14;
    } else if (line.startsWith('•')) {
      // Bullet Item
      const bulletContent = line.replace(/^•\s*/, '');
      y = drawWrappedText(page, `•  ${bulletContent}`, margin + 12, y, contentWidth - 12, font, 9, rgb(0.2, 0.2, 0.2), boldFont);
    } else if (line.includes(':') && line.length < 100 && !line.includes('http')) {
      // Skill category or key-value pair
      const colonIdx = line.indexOf(':');
      const label = line.slice(0, colonIdx + 1);
      const val = line.slice(colonIdx + 1).trim();

      page.drawText(label, { x: margin, y, size: 9, font: boldFont, color: rgb(0.15, 0.15, 0.15) });
      const labelWidth = boldFont.widthOfTextAtSize(label, 9);
      y = drawWrappedText(page, val, margin + labelWidth + 4, y, contentWidth - labelWidth - 4, font, 9, rgb(0.2, 0.2, 0.2), boldFont);
    } else if (isCompanyHeader(line)) {
      // Company or Institution Sub-heading
      y -= 3;
      page.drawText(line, { x: margin, y, size: 10, font: boldFont, color: rgb(0.086, 0.156, 0.47) });
      y -= 13;
    } else {
      // Body Text Paragraph
      y = drawWrappedText(page, line, margin, y, contentWidth, font, 9, rgb(0.22, 0.22, 0.22), boldFont);
    }
  }

  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync(pdfPath, pdfBytes);
  return pdfPath;
}

function drawWrappedText(
  page: any,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  font: any,
  fontSize: number,
  color: any,
  boldFont: any
): number {
  const words = text.split(' ');
  let currentLine = '';

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const testWidth = font.widthOfTextAtSize(testLine, fontSize);

    if (testWidth > maxWidth && currentLine) {
      page.drawText(currentLine, { x, y, size: fontSize, font, color });
      y -= fontSize + 3.5;
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }

  if (currentLine) {
    page.drawText(currentLine, { x, y, size: fontSize, font, color });
    y -= fontSize + 5;
  }

  return y;
}
