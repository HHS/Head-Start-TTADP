import { createRequire } from 'node:module';
import { defineConfig, loadEnv, transformWithEsbuild } from 'vite';
import react from '@vitejs/plugin-react';

const require = createRequire(import.meta.url);

const loadJsFilesAsJsx = {
  name: 'load-js-files-as-jsx',
  async transform(code, id) {
    if (!/\/src\/.*\.js$/.test(id)) {
      return null;
    }

    return transformWithEsbuild(code, id, {
      loader: 'jsx',
      jsx: 'automatic',
    });
  },
};

const htmlTemplateBehavior = (env) => ({
  name: 'html-template-behavior',
  transformIndexHtml(html) {
    const accessibilityCssLink = env.REACT_APP_INCLUDE_ACCESSIBILITY_CSS === 'true'
      ? '<link rel="stylesheet" href="/accessibility-errors.css" />'
      : '';

    const gtmAuth = JSON.stringify(env.REACT_APP_GTM_AUTH || '');
    const gtmPreview = JSON.stringify(env.REACT_APP_GTM_PREVIEW || '');
    const gtmId = JSON.stringify(env.REACT_APP_GTM_ID || '');

    const gtmScript = env.REACT_APP_GTM_ENABLED === 'true'
      ? `<script nonce="__NONCE__">(function(w,d,s,l,i,auth,preview){w[l]=w[l]||[];w[l].push({'gtm.start':
      new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
      j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
      'https://www.googletagmanager.com/gtm.js?id='+i+dl+ '&gtm_auth='+auth+'&gtm_preview='+preview+'&gtm_cookies_win=x';f.parentNode.insertBefore(j,f);
      })(window,document,'script','dataLayer', ${gtmId}, ${gtmAuth}, ${gtmPreview});</script>`
      : '';

    return html
      .replace('<!-- __ACCESSIBILITY_CSS__ -->', accessibilityCssLink)
      .replace('<!-- __GTM__ -->', gtmScript);
  },
});

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const backendProxy = env.BACKEND_PROXY || process.env.BACKEND_PROXY;
  const reactAppEnv = Object.fromEntries(
    Object.entries(env).filter(([key]) => key.startsWith('REACT_APP_')),
  );

  return {
    define: {
      global: 'globalThis',
      'process.env': {
        NODE_ENV: mode,
        ...reactAppEnv,
      },
    },
    plugins: [loadJsFilesAsJsx, react(), htmlTemplateBehavior(env)],
    resolve: {
      alias: {
        '@mesh-kit/core/client': require.resolve('@mesh-kit/core/client'),
        '@use-it/interval': require.resolve('@use-it/interval/dist/index.js'),
      },
    },
    optimizeDeps: {
      esbuildOptions: {
        define: {
          global: 'globalThis',
        },
        loader: {
          '.js': 'jsx',
        },
      },
    },
    server: {
      host: '0.0.0.0',
      port: 3000,
      strictPort: true,
      proxy: backendProxy
        ? {
          '/api': {
            target: backendProxy,
            changeOrigin: true,
          },
        }
        : undefined,
    },
    build: {
      outDir: process.env.VITE_LOCAL_BUILD === 'true' ? 'build' : '../build/server/client',
      emptyOutDir: true,
      commonjsOptions: {
        include: [/node_modules/, /src\/colors\.js$/],
      },
      rollupOptions: {
        onwarn(warning, warn) {
          if (
            warning.code === 'SOURCEMAP_ERROR'
            || (typeof warning.message === 'string'
              && warning.message.includes('Failed to parse source map'))
          ) {
            return;
          }

          warn(warning);
        },
      },
    },
  };
});
