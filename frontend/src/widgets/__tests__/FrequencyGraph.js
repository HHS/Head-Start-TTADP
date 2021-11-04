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
  topic: [
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
  reason: [
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
    const topics = await screen.findByText('Topics');
    expect(topics).toBeInTheDocument();
  });

  it('can switch to show reasons', async () => {
    renderFrequencyGraph();
    const topics = await screen.findByText('Topics');

    userEvent.click(topics);
    const reasonBtn = await screen.findByText('Reasons');
    userEvent.click(reasonBtn);
    const apply = await screen.findByText('Apply');
    userEvent.click(apply);

    const reasons = await screen.findByText('Reasons');
    expect(reasons).toBeInTheDocument();
  });

  it('can show accessible data', async () => {
    renderFrequencyGraph();
    const accessibleBtn = await screen.findByText('Display table');
    userEvent.click(accessibleBtn);
    expect(await screen.findByText('first category')).toBeInTheDocument();
  });
});
