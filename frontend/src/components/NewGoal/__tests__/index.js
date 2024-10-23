import '@testing-library/jest-dom';
import React from 'react';
// import moment from 'moment';
import {
  render,
  //   screen,
  //   within,
  //   waitFor,
  act,
} from '@testing-library/react';
import { SCOPE_IDS } from '@ttahub/common';
// import selectEvent from 'react-select-event';
// import fetchMock from 'fetch-mock';
import { Router } from 'react-router';
import { createMemoryHistory } from 'history';
// import userEvent from '@testing-library/user-event';
import UserContext from '../../../UserContext';
import NewGoal from '..';
import AppLoadingContext from '../../../AppLoadingContext';
// import useNewGoalAction from '../../../hooks/useNewGoalAction';

jest.mock('../../../hooks/useNewGoalAction');

describe('NewGoalForm', () => {
  const defaultUser = {
    permissions: [{ regionId: 1, scopeId: SCOPE_IDS.READ_WRITE_ACTIVITY_REPORTS }],
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
  ) => {
    render(
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
  };

  it('renders without error', async () => {
    act(() => {
      renderNewGoalForm();
    });

    expect(true).toBe(true);
  });
});
