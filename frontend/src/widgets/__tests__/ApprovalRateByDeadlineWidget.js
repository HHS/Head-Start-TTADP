import '@testing-library/jest-dom';
import React from 'react';
import {
  render,
  screen,
  fireEvent,
  act,
} from '@testing-library/react';
import { ApprovalRateByDeadlineWidget } from '../ApprovalRateByDeadlineWidget';

jest.mock('plotly.js-basic-dist', () => ({
  newPlot: jest.fn(),
}));

const buildData = (regions = [1, 2]) => ({
  regions,
  records: [
    {
      month_start: '2025-01-01',
      month_label: 'Jan 2025',
      national_pct: 80,
      national_total: 10,
      national_on_time: 8,
      regions: {
        1: { pct: 70, total: 5, on_time: 3 },
        2: { pct: 90, total: 5, on_time: 5 },
      },
    },
  ],
});

const makeMatchMedia = (matches = false) => ({
  matches,
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  addListener: jest.fn(),
  removeListener: jest.fn(),
});

describe('ApprovalRateByDeadlineWidget', () => {
  beforeEach(() => {
    window.matchMedia = jest.fn().mockImplementation(() => makeMatchMedia(false));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const clickChartAt = (
    clientX,
    bounds = { left: 0, width: 100, height: 50 },
    chartIndex = 0,
  ) => {
    const chart = screen.getAllByTestId('lines')[chartIndex];
    chart.getBoundingClientRect = jest.fn(() => ({
      top: 0,
      right: bounds.left + bounds.width,
      bottom: bounds.height,
      ...bounds,
    }));
    fireEvent.click(chart, { clientX });
  };

  it('renders region carousel controls and only shows next arrow on first region', () => {
    render(<ApprovalRateByDeadlineWidget data={buildData()} loading={false} />);

    expect(screen.getByText('Region 1')).toBeInTheDocument();
    expect(document.querySelectorAll('.approval-rate-carousel-dot').length).toBe(2);
    const nextButton = screen.getByRole('button', { name: /next region/i });
    const previousButton = screen.getByRole('button', { name: /previous region/i });
    expect(nextButton).toBeInTheDocument();
    expect(nextButton).not.toHaveClass('is-hidden');
    expect(previousButton).toHaveClass('is-hidden');
    expect(previousButton).toHaveAttribute('tabindex', '-1');
  });

  it('advances to the next region when clicking a dot', () => {
    render(<ApprovalRateByDeadlineWidget data={buildData()} loading={false} />);

    fireEvent.click(screen.getByRole('button', { name: /show region 2/i }));
    expect(screen.getByText('Region 2')).toBeInTheDocument();
  });

  it('advances to the next region when clicking next', () => {
    render(<ApprovalRateByDeadlineWidget data={buildData()} loading={false} />);

    fireEvent.click(screen.getByRole('button', { name: /next region/i }));
    expect(screen.getByText('Region 2')).toBeInTheDocument();
  });

  it('goes to the previous region when clicking previous', () => {
    render(<ApprovalRateByDeadlineWidget data={buildData()} loading={false} />);

    fireEvent.click(screen.getByRole('button', { name: /next region/i }));
    fireEvent.click(screen.getByRole('button', { name: /previous region/i }));
    expect(screen.getByText('Region 1')).toBeInTheDocument();
  });

  it('only shows previous arrow on last region', () => {
    render(<ApprovalRateByDeadlineWidget data={buildData()} loading={false} />);

    fireEvent.click(screen.getByRole('button', { name: /next region/i }));
    expect(screen.getByText('Region 2')).toBeInTheDocument();
    const previousButton = screen.getByRole('button', { name: /previous region/i });
    const nextButton = screen.getByRole('button', { name: /next region/i });
    expect(previousButton).toBeInTheDocument();
    expect(previousButton).not.toHaveClass('is-hidden');
    expect(nextButton).toHaveClass('is-hidden');
    expect(nextButton).toHaveAttribute('tabindex', '-1');
  });

  it('uses a generic legend label', () => {
    render(<ApprovalRateByDeadlineWidget data={buildData()} loading={false} />);

    expect(screen.getByText('Region')).toBeInTheDocument();
    expect(screen.getByText('National average')).toBeInTheDocument();
  });

  it('renders table with a national average column and total footer row', () => {
    render(<ApprovalRateByDeadlineWidget data={buildData()} loading={false} />);

    fireEvent.click(screen.getByRole('button', { name: /open actions for approval rate by deadline/i }));
    fireEvent.click(screen.getByRole('button', { name: /display table/i }));

    expect(screen.getByText('National average', { selector: 'span[aria-hidden="true"]' })).toBeInTheDocument();
    expect(screen.getAllByText('Total').length).toBeGreaterThan(0);
    expect(document.querySelector('#approval-rate-by-deadline-check-all-checkboxes')).toBeInTheDocument();
  });

  it('does not render the deprecated secondary header label', () => {
    render(<ApprovalRateByDeadlineWidget data={buildData()} loading={false} />);

    expect(screen.queryByText('Region and national average')).not.toBeInTheDocument();
    expect(screen.queryByText(/Filters not applied/i)).not.toBeInTheDocument();
  });

  it('renders filters not applied warning when explicitly flagged via prop', () => {
    render(
      <ApprovalRateByDeadlineWidget
        data={buildData()}
        showFiltersNotApplicable
        loading={false}
      />,
    );

    expect(screen.getByText(/Filters not applied/i)).toBeInTheDocument();
  });

  it('keeps the same region when clicking the active dot', () => {
    render(<ApprovalRateByDeadlineWidget data={buildData()} loading={false} />);

    fireEvent.click(screen.getByRole('button', { name: /show region 1/i }));
    expect(screen.getByText('Region 1')).toBeInTheDocument();
  });

  it('switches regions when clicking a dot', () => {
    render(<ApprovalRateByDeadlineWidget data={buildData()} loading={false} />);

    fireEvent.click(screen.getByRole('button', { name: /show region 2/i }));
    expect(screen.getByText('Region 2')).toBeInTheDocument();
  });

  it('animates when changing regions without reduced motion', () => {
    jest.useFakeTimers();

    render(<ApprovalRateByDeadlineWidget data={buildData()} loading={false} />);

    fireEvent.click(screen.getByRole('button', { name: /show region 2/i }));
    const frame = document.querySelector('.approval-rate-carousel-frame');
    expect(frame.className).not.toMatch(/is-animating/);

    act(() => {
      jest.advanceTimersByTime(0);
    });
    expect(frame.className).toMatch(/is-animating/);

    act(() => {
      jest.advanceTimersByTime(320);
    });
    expect(frame.className).not.toMatch(/is-animating/);

    jest.useRealTimers();
  });

  it('handles transitions when a falsy region id is present', () => {
    render(<ApprovalRateByDeadlineWidget data={buildData([0, 2])} loading={false} />);

    fireEvent.click(screen.getByRole('button', { name: /show region 2/i }));
    expect(screen.getByText('Region 2')).toBeInTheDocument();
  });

  it('supports backward carousel transitions', () => {
    render(<ApprovalRateByDeadlineWidget data={buildData([1, 2, 3])} loading={false} />);

    fireEvent.click(screen.getByRole('button', { name: /show region 3/i }));
    fireEvent.click(screen.getByRole('button', { name: /show region 1/i }));
    expect(screen.getByText('Region 1')).toBeInTheDocument();
  });

  it('renders without matchMedia support', () => {
    const originalMatchMedia = window.matchMedia;
    delete window.matchMedia;

    render(<ApprovalRateByDeadlineWidget data={buildData()} loading={false} />);
    expect(screen.getByText('Approval rate by deadline')).toBeInTheDocument();

    window.matchMedia = originalMatchMedia;
  });

  it('handles prefers reduced motion when switching regions', () => {
    window.matchMedia = jest.fn().mockImplementation(() => makeMatchMedia(true));

    render(<ApprovalRateByDeadlineWidget data={buildData()} loading={false} />);

    fireEvent.click(screen.getByRole('button', { name: /show region 2/i }));
    expect(screen.getByText('Region 2')).toBeInTheDocument();
  });

  it('renders when matchMedia returns null', () => {
    window.matchMedia = jest.fn().mockReturnValue(null);

    render(<ApprovalRateByDeadlineWidget data={buildData()} loading={false} />);

    expect(screen.getByText('Approval rate by deadline')).toBeInTheDocument();
  });

  it('prevents default on carousel navigation mousedown events', () => {
    render(<ApprovalRateByDeadlineWidget data={buildData()} loading={false} />);

    const nextButton = screen.getByRole('button', { name: /next region/i });
    const nextMouseDownEvent = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
    nextButton.dispatchEvent(nextMouseDownEvent);
    expect(nextMouseDownEvent.defaultPrevented).toBe(true);

    fireEvent.click(nextButton);

    const previousButton = screen.getByRole('button', { name: /previous region/i });
    const previousMouseDownEvent = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
    previousButton.dispatchEvent(previousMouseDownEvent);
    expect(previousMouseDownEvent.defaultPrevented).toBe(true);
  });

  it('ignores previous/next clicks when there is no previous or next region', () => {
    render(<ApprovalRateByDeadlineWidget data={buildData()} loading={false} />);

    fireEvent.click(screen.getByRole('button', { name: /previous region/i, hidden: true }));
    expect(screen.getByText('Region 1')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /next region/i }));
    expect(screen.getByText('Region 2')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /next region/i, hidden: true }));
    expect(screen.getByText('Region 2')).toBeInTheDocument();
  });

  it('changes regions when clicking the left or right half of the chart', () => {
    window.matchMedia = jest.fn().mockImplementation(() => makeMatchMedia(true));

    render(<ApprovalRateByDeadlineWidget data={buildData()} loading={false} />);

    clickChartAt(75);
    expect(screen.getByText('Region 2')).toBeInTheDocument();

    clickChartAt(25);
    expect(screen.getByText('Region 1')).toBeInTheDocument();
  });

  it('ignores chart clicks when the chart width is zero or a transition is active', () => {
    jest.useFakeTimers();

    render(<ApprovalRateByDeadlineWidget data={buildData([1, 2, 3])} loading={false} />);

    clickChartAt(10, { left: 0, width: 0, height: 50 });
    expect(screen.getByText('Region 1')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /show region 2/i }));
    expect(screen.getByText('Region 2')).toBeInTheDocument();

    clickChartAt(99, { left: 0, width: 100, height: 50 }, 0);
    expect(screen.getByText('Region 2')).toBeInTheDocument();

    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  it('renders with no regions without dots or arrows', () => {
    render(<ApprovalRateByDeadlineWidget data={buildData([])} loading={false} />);

    expect(screen.getByText('Region')).toBeInTheDocument();
    expect(document.querySelectorAll('.approval-rate-carousel-dot').length).toBe(0);
    expect(screen.queryByRole('button', { name: /next region/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /previous region/i })).not.toBeInTheDocument();
  });

  it('handles null data and renders no-results state', () => {
    render(<ApprovalRateByDeadlineWidget data={null} loading={false} />);

    expect(screen.getByText('No results found.')).toBeInTheDocument();
  });

  it('falls back when records are empty for defined regions', () => {
    render(<ApprovalRateByDeadlineWidget data={{ regions: [1], records: [] }} loading={false} />);

    expect(screen.getByText('No results found.')).toBeInTheDocument();
  });

  it('normalizes non-numeric values in rows and totals', () => {
    render(
      <ApprovalRateByDeadlineWidget
        loading={false}
        data={{
          regions: [1],
          records: [
            {
              month_start: '2025-01-01',
              month_label: 'Jan 2025',
              national_pct: Number.NaN,
              national_total: Number.NaN,
              national_on_time: Number.NaN,
              regions: {
                1: { pct: 'x', total: '2', on_time: '1' },
              },
            },
          ],
        }}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /open actions for approval rate by deadline/i }));
    fireEvent.click(screen.getByRole('button', { name: /display table/i }));

    expect(screen.getAllByText('0% (0 of 0)').length).toBeGreaterThan(0);
  });
});
