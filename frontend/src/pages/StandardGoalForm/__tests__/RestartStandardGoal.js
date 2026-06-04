import '@testing-library/jest-dom';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GOAL_STATUS } from '@ttahub/common';
import fetchMock from 'fetch-mock';
import { createMemoryHistory } from 'history';
import React from 'react';
import { Router } from 'react-router-dom';
import join from 'url-join';
import AppLoadingContext from '../../../AppLoadingContext';
import { HTTPError } from '../../../fetchers';
import * as standardGoalsFetchers from '../../../fetchers/standardGoals';
import RestartStandardGoal from '../RestartStandardGoal';

const mockGoalTemplatePrompts = [[], []];

jest.mock('../../../hooks/useGoalTemplatePrompts', () => ({
  __esModule: true,
  default: jest.fn(() => mockGoalTemplatePrompts),
}));

jest.mock('react-router', () => ({
  ...jest.requireActual('react-router'),
  useParams: () => ({
    regionId: '1',
    goalTemplateId: '1',
    grantId: '1',
  }),
}));

const mockRecipient = {
  id: 1,
  name: 'Test Recipient',
  grants: [
    {
      id: 1,
      numberWithProgramTypes: 'Grant-123',
      status: 'Active',
    },
  ],
};

const mockGoal = {
  id: 1,
  name: 'Test Goal',
  objectives: [
    { id: 1, title: 'Objective 1' },
    { id: 2, title: 'Objective 2' },
  ],
  status: GOAL_STATUS.CLOSED,
  grant: {
    numberWithProgramTypes: 'Grant-123',
  },
};

const renderRestartStandardGoal = (
  locationState = null,
  history = createMemoryHistory({
    initialEntries: [
      {
        pathname: '/recipient-tta-records/1/region/1/standard-goals/1/grant/1/restart',
        state: locationState,
      },
    ],
  })
) => {
  const setIsAppLoading = jest.fn();

  return {
    history,
    setIsAppLoading,
    ...render(
      <Router history={history}>
        <AppLoadingContext.Provider value={{ setIsAppLoading }}>
          <RestartStandardGoal recipient={mockRecipient} />
        </AppLoadingContext.Provider>
      </Router>
    ),
  };
};

describe('RestartStandardGoal', () => {
  const goalTemplatesUrl = join('/', 'api', 'goal-templates');
  beforeEach(() => {
    jest.clearAllMocks();
    fetchMock.get(join(goalTemplatesUrl, '1', 'prompts'), [[], []]);
    fetchMock.get('/api/goal-templates/standard/1/grant/1?status=Closed', mockGoal);
  });

  afterEach(() => {
    fetchMock.restore();
  });

  it('fetches and displays the goal data', async () => {
    renderRestartStandardGoal();

    await waitFor(() => {
      expect(fetchMock.called('/api/goal-templates/standard/1/grant/1?status=Closed')).toBe(true);
    });

    expect(await screen.findByRole('button', { name: /Reopen/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Cancel/i })).toBeInTheDocument();
  });

  it('handles goal not found error', async () => {
    const history = createMemoryHistory({
      initialEntries: [
        {
          pathname: '/recipient-tta-records/1/region/1/standard-goals/1/grant/1/restart',
        },
      ],
    });
    const pushSpy = jest.spyOn(history, 'push');
    const getStandardGoalSpy = jest
      .spyOn(standardGoalsFetchers, 'getStandardGoal')
      .mockRejectedValue(new HTTPError(404, 'Not Found'));
    const { setIsAppLoading } = renderRestartStandardGoal(null, history);

    await waitFor(() => {
      expect(pushSpy).toHaveBeenCalledWith('/something-went-wrong/404');
    });
    await waitFor(() => {
      expect(setIsAppLoading).toHaveBeenCalledWith(false);
    });

    getStandardGoalSpy.mockRestore();
  });

  it('submits the restarted goal successfully', async () => {
    fetchMock.post('/api/goal-templates/standard/1/grant/1', { everything: 'ok' });
    const { history } = renderRestartStandardGoal();

    await waitFor(() => {
      expect(fetchMock.called('/api/goal-templates/standard/1/grant/1?status=Closed')).toBe(true);
    });

    const submitButton = await screen.findByRole('button', { name: /Reopen/i });
    await act(async () => {
      userEvent.click(submitButton);
    });

    await waitFor(() => {
      expect(fetchMock.called('/api/goal-templates/standard/1/grant/1')).toBe(true);
      expect(history.location.pathname).toBe('/recipient-tta-records/1/region/1/rttapa');
    });
  });

  it('uses the goal dashboard back link when provided in location state', async () => {
    const locationState = {
      backLinkTo: '/dashboards/goal-dashboard',
      backLinkText: 'Back to Goal Dashboard',
    };
    const { history } = renderRestartStandardGoal(locationState);

    await waitFor(() => {
      expect(fetchMock.called('/api/goal-templates/standard/1/grant/1?status=Closed')).toBe(true);
    });

    const backLink = await screen.findByRole('link', { name: /Back to Goal Dashboard/i });
    expect(backLink).toHaveAttribute('href', '/dashboards/goal-dashboard');

    const cancelButton = screen.getByRole('link', { name: /Cancel/i });
    userEvent.click(cancelButton);

    expect(history.location.pathname).toBe('/dashboards/goal-dashboard');
  });

  it('returns to the goal dashboard after reopening when provided in location state', async () => {
    fetchMock.post('/api/goal-templates/standard/1/grant/1', { everything: 'ok' });
    const locationState = {
      backLinkTo: '/dashboards/goal-dashboard',
      backLinkText: 'Back to Goal Dashboard',
    };
    const { history } = renderRestartStandardGoal(locationState);

    await waitFor(() => {
      expect(fetchMock.called('/api/goal-templates/standard/1/grant/1?status=Closed')).toBe(true);
    });

    const submitButton = await screen.findByRole('button', { name: /Reopen/i });
    await act(async () => {
      userEvent.click(submitButton);
    });

    await waitFor(() => {
      expect(fetchMock.called('/api/goal-templates/standard/1/grant/1')).toBe(true);
      expect(history.location.pathname).toBe('/dashboards/goal-dashboard');
    });
  });

  it('handles submission error', async () => {
    fetchMock.post('/api/goal-templates/standard/1/grant/1', 500);
    renderRestartStandardGoal();

    await waitFor(() => {
      expect(fetchMock.called('/api/goal-templates/standard/1/grant/1?status=Closed')).toBe(true);
    });

    const submitButton = await screen.findByRole('button', { name: /Reopen/i });
    await act(async () => {
      userEvent.click(submitButton);
    });

    await waitFor(() => {
      expect(fetchMock.called('/api/goal-templates/standard/1/grant/1')).toBe(true);
    });
  });

  it('navigates to the correct page on cancel', async () => {
    const { history } = renderRestartStandardGoal();

    await waitFor(() => {
      expect(fetchMock.called('/api/goal-templates/standard/1/grant/1?status=Closed')).toBe(true);
    });

    const cancelButton = await screen.findByRole('link', { name: /Cancel/i });
    userEvent.click(cancelButton);

    expect(history.location.pathname).toMatch(/\/recipient-tta-records\/1\/region\/1\/rttapa/);
  });
});
