import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { streamText, type ModelMessage } from 'ai';
import { z } from 'zod';
import { askModel, hasApiKey } from '@/lib/provider';
import { retrieveMemories } from '@/lib/rag';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * The client sends a question. It does not send a conversation.
 *
 * The route this replaced took `{ messages }` straight off the wire and handed the array
 * to the model, which meant the browser assigned the roles: anyone could POST a `system`
 * turn and rewrite the site's instructions, or forge an `assistant` turn and put words in
 * MJK's mouth that the model would then treat as its own prior answer. The contract here
 * is narrow on purpose -- a question, and at most four question/answer pairs of context.
 * Every role in the prompt below is assigned on this side of the wire.
 */
const askSchema = z.object({
  question: z
    .string('`question` must be a string.')
    .trim()
    .min(1, '`question` must not be empty.')
    .max(2000, '`question` must be 2000 characters or fewer.'),
  history: z
    .array(
      z.object({
        q: z.string('`history[].q` must be a string.').trim().min(1).max(2000),
        a: z.string('`history[].a` must be a string.').trim().max(8000),
      }),
    )
    .max(4, '`history` holds at most the last 4 exchanges.')
    .optional(),
});

/** Enough for a 2000-character question and four exchanges, with room to spare. */
const MAX_BODY_BYTES = 16 * 1024;

const SYSTEM_PROMPT_PATH = join(process.cwd(), 'content', 'system-prompt.md');

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });

export async function POST(req: Request) {
  // Read the body as bytes before parsing it. `req.json()` on a 40 MB paste buffers the
  // whole thing first, so the size limit has to be enforced on the text, not the object.
  const raw = await req.text();
  if (Buffer.byteLength(raw, 'utf8') > MAX_BODY_BYTES) {
    return json({ error: 'body-too-large' }, 413);
  }

  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return json({ error: 'bad-request', detail: 'body is not valid JSON' }, 400);
  }

  // zod before any field access. An empty body, a bare array and `null` all reach here.
  const parsed = askSchema.safeParse(payload);
  if (!parsed.success) {
    return json({ error: 'bad-request', detail: parsed.error.issues[0]?.message }, 400);
  }
  const { question, history = [] } = parsed.data;

  if (!hasApiKey()) {
    return json({ error: 'chat-unavailable' }, 503);
  }

  const context = await retrieveMemories(question);
  const systemPrompt = readFileSync(SYSTEM_PROMPT_PATH, 'utf-8');

  // ai v7 refuses a `system` role inside `messages`, which is the right shape for this
  // route: instructions travel in their own field and cannot arrive disguised as a turn.
  const instructions = context
    ? systemPrompt + '\n\n---\nRelevant memories:\n' + context
    : systemPrompt +
      '\n\n---\nNo memory matched this question. Say so rather than answering from anything else.';

  const messages: ModelMessage[] = [
    ...history.flatMap((turn): ModelMessage[] => [
      { role: 'user', content: turn.q },
      { role: 'assistant', content: turn.a },
    ]),
    { role: 'user', content: question },
  ];

  const { model, providerOptions } = askModel();

  const result = streamText({
    model,
    instructions,
    messages,
    providerOptions,
    // The stream hands the client a generic "An error occurred." on purpose. Log the real
    // one here, or a model failure is indistinguishable from a model with nothing to say.
    onError({ error }) {
      console.error('[api/ask] streamText failed:', error);
    },
  });

  return result.toUIMessageStreamResponse();
}
