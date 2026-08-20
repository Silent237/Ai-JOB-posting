import fs from 'fs';
import path from 'path';
import { getDB, saveDB, getProfile, ApplicationRecord, getActiveUserId, getWritableBaseDir } from './db';
import { DiscoveredJob, searchJobs } from './job-fetcher';
import { analyzeJobDescription, auditCVAgainstJD, generateCoverLetter, generateColdEmail } from './ai-engine';
import { tailorLaTeXCV } from './latex-parser';
import { compileLaTeXToPDF } from './pdf-compiler';
import { saveCompanyApplicationFiles, sanitizeFolderName } from './storage';
import { sendApplicationEmail } from './email-service';

export interface WorkerState {
  isRunning: boolean;
  autoSendEmail: boolean;
  minMatchScore: number;
  processedCount: number;
  queuedJobs: DiscoveredJob[];
  logs: Array<{ timestamp: string; message: string; type: 'info' | 'success' | 'warn' | 'error' }>;
}

export function getWorkerStatePath(userId?: string): string {
  const targetUser = userId || getActiveUserId();
  const cleanId = targetUser.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
  return path.join(getWritableBaseDir(), 'data', 'users', cleanId, 'worker_state.json');
}

const defaultState: WorkerState = {
  isRunning: false,
  autoSendEmail: false,
  minMatchScore: 65,
  processedCount: 0,
  queuedJobs: [],
  logs: [
    { timestamp: new Date().toLocaleTimeString(), message: 'Autonomous Job Application Worker initialized.', type: 'info' }
  ],
};

export function getWorkerState(userId?: string): WorkerState {
  const filePath = getWorkerStatePath(userId);
  try {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(raw);
    }
  } catch {}
  return { ...defaultState, queuedJobs: [], logs: [...defaultState.logs] };
}

export function saveWorkerState(state: WorkerState, userId?: string) {
  const filePath = getWorkerStatePath(userId);
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(state, null, 2), 'utf-8');
  } catch {}
}

export function addLogToWorker(message: string, type: 'info' | 'success' | 'warn' | 'error' = 'info', userId?: string) {
  const state = getWorkerState(userId);
  state.logs.unshift({
    timestamp: new Date().toLocaleTimeString(),
    message,
    type,
  });
  if (state.logs.length > 50) state.logs = state.logs.slice(0, 50);
  saveWorkerState(state, userId);
}

export function enqueueJobs(jobs: DiscoveredJob[], userId?: string) {
  const targetUser = userId || getActiveUserId();
  const state = getWorkerState(targetUser);
  const db = getDB(targetUser);

  const existingQueueKeys = new Set(state.queuedJobs.map(j => `${j.company.toLowerCase().trim()}_${j.title.toLowerCase().trim()}`));
  const existingAppKeys = new Set(db.applications.map(a => `${a.company.toLowerCase().trim()}_${a.position.toLowerCase().trim()}`));

  let added = 0;
  let duplicatesSkipped = 0;

  jobs.forEach(j => {
    const key = `${j.company.toLowerCase().trim()}_${j.title.toLowerCase().trim()}`;
    if (!existingQueueKeys.has(key) && !existingAppKeys.has(key)) {
      state.queuedJobs.push(j);
      existingQueueKeys.add(key);
      added++;
    } else {
      duplicatesSkipped++;
    }
  });

  saveWorkerState(state, targetUser);
  addLogToWorker(`Added ${added} new job(s) to queue. (${duplicatesSkipped} duplicates skipped)`, duplicatesSkipped > 0 ? 'warn' : 'info', targetUser);
  return state;
}

export async function processSingleJob(job: DiscoveredJob, userId?: string): Promise<{ success: boolean; message: string; score?: number }> {
  const targetUser = userId || getActiveUserId();
  const db = getDB(targetUser);

  const existingAppKey = `${job.company.toLowerCase().trim()}_${job.title.toLowerCase().trim()}`;
  if (db.applications.some(a => `${a.company.toLowerCase().trim()}_${a.position.toLowerCase().trim()}` === existingAppKey)) {
    addLogToWorker(`[Worker] Skipped duplicate application for "${job.title}" at ${job.company}`, 'warn', targetUser);
    return { success: true, message: `Skipped duplicate application for ${job.company}` };
  }

  addLogToWorker(`[Worker] Processing job: "${job.title}" at ${job.company}`, 'info', targetUser);

  try {
    const profile = getProfile(targetUser);
    const activeTpl = profile?.templates?.find(t => t.id === profile?.activeTemplateId) || profile?.templates?.[0];
    const masterLaTeX = activeTpl?.latex || profile?.masterLaTeX || `\\documentclass{article}\n\\begin{document}\nSoftware Engineer\n\\end{document}`;

    // 1. Analyze JD & Match Score
    const jdAnalysis = analyzeJobDescription(job.description, profile);
    const score = jdAnalysis.matchScore.overall;

    // 2. CV Audit
    const audit = auditCVAgainstJD(profile, masterLaTeX, jdAnalysis);

    // 3. Tailor LaTeX CV
    const tailoredLaTeX = tailorLaTeXCV(masterLaTeX, audit.improve, jdAnalysis.matchingSkills);

    // 4. Generate Cover Letter
    const coverLetterObj = generateCoverLetter(profile, job.company, job.title, job.description);

    // 5. Output directory setup
    const cleanCompany = sanitizeFolderName(job.company);
    const baseDir = getWritableBaseDir();
    const outputDir = path.join(baseDir, 'Applications', targetUser, cleanCompany);
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    // 6. Compile PDFs
    const resumePdfPath = await compileLaTeXToPDF(tailoredLaTeX, outputDir, 'Resume');
    const coverLetterPdfPath = await compileLaTeXToPDF(coverLetterObj.tex, outputDir, 'Cover_Letter');

    const resumePdfBytes = fs.existsSync(resumePdfPath) ? fs.readFileSync(resumePdfPath) : undefined;
    const coverLetterPdfBytes = fs.existsSync(coverLetterPdfPath) ? fs.readFileSync(coverLetterPdfPath) : undefined;

    // 7. Save Company Files with Candidate Named PDFs
    const candidateName = profile?.name || 'Candidate';
    const { folderPath } = saveCompanyApplicationFiles(
      job.company,
      tailoredLaTeX,
      resumePdfBytes,
      coverLetterPdfBytes,
      coverLetterObj.tex,
      job.description,
      candidateName,
      targetUser
    );

    // 8. Resolve Valid Recruiter Email
    let emailTarget = job.url?.includes('@') ? job.url : '';
    if (!emailTarget) {
      const cleanCompName = job.company.toLowerCase().replace(/[^a-z0-9]/g, '');
      emailTarget = `careers@${cleanCompName}.com`;
    }

    const emailDraftObj = generateColdEmail('Hiring Manager', job.company, job.title, job.description, profile);

    const appId = `app_auto_${Date.now()}`;
    const emailQueueId = `email_${Date.now()}`;

    const newRecord: ApplicationRecord = {
      id: appId,
      company: job.company,
      position: job.title,
      candidateName: profile?.name || 'Candidate',
      templateTitle: activeTpl?.title || 'Master Resume',
      jobUrl: job.url,
      recruiterEmail: emailTarget,
      recruiterName: 'Hiring Team',
      jobDescription: job.description,
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

    db.applications.unshift(newRecord);
    db.emailQueue.unshift({
      id: emailQueueId,
      applicationId: appId,
      company: job.company,
      recipient: emailTarget,
      subject: emailDraftObj.subject,
      body: emailDraftObj.body,
      status: 'Pending',
    });
    saveDB(db, targetUser);

    addLogToWorker(`[Worker Success] Tailored CV & PDF created for ${job.company} (${score}% match). Saved in Applications/${cleanCompany}/`, 'success', targetUser);
    return { success: true, message: `Successfully processed application for ${job.company}`, score };

  } catch (err: any) {
    addLogToWorker(`[Worker Error] Failed processing ${job.company}: ${err.message}`, 'error', targetUser);
    return { success: false, message: err.message };
  }
}

export async function processNextJobInQueue(userId?: string): Promise<{ processed: boolean; message: string }> {
  const targetUser = userId || getActiveUserId();
  const state = getWorkerState(targetUser);

  if (state.queuedJobs.length === 0) {
    return { processed: false, message: 'Queue is empty.' };
  }

  const job = state.queuedJobs.shift()!;
  saveWorkerState(state, targetUser);

  const res = await processSingleJob(job, targetUser);
  return { processed: true, message: res.message };
}
