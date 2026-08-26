import { hero } from '@/content/static-copy';

export default function Hero() {
  return (
    <section className="relative min-h-[100svh] flex flex-col justify-between px-8 md:px-16 pt-16 pb-40">
      {/* Top meta bar */}
      <header className="flex items-baseline justify-between font-mono text-[11px] tracking-[0.2em] text-[color:var(--color-type-dim)] uppercase">
        <span>Mathew John Kondekeril</span>
        <span className="hidden md:block">Singapore · Engineer · Builder</span>
        <span>2026 — v0.1</span>
      </header>

      {/* Tagline */}
      <div className="max-w-5xl">
        <div className="font-mono text-[11px] tracking-[0.2em] text-[color:var(--color-accent)] uppercase mb-6">
          § 00 — Portfolio
        </div>
        <h1 className="font-serif text-[clamp(2.5rem,7vw,6rem)] leading-[1.02] text-[color:var(--color-type)] tracking-[-0.02em]">
          First I imagine it.
          <br />
          <span className="text-[color:var(--color-type-muted)]">Then I learn whatever it takes to build it.</span>
        </h1>
        <p className="mt-10 max-w-xl text-lg text-[color:var(--color-type-muted)] leading-relaxed">
          {hero.sub}
        </p>
      </div>

      {/* Scroll indicator */}
      <div className="font-mono text-[10px] tracking-[0.25em] text-[color:var(--color-type-dim)] uppercase flex items-center gap-3">
        <span className="inline-block w-8 h-px bg-[color:var(--color-type-dim)]" />
        Scroll or ask the dock below
      </div>
    </section>
  );
}
