import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import React from 'react';
import Dashboard from '../Dashboard';
import MonitoringReportDashboard from '../MonitoringReportDashboard';

jest.mock('../ActivityReportDashboard', () => () => <div data-testid="ar-dashboard" />);
jest.mock('../AllReports', () => () => <div data-testid="all-reports-dashboard" />);
jest.mock('../RecipientSpotlightDashboard', () => () => <div data-testid="spotlight-dashboard" />);
jest.mock('../TrainingReportDashboard', () => () => <div data-testid="tr-dashboard" />);
jest.mock('../MonitoringReportDashboard');

describe('Dashboard - monitoring date filter expansion', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    MonitoringReportDashboard.mockImplementation(({ filtersToApply }) => (
      <div data-testid="monitoring-dashboard">{JSON.stringify(filtersToApply)}</div>
    ));
  });

  const defaultProps = {
    resetPagination: false,
    setResetPagination: jest.fn(),
    filterKey: 'test-key',
    userHasOnlyOneRegion: false,
  };

  it('expands startDate filter into both startDate and reportDeliveryDate for monitoring', () => {
    const filters = [
      {
        id: 'date-1',
        topic: 'startDate',
        condition: 'is within',
        query: '2025/01/01-2025/06/30',
      },
    ];

    render(<Dashboard {...defaultProps} reportType="monitoring" filters={filters} />);

    expect(MonitoringReportDashboard).toHaveBeenCalledTimes(1);
    const passedFilters = MonitoringReportDashboard.mock.calls[0][0].filtersToApply;

    // Should contain both the original startDate filter and a duplicated reportDeliveryDate filter
    const startDateFilters = passedFilters.filter((f) => f.topic === 'startDate');
    const reportDeliveryDateFilters = passedFilters.filter((f) => f.topic === 'reportDeliveryDate');

    expect(startDateFilters).toHaveLength(1);
    expect(reportDeliveryDateFilters).toHaveLength(1);

    expect(startDateFilters[0]).toEqual({
      id: 'date-1',
      topic: 'startDate',
      condition: 'is within',
      query: '2025/01/01-2025/06/30',
    });

    expect(reportDeliveryDateFilters[0]).toEqual({
      topic: 'reportDeliveryDate',
      condition: 'is within',
      query: '2025/01/01-2025/06/30',
    });
  });

  it('expands array startDate queries into multiple reportDeliveryDate entries', () => {
    const filters = [
      {
        id: 'date-2',
        topic: 'startDate',
        condition: 'is within',
        query: ['2025/01/01-2025/03/31', '2025/04/01-2025/06/30'],
      },
    ];

    render(<Dashboard {...defaultProps} reportType="monitoring" filters={filters} />);

    const passedFilters = MonitoringReportDashboard.mock.calls[0][0].filtersToApply;

    const startDateFilters = passedFilters.filter((f) => f.topic === 'startDate');
    const reportDeliveryDateFilters = passedFilters.filter((f) => f.topic === 'reportDeliveryDate');

    // Array queries expand each element individually
    expect(startDateFilters).toHaveLength(2);
    expect(reportDeliveryDateFilters).toHaveLength(2);

    expect(reportDeliveryDateFilters[0]).toEqual({
      topic: 'reportDeliveryDate',
      condition: 'is within',
      query: '2025/01/01-2025/03/31',
    });

    expect(reportDeliveryDateFilters[1]).toEqual({
      topic: 'reportDeliveryDate',
      condition: 'is within',
      query: '2025/04/01-2025/06/30',
    });
  });

  it('does not add reportDeliveryDate for non-startDate filters in monitoring', () => {
    const filters = [
      {
        id: 'region-1',
        topic: 'region',
        condition: 'is',
        query: '1',
      },
    ];

    render(<Dashboard {...defaultProps} reportType="monitoring" filters={filters} />);

    const passedFilters = MonitoringReportDashboard.mock.calls[0][0].filtersToApply;

    const reportDeliveryDateFilters = passedFilters.filter((f) => f.topic === 'reportDeliveryDate');
    expect(reportDeliveryDateFilters).toHaveLength(0);
  });

  it('does not expand startDate into reportDeliveryDate for non-monitoring report types', () => {
    // expandFilters (used for non-monitoring) does not duplicate startDate as reportDeliveryDate
    const { expandFilters } = require('../../../../utils');

    const filters = [
      {
        id: 'date-3',
        topic: 'startDate',
        condition: 'is within',
        query: '2025/01/01-2025/06/30',
      },
    ];

    const expanded = expandFilters(filters);
    const reportDeliveryDateFilters = expanded.filter((f) => f.topic === 'reportDeliveryDate');
    expect(reportDeliveryDateFilters).toHaveLength(0);
  });
});
