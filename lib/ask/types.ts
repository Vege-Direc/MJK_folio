import type { UIMessage } from 'ai';
import type { StopId } from '../../content/stops';

/**
 * The wire contract between /api/ask and the page. Shared by the server handler and the
 * client components, so it must stay free of server-only imports.
 *
 * The envelope is the layout. It is written deterministically from retrieval before the
 * model speaks, and rewritten once at the end with the guard's verdict. The model's only
 * contribution to the stream is text parts.
 */
type EnvelopeStatus = 'streaming' | 'verified' | 'salvaged' | 'replaced';

type EnvelopeCard = { id: string; title: string; kicker: string };

export type EnvelopeData = {
  stopId: StopId;
  index: number;
  kicker: string;
  title: string;
  cards: EnvelopeCard[];
  cites: string[];
  status: EnvelopeStatus;
  /** Present for `salvaged` and `replaced`: the body to show instead of the streamed prose. */
  body?: string;
  /**
   * What the guard did, in words. Deliberately not rendered, and this is the reason.
   *
   * It reads "Checked against the corpus; one line removed." A review flagged it as dead
   * code — written by the server, dropped by the UI — and it is not: it was pulled from
   * the page on purpose. Telling a visitor that the answer they are reading has been
   * checked, and that a line of it was deleted, narrates the machinery of the site to
   * someone who came to find out what MJK has built. The guard's job is to make the
   * answer trustworthy, not to ask for credit for it.
   *
   * It stays on the envelope because it is the only machine-readable account of what
   * salvage did, and two evals assert against it. If you are about to render this, the
   * question to answer first is what the visitor does differently for having read it.
   */
  note?: string;
};

export type RouteData = { stopId: StopId; index: number };

export type AskUIMessage = UIMessage<never, { route: RouteData; envelope: EnvelopeData }>;

/** Name of the DOM event the chat layer fires when an answer has been routed to a stop. */
export const ROUTE_EVENT = 'mjk:route';
