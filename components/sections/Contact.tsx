export default function Contact() {
  return (
    <section className="px-8 md:px-16 py-32 pb-48 border-t border-[color:var(--color-rule)]" id="contact">
      <div className="font-mono text-[11px] tracking-[0.15em] text-[color:var(--color-type-dim)] mb-6">
        § BRIEF ME
      </div>
      <h2 className="font-serif text-4xl md:text-5xl text-[color:var(--color-type)] max-w-3xl tracking-[-0.01em]">
        Not a form. Tell the dock what you're working on.
      </h2>
      <p className="mt-8 max-w-2xl text-[color:var(--color-type-muted)]">
        The dock will walk through problem, timeline, and budget, then email me a brief.
      </p>
      <div className="mt-10 flex gap-6 font-mono text-xs tracking-[0.1em]">
        <a href="/resume.pdf" download>DOWNLOAD RESUME →</a>
        <a href="mailto:mathew_johnk@hotmail.com">EMAIL DIRECTLY →</a>
        <a href="https://github.com/Vege-Direc" target="_blank" rel="noreferrer">GITHUB →</a>
      </div>
    </section>
  );
}
