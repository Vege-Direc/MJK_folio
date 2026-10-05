import { ImageResponse } from 'next/og';

/**
 * A code-generated Apple touch icon, not a static PNG — no image-generation deps
 * (sharp, canvas, etc.) exist in this project, and `next/og`'s `ImageResponse` (already
 * used by app/opengraph-image.tsx) draws one without adding any. Deliberately no custom
 * font fetch here: this route is small and self-contained, and the single bold glyph
 * doesn't need Fraunces to read clearly at app-icon size.
 */
export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0a0a0e',
        }}
      >
        <div style={{ display: 'flex', fontSize: 96, fontWeight: 700, color: '#d4c19c' }}>M</div>
      </div>
    ),
    size,
  );
}
