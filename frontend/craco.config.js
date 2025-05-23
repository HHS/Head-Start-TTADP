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
};
