import {
  useEffect,
  useState,
  useCallback,
  useRef,
  useMemo,
} from 'react';

const WS_URL = process.env.REACT_APP_WEBSOCKET_URL || '';

export default function useSocket(user) {
  const [socketPath, setSocketPath] = useState();
  const [messageStore, setMessageStore] = useState();
  const socket = useRef({
    send: () => {},
    close: () => {},
    url: '',
    readyState: 0,
  });

  const path = useMemo(() => `${WS_URL}${socketPath}`, [socketPath]);

  const clearStore = useCallback(() => {
    setMessageStore();
  }, []);

  useEffect(() => {
    if (!WS_URL || !socketPath) {
      console.log('no socket path or url', WS_URL, socketPath);
      return;
    }

    // if we've already created a socket for the current path, return
    if (socket.current && path === socket.current.url) {
      console.log('socket already exists', path, socket.current);
      return;
    }

    if (socket.current && socket.current.readyState === socket.current.OPEN) {
      socket.current.close();
      clearStore();
      console.log('closing socket', path, socket.current);
    }

    const s = new WebSocket(path);

    console.log('creating new socket', path, s);

    // we don't want to send bufferdata, but json
    s.binaryType = 'arraybuffer';

    // opening a new socket will clear the store
    s.addEventListener('open', () => {
      clearStore();

      if (user) {
        socket.current.send(JSON.stringify({
          user: user.name || 'Anonymous user',
          lastSaveTime: null,
          channel: socketPath,
        }));
      }
    });

    // Listen for messages
    s.addEventListener('message', (event) => {
      if (s.readyState === s.OPEN) {
        const data = JSON.parse(event.data);
        setMessageStore(data);
      }
    });

    socket.current = s;

    // eslint-disable-next-line consistent-return
    return () => {
      // close the open socket
      if (socket.current && socket.current.readyState === socket.current.OPEN) {
        socket.current.close();
      }
    };
  }, [clearStore, path, socketPath, user]);

  return {
    socketPath,
    socket: socket.current,
    messageStore,
    setSocketPath,
    clearStore,
  };
}
