import React, { useCallback } from 'react';
import { uniqBy } from 'lodash';
import PropTypes from 'prop-types';
import useFetchNoLoading from '../hooks/useFetchNoLoading';
import { fetchCitationTextByName } from '../fetchers/citations';

export default function CitationDrawerContent({ citations }) {
  const fetcher = useCallback(() => fetchCitationTextByName(citations), [citations]);
  const { data: content } = useFetchNoLoading([], fetcher, [citations]);

  const uniqueContent = uniqBy(content, 'citation');

  return (
    <div>
      {uniqueContent.map((standard) => (
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
