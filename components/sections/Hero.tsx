import { hero } from '@/content/static-copy';

export default function Hero() {
  return (
    <section className="min-h-screen flex items-center px-8 md:px-16 pt-32 pb-40">
      <div className="max-w-4xl">
        <div className="font-mono text-[11px] tracking-[0.15em] text-[color:var(--color-type-dim)] mb-6">
          MATHEW JOHN KONDEKERIL · SINGAPORE
        </div>
        <h1 className="font-serif text-5xl md:text-7xl leading-[1.05] text-[color:var(--color-type)] tracking-[-0.02em]">
          {hero.tagline}
        </h1>
        <p className="mt-8 text-lg text-[color:var(--color-type-muted)] max-w-xl">
          {hero.sub}
        </p>
      </div>
    </section>
  );
}
