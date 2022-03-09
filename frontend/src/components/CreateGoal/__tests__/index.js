import '@testing-library/jest-dom';
import React from 'react';
import {
  render, screen,
} from '@testing-library/react';
import selectEvent from 'react-select-event';
import fetchMock from 'fetch-mock';
import { Router } from 'react-router';
import { createMemoryHistory } from 'history';
import userEvent from '@testing-library/user-event';
import CreateGoal from '../index';

describe('create goal', () => {
  const match = {
    path: '',
    url: '',
    params: {
      goalId: 'new',
    },
  };

  const recipient = {
    id: 1,
    grants: [
      {
        id: 1,
        numberWithProgramTypes: 'Turtle 1',
      },
      {
        id: 2,
        numberWithProgramTypes: 'Turtle 2',
      },
    ],
  };

  function renderForm() {
    const history = createMemoryHistory();
    render((
      <Router history={history}>
        <CreateGoal
          match={match}
          recipient={recipient}
          regionId="1"
        />
      </Router>
    ));
  }

  it('you can create a goal', async () => {
    fetchMock.post('/api/goals', 200);

    renderForm();

    await screen.findByRole('heading', { name: 'Goal summary' });
    expect(fetchMock.called()).toBe(false);

    const combo = await screen.findByLabelText(/Recipient grant numbers/i);
    await selectEvent.select(combo, ['Turtle 1']);

    const goalText = await screen.findByRole('textbox', { name: 'Goal' });
    userEvent.type(goalText, 'This is goal text');

    const ed = await screen.findByRole('textbox', { name: /goal end date/i });
    userEvent.type(ed, '08/15/2023');

    const save = await screen.findByRole('button', { name: /save and continue/i });
    userEvent.click(save);

    expect(fetchMock.called()).toBeTruthy();
  });
});
