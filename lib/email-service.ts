import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';
import { getDB, saveDB, getDailyActivity, SenderAccount } from './db';
import { sanitizeFolderName } from './storage';

export async function sendApplicationEmail(
  emailQueueId: string,
  recipientOverride?: string,
  senderAccountIdOverride?: string
): Promise<{ success: boolean; message: string }> {
  const db = getDB();
  const queueItem = db.emailQueue.find((e) => e.id === emailQueueId);

  if (!queueItem) {
    return { success: false, message: 'Email draft not found.' };
  }

  const recipient = (recipientOverride || queueItem.recipient || '').trim();
  if (!recipient || !recipient.includes('@')) {
    return { success: false, message: 'Invalid recipient email address.' };
  }

  if (recipientOverride) {
    queueItem.recipient = recipientOverride;
  }

  const activity = getDailyActivity();
  if (activity.emailsSentToday >= activity.dailyEmailLimit) {
    return { success: false, message: `Daily limit of ${activity.dailyEmailLimit} emails reached for today.` };
  }

  // Resolve Sender Email Account (Multi-Account Support)
  const targetSenderId = senderAccountIdOverride || queueItem.senderAccountId || db.settings.activeSenderAccountId;
  let senderAccount: SenderAccount | undefined = db.settings.senderAccounts?.find((s) => s.id === targetSenderId);

  // Fallback to primary smtpConfig if senderAccount is not found
  if (!senderAccount && db.settings.smtpConfig?.user) {
    senderAccount = {
      id: 'default',
      name: db.profile?.name || 'Vinayak Srivastava',
      user: db.settings.smtpConfig.user,
      pass: db.settings.smtpConfig.pass || '',
      host: db.settings.smtpConfig.host || 'smtp.gmail.com',
      port: db.settings.smtpConfig.port || 465,
    };
  }

  if (!senderAccount || !senderAccount.user || !senderAccount.pass) {
    queueItem.status = 'Pending';
    saveDB(db);
    return {
      success: false,
      message: `REAL Email Dispatch requires an active Gmail App Password. Please configure your sender email account under Email Settings.`,
    };
  }

  try {
    const transporter = nodemailer.createTransport({
      host: senderAccount.host || 'smtp.gmail.com',
      port: senderAccount.port || 465,
      secure: (senderAccount.port || 465) === 465,
      auth: {
        user: senderAccount.user,
        pass: senderAccount.pass,
      },
    });

    // Locate REAL PDF attachments in company folder
    const cleanCompany = sanitizeFolderName(queueItem.company);
    const companyFolder = path.join(process.cwd(), 'Applications', cleanCompany);

    const candidateName = db.profile?.name || 'Vinayak_Srivastava';
    const cleanCandidateName = sanitizeFolderName(candidateName);

    const candidateResumePath = path.join(companyFolder, `${cleanCandidateName}_Resume.pdf`);
    const defaultResumePath = path.join(companyFolder, 'Resume.pdf');
    const resumePathToUse = fs.existsSync(candidateResumePath) ? candidateResumePath : defaultResumePath;

    const candidateCoverPath = path.join(companyFolder, `${cleanCandidateName}_Cover_Letter.pdf`);
    const defaultCoverPath = path.join(companyFolder, 'Cover_Letter.pdf');
    const coverPathToUse = fs.existsSync(candidateCoverPath) ? candidateCoverPath : defaultCoverPath;

    const attachments: Array<{ filename: string; path: string }> = [];
    if (fs.existsSync(resumePathToUse)) {
      attachments.push({ filename: `${cleanCandidateName}_Resume.pdf`, path: resumePathToUse });
    }
    if (fs.existsSync(coverPathToUse)) {
      attachments.push({ filename: `${cleanCandidateName}_Cover_Letter.pdf`, path: coverPathToUse });
    }

    // Anti-Spam Formatted HTML Body
    const formattedHtmlBody = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #1e293b; max-width: 600px;">
        ${queueItem.body.split('\n\n').map((p) => `<p style="margin-bottom: 14px;">${p.replace(/\n/g, '<br/>')}</p>`).join('')}
      </div>
    `;

    const userDomain = senderAccount.user.includes('@') ? senderAccount.user.split('@')[1] : 'gmail.com';
    const displayName = senderAccount.name || db.profile?.name || 'Vinayak Srivastava';

    // Perform REAL Email Dispatch with anti-spam deliverability headers
    const info = await transporter.sendMail({
      from: `"${displayName}" <${senderAccount.user}>`,
      replyTo: senderAccount.user,
      to: recipient,
      subject: queueItem.subject,
      text: queueItem.body,
      html: formattedHtmlBody,
      headers: {
        'X-Mailer': 'HuntAI-JobApplication-Suite',
        'X-Priority': '3 (Normal)',
        'X-Auto-Response-Suppress': 'OOF, AutoReply',
        'Message-ID': `<app-${Date.now()}.${Math.floor(Math.random() * 100000)}@${userDomain}>`,
      },
      attachments,
    });

    queueItem.status = 'Sent';
    queueItem.sentAt = new Date().toISOString();

    const app = db.applications.find((a) => a.id === queueItem.applicationId);
    if (app) {
      app.emailStatus = 'Sent';
      app.status = 'Email Sent';
      if (recipientOverride) app.recruiterEmail = recipientOverride;
    }

    saveDB(db);
    return {
      success: true,
      message: `REAL Live Email successfully dispatched from ${senderAccount.user} to ${recipient} (Message ID: ${info.messageId})`,
    };
  } catch (err: any) {
    queueItem.status = 'Failed';
    saveDB(db);
    return { success: false, message: `SMTP Transmission Failed (${senderAccount.user}): ${err.message}` };
  }
}

export async function sendAllApprovedEmails(): Promise<{ sentCount: number; errors: string[] }> {
  const db = getDB();
  const approvedItems = db.emailQueue.filter((e) => e.status === 'Approved');
  let sentCount = 0;
  const errors: string[] = [];

  for (const item of approvedItems) {
    const res = await sendApplicationEmail(item.id);
    if (res.success) {
      sentCount++;
    } else {
      errors.push(res.message);
    }
  }

  return { sentCount, errors };
}
