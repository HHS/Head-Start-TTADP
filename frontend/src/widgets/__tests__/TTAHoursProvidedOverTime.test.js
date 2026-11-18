import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import fetchWidget from '../../fetchers/Widgets';
import useMediaCapture from '../../hooks/useMediaCapture';
import TTAHoursProvidedOverTime from '../TTAHoursProvidedOverTime';

jest.mock('../../fetchers/Widgets');
jest.mock('../../hooks/useMediaCapture');
jest.mock(
  'focus-trap-react',
  () =>
    ({ children }) =>
      children
);

const filters = [
  { topic: 'startDate', condition: 'is within', query: '01/01/2026-11/17/2026' },
  { topic: 'region', condition: 'is', query: '1' },
  { topic: 'recipientId', condition: 'contains', query: '401' },
];

describe('TTA hours provided over time', () => {
  const capture = jest.fn();

  beforeEach(() => {
    jest.spyOn(Date, 'now').mockReturnValue(new Date('2026-11-17T12:00:00Z').valueOf());
    useMediaCapture.mockReturnValue(capture);
    fetchWidget.mockImplementation((widget) =>
      Promise.resolve(
        widget === 'ttaHoursProvidedOverTime'
          ? [
              { startDate: '2026-01-02', duration: 2 },
              { startDate: '2026-01-07', duration: 1.5 },
              { startDate: '2025-12-29', duration: 7 },
            ]
          : [{ startDate: '2026-01-06', endDate: '2026-01-10' }]
      )
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it('aggregates hours by week and outlines overlapping monitoring periods', async () => {
    render(<TTAHoursProvidedOverTime filters={filters} />);
    expect(
      await screen.findByLabelText('January 2026, week 1: 3.5 hours, monitoring review')
    ).toHaveClass('tta-hours-monitoring');
    expect(screen.getByLabelText('January 2026, week 2: 0.0 hours, monitoring review')).toHaveClass(
      'tta-hours-monitoring'
    );
    expect(screen.getByRole('button', { name: 'Current year' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(fetchWidget).toHaveBeenCalledWith(
      'ttaHoursProvidedOverTime',
      'region.in[]=1&recipientId.ctn[]=401'
    );
  });

  it('changes periods without filtering training sessions by their event start date', async () => {
    render(<TTAHoursProvidedOverTime filters={filters} />);
    await screen.findByLabelText('January 2026, week 1: 3.5 hours, monitoring review');
    userEvent.click(screen.getByRole('button', { name: 'Previous year' }));
    expect(screen.getByLabelText('December 2025, week 5: 7.0 hours')).toBeInTheDocument();
    userEvent.click(screen.getByRole('button', { name: 'Last 6 months' }));
    expect(screen.getByRole('button', { name: 'Last 6 months' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(screen.getByLabelText('June 2026, week 1: 0.0 hours')).toBeInTheDocument();
    expect(screen.queryByLabelText('May 2026, week 1: 0.0 hours')).not.toBeInTheDocument();
    expect(fetchWidget).toHaveBeenCalledTimes(2);
  });

  it('offers the drawer, screenshot, and deferred table view', async () => {
    render(<TTAHoursProvidedOverTime filters={filters} />);
    await waitFor(() => expect(fetchWidget).toHaveBeenCalledTimes(2));
    userEvent.click(screen.getByRole('button', { name: 'About this data' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    userEvent.click(screen.getByRole('button', { name: 'Close' }));
    userEvent.click(screen.getByRole('button', { name: /Open Actions for TTA hours/i }));
    userEvent.click(screen.getByRole('button', { name: 'Save screenshot' }));
    expect(capture).toHaveBeenCalled();
    userEvent.click(screen.getByRole('button', { name: /Open Actions for TTA hours/i }));
    userEvent.click(screen.getByRole('button', { name: 'Display table' }));
    expect(screen.getByText('Table view is not yet available.')).toBeInTheDocument();
    userEvent.click(screen.getByRole('button', { name: /Open Actions for TTA hours/i }));
    userEvent.click(screen.getByRole('button', { name: 'Display graph' }));
    expect(screen.getByRole('table', { name: 'TTA hours by month and week' })).toBeInTheDocument();
  });
});
