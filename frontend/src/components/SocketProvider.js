import React, {
  createContext, useCallback, useMemo, useState,
} from 'react';
import PropTypes from 'prop-types';

export const SocketContext = createContext();

const WS_URL = process.env.REACT_APP_WEBSOCKET_URL;

export const socketPath = (activityReportId, page) => {
  if (activityReportId && activityReportId !== 'new' && page) {
    return `/activity-report/edit/${activityReportId}/${page}`;
  }

  return '';
};

export default function SocketProvider({ children, path }) {
  const [store, setStore] = useState(null);

  const clearStore = useCallback(() => {
    setStore(null);
  }, []);

  // Create WebSocket connection.
  const socket = useMemo(() => {
    console.log(path);

    if (!WS_URL || !path) {
      return {
        // eslint-disable-next-line no-console
        send: () => console.log('websocket is unavailable'),
        close: () => {},
      };
    }
    const s = new WebSocket(`${WS_URL}${path}`);

    // we don't want to send bufferdata, but json
    s.binaryType = 'arraybuffer';

    s.addEventListener('open', () => clearStore());

    // Listen for messages
    s.addEventListener('message', (event) => {
      if (s.readyState === s.OPEN) {
        const data = JSON.parse(event.data);
        setStore(data);
      }
    });

    s.addEventListener('error', () => {
      s.close();
    });

    s.addEventListener('close', () => clearStore());

    return s;
  }, [clearStore, path]);

  return (
    <SocketContext.Provider value={{ socket, store, clearStore }}>
      {children}
    </SocketContext.Provider>
  );
}

SocketProvider.propTypes = {
  children: PropTypes.node.isRequired,
  path: PropTypes.string.isRequired,
};
