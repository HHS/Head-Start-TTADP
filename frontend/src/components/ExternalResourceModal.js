import React, { useRef } from 'react';
import PropTypes from 'prop-types';
import { Alert } from '@trussworks/react-uswds';
import Modal from './Modal';
import { isValidURL, isInternalGovernmentLink } from '../utils';

const ExternalLink = ({ to, children }) => {
  const modalRef = useRef(null);

  if (!isValidURL(to)) {
    return to;
  }

  const openResource = () => {
    modalRef.current.toggleModal(false);
    window.open(to, '_blank');
  };

  const onLinkClick = (e) => {
    e.preventDefault();
    if (isInternalGovernmentLink(to)) {
      window.open(to, '_blank');
    } else {
      modalRef.current.toggleModal(true);
    }
  };

  return (
    <>
      <Modal
        modalRef={modalRef}
        onOk={openResource}
        modalId="ExternalResourceModal"
        title="External Resources Disclaimer"
        okButtonText="View External Resource"
        okButtonAriaLabel="This button will redirect you to content that is outside of any OHS-led system."
      >
        <Alert role="alert" type="warning">
          <b>Note:</b>
          {' '}
          This link is hosted outside of an OHS-led system.
          OHS does not have responsibility for external content or
          the privacy policies of non-government websites.
        </Alert>
      </Modal>
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
export default ExternalLink;
