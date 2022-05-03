import React from 'react';
import PropTypes from 'prop-types';
import { Alert } from '@trussworks/react-uswds';

import './IncompletePages.css';

const IncompletePages = ({
  incompletePages,
}) => (
  <Alert className="smart-hub--incomplete-notice" validation noIcon slim type="error">
    <b>Incomplete report</b>
    <br />
    This report cannot be submitted until all sections are complete.
    Please review the following sections:
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
  incompletePages: PropTypes.arrayOf(PropTypes.string).isRequired,
};

export default IncompletePages;
