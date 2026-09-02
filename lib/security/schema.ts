/**
 * The request body `/api/ask` accepts, validated before anything else touches it.
 *
 * This is a narrower cousin of the schema inline in `app/api/ask/route.ts`: a question
 * and at most four question/answer pairs of prior turns, both length-capped. Nothing
 * else. In particular there is no `role` field anywhere in this file -- not on the
 * envelope, not on a history turn -- and that is not an oversight to fix later.
 *
 * A chat-shaped API that accepts `{ role, content }` turns off the wire lets the caller
 * assign roles: a `system` turn rewrites the site's instructions, a fabricated
 * `assistant` turn puts words in Mathew's mouth that the model then treats as its own
 * prior answer and builds on. This schema has no field a client could put a role into.
 * `question` is always the visitor's question; every entry in `history` is always one
 * question the visitor asked and one answer the site gave. The role each string plays
 * in the eventual prompt is assigned entirely on the server side, downstream of this
 * module, by *position* (`q` becomes a `user` turn, `a` becomes an `assistant` turn) --
 * never by a value the request body supplied. A `role` or `messages` key on the raw
 * body parses fine and is simply not there afterwards: zod strips unknown keys by
 * default, and there is no key here for either name to land in even if it survived.
 */
import { z } from 'zod';
import { STOP_IDS, type StopId } from '../../content/stops';

/** Enough for a 500-character question and four exchanges, with room to spare. */
export const MAX_BODY_BYTES = 16 * 1024;

const historyTurnSchema = z.object({
  q: z
    .string('`history[].q` must be a string.')
    .trim()
    .min(1, '`history[].q` must not be empty.')
    .max(500, '`history[].q` must be 500 characters or fewer.'),
  a: z
    .string('`history[].a` must be a string.')
    .trim()
    .max(2000, '`history[].a` must be 2000 characters or fewer.'),
});

export const askBodySchema = z.object({
  question: z
    .string('`question` must be a string.')
    .trim()
    .min(1, '`question` must not be empty.')
    .max(500, '`question` must be 500 characters or fewer.'),
  history: z
    .array(historyTurnSchema)
    .max(4, '`history` holds at most the last 4 exchanges.')
    .optional(),
  /**
   * The section on screen when the question was asked, and the section the previous
   * answer landed in. Both are closed enums of stop ids, so the widest thing a client can
   * say here is "one of nine", and neither can carry text into the prompt.
   *
   * They exist because a question like "more on these?" has its subject on the screen
   * rather than in its words, and because an earlier answer about a different section is
   * not context, it is a distraction.
   */
  viewing: z.enum(STOP_IDS as unknown as [StopId, ...StopId[]]).optional(),
  previousStopId: z.enum(STOP_IDS as unknown as [StopId, ...StopId[]]).optional(),
});

export type AskHistoryTurn = z.infer<typeof historyTurnSchema>;
export type AskBody = z.infer<typeof askBodySchema>;

export type ParseAskBodyResult =
  | { ok: true; value: AskBody }
  | { ok: false; status: 400; reason: string };

/**
 * Parses and validates a raw, already-`JSON.parse`d request body. Byte-size limits
 * belong upstream of this call -- `req.text()` has to be measured before it is parsed,
 * which is exactly why `MAX_BODY_BYTES` is exported separately rather than folded into
 * this function.
 */
export function parseAskBody(raw: unknown): ParseAskBodyResult {
  const result = askBodySchema.safeParse(raw);
  if (!result.success) {
    const reason = result.error.issues[0]?.message ?? 'request body did not match the expected shape.';
    return { ok: false, status: 400, reason };
  }
  return { ok: true, value: result.data };
}
