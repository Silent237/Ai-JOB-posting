import fs from 'fs';
import path from 'path';
import { getDB, saveDB, getProfile, ApplicationRecord } from './db';
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

const WORKER_STATE_FILE = path.join(process.cwd(), 'data', 'worker_state.json');

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

export function getWorkerState(): WorkerState {
  try {
    if (fs.existsSync(WORKER_STATE_FILE)) {
      const raw = fs.readFileSync(WORKER_STATE_FILE, 'utf-8');
      return JSON.parse(raw);
    }
  } catch {}
  return defaultState;
}

export function saveWorkerState(state: WorkerState) {
  try {
    const dir = path.dirname(WORKER_STATE_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(WORKER_STATE_FILE, JSON.stringify(state, null, 2), 'utf-8');
  } catch {}
}

export function addLogToWorker(message: string, type: 'info' | 'success' | 'warn' | 'error' = 'info') {
  const state = getWorkerState();
  state.logs.unshift({
    timestamp: new Date().toLocaleTimeString(),
    message,
    type,
  });
  if (state.logs.length > 50) state.logs = state.logs.slice(0, 50);
  saveWorkerState(state);
}

// Strict Deduplication Enqueue Safeguard
export function enqueueJobs(jobs: DiscoveredJob[]) {
  const state = getWorkerState();
  const db = getDB();

  // Collect existing job identifiers from queue & database
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

  saveWorkerState(state);
  addLogToWorker(`Added ${added} new job(s) to queue. (${duplicatesSkipped} duplicates skipped)`, duplicatesSkipped > 0 ? 'warn' : 'info');
  return state;
}

export async function processNextJobInQueue(): Promise<{ processed: boolean; message: string }> {
  const state = getWorkerState();

  // Auto-Discovery: If queue is empty and worker is running, fetch fresh live jobs automatically!
  if (state.queuedJobs.length === 0) {
    if (state.isRunning) {
      addLogToWorker(`[Auto-Refresh] Worker queue empty. Fetching fresh live jobs from aggregators...`, 'info');
      try {
        const freshJobs = await searchJobs('Full Stack Developer', 'India / Remote');
        enqueueJobs(freshJobs);
        const updatedState = getWorkerState();
        if (updatedState.queuedJobs.length > 0) {
          return processNextJobInQueue();
        }
      } catch {}
    }
    return { processed: false, message: 'Queue is empty.' };
  }

  const job = state.queuedJobs.shift()!;
  saveWorkerState(state);

  const db = getDB();
  const existingAppKey = `${job.company.toLowerCase().trim()}_${job.title.toLowerCase().trim()}`;
  if (db.applications.some(a => `${a.company.toLowerCase().trim()}_${a.position.toLowerCase().trim()}` === existingAppKey)) {
    addLogToWorker(`[Worker] Skipped duplicate application for "${job.title}" at ${job.company}`, 'warn');
    return { processed: true, message: `Skipped duplicate application for ${job.company}` };
  }

  addLogToWorker(`[Worker] Processing job: "${job.title}" at ${job.company}`, 'info');

  try {
    const profile = getProfile();
    const activeTpl = profile?.templates?.find(t => t.id === profile?.activeTemplateId) || profile?.templates?.[0];
    const masterLaTeX = activeTpl?.latex || profile?.masterLaTeX || `\\documentclass{article}\n\\begin{document}\nSoftware Engineer\n\\end{document}`;

    // 1. Analyze JD & Match Score
    const jdAnalysis = analyzeJobDescription(job.description, profile);
    const score = jdAnalysis.matchScore.overall;

    if (score < state.minMatchScore) {
      addLogToWorker(`[Worker] Skipped "${job.title}" at ${job.company} (Match score ${score}% < min threshold ${state.minMatchScore}%)`, 'warn');
      return { processed: true, message: `Skipped job due to low match score (${score}%).` };
    }

    // 2. CV Audit
    const audit = auditCVAgainstJD(profile, masterLaTeX, jdAnalysis);

    // 3. Tailor LaTeX CV
    const tailoredLaTeX = tailorLaTeXCV(masterLaTeX, audit.improve, jdAnalysis.matchingSkills);

    // 4. Generate Cover Letter
    const coverLetterObj = generateCoverLetter(profile, job.company, job.title, job.description);

    // 5. Output directory setup
    const cleanCompany = sanitizeFolderName(job.company);
    const outputDir = path.join(process.cwd(), 'Applications', cleanCompany);
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    // 6. Compile PDFs
    const resumePdfPath = await compileLaTeXToPDF(tailoredLaTeX, outputDir, 'Resume');
    const coverLetterPdfPath = await compileLaTeXToPDF(coverLetterObj.tex, outputDir, 'Cover_Letter');

    const resumePdfBytes = fs.existsSync(resumePdfPath) ? fs.readFileSync(resumePdfPath) : undefined;
    const coverLetterPdfBytes = fs.existsSync(coverLetterPdfPath) ? fs.readFileSync(coverLetterPdfPath) : undefined;

    // 7. Save Company Files with Candidate Named PDFs
    const candidateName = profile?.name || 'Vinayak Srivastava';
    const { folderPath } = saveCompanyApplicationFiles(
      job.company,
      tailoredLaTeX,
      resumePdfBytes,
      coverLetterPdfBytes,
      coverLetterObj.tex,
      job.description,
      candidateName
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
      candidateName: profile?.name || 'Vinayak Srivastava',
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
      status: state.autoSendEmail ? 'Applied' : 'Generated',
      emailStatus: state.autoSendEmail ? 'Sent' : 'Drafted',
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
      status: state.autoSendEmail ? 'Approved' : 'Pending',
    });
    saveDB(db);

    // Auto-dispatch email if Auto-Send mode is turned ON
    if (state.autoSendEmail) {
      await sendApplicationEmail(emailQueueId);
      addLogToWorker(`[Auto-Apply] Dispatched application email to ${emailTarget} for ${job.company}`, 'success');
    }

    state.processedCount += 1;
    saveWorkerState(state);

    addLogToWorker(`[Worker Success] Tailored CV & PDF created for ${job.company} (${score}% match). Saved in Applications/${cleanCompany}/`, 'success');
    return { processed: true, message: `Successfully processed application for ${job.company}` };

  } catch (err: any) {
    addLogToWorker(`[Worker Error] Failed processing ${job.company}: ${err.message}`, 'error');
    return { processed: false, message: err.message };
  }
}
