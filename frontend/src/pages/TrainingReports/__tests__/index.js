import React from 'react';
import {
  render, screen, act, fireEvent, waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import join from 'url-join';
import { Router, MemoryRouter } from 'react-router';
import { createMemoryHistory } from 'history';
import fetchMock from 'fetch-mock';
import { SCOPE_IDS } from '@ttahub/common';
import TrainingReports from '../index';
import UserContext from '../../../UserContext';
import AppLoadingContext from '../../../AppLoadingContext';
import { EVENT_STATUS } from '../constants';
import AriaLiveContext from '../../../AriaLiveContext';

const mockAnnounce = jest.fn();

const notStartedEvents = [{
  id: 1,
  data: {
    eventName: 'Not started event 1',
    eventId: 'Not started event ID 1',
    eventOrganizer: 'Not started event organizer 1',
    reasons: ['New Program/Option', ' New Staff/Turnover', 'Ongoing Quality Improvement', 'School Readiness Goals', 'Emergent Needs'],
    startDate: '01/02/2021',
    endDate: '01/03/2021',
  },
},
{
  id: 2,
  data: {
    eventName: 'Not started event 2',
    eventId: 'Not started event ID 2',
    eventOrganizer: 'Not started event organizer 2',
    startDate: '02/02/2021',
    endDate: '02/03/2021',
  },
},
];

const inProgressEvents = [{
  id: 3,
  data: {
    eventName: 'In progress event 1',
    eventId: 'In progress event ID 1',
    eventOrganizer: 'In progress event organizer 1',
    reasons: ['Emergent Needs'],
    startDate: '03/02/2021',
    endDate: '03/03/2021',
  },
},
];

const completeEvents = [{
  id: 4,
  data: {
    eventName: 'Complete event 1',
    eventId: 'Complete event ID 1',
    eventOrganizer: 'Complete event organizer 1',
    reasons: ['New Staff/Turnover'],
    startDate: '04/02/2021',
    endDate: '04/03/2021',
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
        <AriaLiveContext.Provider value={{ announce: mockAnnounce }}>
          <UserContext.Provider value={{ user }}>
            <AppLoadingContext.Provider value={
            {
              setIsAppLoading: jest.fn(),
              setAppLoadingText: jest.fn(),
              isAppLoading: false,
            }
          }
            >
              <TrainingReports match={{ params: { status: passedStatus }, path: '', url: '' }} />
            </AppLoadingContext.Provider>
          </UserContext.Provider>
        </AriaLiveContext.Provider>
      </Router>,
    );
  };

  beforeEach(async () => {
    // Not started.
    const notStartedUrl = join(eventUrl, `/${EVENT_STATUS.NOT_STARTED}?region.in[]=2`);
    fetchMock.get(notStartedUrl, notStartedEvents);

    // In progress.
    const inProgressUrl = join(eventUrl, `/${EVENT_STATUS.IN_PROGRESS}?region.in[]=2`);
    fetchMock.get(inProgressUrl, inProgressEvents);

    // Complete.
    const completeUrl = join(eventUrl, `/${EVENT_STATUS.COMPLETE}?region.in[]=2`);
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

  it('renders user without a home region', async () => {
    const noHomneRegionUser = {
      homeRegionId: null,
      permissions: [{
        regionId: 2,
        scopeId: SCOPE_IDS.READ_ACTIVITY_REPORTS,
      }],
    };

    act(() => {
      renderTrainingReports(noHomneRegionUser);
    });

    expect(await screen.findByRole('heading', { name: /Training reports/i })).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: /training reports - region 2/i })).toBeInTheDocument();
  });

  it('renders user without a region', async () => {
    const noRegionUser = {
      homeRegionId: null,
    };

    act(() => {
      renderTrainingReports(noRegionUser);
    });

    expect(await screen.findByRole('heading', { name: /training reports -/i, hidden: true })).toBeInTheDocument();
  });

  it('renders the error message', async () => {
    // getEventsByStatus throws an error message.
    fetchMock.get(join(eventUrl, `/${EVENT_STATUS.NOT_STARTED}?region.in[]=2`), 500, { overwriteRoutes: true });

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

    expect(await screen.findByText(/you successfully tested training report on today/i)).toBeVisible();
    const alertButton = await screen.findByLabelText(/dismiss alert/i);
    expect(alertButton).toBeVisible();

    fireEvent.click(alertButton);

    await waitFor(() => {
      expect(screen.queryByText(/you successfully tested training report R04-PD-23-1123 on today/i)).not.toBeInTheDocument();
    });
  });

  // Filters.
  it('correctly renders data based on filters', async () => {
    const user = {
      homeRegionId: 14,
      permissions: [{
        regionId: 1,
        scopeId: SCOPE_IDS.READ_ACTIVITY_REPORTS,
      }, {
        regionId: 2,
        scopeId: SCOPE_IDS.READ_ACTIVITY_REPORTS,
      }],
    };

    // Initial Page Load.
    // api/events/not-started?region.in[]=1&region.in[]=2
    const initialUrl = join(eventUrl, `/${EVENT_STATUS.NOT_STARTED}?region.in[]=1&region.in[]=2`);
    fetchMock.get(initialUrl, notStartedEvents);

    // Only Region 1.
    const region1Url = join(eventUrl, `/${EVENT_STATUS.NOT_STARTED}?region.in[]=1`);
    fetchMock.get(region1Url, [notStartedEvents[1]]);

    // Render Training Reports.
    renderTrainingReports(user);

    // Assert initial data.
    expect(await screen.findByRole('heading', { name: /training reports - all regions/i })).toBeInTheDocument();
    expect(await screen.findByText(/not started event 1/i)).toBeInTheDocument();
    expect(await screen.findByText(/not started event 2/i)).toBeInTheDocument();

    // Open filters menu.
    const open = await screen.findByRole('button', { name: /open filters for this page/i });
    act(() => userEvent.click(open));

    // Change first filter to Region 1.
    const [lastTopic] = Array.from(document.querySelectorAll('[name="topic"]')).slice(-1);
    act(() => userEvent.selectOptions(lastTopic, 'region'));

    const [lastCondition] = Array.from(document.querySelectorAll('[name="condition"]')).slice(-1);
    act(() => userEvent.selectOptions(lastCondition, 'is'));

    const select = await screen.findByRole('combobox', { name: 'Select region to filter by' });
    act(() => userEvent.selectOptions(select, 'Region 1'));

    // Apply filter menu with Region 1 filter.
    const apply = await screen.findByRole('button', { name: /apply filters for training reports/i });
    act(() => userEvent.click(apply));

    // Verify page render after apply.
    expect(await screen.findByText(/training reports/i)).toBeVisible();
    expect(await screen.findByText(/not started event 2/i)).toBeInTheDocument();
    expect(screen.queryAllByText(/not started event 1/i).length).toBe(0);

    // Remove Region 1 filter pill.
    const removeRegion = await screen.findByRole('button', { name: /this button removes the filter: region is 1/i });
    act(() => userEvent.click(removeRegion));

    expect(await screen.findByText(/training reports/i)).toBeVisible();
    expect(await screen.findByText(/not started event 1/i)).toBeInTheDocument();
    expect(await screen.findByText(/not started event 2/i)).toBeInTheDocument();
  });
});
