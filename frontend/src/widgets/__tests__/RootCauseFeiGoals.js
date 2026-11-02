import '@testing-library/jest-dom';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
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

  const showTable = async () => {
    await userEvent.click(await screen.findByRole('button', { name: /open actions/i }));
    await userEvent.click(await screen.findByRole('button', { name: /display table/i }));
  };

  const rowText = () =>
    Array.from(screen.getByRole('table').querySelectorAll('tbody tr'), (row) => row.textContent);

  const firstCauseIn = (text) =>
    ROOT_CAUSE_FEI_GOALS_DATA.records.find((r) => text.includes(r.rootCause)).rootCause;

  it('sorts by root cause name when the root cause column is clicked', async () => {
    render(<RootCauseFeiGoals data={ROOT_CAUSE_FEI_GOALS_DATA} />);
    await showTable();

    const names = ROOT_CAUSE_FEI_GOALS_DATA.records.map((r) => r.rootCause).sort();

    await userEvent.click(screen.getByRole('button', { name: /^Root cause\. activate/i }));
    expect(rowText().map(firstCauseIn)).toEqual([...names].reverse());

    await userEvent.click(screen.getByRole('button', { name: /^Root cause\. activate/i }));
    expect(rowText().map(firstCauseIn)).toEqual(names);
  });

  it.each([
    ['Number', 'response_count'],
    ['Percentage', 'percentage'],
  ])('sorts the %s column by its own values', async (heading, field) => {
    render(<RootCauseFeiGoals data={ROOT_CAUSE_FEI_GOALS_DATA} />);
    await showTable();

    await userEvent.click(screen.getByRole('button', { name: new RegExp(`^${heading}`) }));

    const expected = [...ROOT_CAUSE_FEI_GOALS_DATA.records]
      .sort((a, b) => a[field] - b[field])
      .map((r) => r.rootCause);
    expect(rowText().map(firstCauseIn)).toEqual(expected);
  });
});
