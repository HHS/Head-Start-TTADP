/* eslint-disable no-plusplus */
/* eslint-disable jest/no-disabled-tests */
import '@testing-library/jest-dom';
import React from 'react';
import {
  fireEvent,
  render,
  screen,
  act,
} from '@testing-library/react';
import LegendControl from '../LegendControl';
import { TotalHrsAndRecipientGraph } from '../TotalHrsAndRecipientGraph';

const TEST_DATA_MONTHS = [
  {
    name: 'Recipient Rec TTA', x: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'], y: [1, 2, 3, 4, 5, 6], month: [false, false, false, false, false, false],
  },
  {
    name: 'Hours of Training', x: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'], y: [7, 8, 9, 0, 0, 0], month: [false, false, false, false, false, false],
  },
  {
    name: 'Hours of Technical Assistance', x: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'], y: [0, 0, 0, 10, 11.2348732847, 12], month: [false, false, false, false, false, false],
  },
  {
    name: 'Hours of Both', x: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'], y: [0, 13, 0, 14, 0, 0], month: [false, false, false, false, false, false],
  },
];

const TEST_DATA_DAYS = [
  {
    name: 'Recipient Rec TTA', x: ['1', '2', '3', '4'], y: [1, 2, 3, 4], month: ['Jan', 'Jan', 'Jan', 'Feb'],
  },
  {
    name: 'Hours of Training', x: ['1', '2', '3', '4'], y: [5, 6, 7, 0], month: ['Jan', 'Jan', 'Jan', 'Feb'],
  },
  {
    name: 'Hours of Technical Assistance', x: ['1', '2', '3', '4'], y: [8, 9, 0, 0], month: ['Jan', 'Jan', 'Jan', 'Feb'],
  },
  {
    name: 'Hours of Both', x: ['1', '2', '3', '4'], y: [10, 0, 0, 0], month: ['Jan', 'Jan', 'Jan', 'Feb'],
  },
];

const renderTotalHrsAndRecipientGraph = async (props) => (
  render(
    <TotalHrsAndRecipientGraph loading={props.loading || false} data={props.data} dateTime={{ timestamp: '', label: '05/27/1967-08/21/1968' }} />,
  )
);

describe('Total Hrs And Recipient Graph Widget', () => {
  it('shows the correct month data', async () => {
    expect(() => {
      act(() => {
        renderTotalHrsAndRecipientGraph({ data: TEST_DATA_MONTHS });
      });
    }).not.toThrow();

    const svgGraph = document.querySelector('.plot-container.plotly svg');
    expect(svgGraph).toBeInTheDocument();
  });

  it('shows the correct day data', async () => {
    expect(() => {
      act(() => {
        renderTotalHrsAndRecipientGraph({ data: TEST_DATA_DAYS });
      });
    }).not.toThrow();

    const svgGraph = document.querySelector('.plot-container.plotly svg');
    expect(svgGraph).toBeInTheDocument();
  });

  it('handles undefined data', async () => {
    const data = undefined;
    renderTotalHrsAndRecipientGraph({ data });

    expect(await screen.findByText(/Total TTA Hours/i)).toBeInTheDocument();
  });

  it('handles checkbox clicks', async () => {
    const setSelected = jest.fn();
    render(<LegendControl shape="circle" label="test" id="test" selected setSelected={setSelected} />);
    const checkbox = screen.getByRole('checkbox', { name: /test/i });
    fireEvent.click(checkbox);
    expect(setSelected).toHaveBeenCalled();
  });

  it('expertly handles large datasets', async () => {
    const largeDataSet = [{
      name: 'Hours of Training', x: ['Sep-20', 'Oct-20', 'Nov-20', 'Dec-20', 'Jan-21', 'Feb-21', 'Mar-21', 'Apr-21', 'May-21', 'Jun-21', 'Jul-21', 'Aug-21', 'Sep-21', 'Oct-21', 'Nov-21', 'Dec-21', 'Jan-22', 'Feb-22', 'Mar-22', 'Apr-22', 'May-22', 'Jun-22', 'Jul-22', 'Aug-22', 'Sep-22'], y: [87.5, 209, 406.50000000000006, 439.4, 499.40000000000003, 493.6, 443.5, 555, 527.5, 428.5, 295, 493.5, 533.5, 680.5, 694, 278, 440, 611, 761.5, 534, 495.5, 551, 338.5, 772, 211], month: [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false],
    }, {
      name: 'Hours of Technical Assistance', x: ['Sep-20', 'Oct-20', 'Nov-20', 'Dec-20', 'Jan-21', 'Feb-21', 'Mar-21', 'Apr-21', 'May-21', 'Jun-21', 'Jul-21', 'Aug-21', 'Sep-21', 'Oct-21', 'Nov-21', 'Dec-21', 'Jan-22', 'Feb-22', 'Mar-22', 'Apr-22', 'May-22', 'Jun-22', 'Jul-22', 'Aug-22', 'Sep-22'], y: [509.90000000000003, 1141.8999999999994, 1199.3999999999996, 1109.6999999999998, 1302.3999999999996, 1265.3999999999996, 1404.6, 1328, 1257.5, 1170, 1069.5, 1178, 1215.5, 1426.5, 1219.5, 1063, 1151, 1316, 1436, 1400, 1518.5, 1353, 1238, 1202, 578], month: [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false],
    }, {
      name: 'Hours of Both', x: ['Sep-20', 'Oct-20', 'Nov-20', 'Dec-20', 'Jan-21', 'Feb-21', 'Mar-21', 'Apr-21', 'May-21', 'Jun-21', 'Jul-21', 'Aug-21', 'Sep-21', 'Oct-21', 'Nov-21', 'Dec-21', 'Jan-22', 'Feb-22', 'Mar-22', 'Apr-22', 'May-22', 'Jun-22', 'Jul-22', 'Aug-22', 'Sep-22'], y: [55, 134.5, 173, 137.5, 190, 248.8, 234.3, 230, 193.5, 187.5, 200.5, 202.5, 224.5, 299.5, 155, 206.5, 209.5, 251.5, 234, 206, 235.5, 245, 279.5, 274.5, 155.5], month: [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false],
    }];

    act(() => {
      renderTotalHrsAndRecipientGraph({ data: largeDataSet });
    });

    const svgGraph = document.querySelector('.plot-container.plotly svg');
    expect(svgGraph).toBeInTheDocument();
  });
});
