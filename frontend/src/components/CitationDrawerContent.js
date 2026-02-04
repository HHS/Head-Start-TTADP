import React from 'react';
import PropTypes from 'prop-types';

export default function CitationDrawerContent({ citations }) {
  return (
    <div>
      {citations.map((standard) => (
        <div key={standard.citation} className="margin-bottom-3">
          <p className="text-bold usa-prose margin-0">{standard.citation}</p>
          <p className="usa-prose margin-0">{standard.text}</p>
        </div>
      ))}
    </div>
  );
}

CitationDrawerContent.propTypes = {
  citations: PropTypes.arrayOf(PropTypes.string).isRequired,
};
