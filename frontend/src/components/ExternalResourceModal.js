import React, { useCallback, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import {
  Button, Modal, Alert, useModal, connectModal,
} from '@trussworks/react-uswds';

import { isValidURL, isInternalGovernmentLink } from '../utils';

const ESCAPE_KEY_CODE = 27;

const ExternalResourceModal = ({ onOpen, onClose }) => (
  <Modal
    title={<h3>External Resources Disclaimer</h3>}
    actions={(
      <>
        <Button type="button" onClick={onClose}>
          Cancel
        </Button>

        <Button type="button" secondary onClick={onOpen}>
          View External Resource
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
  const modalRef = useRef(null);
  const { isOpen, openModal, closeModal } = useModal();

  const onEscape = useCallback((event) => {
    if (event.keyCode === ESCAPE_KEY_CODE) {
      closeModal();
    }
  }, [closeModal]);

  useEffect(() => {
    document.addEventListener('keydown', onEscape, false);
    return () => {
      document.removeEventListener('keydown', onEscape, false);
    };
  }, [onEscape]);

  useEffect(() => {
    if (!modalRef.current) return;

    const button = modalRef.current.querySelector('button');
    if (button) {
      button.focus();
    }
  });

  if (!isValidURL(to)) {
    return to;
  }

  const onClick = () => {
    closeModal();
    window.open(to, '_blank');
  };

  const onLinkClick = (e) => {
    e.preventDefault();
    if (isInternalGovernmentLink(to)) {
      window.open(to, '_blank');
    } else {
      openModal();
    }
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
