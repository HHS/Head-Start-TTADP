import React from 'react';
import PropTypes from 'prop-types';

import './Loader.css';

function Loader({ loading }) {
  return (
    <>
      {loading && (
        <div role="status" className="overlay" aria-label="loading" />
      )}
    </>
  );
}

Loader.propTypes = {
  loading: PropTypes.bool.isRequired,
};

export default Loader;
