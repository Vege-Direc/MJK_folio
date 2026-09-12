// Twitter/X uses the same generated card as Open Graph — one image, one place it's
// drawn. Re-exporting keeps that a fact instead of two files that can drift apart.
export { alt, size, contentType, default } from './opengraph-image';
