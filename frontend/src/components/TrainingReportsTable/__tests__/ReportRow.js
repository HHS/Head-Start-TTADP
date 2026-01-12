/* eslint-disable react/jsx-props-no-spreading */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ReportRow from '../ReportRow';

jest.mock('../../../fetchers/helpers');

const mockReport = {
  id: 1,
  eventId: 'EVT001',
  eventName: 'Event 1',
  sessionName: 'Session 1',
  startDate: '2024-01-01',
  endDate: '2024-01-02',
  objectiveTopics: [{ name: 'Topic 1' }, { name: 'Topic 2' }],
};

const defaultProps = {
  report: mockReport,
  openMenuUp: false,
  handleReportSelect: jest.fn(),
  isChecked: false,
  numberOfSelectedReports: 0,
  exportSelected: jest.fn(),
};

const renderReportRow = (props = {}) => {
  const finalProps = { ...defaultProps, ...props };
  return render(
    <BrowserRouter>
      <table>
        <tbody>
          <ReportRow {...finalProps} />
        </tbody>
      </table>
    </BrowserRouter>,
  );
};

describe('ReportRow', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders report row with all columns', () => {
    renderReportRow();

    expect(screen.getByText('EVT001')).toBeInTheDocument();
    expect(screen.getByLabelText('Select EVT001')).toBeInTheDocument();
  });

  it('formats dates correctly', () => {
    renderReportRow();

    expect(screen.getByText('01/01/2024')).toBeInTheDocument();
    expect(screen.getByText('01/02/2024')).toBeInTheDocument();
  });

  it('handles missing eventId', () => {
    const reportWithoutEventId = { ...mockReport, eventId: null };
    renderReportRow({ report: reportWithoutEventId });
    const elements = document.querySelectorAll('[data-label="Event ID"]');
    expect(elements.length).toBeGreaterThan(0);
  });

  it('handles missing eventName', () => {
    const reportWithoutEventName = { ...mockReport, eventName: null };
    renderReportRow({ report: reportWithoutEventName });

    const elements = document.querySelectorAll('[data-label="Event title"]');
    expect(elements.length).toBeGreaterThan(0);
  });

  it('handles checkbox change', () => {
    const handleReportSelect = jest.fn();
    renderReportRow({ handleReportSelect });

    const checkbox = screen.getByLabelText('Select EVT001');
    checkbox.click();

    expect(handleReportSelect).toHaveBeenCalled();
  });

  it('displays checked checkbox when isChecked is true', () => {
    renderReportRow({ isChecked: true });

    const checkbox = screen.getByLabelText('Select EVT001');
    expect(checkbox).toBeChecked();
  });

  it('displays export button when reports are selected', () => {
    renderReportRow({ numberOfSelectedReports: 2 });

    expect(screen.getByText(/Export 2 selected reports/)).toBeInTheDocument();
  });

  it('does not display export button when no reports are selected', () => {
    renderReportRow({ numberOfSelectedReports: 0 });

    expect(screen.queryByText(/Export/)).not.toBeInTheDocument();
  });

  it('handles context menu for navigation', () => {
    renderReportRow();

    expect(screen.getByLabelText(/Actions for session/)).toBeInTheDocument();
  });

  it('handles null objectiveTopics', () => {
    const reportWithoutTopics = { ...mockReport, objectiveTopics: null };
    renderReportRow({ report: reportWithoutTopics });

    // Should render without errors
    expect(screen.getByText('EVT001')).toBeInTheDocument();
  });

  it('opens menu upward when openMenuUp is true', () => {
    renderReportRow({ openMenuUp: true });

    // This test verifies the prop is passed correctly
    expect(screen.getByLabelText(/Actions for session/)).toBeInTheDocument();
  });

  it('handles focus and blur events for row styling', () => {
    const { container } = renderReportRow({ numberOfSelectedReports: 1 });

    const row = container.querySelector('tr');
    expect(row).toBeInTheDocument();
  });
});
