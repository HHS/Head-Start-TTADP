import PropTypes from 'prop-types';
import React, { createContext, useCallback, useContext } from 'react';
import { getAllTrainerOptionsByUser } from '../fetchers/users';
import useFetch from '../hooks/useFetch';
import UserContext from '../UserContext';

export const StaffContext = createContext({
  staff: [],
});

export default function StaffProvider({ children }) {
  const { user } = useContext(UserContext);

  const fetcher = useCallback(async () => getAllTrainerOptionsByUser(String(user.id)), [user.id]);
  const { data: staff } = useFetch([], fetcher, [user.id]);

  return <StaffContext.Provider value={{ staff }}>{children}</StaffContext.Provider>;
}

StaffProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
