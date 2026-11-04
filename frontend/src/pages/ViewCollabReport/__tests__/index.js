import '@testing-library/jest-dom';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { REPORT_STATUSES, SCOPE_IDS } from '@ttahub/common';
import fetchMock from 'fetch-mock';
import { createMemoryHistory } from 'history';
import React from 'react';
import { Router } from 'react-router-dom';
import AppLoadingContext from '../../../AppLoadingContext';
import ViewCollabReport from '..';

const history = createMemoryHistory();

const mockReport = {
  id: 123,
  displayId: 'CR-123',
  name: 'Test Collaboration Report',
  startDate: '01/15/2025',
  endDate: '01/30/2025',
  duration: 2,
  description: 'Test collaboration report description',
  calculatedStatus: REPORT_STATUSES.APPROVED,
  submissionStatus: REPORT_STATUSES.SUBMITTED,
  author: {
    id: 1,
    fullName: 'John Doe',
  },
  isStateActivity: false,
  collabReportSpecialists: [
    {
      specialist: {
        id: 2,
        fullName: 'Jane Smith',
      },
    },
  ],
  approvers: [
    {
      user: {
        id: 3,
        fullName: 'Manager One',
      },
      status: REPORT_STATUSES.APPROVED,
    },
  ],
  createdAt: '2025-01-10T10:00:00.000Z',
  submittedAt: '2025-01-20T15:30:00.000Z',
  approvedAt: '2025-01-25T09:15:00.000Z',
  activityStates: [{ activityStateCode: 'CA' }],
  reportReasons: [{ reasonId: 'new-staff' }],
  reportGoals: [
    {
      goalTemplate: {
        standard: 'Test Goal Standard',
      },
    },
  ],
  dataUsed: [{ collabReportDatum: 'coaching-data' }, { collabReportDatum: 'other' }],
  steps: [
    {
      collabStepDetail: 'First next step',
      collabStepCompleteDate: '02/15/2025',
    },
    {
      collabStepDetail: 'Second next step',
      collabStepCompleteDate: '03/01/2025',
    },
  ],
};

const renderViewCollabReport = (reportId = '123', user = undefined) => {
  const match = {
    params: { collabReportId: reportId },
    path: '/',
    url: '',
  };

  return render(
    <AppLoadingContext.Provider value={{ setIsAppLoading: jest.fn() }}>
      <Router history={history}>
        <ViewCollabReport match={match} user={user} />
      </Router>
    </AppLoadingContext.Provider>
  );
};

describe('ViewCollabReport', () => {
  beforeEach(() => {
    fetchMock.get('/api/collaboration-reports/123', mockReport);
  });

  afterEach(() => {
    fetchMock.restore();
    jest.clearAllMocks();
  });

  it('renders the page title without display ID when not provided', async () => {
    fetchMock.restore();
    fetchMock.get('/api/collaboration-reports/123', { ...mockReport, displayId: null });

    renderViewCollabReport();

    expect(await screen.findByTestId('submitted-collab-report')).toBeInTheDocument();
  });

  it('calls correct API endpoint with collaboration report ID', async () => {
    fetchMock.restore();
    fetchMock.get('/api/collaboration-reports/456', mockReport);

    act(() => {
      renderViewCollabReport('456');
    });

    await screen.findByTestId('submitted-collab-report');

    expect(fetchMock.lastUrl()).toBe('/api/collaboration-reports/456');
  });

  it('handles empty display ID', async () => {
    fetchMock.restore();
    fetchMock.get('/api/collaboration-reports/123', { ...mockReport, displayId: '' });

    renderViewCollabReport();

    expect(await screen.findByTestId('submitted-collab-report')).toBeInTheDocument();
  });

  it('uses useFetch hook correctly with proper dependencies', async () => {
    // This test ensures the useFetch hook is called with the correct parameters
    fetchMock.restore();
    fetchMock.get('/api/collaboration-reports/789', mockReport);

    act(() => {
      renderViewCollabReport('789');
    });

    await screen.findByTestId('submitted-collab-report');

    // Verify correct API endpoint was called with the ID from the match params
    expect(fetchMock.lastUrl()).toBe('/api/collaboration-reports/789');
  });

  it('redirects to error page when fetch fails', async () => {
    fetchMock.restore();
    fetchMock.get('/api/collaboration-reports/123', {
      status: 500,
      body: { error: 'Internal Server Error' },
    });

    act(() => {
      renderViewCollabReport('123');
    });

    // Wait for the redirect to occur
    await new Promise((resolve) => {
      setTimeout(resolve, 100);
    });

    // Verify redirect to error page with correct status code
    expect(history.location.pathname).toBe('/something-went-wrong/500');
  });

  it('redirects to error page with 404 when report not found', async () => {
    fetchMock.restore();
    fetchMock.get('/api/collaboration-reports/999', {
      status: 404,
      body: { error: 'Not Found' },
    });

    act(() => {
      renderViewCollabReport('999');
    });

    // Wait for the redirect to occur
    await new Promise((resolve) => {
      setTimeout(resolve, 100);
    });

    // Verify redirect to error page with 404 status
    expect(history.location.pathname).toBe('/something-went-wrong/404');
  });

  describe('unlock button', () => {
    const unlockAdmin = {
      id: 9,
      name: 'Unlock Admin',
      permissions: [{ regionId: 14, scopeId: SCOPE_IDS.UNLOCK_APPROVED_REPORTS }],
    };

    it('is shown on approved reports', async () => {
      renderViewCollabReport('123', unlockAdmin);

      expect(await screen.findByRole('button', { name: /unlock report/i })).toBeVisible();
    });

    it.each([REPORT_STATUSES.DRAFT, REPORT_STATUSES.SUBMITTED, REPORT_STATUSES.NEEDS_ACTION])(
      'is hidden on %s reports',
      async (calculatedStatus) => {
        fetchMock.restore();
        fetchMock.get('/api/collaboration-reports/123', { ...mockReport, calculatedStatus });

        renderViewCollabReport('123', unlockAdmin);

        await screen.findByTestId('submitted-collab-report');
        expect(screen.queryByRole('button', { name: /unlock report/i })).toBeNull();
      }
    );
  });

  describe('reset to draft button', () => {
    const admin = {
      id: 9,
      name: 'Admin',
      permissions: [{ regionId: 14, scopeId: SCOPE_IDS.ADMIN }],
    };
    const submitted = { ...mockReport, calculatedStatus: REPORT_STATUSES.SUBMITTED };

    it.each([REPORT_STATUSES.SUBMITTED, REPORT_STATUSES.NEEDS_ACTION])(
      'is shown to admins on %s reports',
      async (calculatedStatus) => {
        fetchMock.restore();
        fetchMock.get('/api/collaboration-reports/123', { ...mockReport, calculatedStatus });

        renderViewCollabReport('123', admin);

        expect(await screen.findByRole('button', { name: /reset to draft/i })).toBeVisible();
      }
    );

    it.each([REPORT_STATUSES.DRAFT, REPORT_STATUSES.APPROVED])(
      'is hidden from admins on %s reports',
      async (calculatedStatus) => {
        fetchMock.restore();
        fetchMock.get('/api/collaboration-reports/123', { ...mockReport, calculatedStatus });

        renderViewCollabReport('123', admin);

        await screen.findByTestId('submitted-collab-report');
        expect(screen.queryByRole('button', { name: /reset to draft/i })).toBeNull();
      }
    );

    it('is hidden from non-admins', async () => {
      fetchMock.restore();
      fetchMock.get('/api/collaboration-reports/123', submitted);

      renderViewCollabReport('123', { id: 1, permissions: [{ regionId: 1, scopeId: 3 }] });

      await screen.findByTestId('submitted-collab-report');
      expect(screen.queryByRole('button', { name: /reset to draft/i })).toBeNull();
    });

    it('resets the report after confirming', async () => {
      fetchMock.restore();
      fetchMock.get('/api/collaboration-reports/123', submitted);
      fetchMock.put('/api/collaboration-reports/123/reset', {
        ...mockReport,
        calculatedStatus: REPORT_STATUSES.DRAFT,
        submissionStatus: REPORT_STATUSES.DRAFT,
      });

      renderViewCollabReport('123', admin);

      userEvent.click(await screen.findByRole('button', { name: /reset to draft/i }));
      expect(fetchMock.called('/api/collaboration-reports/123/reset')).toBe(false);
      userEvent.click(screen.getByRole('button', { name: /reset collaboration report to draft/i }));

      expect(await screen.findByText('This report has been reset to draft.')).toBeVisible();
      expect(fetchMock.called('/api/collaboration-reports/123/reset', 'PUT')).toBe(true);
      expect(screen.queryByRole('button', { name: /^reset to draft$/i })).toBeNull();
    });

    it('shows an error when the reset fails', async () => {
      fetchMock.restore();
      fetchMock.get('/api/collaboration-reports/123', submitted);
      fetchMock.put('/api/collaboration-reports/123/reset', 403);

      renderViewCollabReport('123', admin);

      userEvent.click(await screen.findByRole('button', { name: /reset to draft/i }));
      userEvent.click(screen.getByRole('button', { name: /reset collaboration report to draft/i }));

      expect(await screen.findByText('Unable to reset this report to draft.')).toBeVisible();
    });
  });
});
