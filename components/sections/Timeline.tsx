// Dates verified against the resume (2026-08-26). Do not edit without checking it.
const stops = [
  { year: '2010', label: 'BEng Mechanical · BITS Pilani, Dubai' },
  { year: '2012', label: 'MSc Aerospace · Brunel University, London' },
  { year: '2013', label: 'Omnicom Group · PHD, OMD, Resolution · India' },
  { year: '2017', label: 'Kinnect India · Senior Manager → Account Director' },
  { year: '2019', label: 'Disney+ Hotstar · IPL & ICC World Cup' },
  { year: '2020', label: 'Taboola · Media Product Specialist · Thailand' },
  { year: '2021', label: 'Independent consulting · India, Thailand, Singapore' },
  { year: '2023', label: 'Nanomark Solutions · Singapore' },
  { year: '2024', label: 'The Triad Co · Paid Media & Data Partner' },
  { year: '2025', label: 'Krunch Labs · AI systems' },
  { year: '2026', label: 'This site.' },
];

export default function Timeline() {
  return (
    <section className="px-8 md:px-16 py-40 border-t border-[color:var(--color-rule)]" id="timeline">
      <div className="grid grid-cols-12 gap-6 mb-16">
        <div className="col-span-12 md:col-span-2 font-mono text-[11px] tracking-[0.2em] text-[color:var(--color-type-dim)] uppercase">
          § 03 — Timeline
        </div>
        <div className="col-span-12 md:col-span-10">
          <h2 className="font-serif text-4xl md:text-5xl text-[color:var(--color-type)] tracking-[-0.01em]">
            2010 → today.
          </h2>
        </div>
      </div>

      <ol className="grid grid-cols-1 md:grid-cols-3 gap-x-10 gap-y-8 max-w-5xl">
        {stops.map((s) => (
          <li key={s.year} className="flex items-baseline gap-4 border-t border-[color:var(--color-rule)] pt-4">
            <span className="font-mono text-xs text-[color:var(--color-accent)]">{s.year}</span>
            <span className="text-[color:var(--color-type)]">{s.label}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
