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
  | { type: 'presence'; room: string; users: PresenceUser[] }
  | { type: 'event'; room: string; event: string; data: unknown };

interface Handlers {
  onPresence?: (users: PresenceUser[]) => void;
  onEvent?: (event: string, data: unknown) => void;
}

const INITIAL_RETRY_MS = 2000;
const MAX_RETRY_MS = 30000;

export default class RealtimeClient {
  private socket: WebSocket | null = null;

  private retryMs = INITIAL_RETRY_MS;

  private retryTimer: ReturnType<typeof setTimeout> | null = null;

  private closed = false;

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
      socket.send(JSON.stringify({ type: 'join', room: this.room }));
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
        this.handlers.onPresence?.(message.users);
      } else if (message.type === 'event') {
        this.handlers.onEvent?.(message.event, message.data);
      }
    });

    socket.addEventListener('close', () => {
      if (this.closed) return;
      this.retryTimer = setTimeout(() => this.connect(), this.retryMs);
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
