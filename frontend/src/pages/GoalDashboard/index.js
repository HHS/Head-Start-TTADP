import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { Alert, Radio } from '@trussworks/react-uswds';
import useFetch from '../../hooks/useFetch';
import { fetchGoalDashboardData } from '../../fetchers/goals';
import GoalStatusReasonSankeyWidget from '../../widgets/GoalStatusReasonSankeyWidget';

const FAKE_GOAL_DASHBOARD_DATA = {
  total: 64,
  sankey: {
    nodes: [
      {
        id: 'goals', label: 'Goals', count: 64, percentage: 100,
      },
      {
        id: 'status:Not Started', label: 'Not started', count: 37, percentage: 57.81,
      },
      {
        id: 'status:In Progress', label: 'In progress', count: 24, percentage: 37.50,
      },
      {
        id: 'status:Closed', label: 'Closed', count: 2, percentage: 3.13,
      },
      {
        id: 'status:Suspended', label: 'Suspended', count: 1, percentage: 1.56,
      },
      {
        id: 'reason:Closed:TTA complete', label: 'TTA complete', count: 1, percentage: 50,
      },
      {
        id: 'reason:Closed:Recipient request', label: 'Recipient request', count: 1, percentage: 50,
      },
      {
        id: 'reason:Suspended:Key staff turnover / vacancies', label: 'Key staff turnover / vacancies', count: 1, percentage: 100,
      },
    ],
    links: [
      { source: 'goals', target: 'status:Not Started', value: 37 },
      { source: 'goals', target: 'status:In Progress', value: 24 },
      { source: 'goals', target: 'status:Closed', value: 2 },
      { source: 'goals', target: 'status:Suspended', value: 1 },
      { source: 'status:Closed', target: 'reason:Closed:TTA complete', value: 1 },
      { source: 'status:Closed', target: 'reason:Closed:Recipient request', value: 1 },
      { source: 'status:Suspended', target: 'reason:Suspended:Key staff turnover / vacancies', value: 1 },
    ],
  },
};

// All possible close reasons: Recipient request, Regional Office request, TTA complete
// All possible suspend reasons: Key staff turnover / vacancies, Recipient request,
//   Recipient is not responding, Regional Office request
const MAX_REASONS_FAKE_DATA = {
  total: 120,
  sankey: {
    nodes: [
      {
        id: 'goals', label: 'Goals', count: 120, percentage: 100,
      },
      {
        id: 'status:Not Started', label: 'Not started', count: 40, percentage: 33.33,
      },
      {
        id: 'status:In Progress', label: 'In progress', count: 30, percentage: 25.00,
      },
      {
        id: 'status:Closed', label: 'Closed', count: 30, percentage: 25.00,
      },
      {
        id: 'status:Suspended', label: 'Suspended', count: 20, percentage: 16.67,
      },
      {
        id: 'reason:Closed:Recipient request', label: 'Recipient request', count: 12, percentage: 40.00,
      },
      {
        id: 'reason:Closed:Regional Office request', label: 'Regional Office request', count: 10, percentage: 33.33,
      },
      {
        id: 'reason:Closed:TTA complete', label: 'TTA complete', count: 8, percentage: 26.67,
      },
      {
        id: 'reason:Suspended:Key staff turnover / vacancies', label: 'Key staff turnover / vacancies', count: 8, percentage: 40.00,
      },
      {
        id: 'reason:Suspended:Recipient request', label: 'Recipient request', count: 5, percentage: 25.00,
      },
      {
        id: 'reason:Suspended:Recipient is not responding', label: 'Recipient is not responding', count: 4, percentage: 20.00,
      },
      {
        id: 'reason:Suspended:Regional Office request', label: 'Regional Office request', count: 3, percentage: 15.00,
      },
    ],
    links: [
      { source: 'goals', target: 'status:Not Started', value: 40 },
      { source: 'goals', target: 'status:In Progress', value: 30 },
      { source: 'goals', target: 'status:Closed', value: 30 },
      { source: 'goals', target: 'status:Suspended', value: 20 },
      { source: 'status:Closed', target: 'reason:Closed:Recipient request', value: 12 },
      { source: 'status:Closed', target: 'reason:Closed:Regional Office request', value: 10 },
      { source: 'status:Closed', target: 'reason:Closed:TTA complete', value: 8 },
      { source: 'status:Suspended', target: 'reason:Suspended:Key staff turnover / vacancies', value: 8 },
      { source: 'status:Suspended', target: 'reason:Suspended:Recipient request', value: 5 },
      { source: 'status:Suspended', target: 'reason:Suspended:Recipient is not responding', value: 4 },
      { source: 'status:Suspended', target: 'reason:Suspended:Regional Office request', value: 3 },
    ],
  },
};

const BALANCED_FAKE_DATA = {
  total: 80,
  sankey: {
    nodes: [
      {
        id: 'goals', label: 'Goals', count: 80, percentage: 100,
      },
      {
        id: 'status:Not Started', label: 'Not started', count: 24, percentage: 30.00,
      },
      {
        id: 'status:In Progress', label: 'In progress', count: 28, percentage: 35.00,
      },
      {
        id: 'status:Closed', label: 'Closed', count: 16, percentage: 20.00,
      },
      {
        id: 'status:Suspended', label: 'Suspended', count: 12, percentage: 15.00,
      },
      {
        id: 'reason:Closed:TTA complete', label: 'TTA complete', count: 6, percentage: 37.50,
      },
      {
        id: 'reason:Closed:Recipient request', label: 'Recipient request', count: 5, percentage: 31.25,
      },
      {
        id: 'reason:Closed:Regional Office request', label: 'Regional Office request', count: 5, percentage: 31.25,
      },
      {
        id: 'reason:Suspended:Key staff turnover / vacancies', label: 'Key staff turnover / vacancies', count: 5, percentage: 41.67,
      },
      {
        id: 'reason:Suspended:Recipient request', label: 'Recipient request', count: 4, percentage: 33.33,
      },
      {
        id: 'reason:Suspended:Recipient is not responding', label: 'Recipient is not responding', count: 3, percentage: 25.00,
      },
    ],
    links: [
      { source: 'goals', target: 'status:Not Started', value: 24 },
      { source: 'goals', target: 'status:In Progress', value: 28 },
      { source: 'goals', target: 'status:Closed', value: 16 },
      { source: 'goals', target: 'status:Suspended', value: 12 },
      { source: 'status:Closed', target: 'reason:Closed:TTA complete', value: 6 },
      { source: 'status:Closed', target: 'reason:Closed:Recipient request', value: 5 },
      { source: 'status:Closed', target: 'reason:Closed:Regional Office request', value: 5 },
      { source: 'status:Suspended', target: 'reason:Suspended:Key staff turnover / vacancies', value: 5 },
      { source: 'status:Suspended', target: 'reason:Suspended:Recipient request', value: 4 },
      { source: 'status:Suspended', target: 'reason:Suspended:Recipient is not responding', value: 3 },
    ],
  },
};

const NO_RESULTS_FAKE_DATA = {
  total: 0,
  sankey: {
    nodes: [],
    links: [],
  },
};

function useLiveData() {
  const { data, error, loading } = useFetch(
    null,
    fetchGoalDashboardData,
    [],
    'Unable to fetch goal dashboard data',
  );
  return { data, error, loading };
}

const DATA_SOURCES = {
  fake: 'fake',
  maxReasons: 'maxReasons',
  balanced: 'balanced',
  noResults: 'noResults',
  live: 'live',
};

export default function GoalDashboard() {
  const [dataSource, setDataSource] = useState(DATA_SOURCES.fake);

  const live = useLiveData();

  const isLive = dataSource === DATA_SOURCES.live;
  const error = isLive ? live.error : null;
  const loading = isLive ? live.loading : false;
  let goalStatusWithReasons;
  if (dataSource === DATA_SOURCES.live) {
    goalStatusWithReasons = live.data;
  } else if (dataSource === DATA_SOURCES.maxReasons) {
    goalStatusWithReasons = MAX_REASONS_FAKE_DATA;
  } else if (dataSource === DATA_SOURCES.balanced) {
    goalStatusWithReasons = BALANCED_FAKE_DATA;
  } else if (dataSource === DATA_SOURCES.noResults) {
    goalStatusWithReasons = NO_RESULTS_FAKE_DATA;
  } else {
    goalStatusWithReasons = FAKE_GOAL_DASHBOARD_DATA;
  }

  return (
    <div className="ttahub-goal-dashboard">
      <Helmet>
        <title>Goal Dashboard</title>
      </Helmet>
      <h1 className="landing">Goal dashboard</h1>
      <fieldset className="usa-fieldset display-flex flex-align-center flex-gap-2 margin-bottom-2 border-0 padding-0">
        <legend className="text-base-dark font-body-xs margin-right-1">Data source:</legend>
        <Radio
          id="data-source-fake"
          name="data-source"
          label="Current fake data"
          value={DATA_SOURCES.fake}
          checked={dataSource === DATA_SOURCES.fake}
          onChange={() => setDataSource(DATA_SOURCES.fake)}
          className="margin-right-2"
        />
        <Radio
          id="data-source-max-reasons"
          name="data-source"
          label="Max reasons fake data"
          value={DATA_SOURCES.maxReasons}
          checked={dataSource === DATA_SOURCES.maxReasons}
          onChange={() => setDataSource(DATA_SOURCES.maxReasons)}
          className="margin-right-2"
        />
        <Radio
          id="data-source-balanced"
          name="data-source"
          label="Balanced fake data"
          value={DATA_SOURCES.balanced}
          checked={dataSource === DATA_SOURCES.balanced}
          onChange={() => setDataSource(DATA_SOURCES.balanced)}
          className="margin-right-2"
        />
        <Radio
          id="data-source-no-results"
          name="data-source"
          label="No results fake data"
          value={DATA_SOURCES.noResults}
          checked={dataSource === DATA_SOURCES.noResults}
          onChange={() => setDataSource(DATA_SOURCES.noResults)}
          className="margin-right-2"
        />
        <Radio
          id="data-source-live"
          name="data-source"
          label="Actual data"
          value={DATA_SOURCES.live}
          checked={dataSource === DATA_SOURCES.live}
          onChange={() => setDataSource(DATA_SOURCES.live)}
        />
      </fieldset>
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
