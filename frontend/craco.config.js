module.exports = {
  webpack: {
    configure: {
      resolve: {
        fallback: {
          '@mesh-kit/core/client': require.resolve('@mesh-kit/core/client'),
        },
      },
      ignoreWarnings: [
        (warning) => typeof warning?.message === 'string'
          && warning.message.includes('Failed to parse source map'),
      ],
    },
  },
};
