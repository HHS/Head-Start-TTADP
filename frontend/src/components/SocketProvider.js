import React, { createContext, useMemo, useState } from 'react';
import PropTypes from 'prop-types';

export const SocketContext = createContext();

export default function SocketProvider({ children }) {
  const [store, setStore] = useState(null);

  // Create WebSocket connection.
  const socket = useMemo(() => {
    const s = new WebSocket('ws://localhost:8080');

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
