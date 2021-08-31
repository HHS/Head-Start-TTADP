import React from 'react';
import PropTypes from 'prop-types';
import Spinner from './Spinner';

import './Loader.css';

function Loader({ loading, loadingLabel }) {
  return (
    <>
      {loading && (
        <div role="status" aria-live="polite" className="overlay" aria-label={loadingLabel}>
          <div className="overlay-spinner">
            <Spinner />
            Loading Data
          </div>
        </div>
      )}
    </>
  );
}

Loader.propTypes = {
  loading: PropTypes.bool.isRequired,
  loadingLabel: PropTypes.string.isRequired,
};

export default Loader;
