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
    // Week 2 displays because of the February hours, but the blank January cell has no outline.
    const blankMonitoredCell = screen.getByLabelText('January 2026, week 2: 0.0 hours');
    expect(blankMonitoredCell).toHaveClass('border', 'border-base-light');
    expect(blankMonitoredCell).not.toHaveClass('tta-hours-monitoring');
    expect(screen.queryByLabelText('January 2026, week 3: 0.0 hours')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('January 2026, week 4: 0.0 hours')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('January 2026, week 5: 0.0 hours')).not.toBeInTheDocument();
    expect(screen.getByLabelText('February 2026, week 2: 4.0 hours')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Current year' })).not.toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'February 2026' })).toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: 'December 2025' })).not.toBeInTheDocument();
    expect(screen.getByText('TTA duration (hours):')).toHaveClass('margin-right-1');
    expect(screen.getByText('Monitoring:')).toHaveClass('margin-right-1');
    expect(screen.getByRole('table', { name: 'TTA hours by month and week' })).toHaveClass(
      'border-top-1px',
      'border-base-light'
    );
    expect(
      screen.getByRole('region', { name: 'TTA hours by month and week' })
    ).toHaveAttribute('tabindex', '0');
    expect(fetchWidget).toHaveBeenCalledWith(
      'ttaHoursProvidedOverTime',
      'region.in[]=1&recipientId.ctn[]=401'
    );
  });

  it('uses the selected page date range without filtering sessions by event start date', async () => {
    render(<TTAHoursProvidedOverTime filters={filters} />);
    await screen.findByLabelText('January 2026, week 1: 3.5 hours, monitoring review');
    expect(screen.getByLabelText('February 2026, week 2: 4.0 hours')).toBeInTheDocument();
    expect(screen.queryByLabelText('February 2026, week 3: 0.0 hours')).not.toBeInTheDocument();
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
    expect(screen.queryByLabelText('January 2026, week 2: 0.0 hours')).not.toBeInTheDocument();
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

  it.each([
    ['a range filter', filters],
    [
      'separate bounds',
      [
        { topic: 'startDate', condition: 'is on or after', query: '01/01/2026' },
        { topic: 'startDate', condition: 'is on or before', query: '02/15/2026' },
        ...filters.slice(1),
      ],
    ],
  ])('does not display monitoring-only weeks for %s', async (_description, selectedFilters) => {
    fetchWidget.mockImplementation((widget) =>
      Promise.resolve(
        widget === 'ttaHoursProvidedOverTime'
          ? [{ startDate: '2026-01-15', duration: 5 }]
          : [{ startDate: '2026-01-06', endDate: '2026-01-10' }]
      )
    );

    render(<TTAHoursProvidedOverTime filters={selectedFilters} />);

    // The week 3 hours are the only displayed January weeks; the monitoring-only weeks 1 and 2 stay hidden.
    expect(await screen.findByLabelText('January 2026, week 3: 5.0 hours')).toBeInTheDocument();
    expect(
      screen.queryByLabelText('January 2026, week 1: 0.0 hours, monitoring review')
    ).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText('January 2026, week 2: 0.0 hours, monitoring review')
    ).not.toBeInTheDocument();
    // Week 3 displays because of the January hours; the empty February cell still renders within it.
    expect(screen.getByLabelText('February 2026, week 3: 0.0 hours')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'February 2026' })).toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: 'March 2026' })).not.toBeInTheDocument();
  });

  it('does not display weeks without hours', async () => {
    fetchWidget.mockImplementation((widget) =>
      Promise.resolve(
        widget === 'ttaHoursProvidedOverTime' ? [{ startDate: '2026-01-30', duration: 5 }] : []
      )
    );

    render(<TTAHoursProvidedOverTime filters={filters} />);

    expect(await screen.findByLabelText('January 2026, week 5: 5.0 hours')).toBeInTheDocument();
    expect(screen.queryByLabelText('January 2026, week 1: 0.0 hours')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('January 2026, week 2: 0.0 hours')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('January 2026, week 3: 0.0 hours')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('January 2026, week 4: 0.0 hours')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('February 2026, week 1: 0.0 hours')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('February 2026, week 4: 0.0 hours')).not.toBeInTheDocument();
    // The week 5 row displays because of the January hours; its empty February cell still renders within it.
    expect(screen.getByLabelText('February 2026, week 5: 0.0 hours')).toBeInTheDocument();
  });

  it.each([
    [[]],
    [[{ topic: 'startDate', condition: 'is on or after', query: '01/01/2026' }]],
    [[{ topic: 'startDate', condition: 'is on or before', query: '02/15/2026' }]],
  ])('does not show months without hours and complete bounds: %p', async (selectedFilters) => {
    fetchWidget.mockResolvedValue([]);
    render(<TTAHoursProvidedOverTime filters={selectedFilters} />);

    await waitFor(() => expect(fetchWidget).toHaveBeenCalledTimes(2));
    expect(screen.queryByRole('columnheader', { name: /2026/ })).not.toBeInTheDocument();
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
