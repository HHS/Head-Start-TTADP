/**
 * Browser client for the backend realtime server (src/lib/realtime).
 * Joins a single room, reconnects with backoff, and rejoins after reconnecting.
 * The server identifies the user from the session cookie, so nothing about
 * the user is sent from here.
 */

export interface PresenceUser {
  userId: number;
  username: string;
  tabs: number;
}

type ServerMessage =
  | { type: 'presence'; room: string; epoch: string; version: number; users: PresenceUser[] }
  | { type: 'event'; room: string; event: string; data: unknown };

interface Handlers {
  onPresence?: (users: PresenceUser[]) => void;
  onEvent?: (event: string, data: unknown) => void;
}

const INITIAL_RETRY_MS = 2000;
const MAX_RETRY_MS = 30000;

const makeTabId = () =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

/**
 * One id per page load. The server counts tabs by this id, so reconnecting
 * from the same tab isn't mistaken for a second tab. Kept in memory rather
 * than sessionStorage because a duplicated tab copies sessionStorage.
 */
export const TAB_ID = makeTabId();

// spread reconnects out so clients don't all reconnect at once after a deploy
const withJitter = (ms: number) => Math.round(ms * (0.5 + Math.random()));

export default class RealtimeClient {
  private socket: WebSocket | null = null;

  private retryMs = INITIAL_RETRY_MS;

  private retryTimer: ReturnType<typeof setTimeout> | null = null;

  private closed = false;

  // presence snapshots can arrive out of order across server instances
  private presenceVersion = 0;

  // changes if the server loses its version counter; versions restart with it
  private presenceEpoch: string | null = null;

  constructor(
    private readonly url: string,
    private readonly room: string,
    private readonly handlers: Handlers
  ) {}

  connect() {
    if (!this.url || this.closed) return;

    const socket = new WebSocket(this.url);
    this.socket = socket;

    socket.addEventListener('open', () => {
      this.retryMs = INITIAL_RETRY_MS;
      this.presenceVersion = 0;
      this.presenceEpoch = null;
      socket.send(JSON.stringify({ type: 'join', room: this.room, tabId: TAB_ID }));
    });

    socket.addEventListener('message', (event) => {
      let message: ServerMessage;
      try {
        message = JSON.parse(event.data);
      } catch {
        return;
      }
      if (message.room !== this.room) return;
      if (message.type === 'presence') {
        if (message.epoch === this.presenceEpoch && message.version <= this.presenceVersion) {
          return;
        }
        this.presenceEpoch = message.epoch;
        this.presenceVersion = message.version;
        this.handlers.onPresence?.(message.users);
      } else if (message.type === 'event') {
        this.handlers.onEvent?.(message.event, message.data);
      }
    });

    socket.addEventListener('close', () => {
      if (this.closed) return;
      this.retryTimer = setTimeout(() => this.connect(), withJitter(this.retryMs));
      this.retryMs = Math.min(this.retryMs * 2, MAX_RETRY_MS);
    });
  }

  close() {
    this.closed = true;
    if (this.retryTimer) clearTimeout(this.retryTimer);
    if (this.socket && this.socket.readyState <= WebSocket.OPEN) {
      this.socket.close();
    }
    this.socket = null;
  }
}
