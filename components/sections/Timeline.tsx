export default function Timeline() {
  return (
    <section className="px-8 md:px-16 py-32 border-t border-[color:var(--color-rule)]" id="timeline">
      <div className="font-mono text-[11px] tracking-[0.15em] text-[color:var(--color-type-dim)] mb-6">
        § TIMELINE
      </div>
      <h2 className="font-serif text-4xl md:text-5xl text-[color:var(--color-type)] max-w-3xl">
        2013 → today.
      </h2>
      <p className="mt-6 max-w-2xl text-[color:var(--color-type-muted)]">
        Horizontal scrub of every role and engagement. Click a node to expand what was actually shipped.
      </p>
      {/* Timeline nodes render here. Ported from memories.yaml (section: timeline). */}
    </section>
  );
}
