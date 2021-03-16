import React, { useCallback, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import {
  Button, Modal, Alert, useModal, connectModal,
} from '@trussworks/react-uswds';

import { isValidURL } from '../utils';

const ESCAPE_KEY_CODE = 27;

const ExternalResourceModal = ({ onOpen, onClose }) => (
  <Modal
    title={<h3>External Resources Disclaimer</h3>}
    actions={(
      <>
        <Button type="button" onClick={onOpen}>
          View External Resource
        </Button>

        <Button type="button" secondary onClick={onClose}>
          Cancel
        </Button>
      </>
    )}
  >
    <Alert role="alert" type="warning">
      <b>Note:</b>
      {' '}
      This link is hosted outside of an OHS-led system.
      OHS does not have responsibility for external content or
      the privacy policies of non-government websites.
    </Alert>
  </Modal>
);

ExternalResourceModal.propTypes = {
  onOpen: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

const ExternalLink = ({ to, children }) => {
  if (!isValidURL(to)) {
    return to;
  }

  const modalRef = useRef(null);
  const { isOpen, openModal, closeModal } = useModal();

  const onEscape = useCallback((event) => {
    if (event.keyCode === ESCAPE_KEY_CODE) {
      closeModal();
    }
  }, [isOpen]);

  useEffect(() => {
    document.addEventListener('keydown', onEscape, false);
    return () => {
      document.removeEventListener('keydown', onEscape, false);
    };
  }, [onEscape]);

  useEffect(() => {
    const button = modalRef.current.querySelector('button');
    if (button) {
      button.focus();
    }
  });

  const onClick = () => {
    closeModal();
    window.open(to, '_blank');
  };

  const onLinkClick = (e) => {
    e.preventDefault();
    openModal();
  };

  const ConnectModal = connectModal(() => (
    <ExternalResourceModal onOpen={onClick} onClose={closeModal} />
  ));

  return (
    <>
      <div ref={modalRef} aria-modal="true" role="dialog">
        <ConnectModal isOpen={isOpen} onClose={closeModal} />
      </div>
      <a href={to} onClick={onLinkClick}>
        {children}
        {' '}
      </a>
    </>
  );
};

ExternalLink.propTypes = {
  to: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
};

export {
  ExternalResourceModal,
  ExternalLink,
};
