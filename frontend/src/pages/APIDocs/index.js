import React from 'react';
import BackLink from '../../components/BackLink';

export default function APIDocs() {
  const params = new URLSearchParams(window.location.search);
  const referrer = params.get('referrer');

  return (
    <div>
      {referrer && (
        <BackLink to={decodeURIComponent(referrer)}>Back</BackLink>
      )}
      <h1 className="landing margin-top-0 margin-bottom-3">API Documentation</h1>
      <APIDocs spec={jsonData} />
    </div>
  );
}

