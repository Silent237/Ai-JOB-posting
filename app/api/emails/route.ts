import { NextResponse } from 'next/server';
import { getDB, saveDB, getDailyActivity } from '@/lib/db';
import { sendApplicationEmail, sendAllApprovedEmails } from '@/lib/email-service';

export const dynamic = 'force-dynamic';

export async function GET() {
  const db = getDB();
  const activity = getDailyActivity();
  return NextResponse.json({
    emailQueue: db.emailQueue,
    activity,
  });
}

export async function POST(req: Request) {
  try {
    const { action, emailQueueId, recipient, subject, body, senderAccountId } = await req.json();

    if (action === 'update_email') {
      const db = getDB();
      const item = db.emailQueue.find((e) => e.id === emailQueueId);
      if (item) {
        if (recipient !== undefined) item.recipient = recipient;
        if (subject !== undefined) item.subject = subject;
        if (body !== undefined) item.body = body;
        if (senderAccountId !== undefined) item.senderAccountId = senderAccountId;
        saveDB(db);
        return NextResponse.json({ success: true, email: item });
      }
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    if (action === 'delete_email') {
      const db = getDB();
      db.emailQueue = db.emailQueue.filter((e) => e.id !== emailQueueId);
      saveDB(db);
      return NextResponse.json({ success: true });
    }

    if (action === 'approve') {
      const db = getDB();
      const item = db.emailQueue.find((e) => e.id === emailQueueId);
      if (item) {
        item.status = 'Approved';
        saveDB(db);
        return NextResponse.json({ success: true, email: item });
      }
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    if (action === 'send') {
      if (!emailQueueId) {
        return NextResponse.json({ error: 'emailQueueId is required' }, { status: 400 });
      }
      const res = await sendApplicationEmail(emailQueueId, recipient);
      return NextResponse.json(res);
    }

    if (action === 'send_all_approved') {
      const res = await sendAllApprovedEmails();
      return NextResponse.json({ success: true, ...res });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
