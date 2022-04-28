import React, { createContext, useMemo, useState } from 'react';
import PropTypes from 'prop-types';

export const SocketContext = createContext();

const WS_URL = process.env.REACT_APP_WEBSOCKET_URL;

export default function SocketProvider({ children }) {
  const [store, setStore] = useState(null);

  // Create WebSocket connection.
  const socket = useMemo(() => {
    const s = new WebSocket(WS_URL);

    // we don't want to send bufferdata, but json
    s.binaryType = 'arraybuffer';

    // Connection opened
    s.addEventListener('open', () => {
      // you could add an alert here, or use this to debug connection
    });

    // Listen for messages
    s.addEventListener('message', (event) => {
      setStore(JSON.parse(event.data));
    });

    return s;
  }, []);

  return (
    <SocketContext.Provider value={{ socket, store }}>{children}</SocketContext.Provider>
  );
}

SocketProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
