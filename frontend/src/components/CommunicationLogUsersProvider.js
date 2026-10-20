import PropTypes from 'prop-types';
import React, { createContext, useCallback } from 'react';
import { getAdditionalCommunicationLogData } from '../fetchers/communicationLog';
import useFetch from '../hooks/useFetch';

export const CommunicationLogUsersContext = createContext({ users: [] });

/**
 * Provides the list of regional users that can be selected as "other TTA staff"
 * so the communication log filters can render them and display their names.
 */
export default function CommunicationLogUsersProvider({ regionId, children }) {
  const fetcher = useCallback(async () => {
    if (!regionId) {
      return { regionalUsers: [] };
    }
    return getAdditionalCommunicationLogData(String(regionId));
  }, [regionId]);

  const { data } = useFetch({ regionalUsers: [] }, fetcher, [regionId]);

  const users = ((data && data.regionalUsers) || []).map((u) => ({
    id: u.value,
    name: u.label,
  }));

  return (
    <CommunicationLogUsersContext.Provider value={{ users }}>
      {children}
    </CommunicationLogUsersContext.Provider>
  );
}

CommunicationLogUsersProvider.propTypes = {
  regionId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  children: PropTypes.node.isRequired,
};

CommunicationLogUsersProvider.defaultProps = {
  regionId: null,
};
