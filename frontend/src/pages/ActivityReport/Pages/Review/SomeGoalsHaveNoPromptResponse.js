import React from 'react';
import PropTypes from 'prop-types';
import { Alert } from '@trussworks/react-uswds';

const SomeGoalsHaveNoPromptResponse = ({ promptsMissingResponses }) => (
  <Alert validation noIcon slim type="error">
    <strong>Some goals are incomplete</strong>
    <br />
    Please check the Recipient TTA Record and complete the missing fields.
    <ul>
      {promptsMissingResponses.map((prompt) => (
        <li key={prompt}>
          {prompt}
        </li>
      ))}
    </ul>
  </Alert>
);

SomeGoalsHaveNoPromptResponse.propTypes = {
  promptsMissingResponses: PropTypes.arrayOf(PropTypes.string).isRequired,
};

export default SomeGoalsHaveNoPromptResponse;
