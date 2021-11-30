/* eslint-disable jest/no-disabled-tests */
import '@testing-library/jest-dom';
import React from 'react';
import {
  render,
  screen,
  act,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  TopicFrequencyGraphWidget,
  topicsWithLineBreaks,
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
    await expect(graphTitle).toBeInTheDocument();
    await expect(document.querySelector('svg')).toBeInTheDocument();
  });

  it('correctly sorts data by count', () => {
    const data = [...TEST_DATA];
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
    ]);
  });

  it('handles undefined data', async () => {
    const data = undefined;
    renderArGraphOverview({ data });

    expect(await screen.findByText('Number of Activity Reports by Topic')).toBeInTheDocument();
  });

  it('handles loading', async () => {
    renderArGraphOverview({ loading: true });
    expect(await screen.findByText('Loading Data')).toBeInTheDocument();
  });

  it('correctly inserts line breaks', () => {
    const formattedtopic = topicsWithLineBreaks('Equity, Culture &amp; Language');
    expect(formattedtopic).toBe(' Equity,<br />Culture<br />&amp;<br />Language');
  });

  it('the sort control works', async () => {
    renderArGraphOverview({ data: [...TEST_DATA] });
    const button = screen.getByRole('button', { name: /change topic graph order/i });
    act(() => userEvent.click(button));
    const aZ = screen.getByRole('button', { name: /select to view data from a to z\. select apply filters button to apply selection/i });
    act(() => userEvent.click(aZ));
    const apply = screen.getByRole('button', { name: 'Apply filters for the Change topic graph order menu' });

    const point1 = document.querySelector('g.xtick');
    // eslint-disable-next-line no-underscore-dangle
    expect(point1.__data__.text).toBe(' Community<br />and<br />Self-Assessment');
    act(() => userEvent.click(apply));

    const point2 = document.querySelector('g.xtick');
    // eslint-disable-next-line no-underscore-dangle
    expect(point2.__data__.text).toBe(' CLASS:<br />Instructional<br />Support');
  });

  it('handles switching display contexts', async () => {
    renderArGraphOverview({ data: [...TEST_DATA] });
    const button = await screen.findByRole('button', { name: 'display number of activity reports by topic data as table' });
    act(() => userEvent.click(button));

    const firstRowHeader = await screen.findByRole('cell', {
      name: /community and self-assessment/i,
    });
    expect(firstRowHeader).toBeInTheDocument();

    const firstTableCell = await screen.findByRole('cell', { name: /155/i });
    expect(firstTableCell).toBeInTheDocument();

    const viewGraph = await screen.findByRole('button', { name: 'display number of activity reports by topic data as graph' });
    act(() => userEvent.click(viewGraph));

    expect(firstRowHeader).not.toBeInTheDocument();
    expect(firstTableCell).not.toBeInTheDocument();
  });
});
