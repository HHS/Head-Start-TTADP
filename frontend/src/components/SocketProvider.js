import React, { createContext, useMemo, useState } from 'react';
import PropTypes from 'prop-types';

export const SocketContext = createContext();

export default function SocketProvider({ children, userId }) {
  const [store, setStore] = useState(null);

  // Create WebSocket connection.
  const socket = useMemo(() => {
    const s = new WebSocket(`ws://localhost:8080?id=${userId}`);
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
  }, [userId]);

  return (
    <SocketContext.Provider value={{ socket, store }}>{children}</SocketContext.Provider>
  );
}

SocketProvider.propTypes = {
  userId: PropTypes.number.isRequired,
  children: PropTypes.node.isRequired,
};
