import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Alert } from '@trussworks/react-uswds';
import PrintToPdf from '../../../components/PrintToPDF';
import BackLink from '../../../components/BackLink';
import PrintableCitation from './PrintableCitation';
import { filtersToQueryString } from '../../../utils';
import fetchWidget from '../../../fetchers/Widgets';

const PRINT_PER_PAGE = 500;

export default function PrintSelectedCitations() {
  const location = useLocation();
  const {
    selectedIds = [],
    sortConfig = { sortBy: 'recipient_finding', direction: 'asc' },
    filters = [],
  } = location.state || {};

  const [citations, setCitations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCitations() {
      setLoading(true);
      try {
        const query = filtersToQueryString(filters);
        const sortQuery = `sortBy=${sortConfig.sortBy}&direction=${sortConfig.direction}&offset=0&perPage=${PRINT_PER_PAGE}`;
        const response = await fetchWidget('monitoringTta', `${query}&${sortQuery}`);
        const allCitations = response?.data || [];
        const selectedSet = new Set(selectedIds);
        const filtered = allCitations.filter(
          (c) => selectedSet.has(`${c.citationId}-${c.recipientId}`),
        );
        setCitations(filtered);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error(e);
        setCitations([]);
      }
      setLoading(false);
    }

    fetchCitations();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return <p>Loading...</p>;
  }

  if (!citations.length) {
    return (
      <div className="margin-2">
        <BackLink to="/dashboards/regional-dashboard/monitoring">
          Back to regional monitoring dashboard
        </BackLink>
        <Alert type="info" headingLevel="h2" heading={<>No citations found</>}>
          <span className="usa-prose">No matching citations were found. Please go back and try again.</span>
        </Alert>
      </div>
    );
  }

  return (
    <div className="margin-top-2 margin-left-2 ttahub-print-selected-citations">
      <BackLink to="/dashboards/regional-dashboard/monitoring">
        Back to regional monitoring dashboard
      </BackLink>
      <PrintToPdf id="print-selected-citations" className="margin-bottom-3" />
      <div className="bg-white radius-md shadow-2 margin-right-2">
        {citations.map((citation) => (
          <PrintableCitation
            key={`${citation.citationId}-${citation.recipientId}`}
            citation={citation}
          />
        ))}
      </div>
    </div>
  );
}
