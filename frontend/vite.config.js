const path = require('path');
const { defineConfig, loadEnv, transformWithEsbuild } = require('vite');
const react = require('@vitejs/plugin-react');

const gtmSnippet = (env) => `<!-- Google Tag Manager -->
    <script nonce="__NONCE__">(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
    new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
    j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
    'https://www.googletagmanager.com/gtm.js?id='+i+dl+ '&gtm_auth=${env.REACT_APP_GTM_AUTH || ''}&gtm_preview=${env.REACT_APP_GTM_PREVIEW || ''}&gtm_cookies_win=x';f.parentNode.insertBefore(j,f);
    })(window,document,'script','dataLayer', '${env.REACT_APP_GTM_ID || ''}');</script>
    <!-- End Google Tag Manager -->`;

module.exports = defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [
      react(),
      {
        name: 'ttahub-index-template',
        transformIndexHtml(html) {
          const includeGtm = env.REACT_APP_GTM_ENABLED === 'true';
          const includeA11yStyles = env.REACT_APP_INCLUDE_ACCESSIBILITY_CSS === 'true';

          return html
            .replace('<!-- __GTM_SNIPPET__ -->', includeGtm ? gtmSnippet(env) : '')
            .replace('<!-- __ACCESSIBILITY_CSS__ -->', includeA11yStyles
              ? '<link rel="stylesheet" href="/accessibility-errors.css">'
              : '');
        },
      },
      {
        name: 'ttahub-js-as-jsx',
        enforce: 'pre',
        async transform(code, id) {
          if (!/\/src\/.*\.js$/.test(id)) {
            return null;
          }

          return transformWithEsbuild(code, id, {
            loader: 'jsx',
            jsx: 'automatic',
          });
        },
      },
    ],
    resolve: {
      alias: {
        '@mesh-kit/core/client': require.resolve('@mesh-kit/core/client'),
        '@use-it/interval': require.resolve('@use-it/interval/dist/index.js'),
      },
    },
    server: {
      proxy: {
        '/api': {
          target: env.BACKEND_PROXY || 'http://localhost:8080',
          changeOrigin: true,
        },
      },
    },
    envPrefix: ['VITE_', 'REACT_APP_'],
    define: {
      'process.env.REACT_APP_WEBSOCKET_URL': JSON.stringify(env.REACT_APP_WEBSOCKET_URL || ''),
      'process.env.REACT_APP_INACTIVE_MODAL_TIMEOUT': JSON.stringify(env.REACT_APP_INACTIVE_MODAL_TIMEOUT || ''),
      'process.env.REACT_APP_SESSION_TIMEOUT': JSON.stringify(env.REACT_APP_SESSION_TIMEOUT || ''),
    },
    optimizeDeps: {
      esbuildOptions: {
        loader: {
          '.js': 'jsx',
        },
      },
    },
    build: {
      outDir: path.resolve(__dirname, '../build/server/client'),
      emptyOutDir: true,
    },
  };
});
