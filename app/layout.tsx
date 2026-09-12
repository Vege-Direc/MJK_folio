import type { Metadata, Viewport } from 'next';
import { Fraunces, Inter, JetBrains_Mono } from 'next/font/google';
import AnswerPortal from '@/components/chat/AnswerPortal';
import ChatDock from '@/components/chat/ChatDock';
import { ChatProvider } from '@/components/chat/ChatProvider';
import IntroGate from '@/components/mind/IntroGate';
import { PORTRAIT } from '@/lib/mind/portrait-tone';
import { SITE } from '@/content/site';
import { serializeJsonLd } from '@/lib/json-ld';
import './globals.css';
import '@/components/mind/intro.css';

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

/**
 * Whether the opening gate runs, decided before the browser paints anything.
 *
 * WHY IT IS A BLOCKING INLINE SCRIPT AND NOT REACT. Every input to this decision —
 * `localStorage`, the OS motion setting, the URL fragment — exists only on the client, so
 * a React render either has to guess (and be wrong for half the visitors) or wait for
 * hydration. Waiting means the overlay's markup is in the HTML and the decision is not,
 * which is a visible frame of an intro for the people most entitled not to see one.
 * Running here, as the first thing in the body, means the overlay is parsed with the
 * answer already on `<html>`; `intro.css` defaults it to `display: none`, so the flash
 * cannot happen in either direction. Same shape as a theme script, for the same reason.
 *
 * THE FIVE REFUSALS, and four of them matter more than the button in the corner:
 *
 * - **A hash deep link.** Someone arriving at `#work` has an intent and a destination.
 * - **A return visit.** Once per visitor, and the flag is written when the gate STARTS,
 *   so a reload during the animation does not replay it.
 * - **Reduced motion, from the operating system.** Stricter than `lib/motion.ts`, which
 *   lets an explicit choice outrank the OS. A visitor cannot have consented to a
 *   full-screen animation they have not seen; the in-page control is about the ambient
 *   scene they stayed for. It also keeps this exactly equivalent to the CSS belt in
 *   `intro.css` — if the two could disagree, the disagreement would be an invisible
 *   overlay holding an inert page.
 * - **The site's own motion control set to `calm`.** The scene's reduced-motion promise
 *   is measured (7.88% to 0.01% of pixels changing per frame on a desktop) and an intro
 *   that ignored the control that makes it would be breaking a promise the site keeps.
 * - **A background tab.** An animation nobody is looking at, which then ends before they
 *   look, is a gate that only ever cost them time.
 *
 * `?intro=1` forces it past the first two, so the owner can watch it again and so it can
 * be measured. It does NOT force it past reduced motion or `calm`; nothing does.
 *
 * Together with the once-per-visitor flag, these refusals are the substantive WCAG 2.2.1
 * satisfaction — "turn it off before encountering it" — and the skip control is the
 * backstop rather than the compliance.
 */
/**
 * The gate does not run while the portrait is the synthetic placeholder, and this is a
 * refusal rather than a warning.
 *
 * `IntroGate` logs to the console when `PORTRAIT.placeholder` is true, which tells a
 * developer and nobody else. This branch auto-deploys, so a console warning would have put
 * a generated head in front of every first-time visitor with "I'm Mathew" written beside
 * it. A face that is not his, captioned with his name, is a misrepresentation of a real
 * person whatever the intent — so the decision is made here, before the overlay can paint,
 * and `?intro=1` still forces it for review.
 *
 * Deleting this line is part of shipping the photograph, not a separate chore:
 * `scripts/make-portrait.ts` sets `placeholder: false`, and then this evaluates to `false`
 * and disappears from the emitted script on its own.
 */
const INTRO_NEEDS_FORCING = PORTRAIT.placeholder;

const INTRO_DECISION = `(function(){try{
var d=document.documentElement,f=location.search.indexOf('intro=1')>-1;
if(${INTRO_NEEDS_FORCING ? 'true' : 'false'}&&!f)return;
if(document.visibilityState==='hidden')return;
var m=null;try{m=localStorage.getItem('mjk:motion')}catch(e){}
if(m==='calm')return;
if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
if(!f){
if(location.hash)return;
var s=null;try{s=localStorage.getItem('mjk:intro')}catch(e){}
if(s)return;
}
try{localStorage.setItem('mjk:intro','1')}catch(e){}
d.dataset.intro='on';
}catch(e){}})()`;

/**
 * Arms the gate during parse: `inert` beneath it, and a dismissal that works before any
 * of the bundle has run.
 *
 * BOTH HALVES EXIST BECAUSE HYDRATION IS NOT INSTANT. The overlay is painted with the
 * first HTML; the React effect that owns it runs after hydration, which on a slow phone
 * is hundreds of milliseconds later and can be seconds. In that window the naive version
 * has a full-screen overlay over a page that is still focusable and that ignores every
 * key and gesture — the two worst properties this feature could have, and both invisible
 * in a fast test.
 *
 * `inert` has to be set after `#page-root` closes and before anything can be tabbed into
 * it, which is a moment React cannot reach. As the last statement in the body it costs
 * one line and closes the window entirely.
 *
 * The listeners are the same contract the running gate keeps — any wheel, key, pointer or
 * touch ends it — held open from first paint instead of from hydration. Once the real
 * gate starts it publishes `data-intro-live` and these stand down at their next event
 * rather than hard-cutting an animation that has its own 220ms exit.
 *
 * With JavaScript off none of it runs, which is the right answer: the overlay is not
 * displayed either, and a permanently inert page would be far worse than a missing
 * animation.
 */
const INTRO_ARM = `(function(){var d=document.documentElement;
if(d.dataset.intro!=='on')return;
var r=document.getElementById('page-root');if(r)r.inert=true;
var E=['wheel','keydown','pointerdown','touchmove'];
var k=function(e){if(e.type==='keydown'&&/^(Tab|Shift|Control|Alt|Meta)$/.test(e.key))return;
E.forEach(function(n){window.removeEventListener(n,k,true)});
if(d.dataset.introLive==='1')return;
delete d.dataset.intro;if(r)r.removeAttribute('inert');};
E.forEach(function(n){window.addEventListener(n,k,{capture:true,passive:true})});})()`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${fraunces.variable} ${mono.variable}`}>
      <body>
        {/* First in the body, so the answer is on <html> before the overlay is parsed. */}
        <script dangerouslySetInnerHTML={{ __html: INTRO_DECISION }} />
        {/*
          The gate is above everything and outside `#page-root`, so the one thing that
          stays reachable while it is up is its own skip control. The nine sections are
          still server-rendered underneath it — a crawler and a JavaScript-off visitor
          get exactly the page they got before, because `inert` and `display: none` are
          both things only the client does.
        */}
        <IntroGate />
        <div id="page-root">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: personJsonLdString }} />
        {/*
          First in the body, so it is the first tab stop on the page.
          
          It was not needed until the cards became controls. Before that the tab order was
          25 stops and the ask field was near the end of it; making eight cards pressable
          pushed the field from stop 35 to stop 43, on a page whose entire purpose is that
          field. Type-to-focus already covers a sighted keyboard visitor and covers a screen
          reader not at all — single characters are quick-navigation keys in browse mode, so
          typing a letter jumps to the next heading instead of reaching the input.

          A plain anchor to a focusable target, deliberately: browsers move focus into an
          `<input>` addressed this way, and it keeps working with JavaScript off, which is
          the state the rest of this page is careful to survive.
        */}
        <a href="#ask" className="skip-to-ask">
          Skip to the ask box
        </a>
        <ChatProvider>
          {children}
          <AnswerPortal />
          <ChatDock />
        </ChatProvider>
        </div>
        <script dangerouslySetInnerHTML={{ __html: INTRO_ARM }} />
      </body>
    </html>
  );
}
