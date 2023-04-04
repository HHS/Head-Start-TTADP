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
    if (authenticated) {
      try {
        fetchGroups().then((groups) => {
          setMyGroups(groups);
        });
      } catch (error) {
        setMyGroups([]);
      }
    }
  }, [authenticated]);

  return (
    <MyGroupsContext.Provider value={{ myGroups }}>
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
