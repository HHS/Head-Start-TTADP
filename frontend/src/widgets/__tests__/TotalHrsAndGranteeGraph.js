import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { TotalHrsAndGranteeGraph } from '../TotalHrsAndGranteeGraph';

const TEST_DATA_MONTHS = [
  { name: 'All Dates', x: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'], y: [null, null, null, null, null, null] },
  { name: 'Grantee Rec TTA', x: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'], y: [1, 2, 3, 4, 5, 6] },
  { name: 'Hours of Training', x: ['Jan', 'Feb', 'Mar'], y: [7, 8, 9] },
  { name: 'Hours of Technical Assistance', x: ['Apr', 'May', 'Jun'], y: [10, 11, 12] },
  { name: 'Hours of Both', x: ['Feb', 'Apr'], y: [13, 14] },
];

const TEST_DATA_DAYS = [
  { name: 'All Dates', x: ['1', '2', '3', '4'], y: [null, null, null, null] },
  { name: 'Grantee Rec TTA', x: ['1', '2', '3', '4'], y: [1, 2, 3, 4] },
  { name: 'Hours of Training', x: ['1', '2', '3'], y: [5, 6, 7] },
  { name: 'Hours of Technical Assistance', x: ['1', '2'], y: [8, 9] },
  { name: 'Hours of Both', x: ['1'], y: [10] },
];

const renderTotalHrsAndGranteeGraph = async (props) => (
  render(
    <TotalHrsAndGranteeGraph data={props.data} dateTime={{ dateInExpectedFormat: '', prettyPrintedQuery: '05/27/1967-08/21/1968' }} />,
  )
);

describe('Total Hrs And Grantee Graph Widget', () => {
  it('shows the correct month data', async () => {
    renderTotalHrsAndGranteeGraph({ data: TEST_DATA_MONTHS });

    const graphTitle = screen.getByRole('heading', { name: /total hours of tta and number of grants served/i });
    await expect(graphTitle).toBeInTheDocument();
    await expect(document.querySelector('svg')).toBeInTheDocument();

    // Get Trace Nodes.
    const nodes = document.querySelectorAll('.plot .scatterlayer');

    // Verify Number of Traces.
    await expect(nodes[0].childNodes.length).toEqual(5);

    // Verify All Dates
    await expect(nodes[0].childNodes[0].childNodes[3].childNodes.length).toEqual(0);

    // Verify Number of 'Grantee Rec TTA' Trace Points.
    await expect(nodes[0].childNodes[1].childNodes[3].childNodes.length).toEqual(6);

    // Verify Number of 'Hours of Training' Trace Points.
    await expect(nodes[0].childNodes[2].childNodes[3].childNodes.length).toEqual(3);

    // Verify Number of 'Hours of Technical Assistance' Trace Points.
    await expect(nodes[0].childNodes[3].childNodes[3].childNodes.length).toEqual(3);

    // Verify Number of 'Hours of Both' Trace Points.
    await expect(nodes[0].childNodes[4].childNodes[3].childNodes.length).toEqual(2);
  });

  it('shows the correct day data', async () => {
    renderTotalHrsAndGranteeGraph({ data: TEST_DATA_DAYS });

    const graphTitle = screen.getByRole('heading', { name: /total hours of tta and number of grants served/i });
    await expect(graphTitle).toBeInTheDocument();
    await expect(document.querySelector('svg')).toBeInTheDocument();

    // Get Trace Nodes.
    const nodes = document.querySelectorAll('.plot .scatterlayer');

    // Verify Number of Traces.
    await expect(nodes[0].childNodes.length).toEqual(5);

    // Verify Number of 'Grantee Rec TTA' Trace Points.
    await expect(nodes[0].childNodes[0].childNodes[3].childNodes.length).toEqual(0);

    // Verify Number of 'Grantee Rec TTA' Trace Points.
    await expect(nodes[0].childNodes[1].childNodes[3].childNodes.length).toEqual(4);

    // Verify Number of 'Hours of Training' Trace Points.
    await expect(nodes[0].childNodes[2].childNodes[3].childNodes.length).toEqual(3);

    // Verify Number of 'Hours of Technical Assistance' Trace Points.
    await expect(nodes[0].childNodes[3].childNodes[3].childNodes.length).toEqual(2);

    // Verify Number of 'Hours of Both' Trace Points.
    await expect(nodes[0].childNodes[4].childNodes[3].childNodes.length).toEqual(1);
  });

  it('handles null data', async () => {
    const data = null;
    renderTotalHrsAndGranteeGraph({ data });

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });
});
