import fs from 'fs';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'data', 'db.json');

export interface MasterTemplate {
  id: string;
  title: string;
  latex: string;
  preferredSenderAccountId?: string;
  isDefault?: boolean;
}

export interface UserProfile {
  name: string;
  email: string;
  phone: string;
  location: string;
  linkedin: string;
  github: string;
  website: string;
  masterLaTeX: string;
  templates?: MasterTemplate[];
  activeTemplateId?: string;
  skills: {
    languages: string[];
    frameworks: string[];
    databases: string[];
    tools: string[];
    other: string[];
  };
  experience: Array<{
    id: string;
    company: string;
    role: string;
    location: string;
    startDate: string;
    endDate: string;
    bullets: string[];
    technologies: string[];
  }>;
  projects: Array<{
    id: string;
    title: string;
    link: string;
    description: string;
    bullets: string[];
    technologies: string[];
  }>;
  education: Array<{
    id: string;
    degree: string;
    institution: string;
    location: string;
    startDate: string;
    endDate: string;
    gpa?: string;
  }>;
  certifications: string[];
  achievements: string[];
  extractedKeywords: string[];
}

export interface ApplicationRecord {
  id: string;
  company: string;
  position: string;
  candidateName?: string;
  templateTitle?: string;
  jobUrl?: string;
  recruiterEmail?: string;
  recruiterName?: string;
  jobDescription: string;
  date: string;
  matchScore: {
    overall: number;
    skills: number;
    experience: number;
    project: number;
    keyword: number;
  };
  audit: {
    keep: string[];
    reduce: string[];
    improve: Array<{ original: string; suggested: string; reason: string }>;
    add: string[];
    missingSkills: Array<{ skill: string; recommendation: string }>;
  };
  tailoredLaTeX: string;
  coverLetterLaTeX: string;
  coverLetterText: string;
  folderPath: string;
  resumePdfUrl?: string;
  coverLetterPdfUrl?: string;
  status: 'Saved' | 'Generated' | 'Applied' | 'Email Sent' | 'Follow-up' | 'Interview' | 'Rejected' | 'Selected' | 'Withdrawn';
  emailStatus: 'Pending' | 'Drafted' | 'Approved' | 'Sent' | 'Failed';
  emailDraft?: {
    subject: string;
    body: string;
    recipient: string;
  };
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DailyActivity {
  date: string;
  applicationsToday: number;
  emailsSentToday: number;
  dailyEmailLimit: number;
}

export interface SenderAccount {
  id: string;
  name: string;
  user: string;
  pass: string;
  host?: string;
  port?: number;
  isDefault?: boolean;
}

interface DatabaseSchema {
  profile: UserProfile | null;
  applications: ApplicationRecord[];
  emailQueue: Array<{
    id: string;
    applicationId: string;
    company: string;
    recipient: string;
    subject: string;
    body: string;
    senderAccountId?: string;
    status: 'Pending' | 'Approved' | 'Sent' | 'Failed';
    sentAt?: string;
  }>;
  recruiterContacts?: Array<{
    id: string;
    email: string;
    company: string;
    name?: string;
    role?: string;
    status: 'Imported' | 'Queued' | 'Sent' | 'Failed';
    sentAt?: string;
  }>;
  settings: {
    apiKey?: string;
    theme?: 'light' | 'dark';
    dailyEmailLimit?: number;
    googleDriveConnected: boolean;
    senderAccounts?: SenderAccount[];
    activeSenderAccountId?: string;
    smtpConfig?: {
      host: string;
      port: number;
      user: string;
      pass: string;
    };
  };
}

const defaultDB: DatabaseSchema = {
  profile: null,
  applications: [],
  emailQueue: [],
  recruiterContacts: [],
  settings: {
    theme: 'light',
    googleDriveConnected: false,
    senderAccounts: [],
  },
};

function ensureDbExists() {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify(defaultDB, null, 2), 'utf-8');
  }
}

export function getDB(): DatabaseSchema {
  ensureDbExists();
  try {
    const raw = fs.readFileSync(DB_PATH, 'utf-8');
    const parsed = JSON.parse(raw);
    if (!parsed.recruiterContacts) parsed.recruiterContacts = [];
    if (!parsed.settings) parsed.settings = { theme: 'light', googleDriveConnected: false, senderAccounts: [] };
    if (!parsed.settings.theme) parsed.settings.theme = 'light';
    if (!parsed.settings.senderAccounts) parsed.settings.senderAccounts = [];

    // Migrate single smtpConfig to senderAccounts if needed
    if (parsed.settings.smtpConfig?.user && parsed.settings.senderAccounts.length === 0) {
      parsed.settings.senderAccounts.push({
        id: 'sender_default',
        name: parsed.profile?.name || 'Primary Sender',
        user: parsed.settings.smtpConfig.user,
        pass: parsed.settings.smtpConfig.pass || '',
        host: parsed.settings.smtpConfig.host || 'smtp.gmail.com',
        port: parsed.settings.smtpConfig.port || 465,
        isDefault: true,
      });
      parsed.settings.activeSenderAccountId = 'sender_default';
    }

    // Ensure profile templates exists
    if (parsed.profile) {
      if (!parsed.profile.templates) {
        parsed.profile.templates = [
          {
            id: 'default_master',
            title: 'Master Resume Template',
            latex: parsed.profile.masterLaTeX || '',
            isDefault: true,
          }
        ];
        parsed.profile.activeTemplateId = 'default_master';
      }
    }
    return parsed;
  } catch {
    return defaultDB;
  }
}

export function saveDB(data: DatabaseSchema) {
  ensureDbExists();
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

export function getProfile(): UserProfile | null {
  const db = getDB();
  return db.profile;
}

export function saveProfile(profile: UserProfile) {
  const db = getDB();
  db.profile = profile;
  saveDB(db);
  return profile;
}

export function getApplications(): ApplicationRecord[] {
  return getDB().applications;
}

export function getApplicationById(id: string): ApplicationRecord | undefined {
  return getDB().applications.find((a) => a.id === id);
}

export function saveApplication(app: ApplicationRecord) {
  const db = getDB();
  const index = db.applications.findIndex((a) => a.id === app.id);
  if (index >= 0) {
    db.applications[index] = app;
  } else {
    db.applications.unshift(app);
  }
  saveDB(db);
  return app;
}

export function updateApplicationStatus(id: string, status: ApplicationRecord['status'], emailStatus?: ApplicationRecord['emailStatus']) {
  const db = getDB();
  const app = db.applications.find((a) => a.id === id);
  if (app) {
    app.status = status;
    if (emailStatus) app.emailStatus = emailStatus;
    app.updatedAt = new Date().toISOString();
    saveDB(db);
  }
  return app;
}

export function getDailyActivity(): DailyActivity {
  const db = getDB();
  const todayStr = new Date().toISOString().split('T')[0];
  
  const applicationsToday = db.applications.filter((a) => a.createdAt.startsWith(todayStr)).length;
  const emailsSentToday = db.emailQueue.filter((e) => e.status === 'Sent' && e.sentAt?.startsWith(todayStr)).length;
  const limit = db.settings.dailyEmailLimit || 50;

  return {
    date: todayStr,
    applicationsToday,
    emailsSentToday,
    dailyEmailLimit: limit,
  };
}
