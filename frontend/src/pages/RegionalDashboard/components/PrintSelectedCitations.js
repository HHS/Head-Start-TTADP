import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Alert } from '@trussworks/react-uswds';
import PrintToPdf from '../../../components/PrintToPDF';
import BackLink from '../../../components/BackLink';
import PrintableCitation from './PrintableCitation';
import { filtersToQueryString } from '../../../utils';
import fetchWidget from '../../../fetchers/Widgets';
import Container from '../../../components/Container';
import TabsNav from '../../../components/TabsNav';
import { links } from '..';
import './PrintSelectedCitations.css';

export default function PrintSelectedCitations() {
  const location = useLocation();
  const {
    selectedIds = [],
    sortConfig = { sortBy: 'recipient_finding', direction: 'asc' },
  } = location.state || {};

  const [citations, setCitations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const abortController = new AbortController();

    async function fetchCitations() {
      if (!selectedIds.length) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const filterQuery = filtersToQueryString(selectedIds.map((id) => ({
          topic: 'citationRecipient',
          condition: 'is',
          query: String(id),
        })));
        const sortQuery = `sortBy=${sortConfig.sortBy}&direction=${sortConfig.direction}&skipCache=true&perPage=${selectedIds.length}`;
        const response = await fetchWidget('monitoringTta', `${filterQuery}&${sortQuery}`, abortController.signal);
        setCitations(response?.data || []);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error(e);
        setCitations([]);
      }
      setLoading(false);
    }

    fetchCitations();

    return () => {
      abortController.abort();
    };
  }, [selectedIds, sortConfig.direction, sortConfig.sortBy]);

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
    <div className="ttahub-print-selected-citations">
      <TabsNav ariaLabel="Dashboard navigation" links={links} />
      <BackLink to="/dashboards/regional-dashboard/monitoring" bottomMargin={3}>
        Back to Regional dashboard - Monitoring
      </BackLink>
      <h1 className="landing margin-top-0 margin-bottom-3 no-print">Monitoring related TTA</h1>
      <PrintToPdf id="print-selected-citations" className="margin-bottom-3" />
      <Container className="ttahub-print-selected-citations-container">
        {citations.map((citation) => (
          <PrintableCitation
            key={`${citation.citationId}-${citation.recipientId}-${citation.id}`}
            citation={citation}
          />
        ))}
      </Container>
    </div>
  );
}
