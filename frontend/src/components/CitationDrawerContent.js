import React, { useCallback } from 'react';
import PropTypes from 'prop-types';
import { uniqueId } from 'lodash';
import { fetchCitationTextByName } from '../fetchers/citations';
import useFetch from '../hooks/useFetch';

export default function CitationDrawerContent({ citations }) {
  const fetcher = useCallback(() => fetchCitationTextByName(citations), [citations]);
  const { data: content } = useFetch([], fetcher, [citations]);

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
