import js from '@eslint/js';
import { defineConfig, globalIgnores, } from 'eslint/config';
import globals from 'globals'; 
import pluginImport from 'eslint-plugin-import';
import pluginJest from 'eslint-plugin-jest';
import pluginReact from 'eslint-plugin-react';
import pluginHooks from 'eslint-plugin-react-hooks';
import pluginJsxA11y from 'eslint-plugin-jsx-a11y';
import pluginTestingLibrary from 'eslint-plugin-testing-library';
import tseslint from 'typescript-eslint';

const extensions = {
  js: '{js,mjs,cjs,jsx}',
  ts: '{ts,mts,cts,tsx}',
};

const allJavascriptFiles = [`**/*.${extensions.js}`];
const allTypescriptFiles = [`**/*.${extensions.ts}`];
const allFiles = [...allJavascriptFiles, ...allTypescriptFiles];

const allBackendFiles = [`packages/backend/**/*.${extensions.js}`, `packages/backend/**/*.${extensions.ts}`];
const allFrontendFiles = [`packages/frontend/**/*.${extensions.js}`, `packages/frontend/**/*.${extensions.ts}`];

export default defineConfig([
  globalIgnores([
    "**/node_modules/",
    "playwright.config.js",
    "tests/**",
    "packages/common/",
    "packages/frontend/public/",
    // TODO: Temporary, remove these later
    "tools/*",
    // TODO: Test paths?
    "**/__tests__/",
    "**/*.test.*",
    "**/test*.*"
  ]),  
  js.configs.recommended,
  tseslint.configs.recommended,
  pluginReact.configs.flat['recommended'],
  pluginImport.flatConfigs.recommended,
  pluginJsxA11y.flatConfigs.recommended,
  // pluginHooks.configs.recommended,
  // pluginImport.configs.recommended,
  {
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
    plugins: {
      pluginHooks
    //   // import: pluginImport,
    //   // react: pluginReact,
    //   pluginJsxA11y
    },    
    // plugins: {
    //   import: pluginImport,
    //   jest: pluginJest,
    //   'jsx-a11y': pluginJsxA11y,
    // },
    rules: {
      "linebreak-style": 0,
      "@typescript-eslint/no-var-requires": 0,
      "@typescript-eslint/no-unused-vars": 0,
      "@typescript-eslint/no-empty-function": 0,
      "@typescript-eslint/ban-ts-comment": 0,
      "react/jsx-filename-extension": [
        1,
        {
          extensions: [
            ".js",
            ".jsx"
          ]
        }
      ],
      "linebreak-style": 0,
      // These are rules that are currently not enabled using our old configurations so they've been preserved
      "react/no-deprecated": 0,
      "react/jsx-key": 0,
      "@typescript-eslint/no-require-imports": 0,
    }
  },
  // {
  //   name: 'Typescript Settings',
  //   files: allTypescriptFiles,
  //   extends: tseslint.configs.recommended,
  //   rules: {
  //     "@typescript-eslint/no-var-requires": 0,
  //     "@typescript-eslint/no-unused-vars": 0,
  //     "@typescript-eslint/no-empty-function": 0,
  //     "@typescript-eslint/ban-ts-comment": 0,
  //     "react/jsx-filename-extension": [
  //       1,
  //       {
  //         extensions: [
  //           ".js",
  //           ".jsx"
  //         ]
  //       }
  //     ],
  //     "linebreak-style": 0
  //   },
  // }
  // {
  //   name: 'Frontend Settings',
  //   files: allFrontendFiles,
  //   languageOptions: {
  //     globals: {
  //       "jest/globals": true, // TODO: Move this to a test config later
  //       browser: true,
  //     }
  //   },
  //   rules: {
  //     "react/jsx-filename-extension": [
  //       1,
  //       {
  //         extensions: [
  //           ".js",
  //           ".jsx"
  //         ]
  //       }
  //     ],
  //     "linebreak-style": 0
  //   },
  // }  
]);

// export default [
//   {
//     name: "Global Ignore list",
//     ignores: [
//       "**/node_modules/*",
//       "playwright.config.js",
//       "tests/**",
//       "packages/common/*",
//       "packages/frontend/public/*"
//     ],
//   },
//   {
//     ...eslint.configs.recommended,
//     name: 'Global settings',
//     files: allFiles,
//     languageOptions: {
//       globals: {
//         ...globals.browser,
//         ...globals.node
//       },      
//       parserOptions: {
//         projectService: true,
//         tsconfigRootDir: '.'
//       },
//     },
//     linterOptions: {
// 			reportUnusedDisableDirectives: false
// 		},
//     plugins: {
//       import: pluginImport,
//       jest: pluginJest,
//       'jsx-a11y': pluginJsxA11y,
//     },
//     rules: {
//       "linebreak-style": 0,
//       "@typescript-eslint/no-var-requires": 0,
//       "@typescript-eslint/no-unused-vars": 0,
//       "@typescript-eslint/no-empty-function": 0,
//       "@typescript-eslint/ban-ts-comment": 0
//     }
//   }, 
//   {
//     ...pluginReact.configs.flat.recommended,
//     name: 'Frontend Settings',
//     files: allFrontendFiles,
//     rules: {
//       "react/jsx-filename-extension": [
//         1,
//         {
//           "extensions": [
//             ".js",
//             ".jsx"
//           ]
//         }
//       ],
//       "linebreak-style": 0
//     },    
//   }
// ]