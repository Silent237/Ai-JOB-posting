import { NextResponse } from 'next/server';
import { getProfile } from '@/lib/db';
import { analyzeJobDescription } from '@/lib/ai-engine';

export async function POST(req: Request) {
  try {
    const { jobDescription } = await req.json();
    if (!jobDescription) {
      return NextResponse.json({ error: 'Job description is required' }, { status: 400 });
    }

    const profile = getProfile();
    const analysis = analyzeJobDescription(jobDescription, profile);

    return NextResponse.json({ success: true, analysis });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
