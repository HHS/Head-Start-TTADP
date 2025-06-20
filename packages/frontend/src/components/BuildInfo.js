import React, { useEffect, useState } from 'react';

function BuildInfo() {
  const [buildInfo, setBuildInfo] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch('/api/admin/buildInfo')
      .then((response) => {
        if (!response.ok) throw new Error('Build info not accessible');
        return response.json();
      })
      .then((data) => {
        setBuildInfo(data);
        setError(false);
      })
      .catch(() => {
        setError(true); // Set error state if fetch fails
      });
  }, []);

  if (error || !buildInfo) return null; // Show nothing if there's an error or no build info

  return (
    <footer
      style={{
        padding: '1em',
        textAlign: 'center',
        fontSize: '0.8em',
        color: '#666',
      }}
    >
      <p>
        Branch:&nbsp;
        {buildInfo.branch}
        <br />
        Commit:&nbsp;
        {buildInfo.commit}
        <br />
        Build Number:&nbsp;
        {buildInfo.buildNumber}
        <br />
        Deployed on:&nbsp;
        {buildInfo.timestamp}
        <br />
      </p>
    </footer>
  );
}

export default BuildInfo;
