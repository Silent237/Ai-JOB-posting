import fs from 'fs';
import path from 'path';
import os from 'os';
import { cookies } from 'next/headers';

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
  extractedKeywords?: string[];
  certifications?: any[];
  achievements?: any[];
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
    institution: string;
    degree: string;
    fieldOfStudy?: string;
    startDate: string;
    endDate: string;
    location?: string;
  }>;
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
  jobDescription?: string;
  date: string;
  matchScore: {
    overall: number;
    hardSkills?: number;
    softSkills?: number;
    experienceLevel?: number;
    skills?: number;
    experience?: number;
    project?: number;
    keyword?: number;
  };
  audit: {
    keep: any[];
    improve: any[];
    add: any[];
    remove?: any[];
  };
  tailoredLaTeX: string;
  coverLetterLaTeX?: string;
  coverLetterText?: string;
  folderPath: string;
  resumePdfUrl?: string;
  coverLetterPdfUrl?: string;
  status: 'Saved' | 'Generated' | 'Applied' | 'Email Sent' | 'Interview' | 'Rejected' | 'Offer' | string;
  emailStatus: 'Drafted' | 'Queued' | 'Sent' | 'Failed' | string;
  emailDraft?: {
    subject: string;
    body: string;
    recipient: string;
  };
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RecruiterContact {
  id: string;
  name: string;
  email: string;
  company: string;
  role: string;
  linkedin?: string;
  verified?: boolean;
  status?: string;
  sentAt?: string;
  notes?: string;
}

export interface SenderAccount {
  id: string;
  name?: string;
  accountName?: string;
  senderName?: string;
  email?: string;
  user?: string;
  pass?: string;
  host?: string;
  port?: number;
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPass?: string;
  isDefault?: boolean;
  activeDailyCount?: number;
}

export interface DatabaseSchema {
  profile: UserProfile;
  applications: ApplicationRecord[];
  recruiterContacts: RecruiterContact[];
  emailQueue: Array<{
    id: string;
    applicationId: string;
    company: string;
    recipient: string;
    subject: string;
    body: string;
    status: 'Pending' | 'Approved' | 'Sent' | 'Failed' | string;
    scheduledTime?: string;
    sentAt?: string;
    senderAccountId?: string;
  }>;
  settings: {
    theme: 'dark' | 'light';
    googleDriveConnected: boolean;
    senderAccounts?: SenderAccount[];
    activeSenderAccountId?: string;
    smtpConfig?: any;
    dailyEmailLimit?: number;
  };
}

const defaultProfile: UserProfile = {
  name: 'Vinayak Sharma',
  email: 'vinayak@example.com',
  phone: '+91 9876543210',
  location: 'India / Remote',
  linkedin: 'https://linkedin.com/in/vinayak',
  github: 'https://github.com/vinayak',
  website: 'https://vinayak.dev',
  masterLaTeX: `\\documentclass[a4paper,10pt]{article}
\\usepackage[utf8]{utf8}
\\usepackage{fullpage}
\\usepackage{hyperref}
\\begin{document}
\\begin{center}
{\\huge \\bfseries Vinayak Sharma}\\\\
Email: vinayak@example.com | Phone: +91 9876543210\\\\
LinkedIn: https://linkedin.com/in/vinayak | GitHub: https://github.com/vinayak
\\end{center}

\\section*{Professional Summary}
Full Stack Software Developer experienced in JavaScript, React, PHP, Node.js, and Cloud Infrastructure.

\\section*{Skills}
\\begin{itemize}
  \\item \\textbf{Languages:} JavaScript, TypeScript, PHP, SQL, HTML5, CSS3
  \\item \\textbf{Frameworks:} React.js, Next.js, Node.js, Express, Tailwind CSS
  \\item \\textbf{Databases:} MySQL, PostgreSQL, MongoDB
  \\item \\textbf{Tools:} Git, Docker, Linux, REST APIs
\\end{itemize}

\\section*{Experience}
\\textbf{Software Developer} --- Tech Solutions (2022 -- Present)\\\\
Developed responsive web applications, designed RESTful APIs, optimized database queries.

\\end{document}`,
  skills: {
    languages: ['JavaScript', 'TypeScript', 'PHP', 'SQL', 'HTML5', 'CSS3'],
    frameworks: ['React.js', 'Next.js', 'Node.js', 'Express', 'Tailwind CSS'],
    databases: ['MySQL', 'PostgreSQL', 'MongoDB'],
    tools: ['Git', 'Docker', 'Linux', 'REST APIs'],
    other: ['Cloud Deployment', 'Agile Methodology'],
  },
  experience: [
    {
      id: 'exp_1',
      company: 'Tech Solutions',
      role: 'Full Stack Software Developer',
      location: 'Remote, India',
      startDate: '2022',
      endDate: 'Present',
      bullets: [
        'Architected high-throughput web applications using React.js and Node.js microservices.',
        'Engineered optimized SQL database schemas improving response time by 40%.',
        'Implemented secure RESTful API integrations and role-based authentication.',
      ],
      technologies: ['JavaScript', 'React', 'Node.js', 'MySQL', 'REST APIs'],
    },
  ],
  projects: [
    {
      id: 'proj_1',
      title: 'Autonomous Job Discovery & Application Automation Engine',
      link: 'https://github.com/vinayak/job-engine',
      description: 'AI-powered multi-tenant platform for automated CV tailoring and job applications.',
      bullets: [
        'Built dynamic LaTeX CV tailoring engine matching candidate profiles to job descriptions.',
        'Integrated multi-user data isolation and automated email dispatch capabilities.',
      ],
      technologies: ['TypeScript', 'Next.js', 'LaTeX', 'Node.js'],
    },
  ],
  education: [
    {
      id: 'edu_1',
      institution: 'State Technical University',
      degree: 'Bachelor of Technology',
      fieldOfStudy: 'Computer Science & Engineering',
      startDate: '2018',
      endDate: '2022',
    },
  ],
};

const defaultDB: DatabaseSchema = {
  profile: defaultProfile,
  applications: [],
  recruiterContacts: [],
  emailQueue: [],
  settings: {
    theme: 'dark',
    googleDriveConnected: false,
    senderAccounts: [],
    dailyEmailLimit: 50,
  },
};

export function getActiveUserId(): string {
  try {
    const cookieStore = cookies();
    const val = cookieStore.get('hunt_user_id')?.value;
    if (val && val.trim()) {
      return val.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_');
    }
  } catch {}
  return 'default_user';
}

export function getWritableBaseDir(): string {
  if (process.env.NETLIFY || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.VERCEL) {
    return os.tmpdir();
  }
  
  let baseDir = process.cwd();
  try {
    const testFile = path.join(baseDir, `.write_test_${Date.now()}`);
    fs.writeFileSync(testFile, 'test');
    fs.unlinkSync(testFile);
  } catch {
    baseDir = os.tmpdir();
  }
  return baseDir;
}

export function getUserDbPath(userId?: string): string {
  const targetUser = userId || getActiveUserId();
  const cleanId = targetUser.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
  return path.join(getWritableBaseDir(), 'data', 'users', cleanId, 'db.json');
}

function ensureDbExists(userId?: string) {
  const dbPath = getUserDbPath(userId);
  const dir = path.dirname(dbPath);
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  } catch {}

  if (!fs.existsSync(dbPath)) {
    try {
      fs.writeFileSync(dbPath, JSON.stringify(defaultDB, null, 2), 'utf-8');
    } catch {}
  }
}

export function getDB(userId?: string): DatabaseSchema {
  ensureDbExists(userId);
  const dbPath = getUserDbPath(userId);
  try {
    if (fs.existsSync(dbPath)) {
      const raw = fs.readFileSync(dbPath, 'utf-8');
      const parsed = JSON.parse(raw);
      if (!parsed.recruiterContacts) parsed.recruiterContacts = [];
      if (!parsed.settings) parsed.settings = { theme: 'dark', googleDriveConnected: false, senderAccounts: [], dailyEmailLimit: 50 };
      if (!parsed.settings.senderAccounts) parsed.settings.senderAccounts = [];
      return parsed;
    }
  } catch {}
  return defaultDB;
}

export function saveDB(data: DatabaseSchema, userId?: string) {
  ensureDbExists(userId);
  const dbPath = getUserDbPath(userId);
  try {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf-8');
  } catch {}
}

export function getProfile(userId?: string): UserProfile {
  const db = getDB(userId);
  return db.profile || defaultProfile;
}

export function saveProfile(profile: UserProfile, userId?: string) {
  const db = getDB(userId);
  db.profile = profile;
  saveDB(db, userId);
}

export function getApplications(userId?: string): ApplicationRecord[] {
  const db = getDB(userId);
  return db.applications || [];
}

export function getApplicationById(id: string, userId?: string): ApplicationRecord | undefined {
  const db = getDB(userId);
  return db.applications.find(a => a.id === id);
}

export function saveApplication(app: ApplicationRecord, userId?: string) {
  const db = getDB(userId);
  const idx = db.applications.findIndex(a => a.id === app.id);
  if (idx >= 0) {
    db.applications[idx] = app;
  } else {
    db.applications.unshift(app);
  }
  saveDB(db, userId);
}

export function getDailyActivity(userId?: string): { count: number; max: number; emailsSentToday: number; dailyEmailLimit: number } {
  const db = getDB(userId);
  const todayStr = new Date().toISOString().split('T')[0];
  const count = db.emailQueue.filter(e => e.status === 'Sent' && e.scheduledTime?.startsWith(todayStr)).length;
  const max = db.settings?.dailyEmailLimit || 50;
  return { count, max, emailsSentToday: count, dailyEmailLimit: max };
}
