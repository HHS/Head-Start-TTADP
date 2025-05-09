import React, { useState, useEffect, useContext } from 'react';
import PropTypes from 'prop-types';
import { uniqBy } from 'lodash';
// eslint-disable-next-line import/no-unresolved
import { createPresence } from '@mesh-kit/core/client-utils';
// eslint-disable-next-line import/no-unresolved
import { MeshClient } from '@mesh-kit/core/client';
import UserContext from '../UserContext';

const WS_URL = process.env.REACT_APP_WEBSOCKET_URL || '';

function ActivityReportPresence({ client, room, onPresenceUpdate }) {
  const userContext = useContext(UserContext);
  // eslint-disable-next-line no-unused-vars
  const [presentUsers, setPresentUsers] = useState([]);

  const presence = React.useMemo(() => createPresence({
    client,
    room,
    storageKey: `ar:presence-state:${room}`,
    stateIdentifier: async (state, connectionId) => {
      if (state && state.userId) {
        return state.userId;
      }

      if (userContext.user && userContext.user.id) {
        return userContext.user.id;
      }

      return connectionId;
    },
    onUpdate: (users) => {
      const usersWithValidIds = users
        // filter users that haven't published their own state yet
        .filter((user) => !!user.state)
        // then, map them to their state
        .map((user) => ({ ...user.state, tabCount: user.tabCount }));

      const uniqueUsers = uniqBy(usersWithValidIds, 'userId');

      setPresentUsers(usersWithValidIds);

      if (!onPresenceUpdate) {
        return;
      }

      const uniqueUserCount = uniqueUsers.length;
      const hasMultipleUsers = uniqueUserCount > 1;
      const otherUsers = userContext.user ? uniqueUsers.filter((user) => (
        user.userId && user.userId !== userContext.user.id
      )) : [];

      onPresenceUpdate({
        presentUsers: uniqueUsers,
        uniqueUserCount,
        hasMultipleUsers,
        otherUsers,
      });
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [room]);

  const getPresenceData = () => ({
    userId: userContext.user.id,
    username: userContext.user.name,
  });

  useEffect(() => {
    if (!userContext.user.id) return;

    const data = getPresenceData();
    presence.publish(data);

    setTimeout(() => {
      presence.publish(data);
    }, 1000);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presence, userContext.user.id]);

  return null;
}

ActivityReportPresence.propTypes = {
  client: PropTypes.shape({
    on: PropTypes.func,
  }).isRequired,
  room: PropTypes.string.isRequired,
  onPresenceUpdate: PropTypes.func,
};

ActivityReportPresence.defaultProps = {
  onPresenceUpdate: null,
};

function Mesh({ room, onPresenceUpdate, onRevisionUpdate }) {
  const [client, setClient] = useState(null);

  // initialize client and connect on mount
  useEffect(() => {
    async function connect() {
      const meshClient = new MeshClient(WS_URL);
      await meshClient.connect();

      if (onRevisionUpdate && room.startsWith('ar-')) {
        meshClient.on('revision-updated', (data) => {
          // only process updates for the current report
          const reportId = room.replace('ar-', '');
          if (data && data.reportId && data.reportId.toString() === reportId) {
            onRevisionUpdate(data.revision, {
              userId: data.userId,
              timestamp: data.timestamp,
              reportId: data.reportId,
            });
          }
        });
      }

      setClient(meshClient);
    }

    connect();

    // Clean up event listeners when component unmounts
    return () => {
      if (client && onRevisionUpdate) {
        client.off('revision-updated');
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room]);

  if (!client) {
    return null;
  }

  return <ActivityReportPresence client={client} room={room} onPresenceUpdate={onPresenceUpdate} />;
}

Mesh.propTypes = {
  room: PropTypes.string.isRequired,
  onPresenceUpdate: PropTypes.func,
  onRevisionUpdate: PropTypes.func,
};

Mesh.defaultProps = {
  onPresenceUpdate: null,
  onRevisionUpdate: null,
};

export default Mesh;
