import { NextResponse } from 'next/server';
import { getWorkerState, saveWorkerState, processNextJobInQueue, addLogToWorker } from '@/lib/auto-worker';

export const dynamic = 'force-dynamic';

export async function GET() {
  const state = getWorkerState();
  return NextResponse.json({ state });
}

export async function POST(req: Request) {
  try {
    const { action, isRunning, minMatchScore, autoSendEmail } = await req.json();
    const state = getWorkerState();

    if (action === 'toggle') {
      state.isRunning = Boolean(isRunning);
      saveWorkerState(state);
      addLogToWorker(`Autonomous worker ${state.isRunning ? 'STARTED' : 'PAUSED'}`, 'info');
      return NextResponse.json({ success: true, state });
    }

    if (action === 'set_auto_send') {
      state.autoSendEmail = Boolean(autoSendEmail);
      saveWorkerState(state);
      addLogToWorker(`Auto-Dispatch Email Mode ${state.autoSendEmail ? 'ENABLED' : 'DISABLED'}`, 'info');
      return NextResponse.json({ success: true, state });
    }

    if (action === 'set_score') {
      state.minMatchScore = Number(minMatchScore) || 65;
      saveWorkerState(state);
      addLogToWorker(`Minimum match score threshold updated to ${state.minMatchScore}%`, 'info');
      return NextResponse.json({ success: true, state });
    }

    if (action === 'process_next') {
      const res = await processNextJobInQueue();
      return NextResponse.json({ success: true, ...res, state: getWorkerState() });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
