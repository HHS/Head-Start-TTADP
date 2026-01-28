const esLint = require("@eslint/js");
const tsLint = require("typescript-eslint");
const globals = require("globals");
const importPlugin = require("eslint-plugin-import");
const jestPlugin = require("eslint-plugin-jest");
const nodePlugin = require("eslint-plugin-n");
const reactPlugin = require("eslint-plugin-react");
const reactHooksPlugin = require("eslint-plugin-react-hooks");
const jsxA11yPlugin = require("eslint-plugin-jsx-a11y");
const testingLibraryPlugin = require("eslint-plugin-testing-library");

module.exports = [
  {
    ignores: [
      "build/*",
      "node_modules/*",
      "frontend/build/*",
      "frontend/public/*",
      "public/*",
      "coverage/*",
      "reports/*",
      "tests/*",
      "packages/*",
      "ops/*",
      "e2e/*",
      "cucumber/*",
      "playwright-report/*",
      "playwright.config.js",
      "test-results/*",
      "eslint.config.js",
      "eslint.config.mts",
    ],
  },
  // Javascript
  esLint.configs.recommended,
  { 
    files: ["src/**/*.js"],
    plugins: {
      import: importPlugin,
      jest: jestPlugin,
      node: nodePlugin,
    },
    languageOptions: {
      sourceType: "module",
      globals: {
        ...globals.jest,
        ...globals.node,
      },
    },
    rules: {
      "no-unused-vars": "off",
      "no-require-imports": "off",
      "node/no-missing-import": "off",
      "node/no-missing-require": "off",
      "node/no-unpublished-import": "off",
      "node/no-unpublished-require": "off",
      "node/no-process-exit": "off",
    },
  },
  // Typescript
  { 
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: {
      parser: tsLint.parser,
      parserOptions: {
        project: "./src/tsconfig.json",
      },
      globals: {
        ...globals.node,
        ...globals.jest,
      },
    },
    plugins: {
      "@typescript-eslint": tsLint.plugin,
      jest: jestPlugin,
    },
    rules: {
      ...tsLint.configs.recommended.rules,
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/ban-ts-comment": "off",
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  // Frontend (React + browser)
  {
    files: ["frontend/src/**/*.{js,jsx,ts,tsx}"],
    languageOptions: {
      parser: tsLint.parser,
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        ...globals.browser,
        ...globals.jest,
      },
    },
    plugins: {
      react: reactPlugin,
      "react-hooks": reactHooksPlugin,
      "jsx-a11y": jsxA11yPlugin,
      "testing-library": testingLibraryPlugin,
      "@typescript-eslint": tsLint.plugin,
    },
    settings: {
      react: {
        version: "detect",
      },
    },
    rules: {
      ...reactPlugin.configs.flat.recommended.rules,
      ...reactHooksPlugin.configs.recommended.rules,
      ...jsxA11yPlugin.configs.recommended.rules,
      ...testingLibraryPlugin.configs["flat/react"].rules,
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
    },
  },
];
