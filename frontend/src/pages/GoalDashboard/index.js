import { Alert } from '@trussworks/react-uswds';
import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { fetchGoalDashboardData } from '../../fetchers/goals';
import useFetch from '../../hooks/useFetch';
import GoalStatusReasonSankeyWidget from '../../widgets/GoalStatusReasonSankeyWidget';
import { SANKEY_TEST_DATASETS } from './sankeyTestDataSets';

const isDev = process.env.NODE_ENV === 'development';

export default function GoalDashboard() {
  const {
    data: goalStatusWithReasons,
    error,
    loading,
  } = useFetch(null, fetchGoalDashboardData, [], 'Unable to fetch goal dashboard data');

  const [testDataKey, setTestDataKey] = useState('');

  const displayData = testDataKey
    ? SANKEY_TEST_DATASETS.find((d) => d.key === testDataKey)?.data
    : goalStatusWithReasons;

  return (
    <div className="ttahub-goal-dashboard">
      <Helmet>
        <title>Goal Dashboard</title>
      </Helmet>
      <h1 className="landing margin-top-0 margin-bottom-3">Goal dashboard</h1>
      {isDev && (
        <div
          style={{
            background: '#fff3cd',
            border: '1px solid #ffc107',
            borderRadius: '4px',
            padding: '8px 12px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '13px',
          }}
        >
          <strong>DEV</strong>
          <label htmlFor="sankey-test-data-select" style={{ margin: 0 }}>
            Sankey test data:
          </label>
          <select
            id="sankey-test-data-select"
            value={testDataKey}
            onChange={(e) => setTestDataKey(e.target.value)}
            style={{ fontSize: '13px' }}
          >
            <option value="">— Live data —</option>
            {SANKEY_TEST_DATASETS.map(({ key, label }) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>
      )}
      {error && (
        <Alert className="margin-bottom-2" type="error" role="alert">
          {error}
        </Alert>
      )}
      {(displayData || loading) && (
        <GoalStatusReasonSankeyWidget
          key={testDataKey || 'live'}
          data={displayData}
          loading={loading}
        />
      )}
    </div>
  );
}
