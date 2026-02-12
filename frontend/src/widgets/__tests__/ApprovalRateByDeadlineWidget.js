import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
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

describe('ApprovalRateByDeadlineWidget', () => {
  beforeAll(() => {
    window.matchMedia = jest.fn().mockImplementation(() => ({
      matches: false,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      addListener: jest.fn(),
      removeListener: jest.fn(),
    }));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders region carousel controls with dots', () => {
    render(<ApprovalRateByDeadlineWidget data={buildData()} loading={false} />);

    expect(screen.getByText('Region 1')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /next region/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /previous region/i })).not.toBeInTheDocument();
    expect(document.querySelectorAll('.approval-rate-carousel-dot').length).toBe(2);
  });

  it('advances to the next region when clicking the arrow', () => {
    render(<ApprovalRateByDeadlineWidget data={buildData()} loading={false} />);

    fireEvent.click(screen.getByRole('button', { name: /next region/i }));
    expect(screen.getByText('Region 2')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /previous region/i })).toBeInTheDocument();
  });

  it('uses a generic legend label', () => {
    render(<ApprovalRateByDeadlineWidget data={buildData()} loading={false} />);

    expect(screen.getByText('Region')).toBeInTheDocument();
    expect(screen.getByText('National average')).toBeInTheDocument();
  });

  it('keeps the same region when clicking the active dot', () => {
    render(<ApprovalRateByDeadlineWidget data={buildData()} loading={false} />);

    fireEvent.click(screen.getByRole('button', { name: /show region 1/i }));
    expect(screen.getByText('Region 1')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /previous region/i })).not.toBeInTheDocument();
  });

  it('switches regions when clicking a dot', () => {
    render(<ApprovalRateByDeadlineWidget data={buildData()} loading={false} />);

    fireEvent.click(screen.getByRole('button', { name: /show region 2/i }));
    expect(screen.getByText('Region 2')).toBeInTheDocument();
  });

  it('animates when changing regions without reduced motion', () => {
    jest.useFakeTimers();

    render(<ApprovalRateByDeadlineWidget data={buildData()} loading={false} />);

    fireEvent.click(screen.getByRole('button', { name: /next region/i }));
    const frame = document.querySelector('.approval-rate-carousel-frame');
    expect(frame.className).not.toMatch(/is-animating/);

    jest.advanceTimersByTime(0);
    expect(frame.className).toMatch(/is-animating/);

    jest.advanceTimersByTime(320);
    expect(frame.className).not.toMatch(/is-animating/);

    jest.useRealTimers();
  });

  it('handles transitions when a falsy region id is present', () => {
    render(<ApprovalRateByDeadlineWidget data={buildData([0, 2])} loading={false} />);

    fireEvent.click(screen.getByRole('button', { name: /next region/i }));
    expect(screen.getByText('Region 2')).toBeInTheDocument();
  });

  it('renders without matchMedia support', () => {
    const originalMatchMedia = window.matchMedia;
    delete window.matchMedia;

    render(<ApprovalRateByDeadlineWidget data={buildData()} loading={false} />);
    expect(screen.getByText('Approval rate by deadline')).toBeInTheDocument();

    window.matchMedia = originalMatchMedia;
  });

  it('handles prefers reduced motion when switching regions', () => {
    window.matchMedia = jest.fn().mockImplementation(() => ({
      matches: true,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      addListener: jest.fn(),
      removeListener: jest.fn(),
    }));

    render(<ApprovalRateByDeadlineWidget data={buildData()} loading={false} />);

    fireEvent.click(screen.getByRole('button', { name: /next region/i }));
    expect(screen.getByText('Region 2')).toBeInTheDocument();
  });

  it('renders with no regions without dots or arrows', () => {
    render(<ApprovalRateByDeadlineWidget data={buildData([])} loading={false} />);

    expect(screen.getByText('Region')).toBeInTheDocument();
    expect(document.querySelectorAll('.approval-rate-carousel-dot').length).toBe(0);
    expect(screen.queryByRole('button', { name: /next region/i })).not.toBeInTheDocument();
  });
});
