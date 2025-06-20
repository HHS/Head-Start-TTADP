import globals from 'globals';
import pluginImport from 'eslint-plugin-import';
import pluginJest from 'eslint-plugin-jest';
import pluginJs from 'eslint-plugin-jsx-a11y';
import pluginReact from 'eslint-plugin-react';
import tseslint from '@typescript-eslint/eslint-plugin';

const extensions = {
  js: '{js,mjs,cjs,jsx}',
  ts: '{ts,mts,cts,tsx}',
};
const allFiles = [`**/*.${extensions.js}`, `**/*.${extensions.ts}`];

export default [
  {
   // ...pluginReact.configs.recommended,
    files: allFiles,
    ignores: [
      '**/.git/**',
      '**/build/**',
      '**/coverage/**',
      '**/dist/**',
      '**/dist-types/**',
      '**/node_modules/**',
      '**/public/**',
      '**/templates/**',
      'eslint.confg.mjs',
    ],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    name: 'Project-wide settings',
    settings: {
      react: {
        version: 'detect',
      },
    },
  }
  // {
  //   ...pluginJs.configs.recommended,
  //   files: allFiles,
  //   name: 'JavaScript settings',
  // },
  // {
  //   files: allFiles,
  //   name: 'Import settings',
  //   plugins: {
  //     import: pluginImport,
  //   },
  //   rules: {
  //     'import/order': 'error',
  //     'import/no-extraneous-dependencies': ['error', { devDependencies: true }],
  //   },
  // },
  // {
  //   ...tseslint.configs.recommended,
  //   files: [`**/*.${extensions.ts}`],
  //   name: 'TypeScript settings',
  // },
  // {
  //   files: [`**/*.${extensions.ts}`],
  //   name: 'TypeScript overrides',
  //   rules: {
  //     '@typescript-eslint/no-unused-vars': [
  //       'error',
  //       {
  //         argsIgnorePattern: '^_',
  //         caughtErrorsIgnorePattern: '^_',
  //         destructuredArrayIgnorePattern: '^_',
  //         varsIgnorePattern: '^_',
  //       },
  //     ],
  //   },
  // },
  // {
  //   ...pluginJest.configs['flat/recommended'],
  //   files: [`**/*.test.${extensions.js}`, `**/*.test.${extensions.ts}`],
  //   name: 'Jest settings',
  // },
];
