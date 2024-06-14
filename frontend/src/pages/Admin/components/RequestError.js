import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getRequestError } from '../../../fetchers/Admin';
import ReadOnlyField from '../../../components/ReadOnlyField';
import ErrorDetails from './ErrorDetails';

export default function RequestError() {
  const { errorId } = useParams();
  const [error, setError] = useState();

  useEffect(() => {
    async function fetchError() {
      try {
        const es = await getRequestError(errorId);
        setError(es);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error(e);
      }
    }
    fetchError();
  }, [errorId]);

  if (!error) {
    return null;
  }

  return (
    <div>
      <h1>
        Request Error
        {' '}
        { errorId }
      </h1>
      <ReadOnlyField label="ID">
        {error.id}
      </ReadOnlyField>
      <ReadOnlyField label="Operation">
        {error.operation}
      </ReadOnlyField>
      <ReadOnlyField label="URI">
        {error.uri}
      </ReadOnlyField>
      <ReadOnlyField label="Method">
        {error.method}
      </ReadOnlyField>
      <ErrorDetails title="Request body" content={error.requestBody} />
      <ErrorDetails title="Response body" content={error.responseBody} />
      <ReadOnlyField label="Response code">
        {error.responseCode}
      </ReadOnlyField>
      <ReadOnlyField label="Created at">
        {error.createdAt}
      </ReadOnlyField>
      <ReadOnlyField label="Updated at">
        {error.updatedAt}
      </ReadOnlyField>
    </div>
  );
}
