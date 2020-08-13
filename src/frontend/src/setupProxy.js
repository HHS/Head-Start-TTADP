const { createProxyMiddleware } = require('http-proxy-middleware');
module.exports = function(app) {
  app.use('/api',
    createProxyMiddleware({
      target: process.env.BACKEND_PROXY,
      changeOrigin: true,
      pathRewrite: {'^/api' : ''}
    })
  );
};