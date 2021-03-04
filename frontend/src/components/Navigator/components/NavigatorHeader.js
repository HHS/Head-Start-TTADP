/*
  USWDS step indicator header, grabbed from https://designsystem.digital.gov/components/step-indicator/
  The uswds react library we use doesn't have this component yet.
*/
import React, { useEffect } from 'react';
import PropTypes from 'prop-types';

const NavigatorHeader = ({ label }) => {
  useEffect(() => {
    document.getElementsByClassName('usa-step-indicator__heading-text')[0].focus();
  }, []);

  return (
    <div className="usa-step-indicator__header">
      {/* <style>{`:focus{ outline: solid 1px red}`}</style> */}
      <h2 className="usa-step-indicator__heading">
        {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex */}
        <span tabIndex="0" className="usa-step-indicator__heading-text">{label}</span>
      </h2>
    </div>
  );
};

NavigatorHeader.propTypes = {
  label: PropTypes.string.isRequired,
};

export default NavigatorHeader;
