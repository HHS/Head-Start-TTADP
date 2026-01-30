module.exports = {
  webpack: {
    configure: (config) => {
      // Preserve existing fallback
      config.resolve = config.resolve || {};
      config.resolve.fallback = {
        ...(config.resolve.fallback || {}),
        '@mesh-kit/core/client': require.resolve('@mesh-kit/core/client'),
      };

      // Silence third-party source map warnings from dependencies that ship bad maps
      const noisyPackages = [
        /node_modules\/plotly\.js-basic-dist/,
        /node_modules\/react-responsive/,
      ];

      const visitRules = (rules) => {
        rules.forEach((rule) => {
          if (!rule) return;
          if (rule.oneOf) {
            visitRules(rule.oneOf);
          }

          const uses = [];
          if (rule.loader) uses.push(rule.loader);
          if (rule.use) {
            if (Array.isArray(rule.use)) {
              rule.use.forEach((u) => uses.push(typeof u === 'string' ? u : u && u.loader));
            } else {
              uses.push(typeof rule.use === 'string' ? rule.use : rule.use.loader);
            }
          }

          const hasSourceMapLoader = uses.some(
            (u) => u && u.includes && u.includes('source-map-loader'),
          );

          if (hasSourceMapLoader) {
            if (Array.isArray(rule.exclude)) {
              rule.exclude.push(...noisyPackages);
            } else if (rule.exclude) {
              rule.exclude = [rule.exclude, ...noisyPackages];
            } else {
              rule.exclude = noisyPackages;
            }
          }
        });
      };

      if (config.module && Array.isArray(config.module.rules)) {
        visitRules(config.module.rules);
      }

      return config;
    },
  },
  devServer: (devServerConfig) => {
    // CRA still emits deprecated onBefore/onAfter hooks; translate to setupMiddlewares to silence warnings.
    const { onBeforeSetupMiddleware, onAfterSetupMiddleware } = devServerConfig;
    devServerConfig.setupMiddlewares = (middlewares, devServer) => {
      if (typeof onBeforeSetupMiddleware === 'function') {
        onBeforeSetupMiddleware(devServer.app, devServer);
      }
      if (typeof onAfterSetupMiddleware === 'function') {
        onAfterSetupMiddleware(devServer.app, devServer);
      }
      return middlewares;
    };
    delete devServerConfig.onBeforeSetupMiddleware;
    delete devServerConfig.onAfterSetupMiddleware;
    return devServerConfig;
  },
};
