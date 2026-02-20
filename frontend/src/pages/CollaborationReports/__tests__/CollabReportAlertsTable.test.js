/* eslint-disable react/jsx-props-no-spreading */
import React from 'react';
import {
  render, screen, fireEvent, waitFor,
} from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { REPORT_STATUSES } from '@ttahub/common/src/constants';
import UserContext from '../../../UserContext';
import CollabReportAlertsTable, { ReportLink } from '../components/CollabReportAlertsTable';
import * as collaborationReportsFetchers from '../../../fetchers/collaborationReports';

jest.mock('../../../fetchers/collaborationReports');

describe('CollabReportAlertsTable', () => {
  const defaultProps = {
    data: { rows: [], count: 0 },
    title: 'Collaboration Reports',
    requestSort: jest.fn(),
    sortConfig: {},
  };

  const renderTest = (props) => {
    render(
      <MemoryRouter>
        <UserContext.Provider value={{ user: { id: 1 } }}>
          <CollabReportAlertsTable {...defaultProps} {...props} />
        </UserContext.Provider>
      </MemoryRouter>,
    );
  };

  it('renders the title', () => {
    renderTest();
    expect(screen.getByText('Collaboration Reports')).toBeInTheDocument();
  });

  it('renders empty message when no reports', () => {
    renderTest({ emptyMsg: 'No reports available' });
    expect(screen.getByText('No reports available')).toBeInTheDocument();
  });

  it('renders create message when showCreateMsgOnEmpty is true', () => {
    renderTest({ showCreateMsgOnEmpty: true });
    expect(screen.getByText('You have no Collaboration Reports')).toBeInTheDocument();
    expect(screen.getByText(/Document your work connecting Head Start programs/)).toBeInTheDocument();
    expect(screen.getByText(/To get started, click the "New Collaboration Report" button./)).toBeInTheDocument();
  });

  it('renders table when reports are present', () => {
    const data = {
      rows: [
        {
          id: 1,
          displayId: 'R01-1',
          name: 'Report 1',
          startDate: '2024-01-01',
          author: { id: 2, fullName: 'John Doe' },
          createdAt: '2024-01-01T10:00:00Z',
          collaboratingSpecialists: [{ id: 99, fullName: 'Jane Smith' }],
          updatedAt: '2024-01-02T10:00:00Z',
          link: '/collaboration-reports/1',
          approvers: [{ id: 1, user: { fullName: 'Approver user', id: 1 } }],
          submissionStatus: REPORT_STATUSES.SUBMITTED,
        },
        {
          id: 2,
          displayId: 'R01-2',
          name: 'Report 2',
          startDate: '2024-01-02',
          author: { fullName: 'Bob Johnson' },
          createdAt: '2024-01-02T10:00:00Z',
          collaboratingSpecialists: [{ id: 86, fullName: 'Alice Brown' }],
          updatedAt: '2024-01-03T10:00:00Z',
          link: '/collaboration-reports/2',
          approvers: [],
          submissionStatus: REPORT_STATUSES.DRAFT,
        },
        {
          id: 3,
          displayId: 'R01-3',
          name: 'Report 3',
          startDate: '2024-01-01',
          author: { fullName: 'John Doe' },
          createdAt: '2024-01-01T10:00:00Z',
          collaboratingSpecialists: [{ id: 99, fullName: 'Jane Smith' }],
          updatedAt: '2024-01-02T10:00:00Z',
          link: '/collaboration-reports/3',
          approvers: [{ userId: 3, user: { fullName: 'Approver user 3', id: 3 } }],
          submissionStatus: REPORT_STATUSES.SUBMITTED,
        },
      ],
      count: 2,
    };
    renderTest({ data });
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(document.querySelector('a[href="/collaboration-reports/1/review"]')).toBeTruthy();
    expect(document.querySelector('a[href="/collaboration-reports/3"]')).toBeNull();
    expect(document.querySelector('a[href="/collaboration-reports/view/3"]')).toBeTruthy();
  });

  it('shows loading state when loading is true', () => {
    renderTest({ loading: true });
    expect(screen.getByLabelText('Collaboration reports table loading')).toBeInTheDocument();
  });
});

describe('ReportLink', () => {
  const renderReportLink = (report, userId) => {
    render(
      <MemoryRouter>
        <ReportLink report={report} userId={userId} />
      </MemoryRouter>,
    );
  };

  const baseReport = {
    id: 1,
    displayId: 'R01-1',
    link: '/collaboration-reports/1',
    author: { id: 1 },
    submissionStatus: REPORT_STATUSES.DRAFT,
    calculatedStatus: REPORT_STATUSES.DRAFT,
    approvers: [],
  };

  it('renders link to review page when user is creator and report needs action', () => {
    const report = {
      ...baseReport,
      calculatedStatus: REPORT_STATUSES.NEEDS_ACTION,
    };
    renderReportLink(report, 1);
    expect(screen.getByText('R01-1')).toHaveAttribute('href', '/collaboration-reports/1/review');
  });

  it('renders link to view page when report is submitted and user is not approver and not needs action', () => {
    const report = {
      ...baseReport,
      submissionStatus: REPORT_STATUSES.SUBMITTED,
      calculatedStatus: REPORT_STATUSES.SUBMITTED,
      author: { id: 2 },
      approvers: [{ user: { id: 3 } }],
    };
    renderReportLink(report, 1);
    expect(screen.getByText('R01-1')).toHaveAttribute('href', '/collaboration-reports/view/1');
  });

  it('renders link to review page when report is submitted and user is approver', () => {
    const report = {
      ...baseReport,
      submissionStatus: REPORT_STATUSES.SUBMITTED,
      approvers: [{ user: { id: 1 } }],
    };
    renderReportLink(report, 1);
    expect(screen.getByText('R01-1')).toHaveAttribute('href', '/collaboration-reports/1/review');
  });

  it('renders default link when no special conditions are met', () => {
    renderReportLink(baseReport, 1);
    expect(screen.getByText('R01-1')).toHaveAttribute('href', '/collaboration-reports/1');
  });

  it('renders default link when report is draft', () => {
    const report = {
      ...baseReport,
      submissionStatus: REPORT_STATUSES.DRAFT,
      author: { id: 1 },
    };
    renderReportLink(report, 1);
    expect(screen.getByText('R01-1')).toHaveAttribute('href', '/collaboration-reports/1');
  });

  it('prioritizes needs action over other conditions', () => {
    const report = {
      ...baseReport,
      calculatedStatus: REPORT_STATUSES.NEEDS_ACTION,
      submissionStatus: REPORT_STATUSES.SUBMITTED,
      author: { id: 1 },
      approvers: [{ user: { id: 1 } }],
    };
    renderReportLink(report, 1);
    expect(screen.getByText('R01-1')).toHaveAttribute('href', '/collaboration-reports/1/review');
  });
});

describe('Delete Functionality', () => {
  const defaultProps = {
    data: { rows: [], count: 0 },
    title: 'Collaboration Reports',
    requestSort: jest.fn(),
    sortConfig: {},
  };

  const mockReport = {
    id: 1,
    displayId: 'R01-1',
    name: 'Test Report',
    startDate: '2024-01-01',
    author: { id: 1, fullName: 'John Doe' },
    createdAt: '2026-01-01T10:00:00Z',
    collaboratingSpecialists: [{ id: 2, fullName: 'Jane Doe' }],
    updatedAt: '2026-01-02T10:00:00Z',
    link: '/collaboration-reports/1',
    approvers: [],
    submissionStatus: REPORT_STATUSES.DRAFT,
  };

  const renderReportTable = (props, userId = 1) => render(
    <MemoryRouter>
      <UserContext.Provider value={{ user: { id: userId } }}>
        <CollabReportAlertsTable {...defaultProps} {...props} />
      </UserContext.Provider>
    </MemoryRouter>,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows delete action for report creator', async () => {
    const data = { rows: [mockReport], count: 1 };
    renderReportTable({ data }, 1);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
    });
  });

  it('shows delete action for collaborating specialist', async () => {
    const collaboratorId = 99;
    const report = {
      ...mockReport,
      author: { id: 2, fullName: 'Other User' },
      collaboratingSpecialists: [{ id: collaboratorId, fullName: 'Collaborator' }],
    };
    const data = { rows: [report], count: 1 };

    renderReportTable({ data }, collaboratorId);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
    });
  });

  it('does not show delete action for non-creator and non-collaborator', async () => {
    const data = { rows: [mockReport], count: 1 };
    renderReportTable({ data }, 999); // Different user ID

    // Only View action should be available
    await waitFor(() => {
      const actionsButton = screen.queryByRole('button', { name: /actions/i });
      fireEvent.click(actionsButton);
      const viewButtons = screen.queryAllByRole('button', { name: /view/i });
      expect(viewButtons.length).toBe(1);
    });

    // Should be one delete button in the modal, but not in the actions menu
    expect(screen.queryAllByRole('button', { name: /delete/i }).length).toBe(1);
  });

  it('opens delete confirmation modal when delete button is clicked', async () => {
    const data = { rows: [mockReport], count: 1 };
    renderReportTable({ data }, 1);

    const deleteButton = await screen.findByRole('button', { name: /delete/i });
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(screen.getByText('Are you sure you want to delete the report?')).toBeVisible();
    });
  });

  it('displays warning message in delete modal', async () => {
    const data = { rows: [mockReport], count: 1 };
    renderReportTable({ data }, 1);

    const deleteButton = await screen.findByRole('button', { name: /delete/i });
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(screen.getByText('This action cannot be undone.')).toBeInTheDocument();
    });
  });

  it('handles deletion error gracefully', async () => {
    const mockError = new TypeError('Cannot read properties of null (reading \'id\')');
    const mockDelete = jest.fn().mockRejectedValue(mockError);
    collaborationReportsFetchers.deleteReport = mockDelete;

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const data = { rows: [mockReport], count: 1 };
    renderReportTable({ data }, 1);

    const deleteButton = await screen.findByRole('button', { name: /delete/i });
    fireEvent.click(deleteButton);

    const confirmDelete = await screen.findByRole('button', { name: /confirm delete/i });
    fireEvent.click(confirmDelete);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Error deleting report:', mockError);
    });

    consoleSpy.mockRestore();
  });

  it('closes modal without deleting when cancel is clicked', async () => {
    const mockDelete = jest.fn();
    collaborationReportsFetchers.deleteReport = mockDelete;

    const data = { rows: [mockReport], count: 1 };
    renderReportTable({ data }, 1);

    const deleteButton = await screen.findByRole('button', { name: /delete/i });
    fireEvent.click(deleteButton);

    const closeButton = await screen.findByRole('button', { name: /close/i });
    fireEvent.click(closeButton);

    await waitFor(() => {
      expect(mockDelete).not.toHaveBeenCalled();
    });
  });
});
