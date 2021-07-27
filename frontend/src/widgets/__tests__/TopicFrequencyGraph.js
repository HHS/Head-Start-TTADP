import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  TopicFrequencyGraphWidget, reasonsWithLineBreaks, filterData, sortData, Tooltip,
} from '../TopicFrequencyGraph';

const TEST_DATA = [{
  reason: 'CLASS: Instructional Support',
  count: 12,
  participants: [],
},
{
  reason: 'Community and Self-Assessment',
  count: 155,
  participants: [],
},
{
  reason: 'Family Support Services',
  count: 53,
  participants: [],
},
{
  reason: 'Fiscal / Budget',
  count: 0,
  participants: ['Louise'],
},
{
  reason: 'Five-Year Grant',
  count: 33,
  participants: ['Bob'],
},
{
  reason: 'Human Resources',
  count: 0,
  participants: ['Gene'],
}];

const renderArGraphOverview = async (props) => (
  render(
    <TopicFrequencyGraphWidget data={props.data} dateTime={{ dateInExpectedFormat: '', prettyPrintedQuery: '05/27/1967-08/21/1968' }} />,
  )
);

describe('AR Graph Widget', () => {
  it('shows the correct data', async () => {
    renderArGraphOverview({ data: TEST_DATA });
    const graphTitle = screen.getByRole('heading', { name: /number of activity reports by topic/i });
    await expect(graphTitle).toBeInTheDocument();
    await expect(document.querySelector('svg')).toBeInTheDocument();
  });

  it('correctly filters data', () => {
    const data = [...TEST_DATA];
    const filteredData = filterData(data, [{ label: 'Gene' }]);

    expect(filteredData).toStrictEqual([
      {
        reason: 'Human Resources',
        count: 0,
        participants: ['Gene'],
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
        participants: [
          'Louise',
        ],
      },
      {
        reason: 'Human Resources',
        count: 0,
        participants: [
          'Gene',
        ],
      },
      {
        reason: 'CLASS: Instructional Support',
        count: 12,
        participants: [],
      },
      {
        reason: 'Five-Year Grant',
        count: 33,
        participants: [
          'Bob',
        ],
      },
      {
        reason: 'Family Support Services',
        count: 53,
        participants: [],
      },
      {
        reason: 'Community and Self-Assessment',
        count: 155,
        participants: [],
      },
    ]);

    sortData(data, 'desc');

    expect(data).toStrictEqual([
      {
        reason: 'Community and Self-Assessment',
        count: 155,
        participants: [],
      },
      {
        reason: 'Family Support Services',
        count: 53,
        participants: [],
      },
      {
        reason: 'Five-Year Grant',
        count: 33,
        participants: [
          'Bob',
        ],
      },
      {
        reason: 'CLASS: Instructional Support',
        count: 12,
        participants: [],
      },
      {
        reason: 'Fiscal / Budget',
        count: 0,
        participants: [
          'Louise',
        ],
      },
      {
        reason: 'Human Resources',
        count: 0,
        participants: [
          'Gene',
        ],
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

    let louise = screen.getByText(/louise/i);

    userEvent.click(louise);

    louise = screen.getByText(/louise/i);

    expect(louise.classList.contains('ar__multi-value__label')).toBe(true);
  });
});
