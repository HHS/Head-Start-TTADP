import type { IncomingMessage, ServerResponse } from 'node:http';
import type { RequestHandler } from 'express';
import { auditLogger } from '../../logger';
import sessionMiddleware from '../../middleware/sessionMiddleware';
import db from '../../models';
import type { RealtimeUser } from '.';

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
 * Resolves the logged in user for a websocket upgrade request from the same
 * session cookie the HTTP API uses, so presence identity comes from the server
 * rather than from whatever the client claims.
 */
export default async function authenticateUpgrade(
  req: IncomingMessage,
  session: RequestHandler = sessionMiddleware
): Promise<RealtimeUser | null> {
  const sessionReq = req as SessionRequest;
  await loadSession(sessionReq, session);

  let userId = sessionReq.session?.userId;

  // bypass authorization, used for cucumber UAT and axe accessibility testing
  if (!userId && process.env.NODE_ENV !== 'production' && process.env.BYPASS_AUTH === 'true') {
    userId = process.env.CURRENT_USER_ID;
  }

  if (!userId) {
    return null;
  }

  const user = await db.User.findByPk(Number(userId), { attributes: ['id', 'name'] });
  if (!user) {
    auditLogger.warn(`[realtime] rejected websocket for unknown user ${userId}`);
    return null;
  }

  return { userId: user.id, username: user.name };
}
