import React from 'react';
import PropTypes from 'prop-types';
import { Alert } from '@trussworks/react-uswds';

import './IncompletePages.css';

const IncompletePages = ({
  type,
  incompletePages,
}) => (
  <Alert className="smart-hub--incomplete-notice" validation noIcon slim type="error">
    <b>{`Incomplete ${type}`}</b>
    <br />
    {`This ${type} cannot be submitted until all sections are complete.
    Please review the following sections:`}
    <ul>
      {incompletePages.map((page) => (
        <li key={page}>
          {page}
        </li>
      ))}
    </ul>
  </Alert>
);

IncompletePages.propTypes = {
  type: PropTypes.string,
  incompletePages: PropTypes.arrayOf(PropTypes.string).isRequired,
};

IncompletePages.defaultProps = {
  type: 'report',
};

export default IncompletePages;
