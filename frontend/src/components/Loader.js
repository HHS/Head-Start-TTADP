import React from 'react';
import PropTypes from 'prop-types';

import './Loader.css';

function Loader({ loading, loadingLabel }) {
  return (
    <>
      {loading && (
        <div role="status" aria-live="polite" className="overlay" aria-label="loading" loadingLabel={loadingLabel} />
      )}
    </>
  );
}

Loader.propTypes = {
  loading: PropTypes.bool.isRequired,
  loadingLabel: PropTypes.string.isRequired,
};

export default Loader;
