import React from 'react';
import PropTypes from 'prop-types';
import { Modal, ModalHeading } from '@trussworks/react-uswds';

const HEADING_LEVELS = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'];

export default function VanillaModal({
  heading,
  children,
  modalRef,
  className,
  id,
  forceAction,
  headingLevel,
}) {
  // strip everything but letters and numbers
  const regex = /[^a-zA-Z0-9]/g;

  const textForHeadingId = id || heading;
  const modalId = `modal-${textForHeadingId.toLowerCase().replace(regex, '-')}`;
  const headingId = `${modalId}-heading`;
  const resolvedHeadingLevel = HEADING_LEVELS.includes(headingLevel) ? headingLevel : 'h2';
  const isDefaultHeadingLevel = resolvedHeadingLevel === 'h2';

  return (
    <Modal
      className={`ttahub-vanilla-modal ${className}`}
      ref={modalRef}
      id={modalId}
      aria-labelledby={headingId}
      aria-describedby={`${modalId}-description`}
      forceAction={forceAction}
    >
      {isDefaultHeadingLevel ? (
        <ModalHeading id={headingId}>
          {heading}
        </ModalHeading>
      ) : React.createElement(
        resolvedHeadingLevel,
        { id: headingId, className: 'usa-modal__heading' },
        heading,
      )}
      <div id={`${modalId}-description`}>
        {children}
      </div>
    </Modal>
  );
}

VanillaModal.propTypes = {
  heading: PropTypes.oneOfType([PropTypes.string, PropTypes.node]).isRequired,
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
  modalRef: PropTypes.oneOfType([
    PropTypes.func,
    PropTypes.shape(),
  ]).isRequired,
  id: PropTypes.string,
  forceAction: PropTypes.bool,
  headingLevel: PropTypes.oneOf(HEADING_LEVELS),
};

VanillaModal.defaultProps = {
  className: '',
  id: '',
  forceAction: false,
  headingLevel: 'h2',
};
