import type { Metadata } from 'next';
import { Fraunces, Inter, JetBrains_Mono } from 'next/font/google';
import ChatDock from '@/components/chat/ChatDock';
import './globals.css';

// Distinct variable names: app/globals.css declares --font-sans/-serif/-mono as Tailwind
// @theme tokens on :root, which has the same specificity as the class next/font puts on
// <html>. Whichever stylesheet the head happens to emit second would win, and when that
// is the theme the page renders in system fallbacks with no error anywhere.
const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const fraunces = Fraunces({ subsets: ['latin'], variable: '--font-fraunces' });
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-jetbrains' });

export const metadata: Metadata = {
  title: 'Mathew John Kondekeril — First I imagine it. Then I learn whatever it takes to build it.',
  description: 'Engineer, marketer, builder. Ask this site anything.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${fraunces.variable} ${mono.variable}`}>
      <body>
        {children}
        <ChatDock />
      </body>
    </html>
  );
}
