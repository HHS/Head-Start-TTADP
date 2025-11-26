import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react';
import PropTypes from 'prop-types';
import { fetchGroups } from '../fetchers/groups';
import AppLoadingContext from '../AppLoadingContext';

export const MyGroupsContext = createContext({});

export default function MyGroupsProvider({ children, authenticated }) {
  const [myGroups, setMyGroups] = useState([]);
  const { setIsAppLoading } = useContext(AppLoadingContext);

  useEffect(() => {
    async function fetchMyGroups() {
      setIsAppLoading(true);
      try {
        const groups = await fetchGroups();
        setMyGroups(groups);
      } catch (e) {
        setMyGroups([]);
      } finally {
        setIsAppLoading(false);
      }
    }

    if (authenticated) {
      fetchMyGroups();
    }
  }, [authenticated, setIsAppLoading]);

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
