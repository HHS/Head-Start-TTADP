import React from 'react';
import PropTypes from 'prop-types';
import { v4 as uuidv4 } from 'uuid';

export default function GoalPrompts({ prompts }) {
  if (!prompts) {
    return null;
  }

  return prompts.map((prompt) => (
    <div key={uuidv4()}>
      <p className="usa-prose margin-bottom-0 text-bold">{ prompt.title }</p>
      <p className="usa-prose margin-top-0">{ prompt.response.join(' , ')}</p>
    </div>
  ));
}

GoalPrompts.propTypes = {
  prompts: PropTypes.arrayOf(PropTypes.shape({
    title: PropTypes.string.isRequired,
    response: PropTypes.arrayOf(PropTypes.string).isRequired,
  })).isRequired,
};
