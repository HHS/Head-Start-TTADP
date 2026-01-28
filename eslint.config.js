const airbnbExtended = require('eslint-config-airbnb-extended');
const tsParser = require('@typescript-eslint/parser');
const tsPlugin = require('@typescript-eslint/eslint-plugin');
const jestPlugin = require('eslint-plugin-jest');
const testingLibraryPlugin = require('eslint-plugin-testing-library');
const reactPlugin = require('eslint-plugin-react');
const reactHooksPlugin = require('eslint-plugin-react-hooks');
const jsxA11yPlugin = require('eslint-plugin-jsx-a11y');
const importPlugin = require('eslint-plugin-import');
const importXPlugin = require('eslint-plugin-import-x');
const nPlugin = require('eslint-plugin-n');
const stylisticPlugin = require('@stylistic/eslint-plugin');

const toArray = (config) => (Array.isArray(config) ? config : [config]);
const airbnbBaseRecommended = airbnbExtended.configs?.base?.recommended;
const airbnbBaseTypescript = airbnbExtended.configs?.base?.typescript;
const airbnbReactRecommended = airbnbExtended.configs?.react?.recommended;
const airbnbReactTypescript = airbnbExtended.configs?.react?.typescript;
const airbnbConfigs = [
  ...toArray(airbnbBaseRecommended),
  ...toArray(airbnbBaseTypescript),
  ...toArray(airbnbReactRecommended),
  ...toArray(airbnbReactTypescript),
];
const tsRecommended = tsPlugin.configs['flat/recommended'] || tsPlugin.configs.recommended || {};
const jestRecommended = jestPlugin.configs['flat/recommended'] || jestPlugin.configs.recommended || {};
const testingLibraryReact = testingLibraryPlugin.configs?.['flat/react']
  || testingLibraryPlugin.configs?.react
  || {};
const tsRecommendedConfigs = toArray(tsRecommended).map((config) => (
  config.files ? config : { ...config, files: ['src/**/*.{ts,tsx}'] }
));
const testingLibraryReactScoped = testingLibraryReact.files
  ? testingLibraryReact
  : {
      ...testingLibraryReact,
      files: [
        'frontend/src/**/*.{test,spec}.{js,jsx,ts,tsx}',
        'frontend/src/**/__tests__/**/*.{js,jsx,ts,tsx}',
      ],
    };

module.exports = [
  {
    ignores: [
      'node_modules/*',
      'build/*',
      'frontend/build/*',
      'frontend/public/*',
      'public/*',
      'coverage/*',
      'reports/*',
      'playwright.config.js',
      'tests/*',
      'packages/*',
      'ops/*',
      'cucumber/*',
      'e2e/*',
      'playwright-report/*',
      'test-results/*',
      'eslint.config.js',
    ],
  },
  {
    files: ['**/*.{js,cjs,mjs,jsx,ts,cts,mts,tsx}'],
    plugins: {
      '@typescript-eslint': tsPlugin,
      '@stylistic': stylisticPlugin,
      'import-x': importXPlugin,
      n: nPlugin,
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
      'jsx-a11y': jsxA11yPlugin,
      jest: jestPlugin,
      'testing-library': testingLibraryPlugin,
      import: importPlugin,
    },
  },
  ...airbnbConfigs,
  jestRecommended,
  ...tsRecommendedConfigs,
  testingLibraryReactScoped,
  {
    files: ['src/**/*.{js,ts}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
        project: './src/tsconfig.json',
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      import: importPlugin,
      jest: jestPlugin,
    },
    rules: {
      'linebreak-style': "off",
      '@typescript-eslint/no-var-requires': "off",
      '@typescript-eslint/no-unused-vars': "off",
      '@typescript-eslint/no-empty-function': "off",
      '@typescript-eslint/ban-ts-comment': "off",
    },
  },
  {
    files: ['frontend/src/**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
    plugins: {
      'testing-library': testingLibraryPlugin,
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
      'jsx-a11y': jsxA11yPlugin,
      import: importPlugin,
      jest: jestPlugin,
    },
    rules: {
      'react/jsx-filename-extension': [ "warn", { extensions: ['.js', '.jsx'] }],
      'linebreak-style': "off",
    },
  },
];
