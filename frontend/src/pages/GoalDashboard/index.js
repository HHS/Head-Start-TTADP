import React from 'react';
import { Helmet } from 'react-helmet';
import { Alert } from '@trussworks/react-uswds';
import useFetch from '../../hooks/useFetch';
import { fetchGoalDashboardData } from '../../fetchers/goals';
import GoalStatusReasonSankeyWidget from '../../widgets/GoalStatusReasonSankeyWidget';
export default function GoalDashboard() {
  const {
    data: goalStatusWithReasons,
    error,
    loading,
  } = useFetch(
    null,
    fetchGoalDashboardData,
    [],
    'Unable to fetch goal dashboard data',
  );

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
      {(goalStatusWithReasons || loading) && (
        <GoalStatusReasonSankeyWidget
          data={goalStatusWithReasons}
          loading={loading}
        />
      )}
    </div>
  );
}
