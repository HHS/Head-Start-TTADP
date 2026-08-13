import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import React, { createRef } from 'react';
import useSize from '../../hooks/useSize';
import CompliantReviewsGrid from '../CompliantReviewsGrid';

const mockPlot = jest.fn((props) => (
  <div
    data-testid="plotly-chart"
    data-trace-names={(props.data || []).map((trace) => trace.name).join('|')}
    data-width={props.layout?.width}
  />
));

jest.mock('../../hooks/useSize', () => jest.fn());
jest.mock('react-plotly.js/factory', () => jest.fn(() => mockPlot));
jest.mock('plotly.js-basic-dist', () => ({}));

describe('CompliantReviewsGrid', () => {
  const widgetRef = createRef();

  const data = {
    months: ['2026-01', '2026-02'],
    reviews: [
      { name: 'With TTA support', values: [2, 1] },
      { name: 'Without TTA support', values: [3, 4] },
      { name: 'Total', values: [5, 5] },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the chart and legend when size is available', async () => {
    useSize.mockReturnValue({ width: 960 });

    render(<CompliantReviewsGrid data={data} widgetRef={widgetRef} />);

    expect(await screen.findByTestId('plotly-chart')).toBeInTheDocument();
    expect(screen.getByText('With TTA support')).toBeInTheDocument();
    expect(screen.getByText('Without TTA support')).toBeInTheDocument();
    expect(screen.queryByText('Total')).not.toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByTestId('plotly-chart')).toHaveAttribute('data-width', '960');
      expect(screen.getByTestId('plotly-chart')).toHaveAttribute(
        'data-trace-names',
        'With TTA support|Without TTA support'
      );
    });
  });

  it('does not render chart content until a size is available', () => {
    useSize.mockReturnValue(null);

    render(<CompliantReviewsGrid data={data} widgetRef={widgetRef} />);

    expect(screen.queryByTestId('plotly-chart')).not.toBeInTheDocument();
    expect(screen.queryByText('With TTA support')).not.toBeInTheDocument();
  });
});
