export default function Story() {
  return (
    <section className="px-8 md:px-16 py-40 border-t border-[color:var(--color-rule)]" id="story">
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 md:col-span-2 font-mono text-[11px] tracking-[0.2em] text-[color:var(--color-type-dim)] uppercase">
          § 02 — Story
        </div>
        <div className="col-span-12 md:col-span-10 max-w-4xl">
          <h2 className="font-serif text-[clamp(2rem,4.5vw,4rem)] leading-[1.05] text-[color:var(--color-type)] tracking-[-0.01em]">
            Dreamt of aircraft. Built a cafe racer.
            <br />
            <span className="text-[color:var(--color-type-muted)]">Now shipping systems that didn't exist last year.</span>
          </h2>
          <p className="mt-10 max-w-2xl text-lg text-[color:var(--color-type-muted)] leading-relaxed">
            Ask the dock for any chapter — the arc, the pivots, the projects. Each answer streams into the mind above and docks alongside this text.
          </p>
        </div>
      </div>
    </section>
  );
}
