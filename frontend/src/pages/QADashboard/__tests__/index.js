/* eslint-disable max-len */
import '@testing-library/jest-dom';
import React from 'react';
import moment from 'moment';
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
import MyGroupsProvider from '../../../components/MyGroupsProvider';

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

const todayMinus12Months = moment().subtract(12, 'months').format('YYYY/MM/DD');
const today = moment().format('YYYY/MM/DD');

// Convert todayMinus12Months to the format used in the API.
const combinedDates = `${encodeURIComponent(todayMinus12Months)}-${encodeURIComponent(today)}`;

const baseSsdiApi = '/api/ssdi/api/dashboards/qa/';
const noTtaApi = `${baseSsdiApi}no-tta.sql?region.in[]=1&region.in[]=2&startDate.win=${combinedDates}&dataSetSelection[]=no_tta_widget`;
const feiApi = `${baseSsdiApi}fei.sql?region.in[]=1&region.in[]=2&createDate.win=${combinedDates}&dataSetSelection[]=with_fei_widget&dataSetSelection[]=with_fei_graph`;
const dashboardApi = `${baseSsdiApi}dashboard.sql?region.in[]=1&region.in[]=2&startDate.win=${combinedDates}&dataSetSelection[]=delivery_method_graph&dataSetSelection[]=role_graph&dataSetSelection[]=activity_widget`;
const classApi = `${baseSsdiApi}class.sql?region.in[]=1&region.in[]=2&createDate.win=${combinedDates}&dataSetSelection[]=with_class_widget`;
const RECIPIENTS_WITH_NO_TTA_DATA = [
  {
    data_set: 'no_tta_widget',
    records: '1',
    data: [
      {
        total: 1460,
        'recipients without tta': 794,
        '% recipients without tta': 54.38,
      },
    ],
  },
];

const RECIPIENT_CLASS_DATA = [
  {
    data_set: 'with_class_widget',
    records: '1',
    data: [
      {
        total: 1550,
        'recipients with class': 283,
        '% recipients with class': 18.26,
      },
    ],
    active_filters: [
      'regionIds',
      'currentUserId',
    ],
  },
];

const DASHBOARD_DATA = [
  {
    data_set: 'role_graph',
    records: '8',
    data: [
      {
        role_name: 'TTAC',
        percentage: 0.06,
        role_count: 16,
      },
      {
        role_name: 'SS',
        percentage: 0.24,
        role_count: 66,
      },
      {
        role_name: 'HS',
        percentage: 6.82,
        role_count: 1876,
      },
    ],
  },
  {
    data_set: 'delivery_method_graph',
    records: '48',
    data: [
      {
        month: '2024-01-01',
        hybrid_count: 18,
        virtual_count: 613,
        in_person_count: 310,
        hybrid_percentage: 1.91,
        virtual_percentage: 65.14,
        in_person_percentage: 32.94,
      },
      {
        month: '2024-02-01',
        hybrid_count: 8,
        virtual_count: 581,
        in_person_count: 307,
        hybrid_percentage: 0.89,
        virtual_percentage: 64.84,
        in_person_percentage: 34.26,
      },
      {
        month: '2024-03-01',
        hybrid_count: 22,
        virtual_count: 619,
        in_person_count: 360,
        hybrid_percentage: 2.2,
        virtual_percentage: 61.84,
        in_person_percentage: 35.96,
      },
    ],
  },
  {
    data_set: 'activity_widget',
    records: '1',
    data: [
      {
        filtered_reports: 38462,
      },
    ],
  },
];

const ROOT_CAUSE_FEI_GOALS_DATA = [
  {
    data_set: 'with_fei_graph',
    record: '6',
    data: [
      {
        rootCause: 'Facilities',
        percentage: 9,
        response_count: 335,
      },
      {
        rootCause: 'Workforce',
        percentage: 46,
        response_count: 1656,
      },
      {
        rootCause: 'Community Partnerships',
        percentage: 8,
        response_count: 275,
      },
      {
        rootCause: 'Family Circumstances',
        percentage: 11,
        response_count: 391,
      },
      {
        rootCause: 'Other ECE Care Options',
        percentage: 18,
        response_count: 637,
      },
      {
        rootCause: 'Unavailable',
        percentage: 8,
        response_count: 295,
      },
    ],
    active_filters: [
      'regionIds',
      'currentUserId',
    ],
  },
  {
    data_set: 'with_fei_widget',
    records: '1',
    data: [
      {
        total: 1550,
        'recipients with fei': 858,
        '% recipients with fei': 55.35,
      },
    ],
    active_filters: [
      'regionIds',
      'currentUserId',
    ],
  },
];

describe('Resource Dashboard page', () => {
  beforeEach(() => {
    fetchMock.get('/api/groups', []);
    // Mock Recipients with no TTA data.
    fetchMock.get(noTtaApi, RECIPIENTS_WITH_NO_TTA_DATA);

    // Mock Recipients with OHS standard FEI goal data.
    fetchMock.get(feiApi, ROOT_CAUSE_FEI_GOALS_DATA);

    // Mock Recipients with OHS standard CLASS data.
    fetchMock.get(classApi, RECIPIENT_CLASS_DATA);

    // Mock Dashboard data.
    fetchMock.get(dashboardApi, DASHBOARD_DATA);
  });

  afterEach(() => fetchMock.restore());

  const renderQADashboard = (user = defaultUser) => {
    render(
      <MyGroupsProvider authenticated>
        <UserContext.Provider value={{ user }}>
          <AriaLiveContext.Provider value={{ announce: mockAnnounce }}>
            <Router history={history}>
              <QADashboard user={user} />
            </Router>
          </AriaLiveContext.Provider>
        </UserContext.Provider>
      </MyGroupsProvider>,
    );
  };

  it('renders correctly', async () => {
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
        expect(screen.getByText('54.38%')).toBeVisible();
        expect(screen.getByText('18.26%')).toBeVisible();
        expect(screen.getByText('55.35%')).toBeVisible();
      });
    });
  });

  it('removes region filter when user has only one region', async () => {
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

    const filters = await screen.findByRole('button', { name: /open filters for this page , 2 currently applied/i });

    act(() => {
      userEvent.click(filters);
    });

    // click the button 'Add new filter'.
    const addFilter = await screen.findByRole('button', { name: /add new filter/i });
    act(() => {
      userEvent.click(addFilter);
    });
    const select = screen.queryAllByLabelText(/select a filter/i)[2];

    // expect select not to have "region" as an option
    const option = select.querySelector('option[value="region"]');
    expect(option).toBeNull();
  });

  it('renders the graphs correctly if the records are null', async () => {
    fetchMock.restore();
    // Mock Recipients with no TTA data.
    fetchMock.get(noTtaApi, [
      {
        data_set: 'no_tta_widget',
        records: '1',
        data: [
          {
            total: 1460,
            'recipients without tta': 941,
            '% recipients without tta': null,
          },
        ],
      },
    ]);

    // Mock Recipients with OHS standard FEI goal data.
    fetchMock.get(feiApi, [
      {
        data_set: 'with_fei_graph',
        records: '6',
        data: [
          {
            rootCause: 'Facilities',
            percentage: 9,
            response_count: 335,
          },
          {
            rootCause: 'Workforce',
            percentage: 46,
            response_count: 1656,
          },
          {
            rootCause: 'Community Partnerships',
            percentage: 8,
            response_count: 275,
          },
          {
            rootCause: 'Family Circumstances',
            percentage: 11,
            response_count: 393,
          },
          {
            rootCause: 'Other ECE Care Options',
            percentage: 18,
            response_count: 639,
          },
          {
            rootCause: 'Unavailable',
            percentage: 8,
            response_count: 295,
          },
        ],
        active_filters: [
          'currentUserId',
        ],
      },
      {
        data_set: 'with_fei_widget',
        records: '1',
        data: [
          {
            total: 1550,
            'grants with fei': 1042,
            'recipients with fei': 858,
            '% recipients with fei': null,
          },
        ],
        active_filters: [
          'currentUserId',
        ],
      },
    ]);

    // Mock Recipients with OHS standard CLASS data.
    fetchMock.get(classApi, [
      {
        data_set: 'with_class_widget',
        records: '1',
        data: [
          {
            total: 1550,
            'grants with class': 327,
            'recipients with class': 267,
            '% recipients with class': null,
          },
        ],
        active_filters: [
          'currentUserId',
        ],
      },
    ]);

    // Mock Dashboard data.
    fetchMock.get(dashboardApi, [
      {
        data_set: 'activity_widget',
        records: '1',
        data: [
          {
            filtered_reports: 38462,
          },
        ],
      },
      {
        data_set: 'role_graph',
        records: '0',
        data: null,
      },
      {
        data_set: 'delivery_method_graph',
        records: '1',
        data: [
          {
            month: 'Total',
            hybrid_count: null,
            virtual_count: null,
            in_person_count: null,
            hybrid_percentage: 0,
            virtual_percentage: 0,
            in_person_percentage: 0,
          },
        ],
      },
    ]);
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
        expect(screen.getByText('Delivery method')).toBeVisible();
        expect(screen.getByText('Percentage of activity reports by role')).toBeVisible();
        expect(screen.getByText('Root cause on FEI goals')).toBeVisible();
      });
    });
  });

  it('renders the graphs correctly with empty data', async () => {
    fetchMock.restore();
    // Mock Recipients with no TTA data.
    fetchMock.get(noTtaApi, [
      {
        data_set: 'no_tta_widget',
        records: '1',
        data: [],
      },
    ]);

    // Mock Recipients with OHS standard FEI goal data.
    fetchMock.get(feiApi, [
      {
        data_set: 'with_fei_graph',
        records: '6',
        data: [
          {
            rootCause: 'Facilities',
            percentage: 9,
            response_count: 335,
          },
          {
            rootCause: 'Workforce',
            percentage: 46,
            response_count: 1656,
          },
          {
            rootCause: 'Community Partnerships',
            percentage: 8,
            response_count: 275,
          },
          {
            rootCause: 'Family Circumstances',
            percentage: 11,
            response_count: 393,
          },
          {
            rootCause: 'Other ECE Care Options',
            percentage: 18,
            response_count: 639,
          },
          {
            rootCause: 'Unavailable',
            percentage: 8,
            response_count: 295,
          },
        ],
        active_filters: [
          'currentUserId',
        ],
      },
      {
        data_set: 'with_fei_widget',
        records: '1',
        data: [],
        active_filters: [
          'currentUserId',
        ],
      },
    ]);

    // Mock Recipients with OHS standard CLASS data.
    fetchMock.get(classApi, [
      {
        data_set: 'with_class_widget',
        records: '1',
        data: [],
        active_filters: [
          'currentUserId',
        ],
      },
    ]);

    // Mock Dashboard data.
    fetchMock.get(dashboardApi, [
      {
        data_set: 'role_graph',
        records: '0',
        data: null,
      },
      {
        data_set: 'delivery_method_graph',
        records: '1',
        data: [
          {
            month: 'Total',
            hybrid_count: null,
            virtual_count: null,
            in_person_count: null,
            hybrid_percentage: 0,
            virtual_percentage: 0,
            in_person_percentage: 0,
          },
        ],
      },
      {
        data_set: 'activity_widget',
        records: '1',
        data: [
          {
            filtered_reports: 38462,
          },
        ],
      },
    ]);
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
        expect(screen.getByText('Delivery method')).toBeVisible();
        expect(screen.getByText('Percentage of activity reports by role')).toBeVisible();
        expect(screen.getByText('Root cause on FEI goals')).toBeVisible();
      });
    });
  });
});
