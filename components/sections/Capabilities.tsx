import { capabilities } from '@/content/static-copy';

export default function Capabilities() {
  return (
    <section className="px-8 md:px-16 py-24 border-t border-[color:var(--color-rule)]">
      <div className="grid grid-cols-12 gap-6 items-baseline">
        <div className="col-span-12 md:col-span-2 font-mono text-[11px] tracking-[0.2em] text-[color:var(--color-type-dim)] uppercase">
          § 01 — Capabilities
        </div>
        <div className="col-span-12 md:col-span-10 flex flex-wrap gap-x-10 gap-y-3 font-serif text-2xl md:text-4xl text-[color:var(--color-type)]">
          {capabilities.map((c, i) => (
            <span key={c.key} className="flex items-baseline gap-3">
              <span className="font-mono text-xs text-[color:var(--color-type-dim)]">{String(i + 1).padStart(2, '0')}</span>
              {c.label}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
