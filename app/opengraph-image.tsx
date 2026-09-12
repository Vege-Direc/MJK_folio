import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
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
 * IF THE FETCH FAILS THIS ROUTE USED TO TAKE THE DEPLOY WITH IT. The paragraph that
 * stood here said falling back to no custom fonts was "better than failing the build over
 * an OG image", and it was untrue in two separate ways for as long as it stood. Coolify
 * build 1314 died on 2026-09-12 with "Cannot read properties of undefined (reading
 * split)" out of the prerender, on a commit that built here without complaint, because
 * this machine could reach fonts.googleapis.com that minute and the build container could
 * not.
 *
 * The first fault: the style below read `fontFamily: mono ? 'JetBrains Mono' : undefined`,
 * and satori sees the key as present and splits it. A style property set to `undefined` is
 * not a style property that is absent, so the two spreads below omit the key instead.
 *
 * The second, which the first was hiding: satori has no font of its own. With an empty
 * list it stops at "No fonts are loaded. At least one font is required to calculate the
 * layout." Next ships Geist inside `next` for exactly this, so it is read off disk when
 * the network has given nothing. This route is prerendered, so that read happens at build
 * time and never when a visitor asks for the image.
 *
 * Verified the way the sentence this replaces never was: force both fetches to return
 * null, delete `.next`, run the build, watch it pass.
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

/** The font Next bundles for `ImageResponse`. Read from disk, so no network can lose it. */
async function bundledFont(): Promise<ArrayBuffer | null> {
  try {
    const buf = await readFile(
      join(process.cwd(), 'node_modules', 'next', 'dist', 'compiled', '@vercel', 'og', 'Geist-Regular.ttf'),
    );
    return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
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

  if (!fonts.length) {
    const geist = await bundledFont();
    if (geist) fonts.push({ name: 'Geist', data: geist, weight: 500 as const, style: 'normal' as const });
  }

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
            ...(mono ? { fontFamily: 'JetBrains Mono' } : {}),
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
            ...(fraunces ? { fontFamily: 'Fraunces' } : {}),
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
