import { useContext, useEffect, useRef } from 'react';
import { SESSION_STORAGE_IMPERSONATION_KEY } from '../Constants';
import UserContext from '../UserContext';
import RealtimeClient, { type PresenceUser } from '../utils/realtimeClient';

const WS_URL = process.env.REACT_APP_WEBSOCKET_URL || '';

export interface PresenceUpdate {
  presentUsers: PresenceUser[];
  uniqueUserCount: number;
  hasMultipleUsers: boolean;
  otherUsers: PresenceUser[];
  tabCount: number | undefined;
}

interface RevisionUpdate {
  reportId: number;
  revision: number;
  userId: number | null;
  timestamp: string;
}

interface PresenceManagerProps {
  room: string;
  onPresenceUpdate?: (update: PresenceUpdate) => void;
  onRevisionUpdate?: (
    revision: number,
    meta: { userId: number | null; timestamp: string; reportId: number }
  ) => void;
}

/**
 * Browsers can't set headers on a websocket handshake, so the impersonation id
 * the fetchers send as a header goes in the query string instead.
 */
export function realtimeUrl(baseUrl: string): string {
  if (!baseUrl) return baseUrl;
  let impersonationId: string | null = null;
  try {
    impersonationId = window.sessionStorage.getItem(SESSION_STORAGE_IMPERSONATION_KEY);
  } catch {
    // storage unavailable; connect as the session user
  }
  if (!impersonationId) return baseUrl;
  const url = new URL(baseUrl, window.location.href);
  url.searchParams.set('impersonationId', impersonationId);
  return url.toString();
}

export function toPresenceUpdate(users: PresenceUser[], currentUserId: number): PresenceUpdate {
  return {
    presentUsers: users,
    uniqueUserCount: users.length,
    hasMultipleUsers: users.length > 1,
    otherUsers: users.filter((u) => u.userId !== currentUserId),
    tabCount: users.find((u) => u.userId === currentUserId)?.tabs,
  };
}

/**
 * Joins a realtime room for the lifetime of the component and reports who else
 * is in it. Renders nothing.
 */
export default function PresenceManager({
  room,
  onPresenceUpdate = null,
  onRevisionUpdate = null,
}: PresenceManagerProps) {
  const { user } = useContext(UserContext);

  // keep the latest callbacks without reconnecting when the parent re-renders
  const callbacks = useRef({ onPresenceUpdate, onRevisionUpdate, userId: user.id });
  callbacks.current = { onPresenceUpdate, onRevisionUpdate, userId: user.id };

  useEffect(() => {
    const client = new RealtimeClient(realtimeUrl(WS_URL), room, {
      onPresence: (users) => {
        callbacks.current.onPresenceUpdate?.(toPresenceUpdate(users, callbacks.current.userId));
      },
      onEvent: (event, data) => {
        if (event !== 'revision-updated' || !callbacks.current.onRevisionUpdate) return;
        const update = data as RevisionUpdate;
        // only care about revision changes for this report
        if (update?.reportId && `ar-${update.reportId}` === room) {
          callbacks.current.onRevisionUpdate(update.revision, {
            userId: update.userId,
            timestamp: update.timestamp,
            reportId: update.reportId,
          });
        }
      },
    });

    client.connect();

    // the server also notices the dropped socket, but closing promptly keeps presence accurate
    const close = () => client.close();
    window.addEventListener('beforeunload', close);

    return () => {
      window.removeEventListener('beforeunload', close);
      client.close();
    };
  }, [room]);

  return null;
}
