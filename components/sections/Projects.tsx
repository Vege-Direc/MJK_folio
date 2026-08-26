const featured = [
  {
    id: 'jewel-ai',
    kicker: 'Multi-agent creative pipeline',
    title: 'Automated Jewelry Studio',
    body: 'A LangGraph-orchestrated system that turns product shots and briefs into finished ad creatives for jewellery brands.',
    tag: 'AI · CREATIVE',
  },
  {
    id: 'mrunn',
    kicker: 'Chat-native ERP',
    title: 'Mrunn',
    body: 'An ERP you talk to. Purchase orders, invoices, stock — through a Mastra multi-agent system that renders forms only when they\'re the right tool.',
    tag: 'AI · OPS',
  },
  {
    id: 'taboola',
    kicker: 'Product work',
    title: 'Taboola',
    body: 'Payments expansion across APAC, Ads UI refresh, a company-wide 2FA rollout that landed without breaking a single advertiser account.',
    tag: 'PRODUCT · APAC',
  },
  {
    id: 'kinnect',
    kicker: 'Origin story',
    title: 'Kinnect reporting automation',
    body: 'A week of analyst work per client, per month — replaced. The moment marketing became a systems problem for me.',
    tag: 'AUTOMATION',
  },
];

export default function Projects() {
  return (
    <section className="px-8 md:px-16 py-40 border-t border-[color:var(--color-rule)]" id="projects">
      <div className="grid grid-cols-12 gap-6 mb-16">
        <div className="col-span-12 md:col-span-2 font-mono text-[11px] tracking-[0.2em] text-[color:var(--color-type-dim)] uppercase">
          § 04 — Selected work
        </div>
        <div className="col-span-12 md:col-span-10">
          <h2 className="font-serif text-4xl md:text-5xl text-[color:var(--color-type)] tracking-[-0.01em]">
            Four I'll walk you through.
          </h2>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-20 max-w-6xl">
        {featured.map((p) => (
          <article key={p.id} className="border-t border-[color:var(--color-rule)] pt-6">
            <div className="flex items-baseline justify-between mb-5">
              <span className="font-mono text-[10px] tracking-[0.2em] text-[color:var(--color-accent)]">{p.tag}</span>
              <span className="font-mono text-[10px] text-[color:var(--color-type-dim)]">{p.kicker}</span>
            </div>
            <h3 className="font-serif text-3xl md:text-4xl text-[color:var(--color-type)] mb-4 tracking-[-0.01em]">
              {p.title}
            </h3>
            <p className="text-[color:var(--color-type-muted)] leading-relaxed max-w-md">
              {p.body}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
