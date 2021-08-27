/* eslint-disable jest/no-disabled-tests */
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
  reasonsWithLineBreaks,
  filterData,
  sortData,
  SORT_ORDER,
  ROLES_MAP,
} from '../TopicFrequencyGraph';

const TEST_DATA = [{
  reason: 'CLASS: Instructional Support',
  count: 12,
  roles: [],
},
{
  reason: 'Community and Self-Assessment',
  count: 155,
  roles: ['System Specialist'],
},
{
  reason: 'Family Support Services',
  count: 53,
  roles: [],
},
{
  reason: 'Fiscal / Budget',
  count: 0,
  roles: [],
},
{
  reason: 'Five-Year Grant',
  count: 33,
  roles: [],
},
{
  reason: 'Human Resources',
  count: 0,
  roles: ['System Specialist'],
}];

const renderArGraphOverview = async (props) => (
  render(
    <TopicFrequencyGraphWidget loading={props.loading || false} data={props.data} dateTime={{ timestamp: '', label: '05/27/1967-08/21/1968' }} />,
  )
);

describe('Topic & Frequency Graph Widget', () => {
  it('shows the correct data', async () => {
    renderArGraphOverview({ data: TEST_DATA });
    const graphTitle = screen.getByRole('heading', { name: /number of activity reports by topic/i });
    await expect(graphTitle).toBeInTheDocument();
    await expect(document.querySelector('svg')).toBeInTheDocument();
  });

  it('correctly filters data', () => {
    const data = [...TEST_DATA];

    const filter = [ROLES_MAP.find((role) => role.value === 'System Specialist').selectValue];
    const filteredData = filterData(data, filter);
    expect(filteredData).toStrictEqual([{
      reason: 'CLASS: Instructional Support',
      count: 0,
      roles: [],
    },
    {
      reason: 'Community and Self-Assessment',
      count: 155,
      roles: ['System Specialist'],
    },
    {
      reason: 'Family Support Services',
      count: 0,
      roles: [],
    },
    {
      reason: 'Fiscal / Budget',
      count: 0,
      roles: [],
    },
    {
      reason: 'Five-Year Grant',
      count: 0,
      roles: [],
    },
    {
      reason: 'Human Resources',
      count: 0,
      roles: ['System Specialist'],
    }]);
  });

  it('correctly sorts data by count', () => {
    const data = [...TEST_DATA];
    sortData(data, SORT_ORDER.DESC);

    expect(data).toStrictEqual([
      {
        reason: 'Community and Self-Assessment',
        count: 155,
        roles: ['System Specialist'],
      },
      {
        reason: 'Family Support Services',
        count: 53,
        roles: [],
      },
      {
        reason: 'Five-Year Grant',
        count: 33,
        roles: [],
      },
      {
        reason: 'CLASS: Instructional Support',
        count: 12,
        roles: [],
      },
      {
        reason: 'Fiscal / Budget',
        count: 0,
        roles: [],
      },
      {
        reason: 'Human Resources',
        count: 0,
        roles: ['System Specialist'],
      },

    ]);
  });

  it('correctly sorts data alphabetically', () => {
    const data = [...TEST_DATA];

    sortData(data, SORT_ORDER.ALPHA);

    expect(data).toStrictEqual([
      {
        reason: 'CLASS: Instructional Support',
        count: 12,
        roles: [],
      },
      {
        reason: 'Community and Self-Assessment',
        count: 155,
        roles: ['System Specialist'],
      },
      {
        reason: 'Family Support Services',
        count: 53,
        roles: [],
      },
      {
        reason: 'Fiscal / Budget',
        count: 0,
        roles: [],
      },
      {
        reason: 'Five-Year Grant',
        count: 33,
        roles: [],
      },
      {
        reason: 'Human Resources',
        count: 0,
        roles: ['System Specialist'],
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
    expect(await screen.findByLabelText('loading')).toBeInTheDocument();
  });

  it('correctly inserts line breaks', () => {
    const formattedReason = reasonsWithLineBreaks('Equity, Culture &amp; Language');
    expect(formattedReason).toBe(' Equity,<br />Culture<br />&amp;<br />Language');
  });

  it('the filter control works', async () => {
    renderArGraphOverview({ data: [...TEST_DATA] });

    const button = screen.getByRole('button', { name: /change filter by specialists/i });
    userEvent.click(button);

    const barSelector = 'g.point';

    // eslint-disable-next-line no-underscore-dangle
    let height = document.querySelectorAll(barSelector)[0].__data__.y;
    expect(height).toBe(155);

    const systemSpecialist = screen.getByRole('checkbox', { name: /select system specialist \(ss\)/i });

    userEvent.click(systemSpecialist);

    const apply = screen.getByRole('button', { name: /apply filters/i });
    userEvent.click(apply);

    // eslint-disable-next-line no-underscore-dangle
    height = document.querySelectorAll(barSelector)[0].__data__.y;
    expect(height).toBe(0);
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
