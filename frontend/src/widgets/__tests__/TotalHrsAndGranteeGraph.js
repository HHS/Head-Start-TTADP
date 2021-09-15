/* eslint-disable jest/no-disabled-tests */
import '@testing-library/jest-dom';
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { TotalHrsAndGranteeGraph, LegendControl } from '../TotalHrsAndGranteeGraph';

const TEST_DATA_MONTHS = [
  {
    name: 'Grantee Rec TTA', x: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'], y: [1, 2, 3, 4, 5, 6], month: [false, false, false, false, false, false],
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
    name: 'Grantee Rec TTA', x: ['1', '2', '3', '4'], y: [1, 2, 3, 4], month: ['Jan', 'Jan', 'Jan', 'Feb'],
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

const renderTotalHrsAndGranteeGraph = async (props) => (
  render(
    <TotalHrsAndGranteeGraph loading={props.loading || false} data={props.data} dateTime={{ timestamp: '', label: '05/27/1967-08/21/1968' }} />,
  )
);

describe('Total Hrs And Grantee Graph Widget', () => {
  it('shows the correct month data', async () => {
    renderTotalHrsAndGranteeGraph({ data: TEST_DATA_MONTHS });

    const graphTitle = screen.getByRole('heading', { name: /total tta hours/i });
    await expect(graphTitle).toBeInTheDocument();
    await expect(document.querySelector('svg')).toBeInTheDocument();

    // Get Trace Nodes.
    const nodes = document.querySelectorAll('.plot .scatterlayer');

    // Verify Number of Traces.
    await expect(nodes[0].childNodes.length).toEqual(3);

    // Verify Number of 'Grantee Rec TTA' Trace Points.
    // await expect(nodes[0].childNodes[0].childNodes[3].childNodes.length).toEqual(6);

    // Verify Number of 'Hours of Training' Trace Points.
    await expect(nodes[0].childNodes[0].childNodes[3].childNodes.length).toEqual(6);

    // Verify Number of 'Hours of Technical Assistance' Trace Points.
    await expect(nodes[0].childNodes[1].childNodes[3].childNodes.length).toEqual(6);

    // Verify Number of 'Hours of Both' Trace Points.
    await expect(nodes[0].childNodes[2].childNodes[3].childNodes.length).toEqual(6);
  });

  it('shows the correct day data', async () => {
    renderTotalHrsAndGranteeGraph({ data: TEST_DATA_DAYS });

    const graphTitle = screen.getByRole('heading', { name: /total tta hours/i });
    await expect(graphTitle).toBeInTheDocument();
    await expect(document.querySelector('svg')).toBeInTheDocument();

    // Get Trace Nodes.
    const nodes = document.querySelectorAll('.plot .scatterlayer');

    // Verify Number of Traces.
    await expect(nodes[0].childNodes.length).toEqual(3);

    // Verify Number of 'Grantee Rec TTA' Trace Points.
    await expect(nodes[0].childNodes[0].childNodes[3].childNodes.length).toEqual(4);

    // Verify Number of 'Hours of Training' Trace Points.
    await expect(nodes[0].childNodes[1].childNodes[3].childNodes.length).toEqual(4);

    // Verify Number of 'Hours of Technical Assistance' Trace Points.
    await expect(nodes[0].childNodes[2].childNodes[3].childNodes.length).toEqual(4);

    expect(document.querySelectorAll('.plot .scatterlayer .point').length).toBe(12);
    const training = screen.getByRole('checkbox', { name: /training/i });

    fireEvent.click(training);
    expect(document.querySelectorAll('.plot .scatterlayer .point').length).toBe(8);

    fireEvent.click(training);
    expect(document.querySelectorAll('.plot .scatterlayer .point').length).toBe(12);
  });

  it('handles undefined data', async () => {
    const data = undefined;
    renderTotalHrsAndGranteeGraph({ data });

    expect(await screen.findByText('Total TTA Hours')).toBeInTheDocument();
  });

  it('handles loading', async () => {
    renderTotalHrsAndGranteeGraph({ loading: true });
    expect(await screen.findByText('Loading Data')).toBeInTheDocument();
  });

  it('handles checkbox clicks', async () => {
    const setSelected = jest.fn();
    render(<LegendControl label="test" id="test" selected setSelected={setSelected} />);
    const checkbox = screen.getByRole('checkbox', { name: /test/i });
    fireEvent.click(checkbox);
    expect(setSelected).toHaveBeenCalled();
  });

  it('displays table data correctly', async () => {
    renderTotalHrsAndGranteeGraph({ data: TEST_DATA_DAYS });
    const button = screen.getByRole('button', { name: 'display total training and technical assistance hours as table' });
    fireEvent.click(button);
    const jan1 = screen.getByRole('columnheader', { name: /jan 1/i });
    const feb4 = screen.getByRole('columnheader', { name: /feb 4/i });
    expect(jan1).toBeInTheDocument();
    expect(feb4).toBeInTheDocument();
  });

  it('handles switching contexts', async () => {
    renderTotalHrsAndGranteeGraph({ data: TEST_DATA_MONTHS });
    const button = screen.getByRole('button', { name: 'display total training and technical assistance hours as table' });
    fireEvent.click(button);
    const table = screen.getByRole('table', { name: /total tta hours by date and type/i });

    const randomRowHeader = screen.getByRole('rowheader', { name: /grantee rec tta/i });
    expect(randomRowHeader).toBeInTheDocument();

    const randomColumnHeader = screen.getByRole('columnheader', { name: /apr/i });
    expect(randomColumnHeader).toBeInTheDocument();

    const cells = [];

    // eslint-disable-next-line no-plusplus
    for (let index = 2; index < 10; index++) {
      cells.push(screen.getByRole('cell', { name: `${index.toString()}` }));
    }

    expect(screen.getByRole('cell', { name: '11.2' })).toBeInTheDocument();
    cells.forEach((cell) => expect(cell).toBeInTheDocument());

    expect(table).toBeInTheDocument();
    fireEvent.click(button);
    expect(table).not.toBeInTheDocument();
  });
});
