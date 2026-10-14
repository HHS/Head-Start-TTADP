import type { IncomingMessage, ServerResponse } from 'node:http';
import type { RequestHandler } from 'express';
import { auditLogger } from '../../logger';
import sessionMiddleware from '../../middleware/sessionMiddleware';
import db from '../../models';
import { validateUserAuthForAccess } from '../../services/accessValidation';
import { currentUserId } from '../../services/currentUser';
import type { RealtimeUser } from '.';

export const IMPERSONATION_PARAM = 'impersonationId';

type SessionRequest = IncomingMessage & { session?: { userId?: number | string } };

function loadSession(req: SessionRequest, session: RequestHandler): Promise<void> {
  return new Promise((resolve, reject) => {
    // there is no response during an upgrade; express-session only needs an object to patch
    session(req as never, {} as ServerResponse as never, (err?: unknown) =>
      err ? reject(err) : resolve()
    );
  });
}

/**
 * Stand-in for an express response. currentUserId rejects a request by sending
 * a status, so this records whether that happened.
 */
function upgradeResponse() {
  const res = {
    locals: {},
    headersSent: false,
    statusCode: 200,
    status(code: number) {
      res.statusCode = code;
      return res;
    },
    sendStatus(code: number) {
      res.statusCode = code;
      res.headersSent = true;
      return res;
    },
    end() {
      res.headersSent = true;
      return res;
    },
  };
  return res;
}

/**
 * Resolves the effective user for a websocket upgrade the same way the HTTP API
 * does (session, impersonation, and SITE_ACCESS), so presence identity comes
 * from the server rather than from whatever the client claims.
 */
export default async function authenticateUpgrade(
  req: IncomingMessage,
  session: RequestHandler = sessionMiddleware
): Promise<RealtimeUser | null> {
  const sessionReq = req as SessionRequest;
  await loadSession(sessionReq, session);

  // browsers can't set headers on a websocket handshake, so the client sends the
  // impersonation id as a query param; currentUserId validates it like the header
  const impersonationId = new URL(req.url || '/', 'http://localhost').searchParams.get(
    IMPERSONATION_PARAM
  );
  if (impersonationId) {
    req.headers['auth-impersonation-id'] = impersonationId;
  }

  const res = upgradeResponse();
  const userId = await currentUserId(req, res);
  if (res.headersSent || !userId) {
    return null;
  }

  if (!(await validateUserAuthForAccess(Number(userId)))) {
    auditLogger.warn(`[realtime] rejected websocket for user ${userId} without SITE_ACCESS`);
    return null;
  }

  const user = await db.User.findByPk(Number(userId), { attributes: ['id', 'name'] });
  if (!user) {
    auditLogger.warn(`[realtime] rejected websocket for unknown user ${userId}`);
    return null;
  }

  return { userId: user.id, username: user.name };
}
