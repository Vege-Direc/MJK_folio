export const runtime = 'nodejs';

/**
 * Liveness only. Coolify polls this to decide whether to roll the container, and an
 * unauthenticated endpoint that reports whether a credential is configured tells a
 * stranger which half of the deployment to attack. It answers whether the process is up.
 * Nothing else.
 */
export function GET() {
  return Response.json({ ok: true });
}
