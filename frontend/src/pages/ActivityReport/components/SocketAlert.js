/* eslint-disable no-unused-vars */
import React, {
  useContext,
  useState,
  useEffect,
  useMemo,
} from 'react';
import PropTypes from 'prop-types';
import { Alert } from '@trussworks/react-uswds';
import UserContext from '../../../UserContext';
import useInterval from '../../../hooks/useInterval';

const EXPIRATION = 10000;

export default function SocketAlert({ store }) {
  // here's a list of all active users as maintained by this component
  const [activeUsers, setActiveUsers] = useState([]);

  // we need our current user to avoid printing our own name in the alert
  const { user } = useContext(UserContext);

  // memoized list of userNames for checking in our useEffect
  const userNames = useMemo(() => (
    activeUsers.map(((activeUser) => activeUser.name))
  ), [activeUsers]);

  useEffect(() => {
    // push store updates of active users
    // remove current user
    // add cleanup function
  }, []);

  return store ? (
    <Alert type="info">
      <span>
        User
        {' '}
        {store.user}
        {' '}
      </span>
    </Alert>
  ) : null;
}

SocketAlert.propTypes = {
  store: PropTypes.shape({
    user: PropTypes.string,
  }),
};

SocketAlert.defaultProps = {
  store: null,
};
