import React from 'react';
import PropTypes from 'prop-types';
import './ErrorDetails.css';

export default function ErrorDetails({
  title,
  content,
}) {
  return (
    <details className="ttahub-admin-error-details">
      <summary>{title}</summary>
      <pre>{JSON.stringify(content, null, 2)}</pre>
    </details>
  );
}

ErrorDetails.propTypes = {
  title: PropTypes.string.isRequired,
  // eslint-disable-next-line react/forbid-prop-types
  content: PropTypes.object,
};

ErrorDetails.defaultProps = {
  content: {},
};
