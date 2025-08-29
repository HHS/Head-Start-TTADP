// @ts-check
import {} from 'dotenv/config';
import * as openidClient from 'openid-client';
import { URL } from 'node:url';
import { auditLogger } from '../logger';
import { validateUserAuthForAccess } from '../services/accessValidation';
import { currentUserId } from '../services/currentUser';
import handleErrors from '../lib/apiErrorHandler';
import { getPrivateJwk } from './jwkKeyManager';

const namespace = 'MIDDLEWARE:AUTH';

let cachedClient = null;
let issuerConfig = null;
const CODE_CHALLENGE_METHOD = 'S256';

async function getOidcClient() {
  if (cachedClient) return cachedClient;

  const issuerUrl = new URL(`${process.env.AUTH_BASE}/.well-known/openid-configuration`);

  /**
   * @type {import('openid-client').ClientMetadata & import('oauth4webapi').Client}
   */
  const clientMetadata = {
    client_id: process.env.AUTH_CLIENT_ID,
    token_endpoint_auth_method: 'private_key_jwt',
    token_endpoint_auth_signing_alg: 'RS256',
    tlsOnly: issuerUrl.protocol === 'https:',
  };

  /**
   * @type {import('openid-client').DiscoveryRequestOptions}
   */
  const discoveryRequestOptions = {
    execute: issuerUrl.protocol === 'https:' ? [] : [
      openidClient.allowInsecureRequests,
    ],
  };

  issuerConfig = await openidClient.discovery(
    issuerUrl,
    process.env.AUTH_CLIENT_ID,
    clientMetadata,
    openidClient.PrivateKeyJwt(await getPrivateJwk()),
    discoveryRequestOptions,
  );

  cachedClient = openidClient;

  return cachedClient;
}

export async function login(req, res) {
  // keep your existing referrer tracking if you have it
  const referrer = req.headers.referer;
  req.session.referrerPath = referrer ? new URL(referrer).pathname : '';

  try {
    const client = await getOidcClient();

    // Authorization Code flow with PKCE flow
    // https://developer.okta.com/docs/concepts/oauth-openid/#authorization-code-flow-with-pkce
    // The flow requires a cryptographically random string called a code verifier.
    req.session.pkce = {
      codeVerifier: client.randomPKCECodeVerifier(),
    };

    // The code verifier is then hashed to create the code challenge, and this challenge is passed
    // along with the request for the authorization code. The authorization server responds with an
    // authorization code and associates the code challenge with the authorization code.
    const codeChallenge = await client.calculatePKCECodeChallenge(req.session.pkce.codeVerifier);

    // Generate state/nonce for CSRF & replay protection
    req.session.pkce.state = openidClient.randomState();
    req.session.pkce.nonce = openidClient.randomNonce();

    const parameters = {
      redirect_uri: `${process.env.REDIRECT_URI_HOST}/oauth2-client/login/oauth2/code/`,
      scope: 'openid email profile:name',
      code_challenge: codeChallenge,
      code_challenge_method: CODE_CHALLENGE_METHOD,
      state: req.session.pkce.state,
      nonce: req.session.pkce.nonce,
      acr_values: 'http://idmanagement.gov/ns/assurance/ial/2',
    };

    const redirectTo = client.buildAuthorizationUrl(issuerConfig, parameters);
    res.redirect(redirectTo.href);
  } catch (err) {
    // your existing error handling
    // await handleErrors(req, res, err, 'MIDDLEWARE:AUTH');
    auditLogger.error(`${namespace} Failed to start login`, err);
    res.status(500).send('Failed to start login');
  }
}

export async function getAccessToken(req) {
  try {
    const currentUrl = new URL(req.originalUrl, `${req.protocol}://${req.get('host')}`);

    const client = await getOidcClient();
    // Send the authorization code and the code verifier in a request for an access token.
    // The authorization server recomputes the challenge from the verifier using the previously
    // agreed-upon hash algorithm, and compares the challenge with the one it associated
    // with the authorization code in the previous step.
    /**
     * @type {import('openid-client').AuthorizationCodeGrantChecks}
     */
    const options = {
      pkceCodeVerifier: req.session.pkce.codeVerifier,
      expectedState: req.session.pkce.state,
      expectedNonce: req.session.pkce.nonce,
      idTokenExpected: true,
    };
    const tokens = await client.authorizationCodeGrant(issuerConfig, currentUrl, options);

    // The authorization server compares the challenge with the one it associated with the
    // authorization code from the previous step. If the two code challenges and verifier
    // match, the authorization server knows that the same client sent both requests.
    auditLogger.info('Token Endpoint Response', tokens);

    const claims = tokens.claims();
    auditLogger.info('ID Token Claims', claims);

    req.session.claims = claims;
    const accessToken = tokens.access_token;
    return accessToken;
  } catch (err) {
    auditLogger.error(`${namespace} Failed to get access token:`, err);
    return undefined;
  }
}

export async function getUserInfo(accessToken, subject) {
  if (!accessToken || !subject) {
    auditLogger.error('Access token and subject are required');
    throw new Error('Access token and subject are required');
  }
  try {
    const client = await getOidcClient();
    const userInfo = await client.fetchUserInfo(issuerConfig, accessToken, subject);

    auditLogger.info('UserInfo Response', userInfo);

    return userInfo;
  } catch (err) {
    auditLogger.error(`${namespace} Failed to get user info:`, err);
    return undefined;
  }
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
  const userId = await currentUserId(req, res);

  // current user ID can conceivably send a status of unauthorized back
  // if it does, we need to return here
  if (res.headersSent) {
    return;
  }

  if (!userId) {
    // user not found / not authenticated
    res.sendStatus(401);
    return;
  }

  try {
    const hasAccess = await validateUserAuthForAccess(Number(userId));
    if (hasAccess) {
      next();
    } else {
      auditLogger.warn(`User ${userId} denied access due to missing SITE_ACCESS`);
      res.sendStatus(403);
    }
  } catch (error) {
    // handleErrors returns a promise, and sends a 500 status to the client
    // it needs to be awaited before exiting the process here
    await handleErrors(req, res, error, namespace);
  }
}
