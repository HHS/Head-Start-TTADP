module.exports = {
  webpack: {
    configure: {
      resolve: {
        fallback: {
          '@mesh-kit/core/client': require.resolve('@mesh-kit/core/client'),
        },
      },
    },
  },
  plugins: [
    {
      plugin: {
        overrideWebpackConfig: ({ webpackConfig }) => {
          // Silence Dart Sass legacy JS API deprecation warnings
          // (sass-loader v12 uses the legacy API by default)
          webpackConfig.module.rules.forEach((rule) => {
            if (!rule.oneOf) return;
            rule.oneOf.forEach((oneOf) => {
              if (!oneOf.use) return;
              oneOf.use.forEach((loader) => {
                if (loader.loader && loader.loader.includes('sass-loader')) {
                  Object.assign(loader, {
                    options: {
                      ...loader.options,
                      sassOptions: {
                        ...(loader.options && loader.options.sassOptions),
                        silenceDeprecations: ['legacy-js-api'],
                      },
                    },
                  });
                }
              });
            });
          });
          return webpackConfig;
        },
      },
    },
  ],
};
