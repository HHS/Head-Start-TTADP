import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Alert } from '@trussworks/react-uswds';
import { useLocation } from 'react-router-dom';
import { getRecipientGoals } from '../../../fetchers/recipient';
import PrintableGoal from './components/PrintableGoal';
import PrintToPdf from '../../../components/PrintToPDF';
import './PrintGoals.css';

const OFFSET = 0;
export default function PrintGoals({ recipientId, regionId }) {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [, setError] = useState('');
  const location = useLocation();

  useEffect(() => {
    const sortConfig = location.state && location.state.sortConfig
      ? location.state.sortConfig
      : {
        sortBy: 'goalStatus',
        direction: 'asc',
        activePage: 1,
        offset: 0,
      };

    const goalIds = location.state && location.state.selectedGoalIds
      ? location.state.selectedGoalIds
      : [];
    async function fetchGoals(query) {
      setLoading(true);
      try {
        const { goalRows } = await getRecipientGoals(
          recipientId,
          regionId,
          sortConfig.sortBy,
          sortConfig.direction,
          OFFSET,
          false,
          query,
          goalIds,
        );
        setGoals(goalRows);
        setError('');
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error(e);
        setError('Unable to fetch goals');
      }
      setLoading(false);
    }

    const filterQuery = location.search.replace(/^\?/, '');

    fetchGoals(filterQuery);
  }, [location.state, location.search, recipientId, regionId]);

  if (loading) {
    return 'Loading...';
  }

  if (!goals.length) {
    return (
      <Alert type="info" headingLevel="h2" heading={<>Something went wrong</>}>
        <span className="usa-prose">Select goals before printing.</span>
      </Alert>
    );
  }

  return (
    <div className="margin-top-2 margin-left-2 ttahub-print-goals">
      <PrintToPdf id="print-goals" />
      <div className="bg-white radius-md shadow-2 margin-right-2">
        {goals.map((goal) => <PrintableGoal key={`printable-goal-${goal.id}`} goal={goal} />)}
      </div>
    </div>
  );
}

PrintGoals.propTypes = {
  recipientId: PropTypes.string.isRequired,
  regionId: PropTypes.string.isRequired,
};
