/* eslint-disable jsx-a11y/anchor-is-valid */
import React from 'react';
import PropTypes from 'prop-types';
import Tooltip from '../../Tooltip';

export default function Topics({ topics }) {
  if (!topics.length) {
    return null;
  }

  if (topics.length === 1) {
    return <p className="usa-prose margin-y-0">{topics[0]}</p>;
  }

  return (
    <>
      <p className="usa-prose margin-y-0">{topics[0]}</p>
      <Tooltip
        className="usa-prose"
        screenReadDisplayText={false}
        displayText="View all topics"
        buttonLabel={topics.join(' ')}
        tooltipText={topics.map((topic) => <span key={topic} className="width-card display-block padding-bottom-1">{topic}</span>)}
      />
    </>
  );
}

Topics.propTypes = {
  topics: PropTypes.arrayOf(PropTypes.string).isRequired,
};
