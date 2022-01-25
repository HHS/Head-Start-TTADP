/* eslint-disable jest/no-disabled-tests */
import '@testing-library/jest-dom';
import React from 'react';
import {
  render,
  screen,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FreqGraph } from '../FrequencyGraph';

const TEST_DATA = {
  topics: [
    {
      category: 'first category',
      count: 1,
    },
    {
      category: 'b',
      count: 2,
    },
    {
      category: 'c',
      count: 0,
    },
  ],
  reasons: [
    {
      category: 'one',
      count: 1,
    },
    {
      category: 'two',
      count: 2,
    },
    {
      category: 'three',
      count: 0,
    },
  ],
};

const renderFrequencyGraph = async () => (
  render(<FreqGraph loading={false} data={TEST_DATA} />)
);

describe('Frequency Graph', () => {
  it('shows topics by default', async () => {
    renderFrequencyGraph();
    const topics = await screen.findByRole('heading', { name: /topics in activity reports/i });
    expect(topics).toBeInTheDocument();
  });

  it('can switch to show reasons', async () => {
    renderFrequencyGraph();
    const toggleGraphButton = await screen.findByRole('button', { name: /display number of activity reports by reasons/i });
    userEvent.click(toggleGraphButton);
    const topics = await screen.findByRole('heading', { name: /reasons in activity reports/i });
    expect(topics).toBeInTheDocument();
  });

  it('can show accessible data', async () => {
    renderFrequencyGraph();
    const accessibleBtn = await screen.findByText('Display table');
    userEvent.click(accessibleBtn);
    expect(await screen.findByText('first category')).toBeInTheDocument();
  });
});
