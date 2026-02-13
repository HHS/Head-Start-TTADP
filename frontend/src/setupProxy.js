// require style import via:
// https://create-react-app.dev/docs/proxying-api-requests-in-development/
const { legacyCreateProxyMiddleware } = require('http-proxy-middleware')

module.exports = (app) => {
  app.use(
    '/api',
    legacyCreateProxyMiddleware({
      target: process.env.BACKEND_PROXY,
      changeOrigin: true,
    })
  )
}
