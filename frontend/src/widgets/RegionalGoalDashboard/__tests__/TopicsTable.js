import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GOAL_STATUS } from '@ttahub/common/src/constants';
import { TopicsTableWidget } from '../TopicsTable';

const topicsData = [{
  topic: 'Coaching',
  statuses: {
    [GOAL_STATUS.DRAFT]: 0,
    [GOAL_STATUS.NOT_STARTED]: 0,
    [GOAL_STATUS.IN_PROGRESS]: 6,
    [GOAL_STATUS.SUSPENDED]: 0,
    [GOAL_STATUS.CLOSED]: 10,
  },
  total: 16,
}, {
  topic: 'Safety Practices',
  statuses: {
    [GOAL_STATUS.DRAFT]: 0,
    [GOAL_STATUS.NOT_STARTED]: 0,
    [GOAL_STATUS.IN_PROGRESS]: 5,
    [GOAL_STATUS.SUSPENDED]: 0,
    [GOAL_STATUS.CLOSED]: 0,
  },
  total: 5,
}];

describe('TopicsTableWidget', () => {
  it('sorts all the different ways', async () => {
    render(<TopicsTableWidget data={topicsData} loading={false} />);

    const topicsHeader = screen.getByRole('button', { name: /topic/i });

    userEvent.click(topicsHeader);
    expect(topicsHeader).toHaveClass('asc');

    userEvent.click(topicsHeader);
    expect(topicsHeader).toHaveClass('desc');
  });

  it('sorts with invalid sort values', async () => {
    render(<TopicsTableWidget
      data={[
        {
          ...topicsData[0],
          topic: false,
        },
        {
          ...topicsData[1],
          topic: true,
        },
      ]}
      loading={false}
    />);

    const topicsHeader = screen.getByRole('button', { name: /topic/i });

    userEvent.click(topicsHeader);
    expect(topicsHeader).toHaveClass('asc');

    userEvent.click(topicsHeader);
    expect(topicsHeader).toHaveClass('desc');
  });

  it('sorts with invalid equal sort values', async () => {
    render(<TopicsTableWidget
      data={[
        {
          ...topicsData[0],
        },
        {
          ...topicsData[1],
          topic: false,
        },
      ]}
      loading={false}
    />);

    const topicsHeader = screen.getByRole('button', { name: /topic/i });

    userEvent.click(topicsHeader);
    expect(topicsHeader).toHaveClass('asc');

    userEvent.click(topicsHeader);
    expect(topicsHeader).toHaveClass('desc');
  });
});
