import { NextResponse } from 'next/server';
import { searchJobs, extractJobFromUrl } from '@/lib/job-fetcher';
import { enqueueJobs } from '@/lib/auto-worker';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q') || 'Full Stack Developer';
    const location = searchParams.get('loc') || 'Remote';

    const jobs = await searchJobs(query, location);
    return NextResponse.json({ jobs });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { action, jobUrl, bulkText, jobs } = await req.json();

    if (action === 'import_url' && jobUrl) {
      const extracted = await extractJobFromUrl(jobUrl);
      enqueueJobs([extracted]);
      return NextResponse.json({ success: true, job: extracted });
    }

    if (action === 'import_bulk' && bulkText) {
      const sections = bulkText.split(/---|\n\n\n+/).filter((s: string) => s.trim().length > 30);
      const imported = sections.map((sec: string, idx: number) => {
        const firstLine = sec.trim().split('\n')[0];
        return {
          id: `bulk_${Date.now()}_${idx}`,
          title: firstLine.length < 50 ? firstLine : 'Full Stack Developer',
          company: `Target Company ${idx + 1}`,
          location: 'Remote / Onsite',
          url: '',
          source: 'Bulk Paste',
          description: sec.trim(),
        };
      });
      enqueueJobs(imported);
      return NextResponse.json({ success: true, count: imported.length });
    }

    if (action === 'enqueue' && Array.isArray(jobs)) {
      enqueueJobs(jobs);
      return NextResponse.json({ success: true, count: jobs.length });
    }

    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
