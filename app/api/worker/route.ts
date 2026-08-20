import { NextResponse } from 'next/server';
import { getWorkerState, saveWorkerState, processNextJobInQueue, processSingleJob, addLogToWorker } from '@/lib/auto-worker';
import { getActiveUserId } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const userId = getActiveUserId();
  const state = getWorkerState(userId);
  return NextResponse.json({ state });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, isRunning, minMatchScore, autoSendEmail, job } = body;
    const userId = body.userId || getActiveUserId();
    const state = getWorkerState(userId);

    if (action === 'toggle') {
      state.isRunning = Boolean(isRunning);
      saveWorkerState(state, userId);
      addLogToWorker(`Autonomous worker ${state.isRunning ? 'STARTED' : 'PAUSED'}`, 'info', userId);
      return NextResponse.json({ success: true, state });
    }

    if (action === 'set_auto_send') {
      state.autoSendEmail = Boolean(autoSendEmail);
      saveWorkerState(state, userId);
      addLogToWorker(`Auto-Dispatch Email Mode ${state.autoSendEmail ? 'ENABLED' : 'DISABLED'}`, 'info', userId);
      return NextResponse.json({ success: true, state });
    }

    if (action === 'set_score') {
      state.minMatchScore = Number(minMatchScore) || 65;
      saveWorkerState(state, userId);
      addLogToWorker(`Minimum match score threshold updated to ${state.minMatchScore}%`, 'info', userId);
      return NextResponse.json({ success: true, state });
    }

    if (action === 'process_single' && job) {
      const res = await processSingleJob(job, userId);
      return NextResponse.json({ ...res, state: getWorkerState(userId) });
    }

    if (action === 'process_next') {
      const res = await processNextJobInQueue(userId);
      return NextResponse.json({ success: true, ...res, state: getWorkerState(userId) });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
