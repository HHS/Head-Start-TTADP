import {
  useEffect,
  useState,
  useCallback,
  useRef,
  useMemo,
} from 'react';

const WS_URL = process.env.REACT_APP_WEBSOCKET_URL;

export default function useSocket(initialPath) {
  const [socketPath, setSocketPath] = useState(initialPath);
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
      return;
    }

    // if we've already created a socket for the current path, return
    if (socket.current && path === socket.current.url) {
      return;
    }

    if (socket.current && socket.current.readyState === socket.current.OPEN) {
      socket.current.close();
    }

    const s = new WebSocket(path);

    // we don't want to send bufferdata, but json
    s.binaryType = 'arraybuffer';

    // opening a new socket will clear the store
    s.addEventListener('open', () => clearStore());

    // Listen for messages
    s.addEventListener('message', (event) => {
      if (s.readyState === s.OPEN) {
        const data = JSON.parse(event.data);
        setMessageStore(data);
      }
    });

    socket.current = s;
  }, [clearStore, path, socketPath]);

  return {
    socketPath,
    socket: socket.current,
    messageStore,
    setSocketPath,
    clearStore,
  };
}
