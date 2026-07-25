import type { Config } from 'tailwindcss';

// Palette is defined in app/globals.css as CSS custom properties.
// Tailwind v4 reads them via the @theme block there.
const config: Config = {
  content: [
    './app/**/*.{ts,tsx,mdx}',
    './components/**/*.{ts,tsx,mdx}',
    './content/**/*.{ts,tsx,mdx}',
  ],
};
export default config;
