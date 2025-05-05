/* eslint-disable jest/no-disabled-tests */
import '@testing-library/jest-dom';
import React from 'react';
import {
  render,
  screen,
  act,
  fireEvent,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  TopicFrequencyGraphWidget,
  sortData,
  SORT_ORDER,
} from '../TopicFrequencyGraph';

const TEST_DATA = [{
  topic: 'CLASS: Instructional Support',
  count: 12,
},
{
  topic: 'Community and Self-Assessment',
  count: 155,
},
{
  topic: 'Family Support Services',
  count: 53,
},
{
  topic: 'Fiscal / Budget',
  count: 0,
},
{
  topic: 'Five-Year Grant',
  count: 33,
},
{
  topic: 'Human Resources',
  count: 0,
}];

const renderArGraphOverview = async (props) => (
  render(
    <TopicFrequencyGraphWidget updateRoles={() => {}} loading={props.loading || false} data={props.data} dateTime={{ timestamp: '', label: '05/27/1967-08/21/1968' }} />,
  )
);

describe('Topic & Frequency Graph Widget', () => {
  it('shows the correct data', async () => {
    renderArGraphOverview({ data: TEST_DATA });
    const graphTitle = screen.getByRole('heading', { name: /number of activity reports by topic/i });
    expect(graphTitle).toBeInTheDocument();
    expect(document.querySelector('svg')).toBeInTheDocument();
  });

  it('correctly sorts data by count', () => {
    let data = [...TEST_DATA];
    sortData(data, SORT_ORDER.DESC);
    expect(data).toStrictEqual([
      {
        topic: 'Community and Self-Assessment',
        count: 155,
      },
      {
        topic: 'Family Support Services',
        count: 53,
      },
      {
        topic: 'Five-Year Grant',
        count: 33,
      },
      {
        topic: 'CLASS: Instructional Support',
        count: 12,
      },
      {
        topic: 'Fiscal / Budget',
        count: 0,
      },
      {
        topic: 'Human Resources',
        count: 0,
      },
    ].reverse());

    data = [...TEST_DATA];
    sortData(data, SORT_ORDER.DESC, true);
    expect(data).toStrictEqual([
      {
        topic: 'Community and Self-Assessment',
        count: 155,
      },
      {
        topic: 'Family Support Services',
        count: 53,
      },
      {
        topic: 'Five-Year Grant',
        count: 33,
      },
      {
        topic: 'CLASS: Instructional Support',
        count: 12,
      },
      {
        topic: 'Fiscal / Budget',
        count: 0,
      },
      {
        topic: 'Human Resources',
        count: 0,
      },
    ]);
  });

  it('correctly sorts data alphabetically', () => {
    const data = [...TEST_DATA];

    sortData(data, SORT_ORDER.ALPHA);

    expect(data).toStrictEqual([
      {
        topic: 'CLASS: Instructional Support',
        count: 12,
      },
      {
        topic: 'Community and Self-Assessment',
        count: 155,
      },
      {
        topic: 'Family Support Services',
        count: 53,
      },
      {
        topic: 'Fiscal / Budget',
        count: 0,
      },
      {
        topic: 'Five-Year Grant',
        count: 33,
      },
      {
        topic: 'Human Resources',
        count: 0,
      },
    ].reverse());
  });

  it('shows accessibility/tabular data', async () => {
    const data = [...TEST_DATA];
    renderArGraphOverview({ data });

    const tableButton = await screen.findByText('Display table');
    expect(tableButton).toBeInTheDocument();
    fireEvent.click(tableButton);
    const graphButton = await screen.findByText('Display graph');
    expect(graphButton).toBeInTheDocument();
  });

  it('handles undefined data', async () => {
    const data = undefined;
    renderArGraphOverview({ data });

    expect(await screen.findByText('Number of Activity Reports by Topic')).toBeInTheDocument();
  });

  it('the sort control works', async () => {
    renderArGraphOverview({ data: [...TEST_DATA] });
    const button = screen.getByRole('button', { name: /change topic graph order/i });
    act(() => userEvent.click(button));
    const aZ = screen.getByRole('button', { name: /select to view data from a to z\. select apply filters button to apply selection/i });
    act(() => userEvent.click(aZ));
    const apply = screen.getByRole('button', { name: 'Apply filters for the Change topic graph order menu' });

    // Wait for graph to render (takes a sec because of dynamic imports)
    await screen.findByText('Human Resources');

    // this won't change because we sort count and then alphabetically
    // and this is always last in that case
    const firstPoint = document.querySelector('g.ytick');
    // eslint-disable-next-line no-underscore-dangle
    expect(firstPoint.__data__.text).toBe('Human Resources');

    const point1 = Array.from(document.querySelectorAll('g.ytick')).pop();
    // eslint-disable-next-line no-underscore-dangle
    expect(point1.__data__.text).toBe('Community and Self-Assessment');

    act(() => userEvent.click(apply));

    // Waits for screen to load
    await screen.findByText('CLASS: Instructional Support');

    const point2 = Array.from(document.querySelectorAll('g.ytick')).pop();
    // eslint-disable-next-line no-underscore-dangle
    expect(point2.__data__.text).toBe('CLASS: Instructional Support');
  });
});
