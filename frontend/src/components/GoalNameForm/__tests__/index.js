import '@testing-library/jest-dom';
import React from 'react';
import {
  render,
  screen,
  act,
} from '@testing-library/react';
import { SCOPE_IDS } from '@ttahub/common';
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
          />
        </UserContext.Provider>
      </AppLoadingContext.Provider>
    </Router>,
  );

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
});
