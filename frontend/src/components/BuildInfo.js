// frontend/src/components/BuildInfo.js
import React, { useEffect, useState } from 'react';

function BuildInfo() {
  const [buildInfo, setBuildInfo] = useState(null);

  useEffect(() => {
    fetch('/api/admin/buildInfo')
      .then(response => response.json())
      .then(data => setBuildInfo(data))
      .catch(error => console.error("Error fetching build info:", error));
  }, []);

  if (!buildInfo) return null;

  return (
    <footer style={{ padding: '1em', textAlign: 'center', fontSize: '0.8em', color: '#666' }}>
      <p>
        Branch: {buildInfo.branch}<br />
        Commit: {buildInfo.commit}<br />
        Build Number: {buildInfo.buildNumber}<br />
        Deployed on: {buildInfo.timestamp}<br />
      </p>
    </footer>
  );
}

export default BuildInfo;
