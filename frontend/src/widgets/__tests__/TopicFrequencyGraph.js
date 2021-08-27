import '@testing-library/jest-dom';
import React from 'react';
import {
  render,
  screen,
  within,
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
    <TopicFrequencyGraphWidget data={props.data} dateTime={{ timestamp: '', label: '05/27/1967-08/21/1968' }} />,
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

  it('handles null data', async () => {
    const data = null;
    renderArGraphOverview({ data });

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('correctly inserts line breaks', () => {
    const formattedtopic = topicsWithLineBreaks('Equity, Culture &amp; Language');
    expect(formattedtopic).toBe(' Equity,<br />Culture<br />&amp;<br />Language');
  });

  it('the sort control works', async () => {
    renderArGraphOverview({ data: [...TEST_DATA] });
    const button = screen.getByRole('button', { name: /change topic graph order/i });
    userEvent.click(button);
    const aZ = screen.getByRole('button', { name: /select to view data from a to z\. select apply filters button to apply selection/i });
    userEvent.click(aZ);
    const buttonGroup = screen.getByTestId('data-sort');
    const apply = within(buttonGroup).getByRole('button', { name: 'Apply filters' });

    const point1 = document.querySelector('g.xtick');
    // eslint-disable-next-line no-underscore-dangle
    expect(point1.__data__.text).toBe(' Community<br />and<br />Self-Assessment');
    userEvent.click(apply);

    const point2 = document.querySelector('g.xtick');
    // eslint-disable-next-line no-underscore-dangle
    expect(point2.__data__.text).toBe(' CLASS:<br />Instructional<br />Support');
  });

  it('handles switching display contexts', async () => {
    renderArGraphOverview({ data: [...TEST_DATA] });
    const button = screen.getByRole('button', { name: /show accessible data/i });
    userEvent.click(button);

    const firstRowHeader = screen.getByRole('cell', {
      name: /community and self-assessment/i,
    });
    expect(firstRowHeader).toBeInTheDocument();

    const firstTableCell = screen.getByRole('cell', { name: /155/i });
    expect(firstTableCell).toBeInTheDocument();

    const viewGraph = screen.getByRole('button', { name: /view graph/i });
    userEvent.click(viewGraph);

    expect(firstRowHeader).not.toBeInTheDocument();
    expect(firstTableCell).not.toBeInTheDocument();
  });
});
