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
const AUTH_METHOD = (process.env.OIDC_AUTH_METHOD || '').toLowerCase(); // 'pkce' or 'private_key_jwt'
const USE_PKCE = AUTH_METHOD === 'pkce'
  || (AUTH_METHOD === '' && (process.env.AUTH_CLIENT_ID ?? '').endsWith('local'));

async function getOidcClient() {
  if (cachedClient) return cachedClient;

  const issuerUrl = new URL(`${process.env.AUTH_BASE}/.well-known/openid-configuration`);

  /**
   * @type {import('openid-client').ClientMetadata & import('oauth4webapi').Client}
   */
  const clientMetadataPrivateKeyJwt = {
    client_id: process.env.AUTH_CLIENT_ID,
    token_endpoint_auth_method: 'private_key_jwt',
    token_endpoint_auth_signing_alg: 'RS256',
  };

  const clientMetadataPKCE = {
    client_id: process.env.AUTH_CLIENT_ID,
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

  // https://developers.login.gov/oidc/getting-started/#choosing-an-authentication-method
  // Use private_key_jwt in cloud environment.
  // Use PKCE in local development environment.
  // const localEnvironment = (process.env.AUTH_CLIENT_ID ?? '').endsWith('local');

  issuerConfig = await openidClient.discovery(
    issuerUrl,
    process.env.AUTH_CLIENT_ID,
    USE_PKCE ? clientMetadataPKCE : clientMetadataPrivateKeyJwt,
    USE_PKCE ? undefined : openidClient.PrivateKeyJwt(await getPrivateJwk()),
    discoveryRequestOptions,
  );

  cachedClient = openidClient;

  return cachedClient;
}

export async function login(req, res) {
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
      ...(USE_PKCE ? { pkceCodeVerifier: req.session?.pkce?.codeVerifier } : {}),
      expectedState: req.session.pkce.state,
      expectedNonce: req.session.pkce.nonce,
      idTokenExpected: true,
    };

    if (
      USE_PKCE
      && (!options.pkceCodeVerifier
        || !options.expectedState
        || !options.expectedNonce)
    ) {
      auditLogger.error(
        'OIDC callback missing PKCE/session. Possible lost session.',
      );
      return undefined;
    }

    const tokens = await client.authorizationCodeGrant(issuerConfig, currentUrl, options);

    // The authorization server compares the challenge with the one it associated with the
    // authorization code from the previous step. If the two code challenges and verifier
    // match, the authorization server knows that the same client sent both requests.
    auditLogger.info('Token Endpoint Response', tokens);

    const claims = tokens.claims();
    auditLogger.info('ID Token Claims', claims);

    req.session.claims = claims;
    // store raw id_token for RP-initiated logout (id_token_hint)
    if (tokens.id_token) {
      req.session.id_token = tokens.id_token;
    }
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

/**
 * Initiates RP-Initiated Logout at the Authorization Server.
 *
 * Attempts to build an End Session URL using `buildEndSessionUrl` and
 * redirects the user-agent there. Falls back to clearing the session and
 * returning 204 if end-session is not available.
 *
 * @param {*} req - request
 * @param {*} res - response
 */
export async function logoutOidc(req, res) {
  try {
    const client = await getOidcClient();

    const params = {
      post_logout_redirect_uri: `${process.env.TTA_SMART_HUB_URI}/logout`,
    };
    if (req.session?.id_token) {
      params.id_token_hint = req.session.id_token;
    }

    const redirectTo = client.buildEndSessionUrl(issuerConfig, params);

    const { userId } = req.session || {};
    req.session = null;
    auditLogger.info(`User ${userId} logged out (RP-initiated)`);
    res.redirect(redirectTo.href);
  } catch (err) {
    // If end-session is unavailable, fall back to local logout
    auditLogger.warn(`${namespace} RP-initiated logout unavailable, falling back`, err);
    if (!res.headersSent) {
      res.redirect('/logout');
    } else {
      const { userId } = req.session || {};
      auditLogger.info(`User ${userId} logged out (local only)`);
      req.session = null;
      res.sendStatus(204);
    }
  }
}
