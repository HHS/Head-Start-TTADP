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
  { topic: 'startDate', condition: 'is within', query: '01/01/2026-02/15/2026' },
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
              { startDate: '2026-02-10', duration: 4 },
              { startDate: '2026-03-02', duration: 6 },
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
    expect(screen.queryByRole('button', { name: 'Current year' })).not.toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'February 2026' })).toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: 'December 2025' })).not.toBeInTheDocument();
    expect(fetchWidget).toHaveBeenCalledWith(
      'ttaHoursProvidedOverTime',
      'region.in[]=1&recipientId.ctn[]=401'
    );
  });

  it('uses the selected page date range without filtering sessions by event start date', async () => {
    render(<TTAHoursProvidedOverTime filters={filters} />);
    await screen.findByLabelText('January 2026, week 1: 3.5 hours, monitoring review');
    expect(screen.getByLabelText('February 2026, week 3: 0.0 hours')).toBeInTheDocument();
    expect(screen.queryByLabelText('December 2025, week 5: 7.0 hours')).not.toBeInTheDocument();
    expect(fetchWidget).toHaveBeenCalledWith(
      'ttaHoursProvidedOverTime',
      'region.in[]=1&recipientId.ctn[]=401'
    );
  });

  it('uses an on-or-after filter as an inclusive lower bound', async () => {
    const lowerBoundFilters = [
      { topic: 'startDate', condition: 'is on or after', query: '01/07/2026' },
      ...filters.slice(1),
    ];
    render(<TTAHoursProvidedOverTime filters={lowerBoundFilters} />);

    expect(
      await screen.findByLabelText('January 2026, week 1: 1.5 hours, monitoring review')
    ).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'March 2026' })).toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: 'December 2025' })).not.toBeInTheDocument();
    expect(fetchWidget).toHaveBeenCalledWith(
      'ttaHoursProvidedOverTime',
      'region.in[]=1&recipientId.ctn[]=401'
    );
  });

  it('uses an on-or-before filter as an inclusive upper bound', async () => {
    const upperBoundFilters = [
      { topic: 'startDate', condition: 'is on or before', query: '01/07/2026' },
      ...filters.slice(1),
    ];
    render(<TTAHoursProvidedOverTime filters={upperBoundFilters} />);

    expect(
      await screen.findByLabelText('January 2026, week 1: 3.5 hours, monitoring review')
    ).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'December 2025' })).toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: 'February 2026' })).not.toBeInTheDocument();
    expect(screen.getByLabelText('January 2026, week 2: 0.0 hours')).not.toHaveClass(
      'tta-hours-monitoring'
    );
    expect(fetchWidget).toHaveBeenCalledWith(
      'ttaHoursProvidedOverTime',
      'region.in[]=1&recipientId.ctn[]=401'
    );
  });

  it('combines on-or-after and on-or-before filters', async () => {
    const boundedFilters = [
      { topic: 'startDate', condition: 'is on or after', query: '01/07/2026' },
      { topic: 'startDate', condition: 'is on or before', query: '02/15/2026' },
      ...filters.slice(1),
    ];
    render(<TTAHoursProvidedOverTime filters={boundedFilters} />);

    expect(await screen.findByLabelText('February 2026, week 2: 4.0 hours')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'January 2026' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'February 2026' })).toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: 'March 2026' })).not.toBeInTheDocument();
    expect(fetchWidget).toHaveBeenCalledWith(
      'ttaHoursProvidedOverTime',
      'region.in[]=1&recipientId.ctn[]=401'
    );
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
