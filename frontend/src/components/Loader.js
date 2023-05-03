import React from 'react';
import PropTypes from 'prop-types';
import Spinner from './Spinner';

import './Loader.css';

function Loader({
  loading, loadingLabel, text, isFixed,
}) {
  return (
    <>
      {loading && (
        <div role="status" aria-live="polite" className="overlay" style={{ position: isFixed ? 'fixed' : 'absolute' }} aria-label={loadingLabel}>
          <div className="overlay-spinner">
            <Spinner />
            { text }
          </div>
        </div>
      )}
    </>
  );
}

Loader.propTypes = {
  loading: PropTypes.bool.isRequired,
  loadingLabel: PropTypes.string.isRequired,
  text: PropTypes.string,
  isFixed: PropTypes.bool,
};

Loader.defaultProps = {
  text: 'Loading',
  isFixed: false,

};

export default Loader;
