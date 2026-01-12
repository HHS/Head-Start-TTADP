/* eslint-disable react/jsx-props-no-spreading */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Router } from 'react-router-dom';
import { createMemoryHistory } from 'history';
import ReportRow from '../ReportRow';
import { getSessionReportsDownloadURL } from '../../../fetchers/helpers';

jest.mock('../../../fetchers/helpers', () => ({
  getSessionReportsDownloadURL: jest.fn(() => '/api/session-reports?format=csv&sessionId.in[]=1'),
}));

const mockReport = {
  id: 1,
  eventId: 'EVT001',
  eventName: 'Event 1',
  sessionName: 'Session 1',
  startDate: '2024-01-01',
  endDate: '2024-01-02',
  objectiveTopics: ['Topic 1', 'Topic 2'],
};

const defaultProps = {
  report: mockReport,
  openMenuUp: false,
  handleReportSelect: jest.fn(),
  isChecked: false,
  numberOfSelectedReports: 0,
  exportSelected: jest.fn(),
};

const renderReportRow = (props = {}, history = createMemoryHistory()) => {
  const finalProps = { ...defaultProps, ...props };
  return {
    ...render(
      <Router history={history}>
        <table>
          <tbody>
            <ReportRow {...finalProps} />
          </tbody>
        </table>
      </Router>,
    ),
    history,
  };
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

  describe('context menu actions', () => {
    const originalClipboard = navigator.clipboard;
    const originalLocation = window.location;

    beforeEach(() => {
      delete window.location;
      window.location = { ...originalLocation, assign: jest.fn(), origin: 'http://localhost' };
    });

    afterEach(() => {
      window.location = originalLocation;
      Object.defineProperty(navigator, 'clipboard', {
        value: originalClipboard,
        writable: true,
        configurable: true,
      });
    });

    it('navigates to event link when View Report is clicked', () => {
      const history = createMemoryHistory();
      history.push = jest.fn();
      renderReportRow({}, history);

      const contextBtn = screen.getByRole('button', { name: /actions for session/i });
      userEvent.click(contextBtn);

      const viewReportBtn = screen.getByRole('button', { name: /view report/i });
      userEvent.click(viewReportBtn);

      expect(history.push).toHaveBeenCalledWith('/training-report/view/EVT001');
    });

    it('copies URL to clipboard when Copy URL is clicked', async () => {
      const writeTextMock = jest.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: writeTextMock },
        writable: true,
        configurable: true,
      });

      renderReportRow();

      const contextBtn = screen.getByRole('button', { name: /actions for session/i });
      userEvent.click(contextBtn);

      const copyUrlBtn = screen.getByRole('button', { name: /copy url/i });
      userEvent.click(copyUrlBtn);

      expect(writeTextMock).toHaveBeenCalledWith('http://localhost/training-report/view/EVT001');
    });

    it('does not show Copy URL when clipboard is unavailable', () => {
      Object.defineProperty(navigator, 'clipboard', {
        value: undefined,
        writable: true,
        configurable: true,
      });

      renderReportRow();

      const contextBtn = screen.getByRole('button', { name: /actions for session/i });
      userEvent.click(contextBtn);

      expect(screen.queryByRole('button', { name: /copy url/i })).not.toBeInTheDocument();
    });

    it('downloads report when Download is clicked', () => {
      getSessionReportsDownloadURL.mockReturnValue('/api/session-reports?format=csv&sessionId.in[]=1');

      renderReportRow();

      const contextBtn = screen.getByRole('button', { name: /actions for session/i });
      userEvent.click(contextBtn);

      const downloadBtn = screen.getByRole('button', { name: /download/i });
      userEvent.click(downloadBtn);

      expect(getSessionReportsDownloadURL).toHaveBeenCalledWith([1]);
      expect(window.location.assign).toHaveBeenCalledWith('/api/session-reports?format=csv&sessionId.in[]=1');
    });
  });

  describe('focus and blur handlers', () => {
    it('adds focused class on focus', () => {
      const { container } = renderReportRow();
      const row = container.querySelector('tr');

      fireEvent.focus(row);

      expect(row).toHaveClass('tta-smarthub--report-row', 'focused');
    });

    it('removes focused class on blur to outside element', () => {
      const { container } = renderReportRow();
      const row = container.querySelector('tr');

      fireEvent.focus(row);
      expect(row).toHaveClass('focused');

      fireEvent.blur(row, { relatedTarget: document.body });
      expect(row).not.toHaveClass('focused');
    });

    it('keeps focused class when focus moves within the row', () => {
      const { container } = renderReportRow();
      const row = container.querySelector('tr');
      const checkbox = screen.getByLabelText('Select EVT001');

      fireEvent.focus(row);
      expect(row).toHaveClass('focused');

      // When focus moves to an element inside the row, the class should remain
      fireEvent.blur(row, { relatedTarget: checkbox });
      expect(row).toHaveClass('focused');
    });
  });

  describe('falsy value branches', () => {
    it('displays empty string when sessionName is null', () => {
      const reportWithoutSessionName = { ...mockReport, sessionName: null };
      const { container } = renderReportRow({ report: reportWithoutSessionName });

      const sessionCell = container.querySelector('[data-label="Session name"]');
      expect(sessionCell.textContent).toBe('');
    });

    it('displays -- when startDate is null', () => {
      const reportWithoutStartDate = { ...mockReport, startDate: null };
      renderReportRow({ report: reportWithoutStartDate });

      const startDateCells = document.querySelectorAll('[data-label="Session start date"]');
      expect(startDateCells[0].textContent).toBe('--');
    });

    it('displays -- when endDate is null', () => {
      const reportWithoutEndDate = { ...mockReport, endDate: null };
      renderReportRow({ report: reportWithoutEndDate });

      const endDateCells = document.querySelectorAll('[data-label="Session end date"]');
      expect(endDateCells[0].textContent).toBe('--');
    });
  });
});
