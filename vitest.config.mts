import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

/**
 * Tier-A evals only. Node environment — nothing here renders React; the tests
 * read source and content files and assert on facts, not on pixels.
 *
 * Deliberately absent: coverage thresholds and a requirement-id register.
 * Every defect this repo has shipped is a false claim, not a missing
 * requirement, so traceability machinery would guard the wrong thing.
 */
export default defineConfig({
  resolve: {
    // Mirrors tsconfig.json's `"@/*": ["./*"]` so a file under app/ or content/ that
    // imports `@/...` (the convention used throughout app/ and lib/) can also be
    // imported directly by an eval, without every source file having to fall back to
    // relative paths just to stay testable.
    alias: {
      '@': fileURLToPath(new URL('.', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['evals/**/*.test.ts'],
  },
});
