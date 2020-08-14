// require style import via:
// https://create-react-app.dev/docs/proxying-api-requests-in-development/
const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = (app) => {
  app.use('/api',
    createProxyMiddleware({
      target: process.env.BACKEND_PROXY,
      changeOrigin: true,
      pathRewrite: { '^/api': '' },
    }));
};
