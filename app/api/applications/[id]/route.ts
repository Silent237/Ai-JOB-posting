import { NextResponse } from 'next/server';
import { getApplicationById, getDB, saveDB } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const app = getApplicationById(params.id);
  if (!app) {
    return NextResponse.json({ error: 'Application not found' }, { status: 404 });
  }
  return NextResponse.json({ application: app });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const { status, emailStatus, notes } = await req.json();
    const app = getApplicationById(params.id);
    if (!app) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    if (status) app.status = status;
    if (emailStatus) app.emailStatus = emailStatus;
    if (notes !== undefined) app.notes = notes;

    app.updatedAt = new Date().toISOString();
    
    const db = getDB();
    const idx = db.applications.findIndex(a => a.id === params.id);
    if (idx >= 0) db.applications[idx] = app;
    saveDB(db);

    return NextResponse.json({ success: true, application: app });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const db = getDB();
    db.applications = db.applications.filter((a) => a.id !== params.id);
    db.emailQueue = db.emailQueue.filter((e) => e.applicationId !== params.id);
    saveDB(db);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
