import React, { useEffect, useState, useMemo } from 'react';
import { Alert, Dropdown } from '@trussworks/react-uswds';
import PropTypes from 'prop-types';
import { Helmet } from 'react-helmet';
import Container from '../../../components/Container';
import { getRttapas } from '../../../fetchers/rttapa';
import RTTAPAHistoryGoalCard from './components/RTTPAHistoryGoalCard';

export default function RTTAPAHistory({ regionId, recipientId }) {
  const [sortConfig, setSortConfig] = useState({
    sortBy: 'reviewDate',
    direction: 'desc',
  });
  const [reports, setReports] = useState(null);
  const [error, setError] = useState(null);

  const sortValue = useMemo(() => `${sortConfig.sortBy}-${sortConfig.direction}`, [sortConfig.direction, sortConfig.sortBy]);

  const setSortBy = (e) => {
    const [sortBy, direction] = e.target.value.split('-');
    setSortConfig({ sortBy, direction });
  };

  useEffect(() => {
    // fetch RTTAPAS for this recipient/region
    async function fetchRttapas(sort) {
      try {
        const rttapas = await getRttapas(regionId, recipientId, sort);
        setReports(rttapas);
      } catch (e) {
        setReports([]);
        setError('There was an error fetching your reports');
      }
    }

    if (recipientId && regionId) {
      fetchRttapas(sortConfig);
    }
  }, [recipientId, regionId, sortConfig]);

  return (
    <>
      <Helmet>
        <title>
          RTTAPA History
        </title>
      </Helmet>
      <Container className="margin-top-3" paddingX={3} paddingY={3}>
        <h2 className="smart-hub-title-big-serif margin-top-0 margin-bottom-0">Reviewed regional TTA plan agreements</h2>
        <div className="ttahub-rttapa-controls padding-y-3">
          <div className="desktop:display-flex flex-justify">
            <div className="desktop:display-flex flex-align-center">
              {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
              <label className="display-block margin-right-1" style={{ minWidth: 'max-content' }} htmlFor="sortBy">Sort by</label>
              <Dropdown
                onChange={setSortBy}
                value={sortValue}
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
};
