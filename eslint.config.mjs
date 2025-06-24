// @ts-check
import eslint from '@eslint/js';
import globals from 'globals'; 
import pluginJest from 'eslint-plugin-jest';
import pluginReact from 'eslint-plugin-react';
import pluginJsxA11y from 'eslint-plugin-jsx-a11y';
import tseslint from 'typescript-eslint';

const extensions = {
  js: '{js,mjs,cjs,jsx}',
  ts: '{ts,mts,cts,tsx}',
};

const allFiles = [`**/*.${extensions.js}`, `**/*.${extensions.ts}`];

const allBackendFiles = [`packages/backend/**/*.${extensions.js}`, `packages/backend/**/*.${extensions.ts}`];
const allFrontendFiles = [`packages/frontend/**/*.${extensions.js}`, `packages/frontend/**/*.${extensions.ts}`];

export default [
  {
    name: "Global Ignore list",
    ignores: [
      "**/node_modules/*",
      "playwright.config.js",
      "tests/**",
      "packages/common/*",
      "packages/frontend/public/*"
    ],
  },
  {
    ...eslint.configs.recommended,
    name: 'Global settings',
    files: allFiles,
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node
      },      
      parserOptions: {
        projectService: true,
        tsconfigRootDir: '.'
      },
    },
    linterOptions: {
			reportUnusedDisableDirectives: false

		},
    rules: {
      "linebreak-style": 0,
      "@typescript-eslint/no-var-requires": 0,
      "@typescript-eslint/no-unused-vars": 0,
      "@typescript-eslint/no-empty-function": 0,
      "@typescript-eslint/ban-ts-comment": 0
    }
  },
  {
    ...tseslint.configs.recommended.reduce(
      (result, configObject) => ({ ...result, ...configObject }),
      {},
    ),
    name: 'Typescript Settings',
    files: [`**/*.${extensions.ts}`],
  },
  {
    ...pluginReact.configs.flat.recommended,
    ...pluginJsxA11y.configs['flat/recommended'],
    name: 'Frontend Settings',
    files: allFrontendFiles,
    rules: {
      "react/jsx-filename-extension": [
        1,
        {
          "extensions": [
            ".js",
            ".jsx"
          ]
        }
      ],
      "linebreak-style": 0
    },    
  },
  {
    ...pluginJest.configs['flat/recommended'],
    files: [`**/__tests__/**.${extensions.js}`,`**/__tests__/**.${extensions.ts}`],
    name: 'Jest settings',
  },  
]