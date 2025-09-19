import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { Router } from 'react-router-dom';
import fetchMock from 'fetch-mock';
import { createMemoryHistory } from 'history';
import { REPORT_STATUSES } from '@ttahub/common';
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
  activityStates: [
    { activityStateCode: 'CA' },
  ],
  reportReasons: [
    { reasonId: 'new-staff' },
  ],
  reportGoals: [
    {
      goalTemplate: {
        standard: 'Test Goal Standard',
      },
    },
  ],
  dataUsed: [
    { collabReportDatum: 'coaching-data' },
    { collabReportDatum: 'other', collabReportDatumOther: 'Custom data type' },
  ],
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

const renderViewCollabReport = (reportId = '123') => {
  const match = {
    params: { collabReportId: reportId },
    path: '/',
    url: '',
  };

  return render(
    <Router history={history}>
      <ViewCollabReport match={match} />
    </Router>,
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
});
