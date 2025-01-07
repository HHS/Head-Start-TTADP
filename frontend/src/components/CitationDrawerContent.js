import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { uniqueId } from 'lodash';
import { fetchCitationTextByName } from '../fetchers/citations';

export default function CitationDrawerContent({ citations }) {
  const [content, setContent] = useState([]); // { text: string, citation: string }[]

  useEffect(() => {
    const abortController = new AbortController();
    async function fetchCitations() {
      try {
        const response = await fetchCitationTextByName(citations, abortController.signal);
        setContent(response);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(err);
      }
    }

    if (citations) {
      fetchCitations();
    }

    return () => {
      abortController.abort();
    };
  }, [citations]);

  return (
    <div>
      {content.map((standard) => (
        <div key={uniqueId('citation-drawer-content-citation-')} className="margin-bottom-3">
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
