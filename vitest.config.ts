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
  test: {
    environment: 'node',
    include: ['evals/**/*.test.ts'],
  },
});
