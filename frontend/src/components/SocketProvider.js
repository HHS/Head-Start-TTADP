import React, { createContext, useMemo, useState } from 'react';
import PropTypes from 'prop-types';

export const SocketContext = createContext();

const WS_URL = process.env.REACT_APP_WEBSOCKET_URL;

export const socketPath = (activityReportId) => {
  if (activityReportId && activityReportId !== 'new') {
    return `/activity-report/edit/${activityReportId}`;
  }

  return '';
};

export default function SocketProvider({ children, path }) {
  const [store, setStore] = useState(null);

  // Create WebSocket connection.
  const socket = useMemo(() => {
    if (!WS_URL || !path) {
      return null;
    }
    const s = new WebSocket(`${WS_URL}${path}`);

    // we don't want to send bufferdata, but json
    s.binaryType = 'arraybuffer';

    // Listen for messages
    s.addEventListener('message', (event) => {
      const data = JSON.parse(event.data);
      setStore(data);
    });

    return s;
  }, [path]);

  return (
    <SocketContext.Provider value={{ socket, store }}>{children}</SocketContext.Provider>
  );
}

SocketProvider.propTypes = {
  children: PropTypes.node.isRequired,
  path: PropTypes.string.isRequired,
};
