/*
  Stepper indicator header shows the current step label and number out
  of the total number of steps
*/
import React from 'react';
import PropTypes from 'prop-types';

const StepperHeader = ({ currentStep, totalSteps, label }) => (
  <div className="usa-step-indicator__header">
    <h2 className="usa-step-indicator__heading">
      <span className="usa-step-indicator__heading-counter">
        <span className="usa-sr-only">Step</span>
        <span className="usa-step-indicator__current-step">{currentStep}</span>
        <span className="usa-step-indicator__total-steps">
          {' '}
          of
          {' '}
          {totalSteps}
        </span>
      </span>
      <span className="usa-step-indicator__heading-text">{label}</span>
    </h2>
  </div>
);

StepperHeader.propTypes = {
  currentStep: PropTypes.number.isRequired,
  totalSteps: PropTypes.number.isRequired,
  label: PropTypes.string.isRequired,
};

export default StepperHeader;
