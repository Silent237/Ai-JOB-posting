import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getApplicationById } from '@/lib/db';
import { sanitizeFolderName } from '@/lib/storage';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const { searchParams } = new URL(req.url);
    const fileName = searchParams.get('file') || 'Resume.pdf';

    const app = getApplicationById(params.id);
    if (!app) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    const cleanCompany = sanitizeFolderName(app.company);
    const filePath = path.join(process.cwd(), 'Applications', cleanCompany, fileName);

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: `File ${fileName} not found.` }, { status: 404 });
    }

    const fileBuffer = fs.readFileSync(filePath);
    let contentType = 'application/octet-stream';
    if (fileName.endsWith('.pdf')) contentType = 'application/pdf';
    else if (fileName.endsWith('.tex') || fileName.endsWith('.txt')) contentType = 'text/plain; charset=utf-8';

    return new NextResponse(new Uint8Array(fileBuffer), {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `inline; filename="${cleanCompany}_${fileName}"`,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
