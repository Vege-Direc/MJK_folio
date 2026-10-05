import { handleAsk } from '@/lib/ask/handler';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** The whole answer path lives in lib/ask/handler.ts; see its header for the timeline. */
export async function POST(req: Request) {
  return handleAsk(req);
}
