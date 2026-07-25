import { NextResponse } from 'next/server';
import { keysAvailable } from '@/lib/openrouter';

export const runtime = 'nodejs';

export async function GET() {
  const chatOk = await keysAvailable();
  return NextResponse.json({ ok: true, chat: chatOk });
}
