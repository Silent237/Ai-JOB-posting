import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getProfile, getApplications, saveApplication, ApplicationRecord, getDB, saveDB } from '@/lib/db';
import { analyzeJobDescription, auditCVAgainstJD, generateCoverLetter, generateColdEmail } from '@/lib/ai-engine';
import { tailorLaTeXCV } from '@/lib/latex-parser';
import { compileLaTeXToPDF } from '@/lib/pdf-compiler';
import { saveCompanyApplicationFiles, sanitizeFolderName } from '@/lib/storage';

export async function GET() {
  const applications = getApplications();
  return NextResponse.json({ applications });
}

export async function POST(req: Request) {
  try {
    const { company, position, jobDescription, jobUrl, recruiterEmail, recruiterName } = await req.json();

    if (!company || !position || !jobDescription) {
      return NextResponse.json({ error: 'Company name, position, and job description are required.' }, { status: 400 });
    }

    const profile = getProfile();
    const masterLaTeX = profile?.masterLaTeX || `\\documentclass{article}\n\\begin{document}\n\\section{${profile?.name || 'Applicant'}}\nSoftware Engineer\n\\end{document}`;

    // 1. Analyze JD & calculate match score
    const jdAnalysis = analyzeJobDescription(jobDescription, profile);

    // 2. Perform CV Audit
    const audit = auditCVAgainstJD(profile, masterLaTeX, jdAnalysis);

    // 3. Tailor LaTeX CV
    const tailoredLaTeX = tailorLaTeXCV(masterLaTeX, audit.improve, jdAnalysis.matchingSkills);

    // 4. Generate Cover Letter
    const coverLetterObj = generateCoverLetter(profile, company, position, jobDescription);

    // 5. Output directory setup
    const cleanCompany = sanitizeFolderName(company);
    const outputDir = path.join(process.cwd(), 'Applications', cleanCompany);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // 6. Compile Resume & Cover Letter PDFs
    const resumePdfPath = await compileLaTeXToPDF(tailoredLaTeX, outputDir, 'Resume');
    const coverLetterPdfPath = await compileLaTeXToPDF(coverLetterObj.tex, outputDir, 'Cover_Letter');

    const resumePdfBytes = fs.existsSync(resumePdfPath) ? fs.readFileSync(resumePdfPath) : undefined;
    const coverLetterPdfBytes = fs.existsSync(coverLetterPdfPath) ? fs.readFileSync(coverLetterPdfPath) : undefined;

    // 7. Save Company Folder files
    const { folderPath } = saveCompanyApplicationFiles(
      company,
      tailoredLaTeX,
      resumePdfBytes,
      coverLetterPdfBytes,
      coverLetterObj.tex,
      jobDescription
    );

    // 8. Generate Email Draft
    const emailDraftObj = generateColdEmail(recruiterName || 'Hiring Manager', company, position, jobDescription, profile);
    const emailTarget = recruiterEmail || `careers@${company.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`;

    // 9. Create Application Record
    const appId = `app_${Date.now()}`;
    const newRecord: ApplicationRecord = {
      id: appId,
      company,
      position,
      jobUrl,
      recruiterEmail: emailTarget,
      recruiterName,
      jobDescription,
      date: new Date().toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }),
      matchScore: jdAnalysis.matchScore,
      audit,
      tailoredLaTeX,
      coverLetterLaTeX: coverLetterObj.tex,
      coverLetterText: coverLetterObj.text,
      folderPath,
      resumePdfUrl: `/api/applications/${appId}/file?file=Resume.pdf`,
      coverLetterPdfUrl: `/api/applications/${appId}/file?file=Cover_Letter.pdf`,
      status: 'Generated',
      emailStatus: 'Drafted',
      emailDraft: {
        subject: emailDraftObj.subject,
        body: emailDraftObj.body,
        recipient: emailTarget,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    saveApplication(newRecord);

    // Add to email queue
    const db = getDB();
    db.emailQueue.unshift({
      id: `email_${Date.now()}`,
      applicationId: appId,
      company,
      recipient: emailTarget,
      subject: emailDraftObj.subject,
      body: emailDraftObj.body,
      status: 'Pending',
    });
    saveDB(db);

    return NextResponse.json({ success: true, application: newRecord, jdAnalysis });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
