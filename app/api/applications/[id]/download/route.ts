import { NextResponse } from 'next/server';
import { getApplicationById } from '@/lib/db';
import { createCompanyZip } from '@/lib/storage';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const app = getApplicationById(params.id);
    if (!app) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    const zipBuffer = await createCompanyZip(app.company);
    const cleanName = app.company.replace(/[^a-zA-Z0-9_-]/g, '_');

    return new NextResponse(new Uint8Array(zipBuffer), {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${cleanName}_Application_Package.zip"`,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
