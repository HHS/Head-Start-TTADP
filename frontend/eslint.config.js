const esLint = require("@eslint/js");
const espree = require("espree");
const tsPlugin = require("@typescript-eslint/eslint-plugin");
const tsParser = require("@typescript-eslint/parser");
const globals = require("globals");
const importPlugin = require("eslint-plugin-import");
const jestPlugin = require("eslint-plugin-jest");
const reactPlugin = require("eslint-plugin-react");
const reactHooksPlugin = require("eslint-plugin-react-hooks");
const jsxA11yPlugin = require("eslint-plugin-jsx-a11y");

module.exports = [
  {
    ignores: ["build/*", "coverage/*", "node_modules/*", "eslint.config.js"],
  },
  esLint.configs.recommended,
  {
    // React JS
    files: ["src/**/*.{js,jsx}"],
    languageOptions: {
      parser: espree,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        ...globals.browser,
        ...globals.jest,
        ...globals.node,
      },
    },
    plugins: {
      import: importPlugin,
      jest: jestPlugin,
      react: reactPlugin,
      "react-hooks": reactHooksPlugin,
      "jsx-a11y": jsxA11yPlugin,
    },
    settings: {
      react: {
        version: "detect",
      },
    },
    rules: {
      ...reactPlugin.configs.recommended.rules,
      ...reactHooksPlugin.configs.recommended.rules,
      ...jsxA11yPlugin.configs.recommended.rules,
      ...jestPlugin.configs.recommended.rules,
      ...importPlugin.configs.recommended.rules,
      "jest/no-alias-methods": "off",
      "react/jsx-filename-extension": [1, { extensions: [".js", ".jsx"] }],
      "react/display-name": "warn",
      "linebreak-style": 0,
      "no-unused-vars": "off",
      "jsx-a11y/no-autofocus": "warn",
    },
  },
  {
    // React TS
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        ...globals.browser,
        ...globals.jest,
        ...globals.node,
      },
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
      import: importPlugin,
      jest: jestPlugin,
      react: reactPlugin,
      "react-hooks": reactHooksPlugin,
      "jsx-a11y": jsxA11yPlugin,
    },
    settings: {
      react: {
        version: "detect",
      },
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      ...reactPlugin.configs.recommended.rules,
      ...reactHooksPlugin.configs.recommended.rules,
      ...jsxA11yPlugin.configs.recommended.rules,
      ...jestPlugin.configs.recommended.rules,
      "jest/no-alias-methods": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_" },
      ],
      "react/jsx-filename-extension": [1, { extensions: [".js", ".jsx"] }],
      "react/display-name": "warn",
      "linebreak-style": 0,
      "jsx-a11y/no-autofocus": "warn",
    },
  },
];
