/* eslint-disable max-len */
import '@testing-library/jest-dom';
import React from 'react';
import join from 'url-join';
import { SCOPE_IDS } from '@ttahub/common';
import { Router } from 'react-router-dom';
import { createMemoryHistory } from 'history';
import {
  render,
  screen,
  act,
  waitFor,
} from '@testing-library/react';
import fetchMock from 'fetch-mock';
import userEvent from '@testing-library/user-event';
import QADashboard from '../index';
import UserContext from '../../../UserContext';
import AriaLiveContext from '../../../AriaLiveContext';

const history = createMemoryHistory();
const mockAnnounce = jest.fn();

const defaultUser = {
  homeRegionId: 14,
  permissions: [{
    regionId: 1,
    scopeId: SCOPE_IDS.READ_ACTIVITY_REPORTS,
  }, {
    regionId: 2,
    scopeId: SCOPE_IDS.READ_ACTIVITY_REPORTS,
  }],
};
const apiCall = join('api', 'ssdi', 'qa-dashboard?region.in[]=1&region.in[]=2');
const overviewData = {
  recipientsWithNoTTA: { pct: '2.52%', filterApplicable: true },
  recipientsWithOhsStandardFeiGoals: { pct: '73.25%', filterApplicable: false },
  recipientsWithOhsStandardClass: { pct: '14.26%', filterApplicable: false },
};

const DELIVERY_METHOD_GRAPH_DATA = {
  total_in_person_count: 8420,
  average_in_person_percentage: 73,
  total_virtual_count: 2734,
  average_virtual_percentage: 24,
  total_hybrid_count: 356,
  average_hybrid_percentage: 3,
  records: [{
    month: 'Jan 23',
    in_person_count: 818,
    hybrid_count: 0,
    in_person_percentage: 80,
    virtual_count: 204,
    virtual_percentage: 20,
    hybrid_percentage: 0,
  },
  {
    month: 'Feb 23',
    in_person_count: 1750,
    virtual_count: 174,
    hybrid_count: 0,
    in_person_percentage: 83,
    virtual_percentage: 17,
    hybrid_percentage: 0,
  },
  {
    month: 'Mar 23',
    in_person_count: 742,
    virtual_count: 143,
    hybrid_count: 1,
    in_person_percentage: 83,
    virtual_percentage: 16,
    hybrid_percentage: 1,
  },
  {
    month: 'Apr 23',
    in_person_count: 936,
    virtual_count: 255,
    hybrid_count: 24,
    in_person_percentage: 77,
    virtual_percentage: 16,
    hybrid_percentage: 1,
  },
  {
    month: 'May 23',
    in_person_count: 742,
    virtual_count: 191,
    hybrid_count: 29,
    in_person_percentage: 77,
    virtual_percentage: 20,
    hybrid_percentage: 3,
  },
  {
    month: 'Jun 23',
    in_person_count: 650,
    in_person_percentage: 83,
    virtual_count: 102,
    virtual_percentage: 13,
    hybrid_count: 31,
    hybrid_percentage: 4,
  },
  {
    month: 'Jul 23',
    in_person_count: 827,
    in_person_percentage: 84,
    virtual_count: 138,
    virtual_percentage: 13,
    hybrid_count: 20,
    hybrid_percentage: 2,
  }, {
    month: 'Aug 23',
    in_person_count: 756,
    in_person_percentage: 76,
    virtual_count: 206,
    virtual_percentage: 21,
    hybrid_count: 20,
    hybrid_percentage: 2,
  },
  {
    month: 'Sep 23',
    in_person_count: 699,
    in_person_percentage: 73,
    virtual_count: 258,
    virtual_percentage: 26,
    hybrid_count: 0,
    hybrid_percentage: 0,
  },
  {
    month: 'Oct 23',
    in_person_count: 855,
    in_person_percentage: 82,
    virtual_count: 177,
    virtual_percentage: 17,
    hybrid_count: 11,
    hybrid_percentage: 1,
  },
  {
    month: 'Nov 23',
    in_person_count: 803,
    in_person_percentage: 79,
    virtual_count: 290,
    virtual_percentage: 16,
    hybrid_count: 78,
    hybrid_percentage: 5,
  },
  {
    month: 'Dec 23',
    in_person_count: 689,
    in_person_percentage: 69,
    virtual_count: 596,
    virtual_percentage: 29,
    hybrid_count: 64,
    hybrid_percentage: 2,
  },
  ],
};

const ROLE_GRAPH_DATA = {
  totalNumberOfReports: 11510,
  totalPercentage: 100,
  records: [
    {
      role_name: 'ECM',
      role_count: 6,
      percentage: 1,
    },
    {
      role_name: 'ECS',
      role_count: 6892,
      percentage: 58,
    },
    {
      role_name: 'FES',
      role_count: 135,
      percentage: 2,
    },
    {
      role_name: 'GS',
      role_count: 4258,
      percentage: 36,
    },
    {
      role_name: 'GSM',
      role_count: 23,
      percentage: 1,
    },
    {
      role_name: 'HS',
      role_count: 153,
      percentage: 2,
    },
    {
      role_name: 'SS',
      role_count: 0,
      percentage: 0,
    },
    {
      role_name: 'TTAC',
      role_count: 0,
      percentage: 0,
    },
  ],
};

const ROOT_CAUSE_FEI_GOALS_DATA = {
  totalNumberOfGoals: 11510,
  totalNumberOfRootCauses: 21637,
  records: [
    {
      rootCause: 'Community Partnerships',
      response_count: 2532,
      percentage: 22,
    },
    {
      rootCause: 'Facilities',
      response_count: 2186,
      percentage: 19,
    },
    {
      rootCause: 'Family Circumstances',
      response_count: 2762,
      percentage: 24,
    },
    {
      rootCause: 'Other ECE Care Options',
      response_count: 3683,
      percentage: 32,
    },
    {
      rootCause: 'Unavailable',
      response_count: 115,
      percentage: 1,
    },
    {
      rootCause: 'Workforce',
      response_count: 10359,
      percentage: 90,
    },
  ],
};

describe('Resource Dashboard page', () => {
  afterEach(() => fetchMock.restore());
  const renderQADashboard = (user = defaultUser) => {
    render(
      <UserContext.Provider value={{ user }}>
        <AriaLiveContext.Provider value={{ announce: mockAnnounce }}>
          <Router history={history}>
            <QADashboard user={user} />
          </Router>
        </AriaLiveContext.Provider>
      </UserContext.Provider>,
    );
  };

  it('renders correctly', async () => {
    // Mock the API call and return data that contains a property overviewData.
    fetchMock.get(apiCall, {
      overviewData,
      deliveryMethod: DELIVERY_METHOD_GRAPH_DATA,
      roleGraph: ROLE_GRAPH_DATA,
      rootCauseFeiGoalsGraph: ROOT_CAUSE_FEI_GOALS_DATA,
    });

    renderQADashboard();

    // Header
    expect(await screen.findByText('Quality assurance dashboard')).toBeVisible();

    // Overview
    expect(await screen.findByText('Recipients with no TTA')).toBeVisible();
    expect(await screen.findByText('Recipients with OHS standard FEI goal')).toBeVisible();
    expect(await screen.findByText('Recipients with OHS standard CLASS goal')).toBeVisible();

    // Assert test data.
    await act(async () => {
      await waitFor(() => {
        expect(screen.getByText('2.52%')).toBeVisible();
        expect(screen.getByText('73.25%')).toBeVisible();
        expect(screen.getByText('14.26%')).toBeVisible();
      });
    });
  });

  it('removes region filter when user has only one region', async () => {
    // Mock the API call and return data that contains a property overviewData.
    fetchMock.get(apiCall, {
      overviewData,
      deliveryMethod: DELIVERY_METHOD_GRAPH_DATA,
      roleGraph: ROLE_GRAPH_DATA,
      rootCauseFeiGoalsGraph: ROOT_CAUSE_FEI_GOALS_DATA,
    });

    const u = {
      homeRegionId: 14,
      permissions: [{
        regionId: 2,
        scopeId: SCOPE_IDS.READ_ACTIVITY_REPORTS,
      }],
    };
    renderQADashboard(u);

    // Header
    expect(await screen.findByText('Quality assurance dashboard')).toBeVisible();

    const filters = await screen.findByRole('button', { name: 'open filters for this page' });

    act(() => {
      userEvent.click(filters);
    });

    const select = await screen.findByLabelText(/select a filter/i);

    // expect select not to have "region" as an option
    const option = select.querySelector('option[value="region"]');
    expect(option).toBeNull();
  });
});
