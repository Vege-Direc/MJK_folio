export default function Contact() {
  return (
    <section className="px-8 md:px-16 py-40 pb-48 border-t border-[color:var(--color-rule)]" id="contact">
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 md:col-span-2 font-mono text-[11px] tracking-[0.2em] text-[color:var(--color-type-dim)] uppercase">
          § 05 — Brief me
        </div>
        <div className="col-span-12 md:col-span-10 max-w-4xl">
          <h2 className="font-serif text-[clamp(2rem,4.5vw,4rem)] leading-[1.05] text-[color:var(--color-type)] tracking-[-0.01em]">
            Not a form.
            <br />
            <span className="text-[color:var(--color-type-muted)]">Tell the dock what you&rsquo;re working on.</span>
          </h2>
          <p className="mt-10 max-w-2xl text-lg text-[color:var(--color-type-muted)] leading-relaxed">
            It walks through problem, timeline, budget, then emails me a brief. Or reach me directly:
          </p>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl">
            <a href="/resume.pdf" download className="block border-t border-[color:var(--color-rule)] pt-4 hover:border-[color:var(--color-accent)] transition-colors">
              <div className="font-mono text-[10px] tracking-[0.2em] text-[color:var(--color-type-dim)] mb-2">01 · PDF</div>
              <div className="font-serif text-xl text-[color:var(--color-type)]">Download resume</div>
            </a>
            <a href="mailto:mathew_johnk@hotmail.com" className="block border-t border-[color:var(--color-rule)] pt-4 hover:border-[color:var(--color-accent)] transition-colors">
              <div className="font-mono text-[10px] tracking-[0.2em] text-[color:var(--color-type-dim)] mb-2">02 · EMAIL</div>
              <div className="font-serif text-xl text-[color:var(--color-type)]">mathew_johnk@hotmail.com</div>
            </a>
            <a href="https://github.com/Vege-Direc" target="_blank" rel="noreferrer" className="block border-t border-[color:var(--color-rule)] pt-4 hover:border-[color:var(--color-accent)] transition-colors">
              <div className="font-mono text-[10px] tracking-[0.2em] text-[color:var(--color-type-dim)] mb-2">03 · CODE</div>
              <div className="font-serif text-xl text-[color:var(--color-type)]">github.com/Vege-Direc</div>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
