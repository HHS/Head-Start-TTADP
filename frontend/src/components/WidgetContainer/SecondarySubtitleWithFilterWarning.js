import React from 'react';
import PropTypes from 'prop-types';
import FiltersNotApplicable from '../FiltersNotApplicable';

const SecondarySubtitleWithFilterWarning = ({ children, showFiltersNotApplicable }) => (
  <div className="display-flex flex-align-center">
    <p className="usa-prose margin-x-0 margin-y-0 text-bold">
      {children}
    </p>
    {showFiltersNotApplicable && (
      <>
        <FiltersNotApplicable />
      </>
    )}
  </div>
);

SecondarySubtitleWithFilterWarning.propTypes = {
  children: PropTypes.node.isRequired,
  showFiltersNotApplicable: PropTypes.bool,
};

SecondarySubtitleWithFilterWarning.defaultProps = {
  showFiltersNotApplicable: false,
};

export default SecondarySubtitleWithFilterWarning;
