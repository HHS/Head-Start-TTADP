import React, {
  createContext,
  useEffect,
  useState,
} from 'react';
import PropTypes from 'prop-types';
import { fetchGroups } from '../fetchers/groups';

export const MyGroupsContext = createContext({});

export default function MyGroupsProvider({ children, authenticated }) {
  const [myGroups, setMyGroups] = useState([]);

  useEffect(() => {
    async function fetchMyGroups() {
      try {
        const groups = await fetchGroups();
        setMyGroups(groups);
      } catch (e) {
        setMyGroups([]);
      }
    }

    if (authenticated) {
      fetchMyGroups();
    }
  }, [authenticated]);

  return (
    <MyGroupsContext.Provider value={{ myGroups, setMyGroups }}>
      {children}
    </MyGroupsContext.Provider>
  );
}

MyGroupsProvider.propTypes = {
  authenticated: PropTypes.bool,
  children: PropTypes.node.isRequired,
};

MyGroupsProvider.defaultProps = {
  authenticated: false,
};
