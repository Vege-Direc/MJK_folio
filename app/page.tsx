import AskAddress from '@/components/chat/AskAddress';
import MindCanvas from '@/components/mind/MindCanvas';
import ScrollProgress from '@/components/mind/ScrollProgress';
import FocusIntoView from '@/components/stops/FocusIntoView';
import StopSection from '@/components/stops/StopSection';
import { STOPS } from '@/content/stops';
import { loadMemories } from '@/lib/corpus/load';

/**
 * The page: one canvas, twelve stops, and a scroll listener that tells the canvas where
 * the reader is.
 *
 * Twelve sections of prose, rendered on the server, are the content. The canvas is
 * ambience that loads afterwards. That order is the whole architecture — it is why
 * `<MindCanvas/>` renders an inert `<canvas>` and imports three.js from an idle callback
 * rather than being wrapped in `next/dynamic`, and why nothing on this page holds
 * per-frame state in React.
 */
export default function Home() {
  /*
   * The closed set `?ask=<memory-id>` is checked against, resolved here because this is
   * the last place that can read the corpus without a request.
   *
   * A title and not a question, because `cardQuestion` is the one place a title becomes a
   * question and shipping the finished strings would put a second copy of that rule in the
   * bundle. Ids and titles only -- no bodies, no tags, nothing a memory says. The whole map
   * is the same fifty-odd titles the page already prints.
   *
   * Read at render rather than through `searchParams`, deliberately: taking the parameter as
   * a prop would opt `/` out of static rendering for a value only the browser needs, on the
   * one page whose entire architecture is server-rendered prose that arrives before anything
   * else does. `AskAddress` reads `location.search` on the client instead, and `/` stays
   * prerendered.
   */
  const titles = Object.fromEntries(loadMemories().map((m) => [m.id, m.title]));

  return (
    <>
      <AskAddress titles={titles} />
      <MindCanvas />
      <ScrollProgress count={STOPS.length} />
      <FocusIntoView />

      <main className="scroll-root">
        {STOPS.map((stop) => (
          <StopSection key={stop.id} stop={stop} />
        ))}
      </main>
    </>
  );
}
