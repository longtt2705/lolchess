/**
 * Root ESLint config for the lolchess monorepo (ESLint v8 / legacy config).
 * Shared across apps/* and packages/*; per-area overrides below.
 */
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    // Keep this last so it disables stylistic rules that conflict with Prettier.
    'prettier',
  ],
  env: {
    node: true,
    es2022: true,
  },
  ignorePatterns: [
    'node_modules',
    'dist',
    'build',
    'coverage',
    '*.config.js',
    '*.config.cjs',
    '*.config.ts',
    'vite.config.ts',
  ],
  rules: {
    // The codebase leans on `as any` for Mongoose docs and engine internals.
    '@typescript-eslint/no-explicit-any': 'off',
    // Surface unused code as a warning; allow intentional `_`-prefixed throwaways.
    '@typescript-eslint/no-unused-vars': [
      'warn',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true },
    ],
    'no-unused-vars': 'off', // handled by the @typescript-eslint version above
    // Allow deliberate infinite loops (e.g. `while (true)`); still flag `if (true)`.
    'no-constant-condition': ['error', { checkLoops: false }],
    // Pre-existing patterns in the engine/UI — surfaced as warnings, not blockers,
    // so the tooling can land without bundling a refactor. Worth cleaning up later.
    'no-case-declarations': 'warn',
    'no-empty': 'warn',
  },
  overrides: [
    // Frontend: React 18 + Vite.
    {
      files: ['apps/frontend/**/*.{ts,tsx}'],
      env: { browser: true, node: false },
      extends: ['plugin:react-hooks/recommended'],
      plugins: ['react-refresh'],
      rules: {
        'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
        // Pre-existing: several components call hooks after an early return. These are
        // real and worth fixing, but surfaced as warnings so the tooling can land first.
        'react-hooks/rules-of-hooks': 'warn',
      },
    },
    // Backend (NestJS) + engine packages run on Node.
    {
      files: ['apps/backend/**/*.ts', 'packages/**/*.ts'],
      env: { node: true, browser: false },
    },
    // Test files.
    {
      files: ['**/*.spec.ts', '**/*.test.ts'],
      env: { jest: true, node: true },
    },
  ],
};
