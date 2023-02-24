import React from 'react';
import {
  render, screen, act, within,
} from '@testing-library/react';
import fetchMock from 'fetch-mock';
import join from 'url-join';
import RegionalGoalDashboard from '../index';
import UserContext from '../../../UserContext';
import { SCOPE_IDS } from '../../../Constants';
import { formatDateRange } from '../../../utils';

const WIDGET_MOCKS = {
  goalsPercentage: {
    numerator: 36578,
    denominator: 37468,
    percentage: 97.62463969253763,
  },
  goalStatusGraph: {
    total: 14274,
    'Not started': 2505,
    'In progress': 6944,
    Suspended: 311,
    Closed: 4514,
  },
};

describe('RegionalGoalDashboard', () => {
  const lastThirtyDays = `startDate.win=${encodeURIComponent(
    formatDateRange({
      lastThirtyDays: true,
      forDateTime: true,
    }),
  )}`;

  const regionIn = 'region.in[]=1';

  const user = {
    homeRegionId: 14,
    permissions: [{
      regionId: 1,
      scopeId: SCOPE_IDS.READ_ACTIVITY_REPORTS,
    }],
  };

  const renderRegionalGoalDashboard = () => {
    render(
      <UserContext.Provider value={{ user }}>
        <RegionalGoalDashboard />
      </UserContext.Provider>,
    );
  };

  const widgetUrl = join('api', 'widgets');

  beforeEach(async () => {
    const widgets = Object.keys(WIDGET_MOCKS);

    widgets.forEach((widget) => {
      const url = join(widgetUrl, `${widget}?${regionIn}&${lastThirtyDays}`);
      fetchMock.get(url, WIDGET_MOCKS[widget]);
    });
  });

  afterEach(async () => {
    fetchMock.restore();
  });

  it('renders the regional goal dashboard', async () => {
    act(() => {
      renderRegionalGoalDashboard();
    });

    expect(await screen.findByRole('heading', { name: /Region 1 Goal Dashboard/i })).toBeInTheDocument();
  });

  it('goal status graph', async () => {
    act(() => {
      renderRegionalGoalDashboard();
    });

    expect(await screen.findByRole('heading', { name: 'Number of goals by status' })).toBeInTheDocument();

    const graph = await screen.findByTestId('goalStatusGraph');

    const textStrings = [
      'Not started',
      '2505/14274',
      'In progress',
      '6944/14274',
      'Suspended',
      '311/14274',
      'Closed',
      '4514/14274',
      '14274 goals',
    ];

    textStrings.forEach((textString) => {
      expect(within(graph).getByText(textString)).toBeInTheDocument();
    });
  });
});
