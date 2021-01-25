/*
  USWDS step indicator header, grabbed from https://designsystem.digital.gov/components/step-indicator/
  The uswds react library we use doesn't have this component yet.
*/
import React from 'react';
import PropTypes from 'prop-types';

const NavigatorHeader = ({ label }) => (
  <div className="usa-step-indicator__header">
    <h2 className="usa-step-indicator__heading">
      <span className="usa-step-indicator__heading-text">{label}</span>
    </h2>
  </div>
);

NavigatorHeader.propTypes = {
  label: PropTypes.string.isRequired,
};

export default NavigatorHeader;
