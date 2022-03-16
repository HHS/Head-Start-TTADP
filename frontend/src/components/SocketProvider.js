import React, { createContext, useMemo, useState } from 'react';
import PropTypes from 'prop-types';

export const SocketContext = createContext();

export default function SocketProvider({ children }) {
  const [store, setStore] = useState(null);

  // Create WebSocket connection.
  const socket = useMemo(() => {
    const s = new WebSocket('ws://localhost:8080');
    s.binaryType = 'arraybuffer';
    // Connection opened
    // s.addEventListener('open', () => {
    //   s.send(JSON.stringify({ message: 'Hello Server!', sender: 1 }));
    // });

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
