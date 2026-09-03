import type { Metadata, Viewport } from 'next';
import { Fraunces, Inter, JetBrains_Mono } from 'next/font/google';
import AnswerPortal from '@/components/chat/AnswerPortal';
import ChatDock from '@/components/chat/ChatDock';
import { ChatProvider } from '@/components/chat/ChatProvider';
import { SITE } from '@/content/site';
import { serializeJsonLd } from '@/lib/json-ld';
import './globals.css';

// Distinct variable names: app/globals.css declares --font-sans/-serif/-mono as Tailwind
// @theme tokens on :root, which has the same specificity as the class next/font puts on
// <html>. Whichever stylesheet the head happens to emit second would win, and when that
// is the theme the page renders in system fallbacks with no error anywhere.
const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const fraunces = Fraunces({ subsets: ['latin'], variable: '--font-fraunces' });
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-jetbrains' });

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: SITE.title,
    template: `%s · ${SITE.shortName}`,
  },
  description: SITE.description,
  keywords: [
    'Mathew John Kondekeril',
    'AI systems consultant',
    'Krunch Labs',
    'multi-agent orchestration',
    'LangGraph',
    'Next.js',
    'Singapore',
  ],
  authors: [{ name: SITE.name, url: SITE.url }],
  creator: SITE.name,
  openGraph: {
    type: 'profile',
    locale: SITE.locale,
    url: SITE.url,
    siteName: SITE.name,
    title: SITE.title,
    description: SITE.description,
    // No `images` here on purpose: app/opengraph-image.tsx is the single source of
    // the OG image, and Next merges its file-based route into resolved metadata
    // automatically. Setting `images` here would duplicate it or fight over which
    // wins — see Next's metadata resolution tests on `images: undefined`.
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE.title,
    description: SITE.description,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
    },
  },
  alternates: {
    canonical: '/',
  },
};

export const viewport: Viewport = {
  themeColor: '#0a0a0e',
  colorScheme: 'dark',
  /*
   * Ask the browser to resize the layout viewport when the on-screen keyboard opens,
   * rather than leaving a `position: fixed` bar stranded underneath it. Chrome 108+
   * honours it today and WebKit has it in trunk; where it is not honoured it is inert,
   * so this is a free half of the fix and `ChatDock`'s measured inset is the half that
   * works everywhere.
   */
  interactiveWidget: 'resizes-content',
};

/**
 * Person JSON-LD. Every field traces to a fact already committed elsewhere (the
 * résumé facts baked into content/site.ts, or the skills list in
 * content/memories.yaml) — nothing here is invented for SEO.
 */
const personJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Person',
  name: SITE.name,
  url: SITE.url,
  jobTitle: 'Founder & AI Systems Consultant, Krunch Labs',
  worksFor: {
    '@type': 'Organization',
    name: 'Krunch Labs',
  },
  address: {
    '@type': 'PostalAddress',
    addressLocality: 'Singapore',
    addressCountry: 'SG',
  },
  email: SITE.email,
  sameAs: [SITE.github, SITE.linkedin],
  knowsAbout: ['Paid media', 'Multi-agent orchestration', 'LangGraph', 'Next.js', 'TypeScript'],
};

const personJsonLdString = serializeJsonLd(personJsonLd);

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${fraunces.variable} ${mono.variable}`}>
      <body>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: personJsonLdString }} />
        <ChatProvider>
          {children}
          <AnswerPortal />
          <ChatDock />
        </ChatProvider>
      </body>
    </html>
  );
}
