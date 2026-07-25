import { streamText } from 'ai';
import { pickProvider, markKeyRateLimited } from '@/lib/openrouter';
import { retrieveMemories } from '@/lib/rag';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const systemPrompt = readFileSync(
  join(process.cwd(), 'content', 'system-prompt.md'),
  'utf-8'
);

export async function POST(req: Request) {
  const { messages } = await req.json();
  const latest = messages.at(-1)?.content ?? '';
  const context = await retrieveMemories(latest);

  const { provider, keyId } = pickProvider();
  if (!provider) {
    return new Response(
      JSON.stringify({ error: 'chat-unavailable', fallback: 'copilot resting, scroll works fine.' }),
      { status: 503, headers: { 'content-type': 'application/json' } }
    );
  }

  try {
    const result = streamText({
      model: provider(process.env.OPENROUTER_MODEL || 'meta-llama/llama-3.3-70b-instruct:free'),
      system: `${systemPrompt}\n\n---\nRelevant memories:\n${context}`,
      messages,
      tools: {
        // Model tells the WebGL layer where to dolly the camera + which panel to open.
        route_to_section: {
          description: 'Signal which section the answer belongs to. Fires activation propagation in the mind.',
          parameters: {
            type: 'object',
            properties: {
              section: {
                type: 'string',
                enum: ['hero', 'capabilities', 'story', 'timeline', 'projects', 'contact'],
              },
              memory_id: { type: 'string', description: 'ID from memories.yaml if targeting a specific node' },
            },
            required: ['section'],
          },
        },
      },
      onError: async ({ error }) => {
        if (String(error).includes('rate')) await markKeyRateLimited(keyId);
      },
    });
    return result.toDataStreamResponse();
  } catch (err) {
    await markKeyRateLimited(keyId);
    return new Response(JSON.stringify({ error: 'chat-error' }), { status: 500 });
  }
}
