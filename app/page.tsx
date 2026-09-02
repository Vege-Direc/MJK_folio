import MindCanvas from '@/components/mind/MindCanvas';
import ScrollProgress from '@/components/mind/ScrollProgress';
import StopSection from '@/components/stops/StopSection';
import { STOPS } from '@/content/stops';

/**
 * The page: one canvas, nine stops, and a scroll listener that tells the canvas where
 * the reader is.
 *
 * Nine sections of prose, rendered on the server, are the content. The canvas is
 * ambience that loads afterwards. That order is the whole architecture — it is why
 * `<MindCanvas/>` renders an inert `<canvas>` and imports three.js from an idle callback
 * rather than being wrapped in `next/dynamic`, and why nothing on this page holds
 * per-frame state in React.
 */
export default function Home() {
  return (
    <>
      <MindCanvas />
      <ScrollProgress count={STOPS.length} />

      <main className="scroll-root">
        {STOPS.map((stop) => (
          <StopSection key={stop.id} stop={stop} />
        ))}
      </main>
    </>
  );
}
