/*
  Displays a modal after $modalTimeout milliseconds if the user is inactive. If
  the user becomes active when the modal is shown it will disappear. After $logoutTimeout
  milliseconds the logout prop is called.
*/

import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useIdleTimer } from 'react-idle-timer';
import {
  Button, Modal, connectModal, useModal, Alert,
} from '@trussworks/react-uswds';

// list of events to determine activity
// https://github.com/SupremeTechnopriest/react-idle-timer#default-events
const EVENTS = [
  'keydown',
  'wheel',
  'DOMMouseSc',
  'mousewheel',
  'mousedown',
  'touchstart',
  'touchmove',
  'MSPointerDown',
  'MSPointerMove',
  'visibilitychange',
];

function IdleModal({ modalTimeout, logoutTimeout, logoutUser }) {
  const [inactiveTimeout, updateInactiveTimeout] = useState();
  const { isOpen, openModal, closeModal } = useModal();
  const modalVisibleTime = logoutTimeout - modalTimeout;
  const timeoutMinutes = Math.floor(modalVisibleTime / 1000 / 60);

  let timeToLogoutMsg = '';
  if (timeoutMinutes < 1) {
    timeToLogoutMsg = 'less than a minute';
  } else if (timeoutMinutes === 1) {
    timeToLogoutMsg = 'a minute';
  } else {
    timeToLogoutMsg = `${timeoutMinutes} minutes`;
  }

  const Connected = connectModal(() => (
    <Modal
      title={<h3>Are you still there?</h3>}
      actions={(
        <Button type="button">
          Stay logged in
        </Button>
      )}
    >
      <Alert role="alert" type="warning">
        You will be automatically logged out due to inactivity in
        {' '}
        { timeToLogoutMsg }
        {' '}
        unless you become active again.
        <span className="usa-sr-only">
          Press any key to continue your session
        </span>
      </Alert>
    </Modal>
  ));

  // Make sure we clean up any timeout functions when this component
  // is unmounted
  useEffect(() => function cleanup() {
    if (inactiveTimeout) {
      clearTimeout(inactiveTimeout);
    }
  });

  const onIdle = () => {
    const timer = setTimeout(() => {
      closeModal();
      logoutUser(true);
    }, modalVisibleTime);
    openModal();
    updateInactiveTimeout(timer);
  };

  const onActive = () => {
    closeModal();
    clearTimeout(inactiveTimeout);
  };

  useIdleTimer({
    timeout: modalTimeout,
    onIdle,
    onActive,
    events: EVENTS,
    debounce: 500,
  });

  return (
    <Connected isOpen={isOpen} />
  );
}

IdleModal.propTypes = {
  modalTimeout: PropTypes.number.isRequired,
  logoutTimeout: PropTypes.number.isRequired,
  logoutUser: PropTypes.func.isRequired,
};

export default IdleModal;
