export default function MetaLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="font-mono text-[11px] tracking-[0.15em] text-[color:var(--color-type-dim)] uppercase">
      {children}
    </div>
  );
}
