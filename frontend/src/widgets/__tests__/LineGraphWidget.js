import '@testing-library/jest-dom';
import React from 'react';
import {
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import LineGraphWidget from '../LineGraphWidget';

jest.mock('plotly.js-basic-dist', () => ({
  newPlot: jest.fn(),
}));

const DATA = [
  {
    name: 'Series A',
    x: ['1', '2'],
    y: [1.234, 2],
    month: ['Jan', 'Feb'],
    trace: 'circle',
    id: 'series-a',
  },
  {
    name: 'Series B',
    x: ['1', '2'],
    y: [3, 4],
    month: ['Jan', 'Feb'],
    trace: 'triangle',
    id: 'series-b',
  },
];

describe('LineGraphWidget', () => {
  it('toggles between line graph and tabular data', async () => {
    render(
      <LineGraphWidget
        title="Test line graph"
        exportName="Test line graph"
        data={DATA}
        xAxisTitle="Date range"
        yAxisTitle="Count"
        legendConfig={[
          {
            label: 'Series A',
            selected: true,
            shape: 'circle',
            id: 'series-a-checkbox',
            traceId: 'series-a',
          },
          {
            label: 'Series B',
            selected: true,
            shape: 'triangle',
            id: 'series-b-checkbox',
            traceId: 'series-b',
          },
        ]}
      />,
    );

    expect(await screen.findByText('Test line graph')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('context-menu-actions-btn'));
    fireEvent.click(screen.getByText('Display table'));

    expect(await screen.findByText('TTA Provided')).toBeInTheDocument();
    expect(screen.getAllByText('Jan 1').length).toBeGreaterThan(0);
    expect(screen.getByText('1.2')).toBeInTheDocument();
  });
});
