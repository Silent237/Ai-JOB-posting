import { NextResponse } from 'next/server';
import { getDB, saveDB, SenderAccount } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const db = getDB();
  return NextResponse.json({ settings: db.settings });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, senderAccount, senderAccountId, smtpConfig, dailyEmailLimit } = body;
    const db = getDB();

    if (!db.settings.senderAccounts) db.settings.senderAccounts = [];

    if (action === 'set_daily_limit') {
      db.settings.dailyEmailLimit = Number(dailyEmailLimit) || 50;
      saveDB(db);
      return NextResponse.json({ success: true, settings: db.settings });
    }

    if (action === 'save_sender_account' && senderAccount) {
      const id = senderAccount.id || `sender_${Date.now()}`;
      const newAcc: SenderAccount = {
        id,
        name: senderAccount.name || 'Primary Sender',
        user: senderAccount.user,
        pass: senderAccount.pass,
        host: senderAccount.host || 'smtp.gmail.com',
        port: Number(senderAccount.port) || 465,
        isDefault: db.settings.senderAccounts.length === 0,
      };

      const existingIdx = db.settings.senderAccounts.findIndex((s) => s.id === id);
      if (existingIdx >= 0) {
        db.settings.senderAccounts[existingIdx] = newAcc;
      } else {
        db.settings.senderAccounts.push(newAcc);
      }

      db.settings.activeSenderAccountId = id;
      db.settings.smtpConfig = {
        host: newAcc.host || 'smtp.gmail.com',
        port: newAcc.port || 465,
        user: newAcc.user,
        pass: newAcc.pass,
      };

      saveDB(db);
      return NextResponse.json({ success: true, settings: db.settings });
    }

    if (action === 'set_active_sender' && senderAccountId) {
      db.settings.activeSenderAccountId = senderAccountId;
      const acc = db.settings.senderAccounts.find((s) => s.id === senderAccountId);
      if (acc) {
        db.settings.smtpConfig = {
          host: acc.host || 'smtp.gmail.com',
          port: acc.port || 465,
          user: acc.user,
          pass: acc.pass,
        };
      }
      saveDB(db);
      return NextResponse.json({ success: true, settings: db.settings });
    }

    if (action === 'delete_sender_account' && senderAccountId) {
      db.settings.senderAccounts = db.settings.senderAccounts.filter((s) => s.id !== senderAccountId);
      if (db.settings.activeSenderAccountId === senderAccountId) {
        db.settings.activeSenderAccountId = db.settings.senderAccounts[0]?.id || '';
      }
      saveDB(db);
      return NextResponse.json({ success: true, settings: db.settings });
    }

    if (smtpConfig) {
      const id = `sender_default`;
      const acc: SenderAccount = {
        id,
        name: db.profile?.name || 'Primary Sender',
        user: smtpConfig.user,
        pass: smtpConfig.pass,
        host: smtpConfig.host || 'smtp.gmail.com',
        port: Number(smtpConfig.port) || 465,
      };
      db.settings.senderAccounts = [acc];
      db.settings.activeSenderAccountId = id;
      db.settings.smtpConfig = {
        host: acc.host || 'smtp.gmail.com',
        port: acc.port || 465,
        user: acc.user,
        pass: acc.pass,
      };
      saveDB(db);
      return NextResponse.json({ success: true, settings: db.settings });
    }

    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
