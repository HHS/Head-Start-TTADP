import React, { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';

const NavigatorHeader = ({ label, titleOverride, formData }) => {
  const heading = useRef();

  useEffect(() => {
    if (heading) {
      heading.current.focus();
    }
  }, []);

  const finalLabel = titleOverride ? titleOverride(formData) : label;

  return (
    <div className="padding-top-2">
      <h2 className="font-family-serif" ref={heading}>{finalLabel}</h2>
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
