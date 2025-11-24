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
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchMyGroups() {
      setIsLoading(true);
      try {
        const groups = await fetchGroups();
        setMyGroups(groups);
      } catch (e) {
        setMyGroups([]);
      } finally {
        setIsLoading(false);
      }
    }

    if (authenticated) {
      fetchMyGroups();
    } else {
      setIsLoading(false);
    }
  }, [authenticated]);

  return (
    <MyGroupsContext.Provider value={{ myGroups, setMyGroups, isLoading }}>
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
