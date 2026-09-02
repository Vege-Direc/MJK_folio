# --- deps
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
# No --omit=optional. Next's platform binaries -- @next/swc-*, lightningcss-* and sharp --
# are optionalDependencies, so omitting them removes the compiler the build needs and the
# image cannot be built at all.
RUN npm ci

# --- build
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# --- runner
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# curl is for Coolify's health probe. busybox wget alone resolves `localhost` to ::1 on
# Alpine and is refused, because Next binds 0.0.0.0; curl falls back to 127.0.0.1.
RUN apk add --no-cache curl \n && addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# The ask route and lib/rag.ts read content/ off disk at runtime with a path built from
# process.cwd(), so nothing imports it and nothing traces it. next.config.ts declares it
# under outputFileTracingIncludes; this line is the belt to that braces, because the cost
# of the two disagreeing is a container that 500s on every question.
COPY --from=builder --chown=nextjs:nodejs /app/content ./content
USER nextjs
EXPOSE 3000
ENV PORT=3000 HOSTNAME=0.0.0.0
CMD ["node", "server.js"]
