import React from 'react';
import {
  render, screen, act, waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import join from 'url-join';
import { Router } from 'react-router';
import { createMemoryHistory } from 'history';
import fetchMock from 'fetch-mock';
import { SCOPE_IDS, SUPPORT_TYPES } from '@ttahub/common';
import TrainingReports, { evaluateMessageFromHistory } from '../index';
import UserContext from '../../../UserContext';
import AppLoadingContext from '../../../AppLoadingContext';
import { EVENT_STATUS } from '../constants';
import AriaLiveContext from '../../../AriaLiveContext';

const mockAnnounce = jest.fn();

const notStartedEvents = [{
  id: 1,
  ownerId: 1,
  collaboratorIds: [],
  pocIds: [],
  data: {
    eventName: 'Not started event 1',
    eventId: '-1',
    eventOrganizer: 'Not started event organizer 1',
    reasons: ['New Program/Option', ' New Staff/Turnover', 'Ongoing Quality Improvement', 'School Readiness Goals', 'Emergent Needs'],
    startDate: '01/02/2021',
    endDate: '01/03/2021',
    status: 'Not started',
  },
  sessionReports: [],
},
{
  id: 2,
  ownerId: 1,
  collaboratorIds: [],
  pocIds: [],
  data: {
    eventName: 'Not started event 2',
    eventId: '-2',
    eventOrganizer: 'Not started event organizer 2',
    startDate: '02/02/2021',
    endDate: '02/03/2021',
    status: 'Not started',
  },
  sessionReports: [],
},
];

const inProgressEvents = [{
  id: 3,
  ownerId: 999,
  collaboratorIds: [1],
  pocIds: [],
  regionId: 2,
  data: {
    eventName: 'In progress event 1',
    eventId: '-3',
    eventOrganizer: 'In progress event organizer 1',
    reasons: ['Emergent Needs'],
    startDate: '03/02/2021',
    endDate: '03/03/2021',
  },
  sessionReports: [{
    id: 1,
    eventId: 3,
    regionId: 2,
    approverId: 999,
    data: {
      regionId: 2,
      sessionName: 'This is my session title',
      startDate: '01/02/2021',
      endDate: '01/03/2021',
      objective: 'This is my session objective',
      objectiveSupportType: SUPPORT_TYPES[2],
      objectiveTopics: ['Topic 1', 'Topic 2'],
      objectiveTrainers: ['Trainer 1', 'Trainer 2'],
      status: 'In progress',
      pocComplete: false,
      collabComplete: false,
      submitted: false,
      facilitation: 'national_centers',
    },
  }],
}];

const completeEvents = [{
  id: 4,
  ownerId: 1,
  collaboratorIds: [],
  pocIds: [],
  data: {
    eventName: 'Complete event 1',
    eventId: '-4',
    eventOrganizer: 'Complete event organizer 1',
    reasons: ['New Staff/Turnover'],
    startDate: '04/02/2021',
    endDate: '04/03/2021',
  },
  sessionReports: [],
},
];

const suspendedEvents = [{
  id: 5,
  ownerId: 1,
  collaboratorIds: [],
  pocIds: [],
  data: {
    eventName: 'suspended event 1',
    eventId: '-5',
    eventOrganizer: 'suspended event organizer 1',
    reasons: ['New Staff/Turnover'],
    startDate: '05/02/2021',
    endDate: '05/03/2021',
  },
  sessionReports: [],
},
];

const history = createMemoryHistory();
const eventUrl = join('api', 'events');

describe('TrainingReports', () => {
  const nonCentralOfficeUser = {
    id: 1,
    homeRegionId: 1,
    permissions: [{
      regionId: 2,
      scopeId: SCOPE_IDS.READ_WRITE_TRAINING_REPORTS,
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

  // Not started.
  const notStartedUrl = join(eventUrl, `/${EVENT_STATUS.NOT_STARTED}?region.in[]=2`);

  beforeEach(async () => {
    fetchMock.get(notStartedUrl, notStartedEvents);

    // In progress.
    const inProgressUrl = join(eventUrl, `/${EVENT_STATUS.IN_PROGRESS}?region.in[]=2`);
    fetchMock.get(inProgressUrl, inProgressEvents);

    // Complete.
    const completeUrl = join(eventUrl, `/${EVENT_STATUS.COMPLETE}?region.in[]=2`);
    fetchMock.get(completeUrl, completeEvents);

    // Suspended.
    const suspendedUrl = join(eventUrl, `/${EVENT_STATUS.SUSPENDED}?region.in[]=2`);
    fetchMock.get(suspendedUrl, suspendedEvents);
  });

  afterEach(async () => {
    fetchMock.restore();
  });

  describe('delete an event', () => {
    beforeEach(async () => {
      act(() => {
        renderTrainingReports({
          ...nonCentralOfficeUser,
          permissions: [
            {
              regionId: 2,
              scopeId: SCOPE_IDS.READ_WRITE_TRAINING_REPORTS,
            },
            {
              regionId: 2,
              scopeId: SCOPE_IDS.ADMIN,
            },
          ],
        }, EVENT_STATUS.NOT_STARTED);

        fetchMock.get(notStartedUrl, [{ ...notStartedEvents[0] }], { overwriteRoutes: true });
      });

      await act(async () => {
        const button = await screen.findByRole('button', { name: /actions for event -1/i });
        userEvent.click(button);
      });
    });

    afterEach(() => {
      fetchMock.restore();
    });

    it('handles success', async () => {
      fetchMock.delete('/api/events/id/1', { message: 'Success!' });
      expect(await screen.findByText('Not started event 1')).toBeInTheDocument();

      await act(async () => {
        const deleteButtons = screen.queryAllByRole('button', { name: /delete event/i });
        userEvent.click(deleteButtons[0]);
      });

      await waitFor(() => expect(screen.getByText('Are you sure you want to delete this event?')).toBeInTheDocument());

      await act(async () => {
        const confirmButton = await screen.findByRole('button', { name: /delete event/i, hidden: true });
        userEvent.click(confirmButton);
      });

      expect(screen.queryByText('Not started event 1')).toBeNull();
    });

    it('handles failure', async () => {
      fetchMock.delete('/api/events/id/1', 500);
      expect(await screen.findByText('Not started event 1')).toBeInTheDocument();
      await act(async () => {
        const deleteButtons = screen.queryAllByRole('button', { name: /delete event/i });
        userEvent.click(deleteButtons[0]);
      });

      await waitFor(() => expect(screen.getByText('Are you sure you want to delete this event?')).toBeInTheDocument());

      await act(async () => {
        const confirmButton = await screen.findByRole('button', { name: /delete event/i, hidden: true });
        userEvent.click(confirmButton);
      });

      expect(await screen.findByText('Not started event 1')).toBeInTheDocument();
    });
  });

  it('renders the training reports page', async () => {
    act(() => {
      renderTrainingReports();
    });
    expect(await screen.findByRole('heading', { name: /Training reports/i })).toBeInTheDocument();
  });

  it('renders user without a home region', async () => {
    const noHomeRegionUser = {
      id: 1,
      homeRegionId: null,
      permissions: [{
        regionId: 2,
        scopeId: SCOPE_IDS.READ_ACTIVITY_REPORTS,
      }],
    };

    act(() => {
      renderTrainingReports(noHomeRegionUser);
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
    expect(await screen.findByText(/-1/i)).toBeInTheDocument();
    expect(await screen.findByText(/not started event organizer 1/i)).toBeInTheDocument();
    expect(await screen.findByText('01/02/2021')).toBeInTheDocument();
    expect(await screen.findByText('01/03/2021')).toBeInTheDocument();

    // Not started event 2.
    expect(await screen.findByText(/not started event 2/i)).toBeInTheDocument();
    expect(await screen.findByText(/-2/i)).toBeInTheDocument();
    expect(await screen.findByText(/not started event organizer 2/i)).toBeInTheDocument();
    expect(await screen.findByText('02/02/2021')).toBeInTheDocument();
    expect(await screen.findByText('02/03/2021')).toBeInTheDocument();
  });

  describe('delete a session', () => {
    beforeEach(async () => {
      act(() => {
        renderTrainingReports(nonCentralOfficeUser, EVENT_STATUS.IN_PROGRESS);
      });

      await act(async () => {
        const button = await screen.findByRole('button', { name: /sessions for event/i });
        userEvent.click(button);
      });
    });

    afterEach(() => {
      fetchMock.restore();
    });

    it('handles success', async () => {
      fetchMock.delete('/api/session-reports/id/1', { message: 'Success!' });
      expect(await screen.findByText('This is my session title')).toBeInTheDocument();
      const hideSession = await screen.findByRole('button', { name: /hide sessions for event/i });
      expect(hideSession).toBeInTheDocument();

      await act(async () => {
        const deleteButton = await screen.findByRole('button', { name: 'Delete session' });
        userEvent.click(deleteButton);
      });

      await waitFor(() => expect(screen.getByText('Are you sure you want to delete this session?')).toBeInTheDocument());

      await act(async () => {
        const confirmButton = await screen.findByRole('button', { name: 'Delete' });
        userEvent.click(confirmButton);
      });

      expect(screen.queryByText('This is my session title')).toBeNull();
    });

    it('handles failure', async () => {
      fetchMock.delete('/api/session-reports/id/1', 500);
      expect(await screen.findByText('This is my session title')).toBeInTheDocument();
      const hideSession = await screen.findByRole('button', { name: /hide sessions for event/i });
      expect(hideSession).toBeInTheDocument();

      await act(async () => {
        const deleteButton = await screen.findByRole('button', { name: 'Delete session' });
        userEvent.click(deleteButton);
      });

      await waitFor(() => expect(screen.getByText('Are you sure you want to delete this session?')).toBeInTheDocument());

      await act(async () => {
        const confirmButton = await screen.findByRole('button', { name: 'Delete' });
        userEvent.click(confirmButton);
      });

      expect(await screen.findByText('This is my session title')).toBeInTheDocument();
    });
  });

  it('renders the in progress events tab', async () => {
    act(() => {
      renderTrainingReports(nonCentralOfficeUser, EVENT_STATUS.IN_PROGRESS);
    });
    // In progress event 1.
    expect(await screen.findByRole('heading', { name: /Training reports/i })).toBeInTheDocument();
    expect(await screen.findByText(/in progress event 1/i)).toBeInTheDocument();
    expect(await screen.findByText(/-3/i)).toBeInTheDocument();
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
    expect(await screen.findByText(/-4/i)).toBeInTheDocument();
    expect(await screen.findByText(/complete event organizer 1/i)).toBeInTheDocument();
    expect(await screen.findByText('04/02/2021')).toBeInTheDocument();
    expect(await screen.findByText('04/03/2021')).toBeInTheDocument();
  });

  it('renders the suspended events tab', async () => {
    act(() => {
      renderTrainingReports(nonCentralOfficeUser, EVENT_STATUS.SUSPENDED);
    });

    expect(await screen.findByRole('heading', { name: /Training reports/i })).toBeInTheDocument();
    expect(await screen.findByText(/suspended event 1/i)).toBeInTheDocument();
    expect(await screen.findByText(/-5/i)).toBeInTheDocument();
    expect(await screen.findByText(/suspended event organizer 1/i)).toBeInTheDocument();
    expect(await screen.findByText('05/02/2021')).toBeInTheDocument();
    expect(await screen.findByText('05/03/2021')).toBeInTheDocument();
  });

  it('renders the header with one region', async () => {
    act(() => {
      renderTrainingReports();
    });
    expect(await screen.findByRole('heading', { name: /training reports - region 1/i })).toBeInTheDocument();
  });

  it('renders the header with all regions', async () => {
    const centralOfficeUser = {
      id: 1,
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

  // Filters.
  it('correctly renders data based on filters', async () => {
    const user = {
      id: 1,
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

  describe('evaluateMessageFromHistory', () => {
    it('returns null when history has no state', () => {
      const mockHistory = {
        location: {},
      };

      const result = evaluateMessageFromHistory(mockHistory);

      expect(result).toBeNull();
    });

    it('returns null when state exists but message is missing', () => {
      const mockHistory = {
        location: {
          state: {},
        },
      };

      const result = evaluateMessageFromHistory(mockHistory);

      expect(result).toBeNull();
    });

    it('returns null when message exists but eventId is missing', () => {
      const mockHistory = {
        location: {
          state: {
            message: {
              dateStr: '12/18/2025 at 3:30 pm EST',
            },
          },
        },
      };

      const result = evaluateMessageFromHistory(mockHistory);

      expect(result).toBeNull();
    });

    it('returns null when message has empty eventId', () => {
      const mockHistory = {
        location: {
          state: {
            message: {
              eventId: '',
              dateStr: '12/18/2025 at 3:30 pm EST',
            },
          },
        },
      };

      const result = evaluateMessageFromHistory(mockHistory);

      expect(result).toBeNull();
    });

    it('returns session message when isSession is true', () => {
      const mockHistory = {
        location: {
          state: {
            message: {
              isSession: true,
              sessionName: 'My Session',
              eventId: 'R01-PD-1234',
              dateStr: '12/18/2025 at 3:30 pm EST',
            },
          },
        },
      };

      const result = evaluateMessageFromHistory(mockHistory);

      const testHistory = createMemoryHistory();
      render(
        <Router history={testHistory}>
          {result}
        </Router>,
      );

      expect(screen.getByText(/Your review for session/)).toBeInTheDocument();
      expect(screen.getByText(/My Session/)).toBeInTheDocument();
      expect(screen.getByText(/of Training Event/)).toBeInTheDocument();
      expect(screen.getByText('R01-PD-1234')).toBeInTheDocument();
      expect(screen.getByText(/was submitted on/)).toBeInTheDocument();
      expect(screen.getByText(/12\/18\/2025 at 3:30 pm EST/)).toBeInTheDocument();

      // Verify link points to correct view page
      const link = screen.getByRole('link', { name: 'R01-PD-1234' });
      expect(link).toHaveAttribute('href', '/training-report/view/1234');
    });

    it('returns event message when isSession is false or undefined', () => {
      const mockHistory = {
        location: {
          state: {
            message: {
              eventId: 'R02-PD-5678',
              dateStr: '12/18/2025 at 4:00 pm EST',
            },
          },
        },
      };

      const result = evaluateMessageFromHistory(mockHistory);

      const testHistory = createMemoryHistory();
      render(
        <Router history={testHistory}>
          {result}
        </Router>,
      );

      expect(screen.getByText(/You submitted Training Event/)).toBeInTheDocument();
      expect(screen.getByText('R02-PD-5678')).toBeInTheDocument();
      expect(screen.getByText(/on/)).toBeInTheDocument();
      expect(screen.getByText(/12\/18\/2025 at 4:00 pm EST/)).toBeInTheDocument();

      // Verify link points to correct view page
      const link = screen.getByRole('link', { name: 'R02-PD-5678' });
      expect(link).toHaveAttribute('href', '/training-report/view/5678');
    });

    it('handles eventId with different format correctly', () => {
      const mockHistory = {
        location: {
          state: {
            message: {
              eventId: 'R14-PD-99-9999',
              dateStr: '12/18/2025 at 5:00 pm EST',
            },
          },
        },
      };

      const result = evaluateMessageFromHistory(mockHistory);

      const testHistory = createMemoryHistory();
      render(
        <Router history={testHistory}>
          {result}
        </Router>,
      );

      // The link extracts last segment after split
      const link = screen.getByRole('link', { name: 'R14-PD-99-9999' });
      expect(link).toHaveAttribute('href', '/training-report/view/9999');
    });
  });
});
