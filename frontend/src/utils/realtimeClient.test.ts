import RealtimeClient from './realtimeClient';

class FakeSocket {
  static instances: FakeSocket[] = [];

  readyState = 0;

  sent: string[] = [];

  listeners: Record<string, ((event?: { data: string }) => void)[]> = {};

  constructor(public url: string) {
    FakeSocket.instances.push(this);
  }

  addEventListener(type: string, fn: (event?: { data: string }) => void) {
    this.listeners[type] = [...(this.listeners[type] || []), fn];
  }

  send(data: string) {
    this.sent.push(data);
  }

  close = jest.fn(() => {
    this.readyState = 3;
  });

  emit(type: string, event?: { data: string }) {
    (this.listeners[type] || []).forEach((fn) => {
      fn(event);
    });
  }

  open() {
    this.readyState = 1;
    this.emit('open');
  }

  receive(message: object | string) {
    this.emit('message', {
      data: typeof message === 'string' ? message : JSON.stringify(message),
    });
  }
}

describe('RealtimeClient', () => {
  const originalWebSocket = global.WebSocket;

  beforeEach(() => {
    jest.useFakeTimers();
    FakeSocket.instances = [];
    global.WebSocket = Object.assign(FakeSocket, {
      CONNECTING: 0,
      OPEN: 1,
      CLOSING: 2,
      CLOSED: 3,
    }) as unknown as typeof WebSocket;
  });

  afterEach(() => {
    jest.useRealTimers();
    global.WebSocket = originalWebSocket;
  });

  it('joins the room once connected', () => {
    new RealtimeClient('wss://hub', 'ar-1', {}).connect();
    const socket = FakeSocket.instances[0];

    expect(socket.url).toBe('wss://hub');
    expect(socket.sent).toEqual([]);

    socket.open();

    expect(socket.sent).toEqual([JSON.stringify({ type: 'join', room: 'ar-1' })]);
  });

  it('does nothing without a url', () => {
    new RealtimeClient('', 'ar-1', {}).connect();

    expect(FakeSocket.instances).toHaveLength(0);
  });

  it('routes presence and events for its room only', () => {
    const onPresence = jest.fn();
    const onEvent = jest.fn();
    new RealtimeClient('wss://hub', 'ar-1', { onPresence, onEvent }).connect();
    const socket = FakeSocket.instances[0];
    socket.open();

    const users = [{ userId: 1, username: 'Alice', tabs: 1 }];
    socket.receive({ type: 'presence', room: 'ar-1', users });
    socket.receive({ type: 'presence', room: 'ar-2', users: [] });
    socket.receive({ type: 'event', room: 'ar-1', event: 'revision-updated', data: { a: 1 } });
    socket.receive('not json');

    expect(onPresence).toHaveBeenCalledTimes(1);
    expect(onPresence).toHaveBeenCalledWith(users);
    expect(onEvent).toHaveBeenCalledWith('revision-updated', { a: 1 });
  });

  it('reconnects with backoff and rejoins after the socket drops', () => {
    new RealtimeClient('wss://hub', 'ar-1', {}).connect();
    FakeSocket.instances[0].emit('close');

    jest.advanceTimersByTime(1999);
    expect(FakeSocket.instances).toHaveLength(1);
    jest.advanceTimersByTime(1);
    expect(FakeSocket.instances).toHaveLength(2);

    // second failure waits twice as long
    FakeSocket.instances[1].emit('close');
    jest.advanceTimersByTime(3999);
    expect(FakeSocket.instances).toHaveLength(2);
    jest.advanceTimersByTime(1);
    expect(FakeSocket.instances).toHaveLength(3);

    FakeSocket.instances[2].open();
    expect(FakeSocket.instances[2].sent).toEqual([JSON.stringify({ type: 'join', room: 'ar-1' })]);
  });

  it('stops reconnecting once closed', () => {
    const client = new RealtimeClient('wss://hub', 'ar-1', {});
    client.connect();
    const socket = FakeSocket.instances[0];
    socket.open();

    client.close();
    socket.emit('close');
    jest.advanceTimersByTime(60000);

    expect(socket.close).toHaveBeenCalled();
    expect(FakeSocket.instances).toHaveLength(1);
  });
});
