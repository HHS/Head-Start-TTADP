import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TopicsTableWidget } from '../TopicsTable';

const topicsData = [{
  topic: 'Coaching',
  statuses: {
    Draft: 0, 'Not Started': 0, 'In Progress': 6, Suspended: 0, Closed: 10,
  },
  total: 16,
}, {
  topic: 'Safety Practices',
  statuses: {
    Draft: 0, 'Not Started': 0, 'In Progress': 5, Suspended: 0, Closed: 0,
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
