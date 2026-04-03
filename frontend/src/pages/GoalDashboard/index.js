import React from 'react';
import { Helmet } from 'react-helmet';
import { Alert } from '@trussworks/react-uswds';
import useFetch from '../../hooks/useFetch';
import { fetchGoalDashboardData } from '../../fetchers/goals';

export default function GoalDashboard() {
  const { data, error } = useFetch(
    null,
    fetchGoalDashboardData,
    [],
    'Unable to fetch goal dashboard data',
  );

  const totalGoals = data?.goalStatusWithReasons?.total;

  return (
    <div className="ttahub-goal-dashboard">
      <Helmet>
        <title>Goal Dashboard</title>
      </Helmet>
      <h1 className="landing">Goal dashboard</h1>
      {error && (
        <Alert className="margin-bottom-2" type="error" role="alert">
          {error}
        </Alert>
      )}
      {typeof totalGoals !== 'undefined' && (
        <p>
          {`Total goals: ${totalGoals}`}
        </p>
      )}
    </div>
  );
}
