import React, { useEffect, useState } from 'react';
import { Alert, Dropdown } from '@trussworks/react-uswds';
import PropTypes from 'prop-types';
import { Helmet } from 'react-helmet';
import Container from '../../../components/Container';
import { getRttapas } from '../../../fetchers/rttapa';
import RTTAPAHistoryGoalCard from './components/RTTPAHistoryGoalCard';

export default function RTTAPAHistory({ regionId, recipientId, recipientNameWithRegion }) {
  const [sortConfig, setSortConfig] = useState({
    sortBy: 'reviewDate',
    direction: 'desc',
  });
  const [reports, setReports] = useState(null);
  const [error, setError] = useState(null);

  const setSortBy = (e) => {
    const [sortBy, direction] = e.target.value.split('-');
    setSortConfig({ sortBy, direction });
  };

  useEffect(() => {
    // fetch RTTAPAS for this recipient/region
    async function fetchRttapas() {
      try {
        const rttapas = await getRttapas(regionId, recipientId);
        setReports(rttapas);
      } catch (e) {
        setReports([]);
        setError('There was an error fetching your reports');
      }
    }

    if (!reports && recipientId && regionId) {
      fetchRttapas();
    }
  }, [recipientId, regionId, reports]);

  return (
    <>
      <Helmet>
        <title>
          RTTAPA History -
          {recipientNameWithRegion}
        </title>
      </Helmet>
      <Container>
        <h2>Reviewed regional TTA plan agreements</h2>
        <div className="ttahub-rttapa-controls padding-y-4">
          <div className="desktop:display-flex flex-justify">
            <div className="desktop:display-flex flex-align-center">
              {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
              <label className="display-block margin-right-1" style={{ minWidth: 'max-content' }} htmlFor="sortBy">Sort by</label>
              <Dropdown
                onChange={setSortBy}
                value={`${sortConfig.sortBy}-${sortConfig.direction}`}
                className="margin-top-0"
                id="sortBy"
                name="sortBy"
                data-testid="sortGoalsBy"
              >
                <option value="reviewDate-desc">review date (newest to oldest) </option>
                <option value="reviewDate-asc">review date (oldest to newest) </option>
              </Dropdown>
            </div>
          </div>
        </div>
        <div className="ttahub-rttapa-list">
          { error && (
          <Alert type="error">
            <p>{error}</p>
          </Alert>
          )}
          {reports && reports.map((report) => (
            <RTTAPAHistoryGoalCard
              key={report.id}
              report={report}
              recipientId={recipientId}
              regionId={regionId}
            />
          ))}
        </div>
      </Container>
    </>
  );
}

RTTAPAHistory.propTypes = {
  regionId: PropTypes.string.isRequired,
  recipientId: PropTypes.string.isRequired,
  recipientNameWithRegion: PropTypes.string.isRequired,
};
