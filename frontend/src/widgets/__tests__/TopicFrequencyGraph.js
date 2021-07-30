import '@testing-library/jest-dom';
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  TopicFrequencyGraphWidget, reasonsWithLineBreaks, filterData, sortData, Tooltip,
} from '../TopicFrequencyGraph';

const TEST_DATA = [{
  reason: 'CLASS: Instructional Support',
  count: 12,
  roles: [],
},
{
  reason: 'Community and Self-Assessment',
  count: 155,
  roles: [],
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
    <TopicFrequencyGraphWidget data={props.data} dateTime={{ dateInExpectedFormat: '', prettyPrintedQuery: '05/27/1967-08/21/1968' }} />,
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
    const filteredData = filterData(data, [{ value: 'System Specialist' }]);

    expect(filteredData).toStrictEqual([
      {
        reason: 'Human Resources',
        count: 0,
        roles: ['System Specialist'],
      },
    ]);
  });

  it('correctly sorts data', () => {
    const data = [...TEST_DATA];
    // const filteredData = filterData(data, [{ label: 'Gene' }]);
    sortData(data, 'asc');

    expect(data).toStrictEqual([
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
      {
        reason: 'CLASS: Instructional Support',
        count: 12,
        roles: [],
      },
      {
        reason: 'Five-Year Grant',
        count: 33,
        roles: [],
      },
      {
        reason: 'Family Support Services',
        count: 53,
        roles: [],
      },
      {
        reason: 'Community and Self-Assessment',
        count: 155,
        roles: [],
      },
    ]);

    sortData(data, 'desc');

    expect(data).toStrictEqual([
      {
        reason: 'Community and Self-Assessment',
        count: 155,
        roles: [],
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

  it('handles null data', async () => {
    const data = null;
    renderArGraphOverview({ data });

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('correctly inserts line breaks', () => {
    const formattedReason = reasonsWithLineBreaks('Equity, Culture &amp; Language');
    expect(formattedReason).toBe(' Equity,<br />Culture<br />&amp;<br />Language');
  });

  it('shows current order', () => {
    renderArGraphOverview({ data: TEST_DATA });

    const order = screen.getByRole('combobox', { name: /change topic data order/i });
    userEvent.selectOptions(order, ['asc']);

    const applyFiltersButton = screen.getByRole('button', { name: 'Apply filters' });
    fireEvent.click(applyFiltersButton);

    expect(order.value).toBe('asc');
  });

  it('tooltip props', () => {
    render(<Tooltip x={0} text="Test" show />);

    expect(screen.getByText(/test/i)).toBeInTheDocument();
  });

  it('select styles', () => {
    renderArGraphOverview({ data: TEST_DATA });

    const select = document.querySelector('.ar__control');

    userEvent.click(select);

    expect(select.classList.contains('ar__control--is-focused')).toBe(true);

    let louise = screen.getByText(/system specialist/i);

    userEvent.click(louise);

    louise = screen.getByText(/system specialist/i);

    expect(louise.classList.contains('ar__multi-value__label')).toBe(true);
  });
});
