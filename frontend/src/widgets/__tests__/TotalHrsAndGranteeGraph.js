import '@testing-library/jest-dom';
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { TotalHrsAndGranteeGraph } from '../TotalHrsAndGranteeGraph';

const TEST_DATA_MONTHS = [
  { name: 'Grantee Rec TTA', x: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'], y: [1, 2, 3, 4, 5, 6] },
  { name: 'Hours of Training', x: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'], y: [7, 8, 9, 0, 0, 0] },
  { name: 'Hours of Technical Assistance', x: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'], y: [0, 0, 0, 10, 11, 12] },
  { name: 'Hours of Both', x: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'], y: [0, 13, 0, 14, 0, 0] },
];

const TEST_DATA_DAYS = [
  { name: 'Grantee Rec TTA', x: ['1', '2', '3', '4'], y: [1, 2, 3, 4] },
  { name: 'Hours of Training', x: ['1', '2', '3', '4'], y: [5, 6, 7, 0] },
  { name: 'Hours of Technical Assistance', x: ['1', '2', '3', '4'], y: [8, 9, 0, 0] },
  { name: 'Hours of Both', x: ['1', '2', '3', '4'], y: [10, 0, 0, 0] },
];

const renderTotalHrsAndGranteeGraph = async (props) => (
  render(
    <TotalHrsAndGranteeGraph data={props.data} dateTime={{ timestamp: '', label: '05/27/1967-08/21/1968' }} />,
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
    // await expect(nodes[0].childNodes[0].childNodes[3].childNodes.length).toEqual(4);

    // Verify Number of 'Grantee Rec TTA' Trace Points.
    await expect(nodes[0].childNodes[0].childNodes[3].childNodes.length).toEqual(4);

    // Verify Number of 'Hours of Training' Trace Points.
    await expect(nodes[0].childNodes[1].childNodes[3].childNodes.length).toEqual(4);

    // Verify Number of 'Hours of Technical Assistance' Trace Points.
    await expect(nodes[0].childNodes[2].childNodes[3].childNodes.length).toEqual(4);
  });

  it('handles null data', async () => {
    const data = null;
    renderTotalHrsAndGranteeGraph({ data });

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('handles switching contexts', async () => {
    renderTotalHrsAndGranteeGraph({ data: TEST_DATA_MONTHS });
    const button = screen.getByRole('button', { name: /show accessible data/i });
    fireEvent.click(button);
    const table = screen.getByRole('table', { name: /total tta hours by date and type/i });

    const randomRowHeader = screen.getByRole('rowheader', { name: /grantee rec tta/i });
    expect(randomRowHeader).toBeInTheDocument();
    const randomColumnHeader = screen.getByRole('columnheader', { name: /apr/i });
    expect(randomColumnHeader).toBeInTheDocument();

    const cells = [];

    // eslint-disable-next-line no-plusplus
    for (let index = 2; index < 15; index++) {
      cells.push(screen.getByRole('cell', { name: `${index.toString()} hours` }));
    }

    cells.forEach((cell) => expect(cell).toBeInTheDocument());

    expect(table).toBeInTheDocument();
    fireEvent.click(button);
    expect(table).not.toBeInTheDocument();
  });
});
