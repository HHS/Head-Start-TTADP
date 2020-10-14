/*
  This component is the Number, line and label in the stepper. It should
  be used inside a <StepperIndicator />
*/
import React from 'react';
import PropTypes from 'prop-types';

const StepperIndicatorSegment = ({ label, complete, current }) => {
  let segmentClass;
  let screenReaderMessage;

  if (complete) {
    segmentClass = 'usa-step-indicator__segment--complete';
    screenReaderMessage = 'completed';
  } if (current) {
    segmentClass = 'usa-step-indicator__segment--current';
  } else {
    screenReaderMessage = 'not completed';
  }

  return (
    <li data-testid={label} className={`usa-step-indicator__segment width-fit-content  ${segmentClass || ''}`}>
      <span className="usa-step-indicator__segment-label" aria-current={current}>
        {label}
        {screenReaderMessage && <span className="usa-sr-only">{screenReaderMessage}</span> }
      </span>
    </li>
  );
};

StepperIndicatorSegment.propTypes = {
  label: PropTypes.string.isRequired,
  complete: PropTypes.bool.isRequired,
  current: PropTypes.bool.isRequired,
};

export default StepperIndicatorSegment;
