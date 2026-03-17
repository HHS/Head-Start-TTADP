import '@testing-library/jest-dom';
import React from 'react';
import {
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import LineGraphWidget from '../LineGraphWidget';
import useWidgetExport from '../../hooks/useWidgetExport';

jest.mock('plotly.js-basic-dist', () => ({
  newPlot: jest.fn(),
}));
jest.mock('../../hooks/useWidgetExport', () => jest.fn());

const mockExportRows = jest.fn();

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

const LEGEND_CONFIG = [
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
];

const renderLineGraphWidget = (title = 'Test line graph') => render(
  <LineGraphWidget
    title={title}
    exportName={title}
    data={DATA}
    xAxisTitle="Date range"
    yAxisTitle="Count"
    legendConfig={LEGEND_CONFIG}
  />,
);

describe('LineGraphWidget', () => {
  beforeEach(() => {
    mockExportRows.mockClear();
    useWidgetExport.mockReturnValue({
      exportRows: mockExportRows,
    });
  });

  it('toggles between line graph and tabular data', async () => {
    renderLineGraphWidget();

    expect(await screen.findByText('Test line graph')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('context-menu-actions-btn'));
    fireEvent.click(screen.getByText('Display table'));

    expect(await screen.findByText('TTA Provided')).toBeInTheDocument();
    expect(screen.getAllByText('Jan 1').length).toBeGreaterThan(0);
    expect(screen.getByText('1.2')).toBeInTheDocument();
  });

  it('uses a slugified title for the screenshot menu item id', async () => {
    renderLineGraphWidget();

    fireEvent.click(screen.getByTestId('context-menu-actions-btn'));

    expect(await screen.findByRole('button', { name: 'Save screenshot' })).toHaveAttribute(
      'id',
      'rd-test-line-graph-save-screenshot',
    );
  });

  it('exports table data when tabular view is shown', async () => {
    renderLineGraphWidget();

    fireEvent.click(screen.getByTestId('context-menu-actions-btn'));
    fireEvent.click(screen.getByText('Display table'));
    expect(await screen.findByText('TTA Provided')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('context-menu-actions-btn'));
    const exportButton = screen.getByRole('button', { name: 'Export table data' });
    expect(exportButton).toHaveAttribute('id', 'rd-test-line-graph-export-table-data');
    fireEvent.click(exportButton);

    expect(mockExportRows).toHaveBeenCalledWith('all');
  });
});
