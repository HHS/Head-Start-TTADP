import React from 'react';
import {
  render,
  screen,
} from '@testing-library/react';
import { GOAL_STATUS } from '@ttahub/common/src/constants';
import { TopicsTableWidget } from '../../../widgets/RegionalGoalDashboard/TopicsTable';

const TEST_DATA = [
  {
    topic: 'Topic 1',
    statuses: {
      [GOAL_STATUS.IN_PROGRESS]: 1,
      [GOAL_STATUS.NOT_STARTED]: 2,
      [GOAL_STATUS.CLOSED]: 3,
      [GOAL_STATUS.SUSPENDED]: 4,
    },
    total: 10,
  },
  {
    topic: 'Topic 2',
    statuses: {
      [GOAL_STATUS.IN_PROGRESS]: 5,
      [GOAL_STATUS.NOT_STARTED]: 6,
      [GOAL_STATUS.CLOSED]: 7,
      [GOAL_STATUS.SUSPENDED]: 8,
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
    const loading = await screen.findByLabelText('topics table loading');
    expect(loading).toBeInTheDocument();
  });

  it('is sortable', async () => {
    renderTopicsTable();

    const firstHeader = screen.getAllByRole('columnheader')[0];
    expect(firstHeader).toHaveAttribute('aria-sort', 'descending');

    const firstHeaderButton = firstHeader.querySelector('button');
    firstHeaderButton.click();
    expect(firstHeader).toHaveAttribute('aria-sort', 'ascending');

    const secondHeader = screen.getAllByRole('columnheader')[1];
    expect(secondHeader).toHaveAttribute('aria-sort', 'none');
    const secondHeaderButton = secondHeader.querySelector('button');
    secondHeaderButton.click();
    expect(secondHeader).toHaveAttribute('aria-sort', 'descending');
  });
});
