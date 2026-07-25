export default function Story() {
  return (
    <section className="px-8 md:px-16 py-32 border-t border-[color:var(--color-rule)]" id="story">
      <div className="font-mono text-[11px] tracking-[0.15em] text-[color:var(--color-type-dim)] mb-6">
        § STORY
      </div>
      <h2 className="font-serif text-4xl md:text-5xl text-[color:var(--color-type)] max-w-3xl tracking-[-0.01em]">
        Dreamt of aircraft. Built a cafe racer. Now shipping systems that didn't exist last year.
      </h2>
      <p className="mt-8 max-w-2xl text-[color:var(--color-type-muted)] leading-relaxed">
        Ask the dock for any chapter. Each answer streams into the mind above and docks here.
      </p>
    </section>
  );
}
