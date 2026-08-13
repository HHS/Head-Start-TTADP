/* eslint-disable react/prop-types */
import '@testing-library/jest-dom';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import fetchMock from 'fetch-mock';
import { createMemoryHistory } from 'history';
import React from 'react';
import { Router } from 'react-router-dom';
import join from 'url-join';
import AppLoadingContext from '../../../AppLoadingContext';
import { HTTPError } from '../../../fetchers';
import * as standardGoalsFetchers from '../../../fetchers/standardGoals';
import UpdateStandardGoal from '../UpdateStandardGoal';

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
    { id: 1, title: 'Objective 1', onAR: false },
    { id: 2, title: 'Objective 2', onAR: true },
  ],
  responses: [
    {
      response: ['Root Cause 1', 'Root Cause 2'],
    },
  ],
  grant: {
    numberWithProgramTypes: 'Grant-123',
  },
};

describe('UpdateStandardGoal', () => {
  const RenderTest = (
    locationState = null,
    history = createMemoryHistory({
      initialEntries: [
        {
          pathname: '/recipient-tta-records/1/region/1/standard-goals/1/grant/1',
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
            <UpdateStandardGoal recipient={mockRecipient} />
          </AppLoadingContext.Provider>
        </Router>
      ),
    };
  };
  const goalTemplatesUrl = join('/', 'api', 'goal-templates');
  beforeEach(() => {
    jest.clearAllMocks();
    fetchMock.get(join(goalTemplatesUrl, '1', 'prompts'), [[], []]);
    fetchMock.get('/api/goal-templates/standard/1/grant/1', mockGoal);
  });

  afterEach(() => {
    fetchMock.restore();
  });

  it('renders the goal form with existing goal data', async () => {
    RenderTest();

    await waitFor(() => {
      expect(fetchMock.called('/api/goal-templates/standard/1/grant/1')).toBe(true);
    });

    expect(await screen.findByRole('button', { name: /Save/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Cancel/i })).toBeInTheDocument();
    expect(screen.getByText('Test Goal')).toBeInTheDocument();
    expect(screen.getByText('Grant-123')).toBeInTheDocument();
  });

  it('populates existing objectives into the form on initial render', async () => {
    RenderTest();

    await waitFor(() => {
      expect(fetchMock.called('/api/goal-templates/standard/1/grant/1')).toBe(true);
    });

    expect(await screen.findByRole('button', { name: /Save/i })).toBeInTheDocument();

    expect(await screen.findByDisplayValue('Objective 1')).toBeInTheDocument();

    expect(screen.getByText('Objective 2', { selector: 'div' })).toBeInTheDocument();

    expect(screen.getByText('Objectives used on reports cannot be edited.')).toBeInTheDocument();
  });

  it('redirects to error page when goal is not found', async () => {
    const history = createMemoryHistory({
      initialEntries: [
        {
          pathname: '/recipient-tta-records/1/region/1/standard-goals/1/grant/1',
        },
      ],
    });
    const pushSpy = jest.spyOn(history, 'push');
    const getStandardGoalSpy = jest
      .spyOn(standardGoalsFetchers, 'getStandardGoal')
      .mockRejectedValue(new HTTPError(404, 'Not Found'));
    const { setIsAppLoading } = RenderTest(null, history);

    await waitFor(() => {
      expect(pushSpy).toHaveBeenCalledWith('/something-went-wrong/404');
    });
    await waitFor(() => {
      expect(setIsAppLoading).toHaveBeenCalledWith(false);
    });

    getStandardGoalSpy.mockRestore();
  });

  it('successfully updates an existing goal', async () => {
    fetchMock.put('/api/goal-templates/standard/1/grant/1', { everything: 'ok' });
    const { history } = RenderTest();

    await waitFor(() => {
      expect(fetchMock.called('/api/goal-templates/standard/1/grant/1')).toBe(true);
    });

    const submitButton = await screen.findByRole('button', { name: /Save/i });
    await act(async () => {
      userEvent.click(submitButton);
    });

    await waitFor(() => {
      expect(fetchMock.called('/api/goal-templates/standard/1/grant/1', { method: 'PUT' })).toBe(
        true
      );
      expect(history.location.pathname).toBe('/recipient-tta-records/1/region/1/rttapa');
    });
  });

  it('uses the goal dashboard back link when provided in location state', async () => {
    const locationState = {
      backLinkTo: '/dashboards/goal-dashboard',
      backLinkText: 'Back to Goal Dashboard',
    };
    const { history } = RenderTest(locationState);

    await waitFor(() => {
      expect(fetchMock.called('/api/goal-templates/standard/1/grant/1')).toBe(true);
    });

    const backLink = await screen.findByRole('link', { name: /Back to Goal Dashboard/i });
    expect(backLink).toHaveAttribute('href', '/dashboards/goal-dashboard');

    const cancelButton = screen.getByRole('link', { name: /Cancel/i });
    userEvent.click(cancelButton);

    expect(history.location.pathname).toBe('/dashboards/goal-dashboard');
  });

  it('returns to the goal dashboard after saving when provided in location state', async () => {
    fetchMock.put('/api/goal-templates/standard/1/grant/1', { everything: 'ok' });
    const locationState = {
      backLinkTo: '/dashboards/goal-dashboard',
      backLinkText: 'Back to Goal Dashboard',
    };
    const { history } = RenderTest(locationState);

    await waitFor(() => {
      expect(fetchMock.called('/api/goal-templates/standard/1/grant/1')).toBe(true);
    });

    const submitButton = await screen.findByRole('button', { name: /Save/i });
    await act(async () => {
      userEvent.click(submitButton);
    });

    await waitFor(() => {
      expect(fetchMock.called('/api/goal-templates/standard/1/grant/1', { method: 'PUT' })).toBe(
        true
      );
      expect(history.location.pathname).toBe('/dashboards/goal-dashboard');
    });
  });

  it('handles API error during goal update', async () => {
    fetchMock.put('/api/goal-templates/standard/1/grant/1', 500);
    const { setIsAppLoading } = RenderTest();

    await waitFor(() => {
      expect(fetchMock.called('/api/goal-templates/standard/1/grant/1')).toBe(true);
    });

    const submitButton = await screen.findByRole('button', { name: /Save/i });
    await act(async () => {
      userEvent.click(submitButton);
    });

    await waitFor(() => {
      expect(fetchMock.called('/api/goal-templates/standard/1/grant/1', { method: 'PUT' })).toBe(
        true
      );
      expect(setIsAppLoading).toHaveBeenCalledWith(false);
    });
  });

  it('navigates to recipient TTA page on cancel', async () => {
    const { history } = RenderTest();

    await waitFor(() => {
      expect(fetchMock.called('/api/goal-templates/standard/1/grant/1')).toBe(true);
    });

    const cancelButton = await screen.findByRole('link', { name: /Cancel/i });
    userEvent.click(cancelButton);

    expect(history.location.pathname).toMatch(/\/recipient-tta-records\/1\/region\/1\/rttapa/);
  });
});
