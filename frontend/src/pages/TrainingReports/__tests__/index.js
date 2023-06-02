import React from 'react';
import {
  render, screen, act, fireEvent, waitFor,
} from '@testing-library/react';
import join from 'url-join';
import { Router, MemoryRouter } from 'react-router';
import { createMemoryHistory } from 'history';
import fetchMock from 'fetch-mock';
import { SCOPE_IDS } from '@ttahub/common';
import TrainingReports from '../index';
import UserContext from '../../../UserContext';
import AppLoadingContext from '../../../AppLoadingContext';
import { EVENT_STATUS } from '../constants';

const notStartedEvents = [{
  id: 1,
  data: {
    'Edit Title': 'Not started event 1',
    'Event ID': 'Not started event ID 1',
    'Event Organizer - Type of Event': 'Not started event organizer 1',
    'Reason for Activity': 'New Program/Option\nNew Staff/Turnover\nOngoing Quality Improvement\nSchool Readiness Goals\nEmergent Needs',
    startDate: '2021-01-02',
    endDate: '2021-01-03',
  },
},
{
  id: 2,
  data: {
    'Edit Title': 'Not started event 2',
    'Event ID': 'Not started event ID 2',
    'Event Organizer - Type of Event': 'Not started event organizer 2',
    startDate: '2021-02-02',
    endDate: '2021-02-03',
  },
},
];

const inProgressEvents = [{
  id: 3,
  data: {
    'Edit Title': 'In progress event 1',
    'Event ID': 'In progress event ID 1',
    'Event Organizer - Type of Event': 'In progress event organizer 1',
    'Reason for Activity': 'Emergent Needs',
    startDate: '2021-03-02',
    endDate: '2021-03-03',
  },
},
];

const completeEvents = [{
  id: 4,
  data: {
    'Edit Title': 'Complete event 1',
    'Event ID': 'Complete event ID 1',
    'Event Organizer - Type of Event': 'Complete event organizer 1',
    'Reason for Activity': 'New Staff/Turnover',
    startDate: '2021-04-02',
    endDate: '2021-04-03',
  },
},
];

const history = createMemoryHistory();
const eventUrl = join('api', 'events');

describe('TrainingReports', () => {
  const nonCentralOfficeUser = {
    homeRegionId: 1,
    permissions: [{
      regionId: 2,
      scopeId: SCOPE_IDS.READ_ACTIVITY_REPORTS,
    }],
  };

  const renderTrainingReports = (u, passedStatus = EVENT_STATUS.NOT_STARTED) => {
    const user = u || nonCentralOfficeUser;
    render(
      <Router history={history}>
        <UserContext.Provider value={{ user }}>
          <AppLoadingContext.Provider value={
            {
              setIsAppLoading: jest.fn(),
              setAppLoadingText: jest.fn(),
              isAppLoading: false,
            }
          }
          >
            <TrainingReports match={{ params: { status: passedStatus } }} />
          </AppLoadingContext.Provider>
        </UserContext.Provider>
      </Router>,
    );
  };

  beforeEach(async () => {
    // Not started.
    const notStartedUrl = join(eventUrl, `/${EVENT_STATUS.NOT_STARTED}`);
    fetchMock.get(notStartedUrl, notStartedEvents);

    // In progress.
    const inProgressUrl = join(eventUrl, `/${EVENT_STATUS.IN_PROGRESS}`);
    fetchMock.get(inProgressUrl, inProgressEvents);

    // Complete.
    const completeUrl = join(eventUrl, `/${EVENT_STATUS.COMPLETE}`);
    fetchMock.get(completeUrl, completeEvents);
  });

  afterEach(async () => {
    fetchMock.restore();
  });

  it('renders the training reports page', async () => {
    act(() => {
      renderTrainingReports();
    });
    expect(await screen.findByRole('heading', { name: /Training reports/i })).toBeInTheDocument();
  });

  it('renders the error message', async () => {
    // getEventsByStatus throws an error message.
    fetchMock.get(join(eventUrl, `/${EVENT_STATUS.NOT_STARTED}`), 500, { overwriteRoutes: true });

    act(() => {
      renderTrainingReports();
    });
    expect(await screen.findByText(/Unable to fetch events/i)).toBeInTheDocument();
  });

  it('renders the not started tab', async () => {
    act(() => {
      renderTrainingReports(nonCentralOfficeUser, EVENT_STATUS.NOT_STARTED);
    });
    // Not started event 1.
    expect(await screen.findByRole('heading', { name: /Training reports/i })).toBeInTheDocument();
    expect(await screen.findByText(/not started event 1/i)).toBeInTheDocument();
    expect(await screen.findByText(/not started event ID 1/i)).toBeInTheDocument();
    expect(await screen.findByText(/not started event organizer 1/i)).toBeInTheDocument();
    expect(await screen.findByText('01/02/2021')).toBeInTheDocument();
    expect(await screen.findByText('01/03/2021')).toBeInTheDocument();

    // Not started event 2.
    expect(await screen.findByText(/not started event 2/i)).toBeInTheDocument();
    expect(await screen.findByText(/not started event ID 2/i)).toBeInTheDocument();
    expect(await screen.findByText(/not started event organizer 2/i)).toBeInTheDocument();
    expect(await screen.findByText('02/02/2021')).toBeInTheDocument();
    expect(await screen.findByText('02/03/2021')).toBeInTheDocument();
  });

  it('renders the in progress events tab', async () => {
    act(() => {
      renderTrainingReports(nonCentralOfficeUser, EVENT_STATUS.IN_PROGRESS);
    });
    // In progress event 1.
    expect(await screen.findByRole('heading', { name: /Training reports/i })).toBeInTheDocument();
    expect(await screen.findByText(/in progress event 1/i)).toBeInTheDocument();
    expect(await screen.findByText(/in progress event ID 1/i)).toBeInTheDocument();
    expect(await screen.findByText(/in progress event organizer 1/i)).toBeInTheDocument();
    expect(await screen.findByText('03/02/2021')).toBeInTheDocument();
    expect(await screen.findByText('03/03/2021')).toBeInTheDocument();
  });

  it('renders the complete events tab', async () => {
    act(() => {
      renderTrainingReports(nonCentralOfficeUser, EVENT_STATUS.COMPLETE);
    });
    // In complete event 1.
    expect(await screen.findByRole('heading', { name: /Training reports/i })).toBeInTheDocument();
    expect(await screen.findByText(/complete event 1/i)).toBeInTheDocument();
    expect(await screen.findByText(/complete event ID 1/i)).toBeInTheDocument();
    expect(await screen.findByText(/complete event organizer 1/i)).toBeInTheDocument();
    expect(await screen.findByText('04/02/2021')).toBeInTheDocument();
    expect(await screen.findByText('04/03/2021')).toBeInTheDocument();
  });

  it('renders the header with one region', async () => {
    act(() => {
      renderTrainingReports();
    });
    expect(await screen.findByRole('heading', { name: /training reports - region 1/i })).toBeInTheDocument();
  });

  it('renders the header with all regions', async () => {
    const centralOfficeUser = {
      homeRegionId: 14,
      permissions: [{
        regionId: 2,
        scopeId: SCOPE_IDS.READ_ACTIVITY_REPORTS,
      }],
    };
    act(() => {
      renderTrainingReports(centralOfficeUser);
    });
    expect(await screen.findByRole('heading', { name: /training reports - all regions/i })).toBeInTheDocument();
  });

  test('displays a message', async () => {
    const user = {
      name: 'test@test.com',
      homeRegionId: 1,
      permissions: [
        {
          scopeId: 3,
          regionId: 1,
        },
      ],
    };
    const message = {
      status: 'TESTED',
      displayId: 'R04-PD-23-1123',
      time: 'today',
    };

    const pastLocations = [
      { pathname: '/training-reports/not-started', state: { message } },
    ];

    render(
      <MemoryRouter initialEntries={pastLocations}>
        <UserContext.Provider value={{ user }}>
          <AppLoadingContext.Provider value={
            {
              setIsAppLoading: jest.fn(),
              setAppLoadingText: jest.fn(),
              isAppLoading: false,
            }
          }
          >
            <TrainingReports match={{ params: { status: EVENT_STATUS.NOT_STARTED } }} />
          </AppLoadingContext.Provider>
        </UserContext.Provider>
      </MemoryRouter>,
    );

    const alert = await screen.findByRole('alert');
    expect(alert).toBeVisible();

    const alertButton = await screen.findByLabelText(/dismiss alert/i);
    expect(alertButton).toBeVisible();

    fireEvent.click(alertButton);

    await waitFor(() => {
      expect(screen.queryByText(/you successfully tested training report R04-PD-23-1123 on today/i)).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/dismiss alert/i)).not.toBeInTheDocument();
    });
  });
});
