import React, { useEffect, useContext } from 'react';
import PropTypes from 'prop-types';
import { Alert } from '@trussworks/react-uswds';
import Sticky from 'react-stickynode';
import { useMediaQuery } from 'react-responsive';
import UserContext from '../UserContext';
import useArrayWithExpiration from '../hooks/useArrayWithExpiration';
import usePageVisibility from '../hooks/usePageVisibility';
import './SocketAlert.css';

export default function SocketAlert({ store }) {
  const [users, { push: pushUser }] = useArrayWithExpiration([]);
  const isPageVisible = usePageVisibility();
  const isMobile = useMediaQuery({ maxWidth: 1023 });

  useEffect(() => {
    if (store && store.user && isPageVisible) {
      pushUser(store.user);
    }
  }, [isPageVisible, pushUser, store]);

  // we need our current user to avoid printing our own name in the alert
  const { user: { name: currentUser } } = useContext(UserContext);

  const usersToRender = Array.from(
    new Set(
      users.map((user) => (user.name)).filter((user) => user !== currentUser),
    ),
  );

  const message = `${usersToRender.map((user, index) => {
    if (usersToRender.length > 1 && index + 1 === usersToRender.length) {
      return `and ${user}`;
    }
    return user;
  }).join(usersToRender.length < 3 ? ' ' : ', ')} ${usersToRender.length === 1 ? 'is' : 'are'} now also working in this section. Your changes may not be saved.`;

  return store && usersToRender.length ? (
    <Sticky className="ttahub-socket-alert margin-bottom-2" top={71} enabled={!isMobile}>
      <Alert type="warning">
        <span>
          <p className="usa-prose margin-top-0">{message}</p>
          <p className="usa-prose margin-bottom-0">Check with them before working on this page.</p>
        </span>
      </Alert>
    </Sticky>
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
