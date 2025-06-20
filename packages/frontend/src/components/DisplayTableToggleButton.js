import React from 'react';
import PropTypes from 'prop-types';
import { uniqueId } from 'lodash';

export default function DisplayTableToggle({ displayTable, setDisplayTable, title }) {
  return (
    <button
      type="button"
      className="usa-button usa-button--unstyled"
      data-html2canvas-ignore
      id={uniqueId('display-table-toggle-')}
      onClick={() => setDisplayTable(!displayTable)}
      aria-label={displayTable ? `Display ${title} as graph` : `Display ${title} as table`}
    >
      {displayTable ? 'Display graph' : 'Display table'}
    </button>
  );
}

DisplayTableToggle.propTypes = {
  displayTable: PropTypes.bool,
  setDisplayTable: PropTypes.func.isRequired,
  title: PropTypes.string.isRequired,
};
DisplayTableToggle.defaultProps = {
  displayTable: false,
};
