import {} from 'dotenv/config';
import ClientOAuth2 from 'client-oauth2';

export const hsesAuth = new ClientOAuth2({
  clientId: process.env.AUTH_CLIENT_ID,
  clientSecret: process.env.AUTH_CLIENT_SECRET,
  accessTokenUri: `${process.env.AUTH_BASE}/auth/oauth/token`,
  authorizationUri: `${process.env.AUTH_BASE}/auth/oauth/authorize`,
  // TODO: Once our oauth callback has been updated change this to:
  // redirectUri: `${process.env.TTA_SMART_HUB_URI}/api/oauth2-client/login/oauth2/code/`,
  redirectUri: `${process.env.REDIRECT_URI_HOST}/oauth2-client/login/oauth2/code/`,
  scopes: ['user_info'],
});

/**
 * Login handler
 *
 * This function redirects the caller to the configured HSES endpoint
 * @param {*} req - request
 * @param {*} res - response
 */
export function login(req, res) {
  const referrer = req.headers.referer;
  req.session.referrerPath = referrer ? new URL(referrer).pathname : '';
  const uri = hsesAuth.code.getUri();
  res.redirect(uri);
}

/**
 * Authentication Middleware
 *
 * This middleware handles user authentication using the request session
 * uid that gets set after successful login via HSES. Non-authenticated
 * users who attempt to access a page that requires authentication will be
 * served a 401
 * @param {*} req - request
 * @param {*} res - response
 * @param {*} next - next middleware
 */

export default async function authMiddleware(req, res, next) {
  // bypass authorization, used for cucumber UAT and axe accessibility testing
  if (process.env.NODE_ENV !== 'production' && process.env.BYPASS_AUTH === 'true') {
    req.session.userId = process.env.CUCUMBER_USER_ID;
  }
  if (!req.session.userId) {
    res.sendStatus(401);
  } else {
    next();
  }
}
