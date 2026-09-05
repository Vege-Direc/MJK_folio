import { ImageResponse } from 'next/og';
import { SITE } from '@/content/site';

// Image metadata
export const alt = SITE.title;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/**
 * Fraunces (headline) and JetBrains Mono (kicker) — the exact two DOM fonts declared
 * in app/layout.tsx — loaded from Google Fonts as `.woff` at image-generation time.
 *
 * This route has no dynamic APIs, so Next generates it once at `next build`; the
 * compiled output serves a static PNG and never touches the network again at request
 * time. `.woff`, not `.woff2`, because satori (what `ImageResponse` runs on) accepts
 * ttf/otf/woff only — Google's CSS endpoint serves woff2 to modern browsers, so the
 * fetch below sends a legacy User-Agent to get the woff variant instead.
 *
 * If the fetch fails (offline build, blocked egress), we fall back to no custom fonts.
 * Satori's built-in fallback still renders every character, just without the serif/mono
 * distinction — better than failing the build over an OG image.
 */
async function loadGoogleFont(family: string, weight: number): Promise<ArrayBuffer | null> {
  try {
    const css = await fetch(
      `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@${weight}&display=swap`,
      { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MSIE 9.0; Windows NT 6.1; Trident/5.0)' } },
    ).then((res) => res.text());

    const match = css.match(/src: url\(([^)]+)\) format\('woff'\)/);
    if (!match) return null;

    const buf = await fetch(match[1]).then((res) => res.arrayBuffer());
    return buf;
  } catch {
    return null;
  }
}

export default async function Image() {
  const [fraunces, mono] = await Promise.all([
    loadGoogleFont('Fraunces', 600),
    loadGoogleFont('JetBrains Mono', 500),
  ]);

  const fonts = [
    fraunces ? { name: 'Fraunces', data: fraunces, weight: 600 as const, style: 'normal' as const } : null,
    mono ? { name: 'JetBrains Mono', data: mono, weight: 500 as const, style: 'normal' as const } : null,
  ].filter((f): f is NonNullable<typeof f> => f !== null);

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '96px',
          backgroundColor: '#0a0a0e',
        }}
      >
        <div
          style={{
            display: 'flex',
            fontFamily: mono ? 'JetBrains Mono' : undefined,
            fontSize: 22,
            letterSpacing: 6,
            textTransform: 'uppercase',
            color: '#a8a49a',
          }}
        >
          {SITE.name} · Singapore
        </div>
        <div
          style={{
            display: 'flex',
            marginTop: 40,
            fontFamily: fraunces ? 'Fraunces' : undefined,
            fontSize: 62,
            lineHeight: 1.28,
            color: '#f5f3ee',
            maxWidth: 980,
          }}
        >
          {SITE.tagline}
        </div>
        <div
          style={{
            display: 'flex',
            marginTop: 56,
            width: 120,
            height: 2,
            backgroundColor: '#d4c19c',
          }}
        />
      </div>
    ),
    { ...size, fonts },
  );
}
