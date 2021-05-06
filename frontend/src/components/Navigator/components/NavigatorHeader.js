/*
  USWDS step indicator header, grabbed from https://designsystem.digital.gov/components/step-indicator/
  The uswds react library we use doesn't have this component yet.
*/
import React, { useEffect } from 'react';
import PropTypes from 'prop-types';

const NavigatorHeader = ({ label, titleOverride, formData }) => {
  useEffect(() => {
    document.getElementsByClassName('usa-step-indicator__heading-text')[0].focus();
  }, []);

  const finalLabel = titleOverride ? titleOverride(formData) : label;

  return (
    <div className="usa-step-indicator__header">
      <h2 className="usa-step-indicator__heading">
        {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex */}
        <span tabIndex="0" className="usa-step-indicator__heading-text">{finalLabel}</span>
      </h2>
    </div>
  );
};

NavigatorHeader.propTypes = {
  label: PropTypes.string.isRequired,
  titleOverride: PropTypes.func,
  formData: PropTypes.shape({}).isRequired,
};

NavigatorHeader.defaultProps = {
  titleOverride: null,
};

export default NavigatorHeader;
