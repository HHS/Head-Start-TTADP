/*
  Displays a modal after $modalTimeout milliseconds if the user is inactive. If
  the user becomes active when the modal is shown it will disappear. After $logoutTimeout
  milliseconds the logout prop is called.
*/

import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { useIdleTimer } from 'react-idle-timer';
import { Alert } from '@trussworks/react-uswds';
import Modal from './Modal';

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
  const modalRef = useRef();
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

  // Make sure we clean up any timeout functions when this component
  // is unmounted
  useEffect(() => function cleanup() {
    if (inactiveTimeout) {
      clearTimeout(inactiveTimeout);
    }
  });

  const onIdle = () => {
    const timer = setTimeout(() => {
      modalRef.current.toggleModal(false);
      logoutUser(true);
    }, modalVisibleTime);
    modalRef.current.toggleModal(true);
    updateInactiveTimeout(timer);
  };

  const onActive = () => {
    modalRef.current.toggleModal(false);
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
    <Modal
      modalRef={modalRef}
      onOk={() => {}}
      modalId="IdleReportModal"
      title="Are you still there?"
      showOkButton={false}
      cancelButtonText="Stay logged in"
    >
      <Alert role="alert" type="warning">
        You will be automatically logged out due to inactivity in
        {' '}
        {timeToLogoutMsg}
        {' '}
        unless you become active again.
      </Alert>
    </Modal>
  );
}

IdleModal.propTypes = {
  modalTimeout: PropTypes.number.isRequired,
  logoutTimeout: PropTypes.number.isRequired,
  logoutUser: PropTypes.func.isRequired,
};

export default IdleModal;
