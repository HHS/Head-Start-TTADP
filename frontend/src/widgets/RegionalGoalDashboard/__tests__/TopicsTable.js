import React from 'react';
import {
  render,
  screen,
} from '@testing-library/react';
import { TopicsTableWidget } from '../TopicsTable';

const TEST_DATA = [
  {
    topic: 'Topic 1',
    statuses: {
      'In Progress': 1,
      'Not Started': 2,
      Closed: 3,
      Suspended: 4,
    },
    total: 10,
  },
  {
    topic: 'Topic 2',
    statuses: {
      'In Progress': 5,
      'Not Started': 6,
      Closed: 7,
      Suspended: 8,
    },
    total: 26,
  },
];

const renderTopicsTable = async (loading = false) => {
  render(<TopicsTableWidget loading={loading} data={TEST_DATA} />);
};

describe('Topics Table', () => {
  it('shows the topics', async () => {
    renderTopicsTable();
    const topic1 = await screen.findByText('Topic 1');
    expect(topic1).toBeInTheDocument();
    const topic2 = await screen.findByText('Topic 2');
    expect(topic2).toBeInTheDocument();
  });

  it('shows the values for statuses and totals', async () => {
    renderTopicsTable();

    // find the tr that has the topic name:
    const topic1 = await screen.findByText('Topic 1');

    // the statuses should be in THIS tr:
    const statuses = topic1.closest('tr').querySelectorAll('td');
    expect(statuses[1]).toHaveTextContent('2');
    expect(statuses[2]).toHaveTextContent('1');
    expect(statuses[3]).toHaveTextContent('3');
    expect(statuses[4]).toHaveTextContent('4');
  });

  it('shows the loading state', async () => {
    renderTopicsTable(true);
    const loading = await screen.findByText('Loading...');
    expect(loading).toBeInTheDocument();
  });
});
