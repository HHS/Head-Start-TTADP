import '@testing-library/jest-dom';
import React from 'react';
import {
  render,
  screen,
  act,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RootCauseFeiGoals from '../RootCauseFeiGoals';

const ROOT_CAUSE_FEI_GOALS_DATA = {
  totalNumberOfGoals: 11510,
  totalNumberOfRootCauses: 21637,
  records: [
    {
      rootCause: 'Community Partnerships',
      response_count: 2532,
      percentage: 22,
    },
    {
      rootCause: 'Facilities',
      response_count: 2186,
      percentage: 19,
    },
    {
      rootCause: 'Family Circumstances',
      response_count: 2762,
      percentage: 24,
    },
    {
      rootCause: 'Other ECE Care Options',
      response_count: 3683,
      percentage: 32,
    },
    {
      rootCause: 'Unavailable',
      response_count: 115,
      percentage: 1,
    },
    {
      rootCause: 'Workforce',
      response_count: 10359,
      percentage: 90,
    },
  ],
};

describe('RootCauseFeiGoals', () => {
  it('should switch to tabular data', async () => {
    render(<RootCauseFeiGoals data={ROOT_CAUSE_FEI_GOALS_DATA} />);

    const button = await screen.findByRole('button', { name: /open actions/i });

    act(() => {
      userEvent.click(button);
    });

    const tabularDataButton = await screen.findByRole('button', { name: /display table/i });

    act(() => {
      userEvent.click(tabularDataButton);
    });

    const table = await screen.findByRole('table');
    expect(table).toBeVisible();
  });
});
