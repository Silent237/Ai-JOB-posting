import { NextResponse } from 'next/server';
import { getDB, saveDB, getProfile, ApplicationRecord } from '@/lib/db';
import { analyzeJobDescription, auditCVAgainstJD, generateCoverLetter, generateColdEmail } from '@/lib/ai-engine';
import { tailorLaTeXCV } from '@/lib/latex-parser';
import { compileLaTeXToPDF } from '@/lib/pdf-compiler';
import { saveCompanyApplicationFiles, sanitizeFolderName } from '@/lib/storage';
import { sendApplicationEmail } from '@/lib/email-service';
import fs from 'fs';
import path from 'path';

export async function GET() {
  const db = getDB();
  return NextResponse.json({ contacts: db.recruiterContacts || [] });
}

export async function POST(req: Request) {
  try {
    const { action, contacts } = await req.json();
    const db = getDB();

    if (action === 'import' && Array.isArray(contacts)) {
      const existing = db.recruiterContacts || [];
      const existingEmails = new Set(existing.map(c => c.email.toLowerCase().trim()));

      let imported = 0;
      contacts.forEach(c => {
        if (c.email && !existingEmails.has(c.email.toLowerCase().trim())) {
          existing.unshift({
            id: `rec_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
            email: c.email.trim(),
            company: c.company || 'Target Tech Company',
            name: c.name || 'Hiring Manager',
            role: c.role || 'Full Stack / Software Developer',
            status: 'Imported',
          });
          existingEmails.add(c.email.toLowerCase().trim());
          imported++;
        }
      });

      db.recruiterContacts = existing;
      saveDB(db);

      return NextResponse.json({ success: true, imported, total: db.recruiterContacts.length });
    }

    if (action === 'dispatch_all') {
      const profile = getProfile();
      const masterLaTeX = profile?.masterLaTeX || `\\documentclass{article}\n\\begin{document}\nSoftware Engineer\n\\end{document}`;
      const toDispatch = (db.recruiterContacts || []).filter(c => c.status !== 'Sent');

      let dispatchedCount = 0;
      const errors: string[] = [];

      for (const rec of toDispatch) {
        try {
          const company = rec.company || 'Target Company';
          const role = rec.role || 'Full Stack Developer';
          const recName = rec.name || 'Hiring Manager';
          const jdText = `Recruiter outreach for ${role} position at ${company}. Requires Full Stack Web Development, REST APIs, Database Optimization, and Software Engineering skills.`;

          // 1. Analyze & Audit
          const jdAnalysis = analyzeJobDescription(jdText, profile);
          const audit = auditCVAgainstJD(profile, masterLaTeX, jdAnalysis);

          // 2. Tailor CV & Cover Letter
          const tailoredLaTeX = tailorLaTeXCV(masterLaTeX, audit.improve, jdAnalysis.matchingSkills);
          const coverLetterObj = generateCoverLetter(profile, company, role, jdText);

          // 3. Compile PDFs
          const cleanComp = sanitizeFolderName(company);
          const outputDir = path.join(process.cwd(), 'Applications', cleanComp);
          if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

          const resumePdfPath = await compileLaTeXToPDF(tailoredLaTeX, outputDir, 'Resume');
          const coverPdfPath = await compileLaTeXToPDF(coverLetterObj.tex, outputDir, 'Cover_Letter');

          const resumePdfBytes = fs.existsSync(resumePdfPath) ? fs.readFileSync(resumePdfPath) : undefined;
          const coverPdfBytes = fs.existsSync(coverPdfPath) ? fs.readFileSync(coverPdfPath) : undefined;

          const { folderPath } = saveCompanyApplicationFiles(
            company,
            tailoredLaTeX,
            resumePdfBytes,
            coverPdfBytes,
            coverLetterObj.tex,
            jdText
          );

          // 4. Create App & Email Queue Record
          const appId = `app_rec_${Date.now()}`;
          const emailQueueId = `email_rec_${Date.now()}`;
          const emailObj = generateColdEmail(recName, company, role, jdText, profile);

          const newApp: ApplicationRecord = {
            id: appId,
            company,
            position: role,
            recruiterEmail: rec.email,
            recruiterName: recName,
            jobDescription: jdText,
            date: new Date().toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }),
            matchScore: jdAnalysis.matchScore,
            audit,
            tailoredLaTeX,
            coverLetterLaTeX: coverLetterObj.tex,
            coverLetterText: coverLetterObj.text,
            folderPath,
            resumePdfUrl: `/api/applications/${appId}/file?file=Resume.pdf`,
            coverLetterPdfUrl: `/api/applications/${appId}/file?file=Cover_Letter.pdf`,
            status: 'Applied',
            emailStatus: 'Sent',
            emailDraft: {
              subject: emailObj.subject,
              body: emailObj.body,
              recipient: rec.email,
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          db.applications.unshift(newApp);
          db.emailQueue.unshift({
            id: emailQueueId,
            applicationId: appId,
            company,
            recipient: rec.email,
            subject: emailObj.subject,
            body: emailObj.body,
            status: 'Approved',
          });
          saveDB(db);

          // Send real live email
          const sendRes = await sendApplicationEmail(emailQueueId);
          if (sendRes.success) {
            rec.status = 'Sent';
            rec.sentAt = new Date().toISOString();
            dispatchedCount++;
          } else {
            rec.status = 'Failed';
            errors.push(`${rec.email}: ${sendRes.message}`);
          }
          saveDB(db);

        } catch (err: any) {
          rec.status = 'Failed';
          errors.push(`${rec.email}: ${err.message}`);
          saveDB(db);
        }
      }

      return NextResponse.json({ success: true, dispatchedCount, errors, total: db.recruiterContacts?.length || 0 });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
