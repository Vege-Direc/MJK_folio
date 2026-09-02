import type { Metadata } from 'next';
import { SITE } from '@/content/site';

export const metadata: Metadata = {
  title: 'Privacy',
};

export default function PrivacyPage() {
  return (
    <main className="px-8 md:px-16 py-40 pb-48">
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 md:col-span-2 font-mono text-[11px] tracking-[0.2em] text-[color:var(--color-type-dim)] uppercase">
          § 09 — Privacy
        </div>
        <div className="col-span-12 md:col-span-10 max-w-3xl">
          <h1 className="font-serif text-[clamp(2rem,4.5vw,4rem)] leading-[1.05] text-[color:var(--color-type)] tracking-[-0.01em]">
            The whole policy,
            <br />
            <span className="text-[color:var(--color-type-muted)]">in one page.</span>
          </h1>

          <div className="mt-12 space-y-6 text-lg text-[color:var(--color-type-muted)] leading-relaxed">
            <p>No account. No cookies. No analytics. This page exists because you might ask, not because a form required it.</p>

            <p>
              Questions you type into the dock leave this server and go to{' '}
              <span className="text-[color:var(--color-type)]">OpenRouter</span>, a third-party inference
              provider based in the US, so a model can generate an answer. From there they may be processed
              by whichever model provider OpenRouter routes the request to — I don&rsquo;t run the model, so
              I don&rsquo;t control that hop.
            </p>

            <p>
              Nothing is logged next to your name, because I don&rsquo;t ask for one. The only thing kept is
              a hashed form of your IP address, held in Redis for up to 24 hours, and only to enforce
              rate limits — not to identify you.
            </p>

            <p>If you&rsquo;d rather send nothing anywhere: the résumé PDF works with no chat at all.</p>
          </div>

          <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl">
            <a
              href="/resume.pdf"
              download
              className="block border-t border-[color:var(--color-rule)] pt-4 hover:border-[color:var(--color-accent)] transition-colors"
            >
              <div className="font-mono text-[10px] tracking-[0.2em] text-[color:var(--color-type-dim)] mb-2">01 · PDF</div>
              <div className="font-serif text-xl text-[color:var(--color-type)]">Download resume</div>
            </a>
            <a
              href={`mailto:${SITE.email}`}
              className="block border-t border-[color:var(--color-rule)] pt-4 hover:border-[color:var(--color-accent)] transition-colors"
            >
              <div className="font-mono text-[10px] tracking-[0.2em] text-[color:var(--color-type-dim)] mb-2">02 · EMAIL</div>
              <div className="font-serif text-xl text-[color:var(--color-type)]">{SITE.email}</div>
            </a>
          </div>
          <p className="mt-10 text-sm text-[color:var(--color-type-dim)]">
            Questions about any of this, or a request about your own data — that email reaches me directly.
          </p>
        </div>
      </div>
    </main>
  );
}
