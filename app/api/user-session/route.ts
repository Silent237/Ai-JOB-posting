import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import fs from 'fs';
import path from 'path';
import { getActiveUserId } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const activeUserId = getActiveUserId();
  const usersDir = path.join(process.cwd(), 'data', 'users');
  
  let availableUsers: string[] = ['default_user'];
  if (fs.existsSync(usersDir)) {
    const dirs = fs.readdirSync(usersDir).filter((f) => {
      return fs.statSync(path.join(usersDir, f)).isDirectory();
    });
    if (dirs.length > 0) availableUsers = dirs;
  }

  return NextResponse.json({ activeUserId, availableUsers });
}

export async function POST(req: Request) {
  try {
    const { userId } = await req.json();
    if (!userId || typeof userId !== 'string') {
      return NextResponse.json({ error: 'Valid userId required' }, { status: 400 });
    }

    const cleanId = userId.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
    
    // Set HTTP cookie valid for 30 days
    const cookieStore = cookies();
    cookieStore.set('hunt_user_id', cleanId, {
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      httpOnly: false,
      sameSite: 'lax',
    });

    return NextResponse.json({ success: true, activeUserId: cleanId });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
