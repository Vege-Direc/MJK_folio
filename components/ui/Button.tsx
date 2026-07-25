type Props = React.ButtonHTMLAttributes<HTMLButtonElement>;
export default function Button({ children, ...rest }: Props) {
  return (
    <button
      {...rest}
      className={`font-mono text-xs tracking-[0.12em] uppercase text-[color:var(--color-accent)] border border-[color:var(--color-accent)] px-4 py-2 rounded-[3px] hover:bg-[color:var(--color-accent)] hover:text-[color:var(--color-bg)] transition-colors ${rest.className ?? ''}`}
    >
      {children}
    </button>
  );
}
