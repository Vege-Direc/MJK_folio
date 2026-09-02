import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';

/**
 * Next 16 removed `next lint`, so `npm run lint` is `eslint .` against this flat config.
 * `globalIgnores` is re-declared here because eslint-config-next's own ignores are
 * replaced, not merged, the moment a project config sets any.
 */
export default defineConfig([
  ...nextVitals,
  ...nextTypescript,
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    'node_modules/**',
    'graphify-out/**',
    'reference/**',
    'public/**',
  ]),
]);
