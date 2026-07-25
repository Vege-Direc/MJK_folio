import { capabilities } from '@/content/static-copy';

export default function Capabilities() {
  return (
    <section className="px-8 md:px-16 py-24 border-t border-[color:var(--color-rule)]">
      <div className="font-mono text-[11px] tracking-[0.15em] text-[color:var(--color-type-dim)] mb-6">
        § CAPABILITIES
      </div>
      <div className="flex flex-wrap gap-x-10 gap-y-3 font-serif text-2xl md:text-3xl text-[color:var(--color-type)]">
        {capabilities.map((c) => (
          <span key={c.key}>{c.label}</span>
        ))}
      </div>
    </section>
  );
}
