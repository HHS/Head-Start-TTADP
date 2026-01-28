const esLint = require("@eslint/js");
const espree = require("espree");
const tsPlugin = require("@typescript-eslint/eslint-plugin");
const tsParser = require("@typescript-eslint/parser");
const stylisticPlugin = require("@stylistic/eslint-plugin");
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
    settings: {
      "import/resolver": {
        typescript: {
          project: "./src/tsconfig.json",
        },
        node: {
          extensions: [".js", ".jsx", ".ts", ".tsx", ".d.ts"],
        },
      },
    },
  },
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
      "@typescript-eslint": tsPlugin,
      "@stylistic": stylisticPlugin,
    },
    languageOptions: {
      sourceType: "module",
      globals: {
        ...globals.jest,
        ...globals.node,
      },
    },
    rules: {
      ...esLint.configs.recommended.rules,
      ...importPlugin.configs.recommended.rules,
      ...jestPlugin.configs.recommended.rules,
      "import/no-named-as-default": "off",
      "no-unused-vars": "off",
      "no-require-imports": "off",
      "no-console": "warn",
      "no-shadow": "off",
      "@typescript-eslint/no-shadow": "error",
      "node/no-missing-import": "off",
      "node/no-missing-require": "off",
      "node/no-unpublished-import": "off",
      "node/no-unpublished-require": "off",
      "node/no-process-exit": "off",
      "node/global-require": "error",
      "no-param-reassign": "error",
      "jest/no-alias-methods": "off",
      "@stylistic/semi": ["error", "always"],
      "@stylistic/indent": ["error", 2],
    },
  },
  // Typescript
  {
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: "./src/tsconfig.json",
      },
      globals: {
        ...globals.node,
        ...globals.jest,
      },
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
      import: importPlugin,
      jest: jestPlugin,
      node: nodePlugin,
      "@stylistic": stylisticPlugin,
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      ...importPlugin.configs.recommended.rules,
      ...jestPlugin.configs.recommended.rules,
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/ban-ts-comment": "off",
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-require-imports": "off",
      "no-console": "warn",
      "no-require-imports": "off",
      "node/global-require": "error",
      "jest/no-alias-methods": "off",
    },
  },
];
