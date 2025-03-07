import '@testing-library/jest-dom';
import React from 'react';
import {
  render,
  screen,
  act,
  waitFor,
} from '@testing-library/react';
import { SCOPE_IDS, GOAL_STATUS } from '@ttahub/common';
import fetchMock from 'fetch-mock';
import selectEvent from 'react-select-event';
import { Router } from 'react-router';
import { createMemoryHistory } from 'history';
import userEvent from '@testing-library/user-event';
import UserContext from '../../../UserContext';
import NewGoal from '..';
import AppLoadingContext from '../../../AppLoadingContext';

describe('NewGoalForm', () => {
  const defaultUser = {
    permissions: [{
      regionId: 1,
      scopeId: SCOPE_IDS.READ_WRITE_ACTIVITY_REPORTS,
    }],
  };

  const defaultRecipient = {
    id: 1,
    grants: [
      { id: 1, status: 'Active', numberWithProgramTypes: '123 EHS' },
    ],
  };

  const history = createMemoryHistory();

  const renderNewGoalForm = (
    user = defaultUser,
    recipient = defaultRecipient,
    isExistingGoal = false,
    ids = [],
  ) => render(
    <Router history={history}>
      <AppLoadingContext.Provider value={{
        setIsAppLoading: jest.fn(),
      }}
      >
        <UserContext.Provider value={{
          user,
        }}
        >
          <NewGoal
            recipient={recipient}
            regionId="1"
            isExistingGoal={isExistingGoal}
            ids={ids}
          />
        </UserContext.Provider>
      </AppLoadingContext.Provider>
    </Router>,
  );

  beforeEach(() => {
    fetchMock.get('/api/goal-templates?grantIds=1', []);
    fetchMock.get('/api/goal-templates?grantIds=2', []);
  });

  afterEach(() => {
    fetchMock.restore();
    history.location.pathname = '/';
  });

  it('renders without error', async () => {
    act(() => {
      renderNewGoalForm();
    });

    const grant = screen.queryByTestId('read-only-value');

    expect(grant.textContent).toBe('123 EHS');
  });

  it('allows grant selection and submission', async () => {
    const recipient = {
      id: 1,
      grants: [
        { id: 1, status: 'Active', numberWithProgramTypes: '123 EHS' },
        { id: 2, status: 'Active', numberWithProgramTypes: '456 EHS' },
      ],
    };

    act(() => {
      renderNewGoalForm(defaultUser, recipient);
    });

    await act(async () => {
      await selectEvent.select(screen.getByLabelText(/Recipient grant numbers/), '456 EHS');
    });

    const submitButton = screen.getByRole('button', { name: 'Save and continue' });

    expect(submitButton).toBeInTheDocument();

    act(() => {
      userEvent.click(submitButton);
    });
  });

  it('redirects if a user does not have the proper permissions', async () => {
    const regionTwoUser = {
      permissions: [{
        regionId: 2,
        scopeId: SCOPE_IDS.READ_WRITE_ACTIVITY_REPORTS,
      }],
    };
    act(() => {
      renderNewGoalForm(regionTwoUser);
    });

    expect(history.location.pathname).toBe('/something-went-wrong/401');
  });

  it('fetches goal if there is an existing goal', async () => {
    fetchMock.get('/api/recipient/1/goals?goalIds=1', [{
      goalIds: [1],
      name: 'Test Goal',
      status: 'Not Started',
      isCurated: false,
      onAR: false,
    }]);

    act(() => {
      renderNewGoalForm(defaultUser, defaultRecipient, true, [1]);
    });

    expect(fetchMock.called('/api/recipient/1/goals?goalIds=1')).toBe(true);
  });
  it('redirects if goal is curated', async () => {
    fetchMock.get('/api/recipient/1/goals?goalIds=1', [{
      goalIds: [1],
      name: 'Test Goal',
      status: 'Not Started',
      isCurated: true,
      onAR: false,
    }]);

    act(() => {
      renderNewGoalForm(defaultUser, defaultRecipient, true, [1]);
    });

    expect(fetchMock.called('/api/recipient/1/goals?goalIds=1')).toBe(true);
    await waitFor(() => {
      expect(history.location.pathname).toBe('/recipient-tta-records/1/region/1/goals/edit');
    });
  });
  it('redirects if goal is onAR', async () => {
    fetchMock.get('/api/recipient/1/goals?goalIds=1', [{
      goalIds: [1],
      name: 'Test Goal',
      status: 'Not Started',
      isCurated: false,
      onAR: true,
    }]);

    act(() => {
      renderNewGoalForm(defaultUser, defaultRecipient, true, [1]);
    });

    expect(fetchMock.called('/api/recipient/1/goals?goalIds=1')).toBe(true);
    await waitFor(() => {
      expect(history.location.pathname).toBe('/recipient-tta-records/1/region/1/goals/edit');
    });
  });

  it('redirects if goal is closed', async () => {
    fetchMock.get('/api/recipient/1/goals?goalIds=1', [{
      goalIds: [1],
      name: 'Test Goal',
      status: GOAL_STATUS.CLOSED,
      isCurated: false,
      onAR: false,
    }]);

    act(() => {
      renderNewGoalForm(defaultUser, defaultRecipient, true, [1]);
    });

    expect(fetchMock.called('/api/recipient/1/goals?goalIds=1')).toBe(true);
    await waitFor(() => {
      expect(history.location.pathname).toBe('/recipient-tta-records/1/region/1/goals/edit');
    });
  });

  it('handles an error fetching goals', async () => {
    fetchMock.get('/api/recipient/1/goals?goalIds=1', 500);

    act(() => {
      renderNewGoalForm(defaultUser, defaultRecipient, true, [1]);
    });

    expect(fetchMock.called('/api/recipient/1/goals?goalIds=1')).toBe(true);

    await waitFor(() => {
      expect(history.location.pathname).toBe('/something-went-wrong/500');
    });
  });
});
