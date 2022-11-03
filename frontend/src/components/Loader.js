import React from 'react';
import PropTypes from 'prop-types';
import Spinner from './Spinner';

import './Loader.css';

function Loader({ loading, loadingLabel, text }) {
  return (
    <>
      {loading && (
        <div role="status" aria-live="polite" className="overlay top" style={{ position: 'fixed' }} aria-label={loadingLabel}>
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
};

Loader.defaultProps = {
  text: 'Loading Data',
};

export default Loader;
