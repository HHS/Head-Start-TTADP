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
  // Initialize as true if authenticated, since we'll immediately start loading
  const [isLoadingGroups, setIsLoadingGroups] = useState(authenticated);

  useEffect(() => {
    async function fetchMyGroups() {
      setIsLoadingGroups(true);
      try {
        const groups = await fetchGroups();
        setMyGroups(groups);
      } catch (e) {
        setMyGroups([]);
      } finally {
        setIsLoadingGroups(false);
      }
    }

    if (authenticated) {
      fetchMyGroups();
    }
  }, [authenticated]);

  return (
    <MyGroupsContext.Provider value={{ myGroups, setMyGroups, isLoadingGroups }}>
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
