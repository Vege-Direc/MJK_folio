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
  /** One line the UI may show under the answer. */
  note?: string;
};

export type RouteData = { stopId: StopId; index: number };

export type AskUIMessage = UIMessage<never, { route: RouteData; envelope: EnvelopeData }>;

/** Name of the DOM event the chat layer fires when an answer has been routed to a stop. */
export const ROUTE_EVENT = 'mjk:route';
