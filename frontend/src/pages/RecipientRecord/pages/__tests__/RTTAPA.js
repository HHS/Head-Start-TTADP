import React from 'react';
import {
  render, screen, act, waitFor,
} from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import fetchMock from 'fetch-mock';
import join from 'url-join';
import userEvent from '@testing-library/user-event';
import RTTAPA from '../RTTAPA';
import UserContext from '../../../../UserContext';
import { SCOPE_IDS } from '../../../../Constants';
import AppLoadingContext from '../../../../AppLoadingContext';

const rttapaUrl = join('/', 'api', 'rttapa');
const recipientGoalsUrl = join(
  'api',
  'recipient',
  '1',
  'region',
  '1',
  'goals',
  '?sortBy=goalName&sortDir=desc&offset=0&limit=false',
  '&goalIds=1&goalIds=2',
);

describe('RTTAPA', () => {
  const user = {
    name: 'test@test.com',
    homeRegionId: 1,
    permissions: [
      {
        scopeId: SCOPE_IDS.READ_WRITE_ACTIVITY_REPORTS,
        regionId: 1,
      },
    ],
  };

  const goalsResponse = {
    goalRows: [
      {
        id: 1,
        ids: [1],
        goalText: 'Goal 1',
        goalStatus: 'In Progress',
        createdOn: '2022-01-01',
        goalTopics: ['goo'],
        reasons: ['diffidence'],
        previousStatus: null,
        isRttapa: true,
        goalNumbers: ['G-1'],
        objectives: [{
          id: 1,
          title: 'Objective 1',
          activityReports: [],
          ttaProvdided: '',
          endDate: '2022-01-01',
          reasons: ['diffidence'],
          status: 'In Progress',
          grantNumbers: ['123sdfsdf'],
        }],
      },
      {
        id: 2,
        ids: [2],
        goalText: 'Goal 2',
        goalStatus: 'In Progress',
        createdOn: '2022-01-01',
        goalTopics: ['skullduggery'],
        goalNumbers: ['G-2'],
        reasons: ['diffidence', 'nihilism'],
        previousStatus: null,
        isRttapa: true,
        objectives: [{
          id: 2,
          title: 'Objective 1',
          activityReports: [],
          ttaProvdided: '',
          endDate: '2022-01-01',
          reasons: ['there is no reason'],
          status: 'In Progress',
          grantNumbers: ['asdfsdf'],
        }],
      },
    ],
  };

  const renderRttapa = () => {
    render(
      <MemoryRouter>
        <AppLoadingContext.Provider value={{ setIsAppLoading: () => {} }}>
          <UserContext.Provider value={{ user }}>
            <RTTAPA
              recipientId="1"
              regionId="1"
              recipientNameWithRegion="Test Recipient"
              location={{
                pathname: '/recipient/1/region/1/rttapa',
                search: '?goalId[]=1&goalId[]=2',
                hash: '',
              }}
            />
          </UserContext.Provider>
        </AppLoadingContext.Provider>
      </MemoryRouter>,
    );
  };

  afterEach(() => {
    fetchMock.restore();
  });

  it('renders the RTTAPA form', async () => {
    fetchMock.get(recipientGoalsUrl, goalsResponse);
    act(() => {
      renderRttapa();
    });

    await waitFor(() => {
      expect(screen.getByText('View goals')).toBeInTheDocument();
      expect(screen.getByText('(2)')).toBeInTheDocument();
    });
  });

  it('handles errors', async () => {
    fetchMock.get(recipientGoalsUrl, 500);
    act(() => {
      renderRttapa();
    });

    await waitFor(() => {
      expect(screen.getByText('There was an error fetching your goals')).toBeInTheDocument();
    });
  });

  it('handles submissions', async () => {
    fetchMock.get(recipientGoalsUrl, goalsResponse);

    act(() => {
      renderRttapa();
    });

    await waitFor(() => {
      expect(screen.getByText('View goals')).toBeInTheDocument();
      expect(screen.getByText('(2)')).toBeInTheDocument();
    });

    const reviewDate = await screen.findByRole('textbox', { name: /review date/i });
    act(() => {
      userEvent.type(reviewDate, '01/01/2023');
    });

    fetchMock.restore();
    expect(fetchMock.called()).toBe(false);
    fetchMock.post(rttapaUrl, {});
    act(() => {
      userEvent.click(screen.getByText('Submit RTTAPA'));
    });
    await waitFor(() => expect(fetchMock.called()).toBe(true));
  });

  it('handles submission errors', async () => {
    fetchMock.get(recipientGoalsUrl, goalsResponse);

    act(() => {
      renderRttapa();
    });

    await waitFor(() => {
      expect(screen.getByText('View goals')).toBeInTheDocument();
      expect(screen.getByText('(2)')).toBeInTheDocument();
    });

    const reviewDate = await screen.findByRole('textbox', { name: /review date/i });
    act(() => {
      userEvent.type(reviewDate, '01/01/2023');
    });

    fetchMock.restore();
    expect(fetchMock.called()).toBe(false);
    fetchMock.post(rttapaUrl, 500);
    act(() => {
      userEvent.click(screen.getByText('Submit RTTAPA'));
    });
    await waitFor(() => expect(fetchMock.called()).toBe(false));
  });

  it('you can remove a goal', async () => {
    fetchMock.get(recipientGoalsUrl, goalsResponse);

    act(() => {
      renderRttapa();
    });

    const viewGoalsButton = await screen.findByRole('button', { name: /view goals/i });
    act(() => {
      userEvent.click(viewGoalsButton);
    });

    const removeGoalButton = await screen.findByRole('button', { name: /remove goal 1/i });
    act(() => {
      userEvent.click(removeGoalButton);
    });

    await waitFor(() => {
      expect(screen.getByText('(1)')).toBeInTheDocument();
    });
  });

  it('you can\'t submit with no goals', async () => {
    fetchMock.get(recipientGoalsUrl, { goalRows: [] });

    act(() => {
      renderRttapa();
    });

    const reviewDate = await screen.findByRole('textbox', { name: /review date/i });
    act(() => {
      userEvent.type(reviewDate, '01/01/2023');
    });

    fetchMock.restore();
    expect(fetchMock.called()).toBe(false);
    fetchMock.post(rttapaUrl, {});
    act(() => {
      userEvent.click(screen.getByText('Submit RTTAPA'));
    });
    await waitFor(() => expect(fetchMock.called()).toBe(false));
  });
});
