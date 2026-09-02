import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Not found',
};

export default function NotFound() {
  return (
    <main className="relative min-h-[100svh] flex flex-col justify-center px-8 md:px-16 py-40">
      <div className="max-w-3xl">
        <div className="font-mono text-[11px] tracking-[0.2em] text-[color:var(--color-accent)] uppercase mb-6">
          § 404
        </div>
        <h1 className="font-serif text-[clamp(2.5rem,7vw,5rem)] leading-[1.05] text-[color:var(--color-type)] tracking-[-0.02em]">
          Wrong stop.
        </h1>
        <p className="mt-8 max-w-xl text-lg text-[color:var(--color-type-muted)] leading-relaxed">
          Nothing lives at this address. The other nine do — start back at the top.
        </p>
        <Link
          href="/"
          className="mt-12 inline-flex items-center gap-3 font-mono text-[11px] tracking-[0.2em] text-[color:var(--color-accent)] uppercase"
        >
          <span className="inline-block w-8 h-px bg-[color:var(--color-accent)]" aria-hidden="true" />
          Back home
        </Link>
      </div>
    </main>
  );
}
