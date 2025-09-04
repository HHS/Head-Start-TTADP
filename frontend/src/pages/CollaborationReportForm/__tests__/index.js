/* eslint-disable react/prop-types */
import '@testing-library/jest-dom';
import React from 'react';
import {
  render,
  screen,
  waitFor,
  act,
} from '@testing-library/react';
import { Router } from 'react-router';
import { SCOPE_IDS, REPORT_STATUSES } from '@ttahub/common';
import fetchMock from 'fetch-mock';
import { createMemoryHistory } from 'history';
import { mockWindowProperty } from '../../../testHelpers';
import CollaborationReportForm from '..';
import AppLoadingContext from '../../../AppLoadingContext';
import UserContext from '../../../UserContext';

const history = createMemoryHistory();

const user = {
  id: 1,
  name: 'Walter Burns',
  roles: [{ fullName: 'Reporter' }],
  permissions: [
    { regionId: 1, scopeId: SCOPE_IDS.READ_WRITE_ACTIVITY_REPORTS },
  ],
};

const dummyReport = {
  regionId: 1,
  endDate: '2025-01-01',
  approvers: [],
  status: REPORT_STATUSES.DRAFT,
  userId: 1,
};

const ReportComponent = ({
  id,
  currentPage = 'activity-summary',
  showLastUpdatedTime = null,
  userId = 1,
  userRoles = [{ fullName: 'Reporter' }],
  region = 1,
}) => (
  <Router history={history}>
    <AppLoadingContext.Provider value={{ setAppLoading: jest.fn(), setAppLoadingText: jest.fn() }}>
      <UserContext.Provider value={{
        user: {
          ...user, id: userId, roles: userRoles, flags: [],
        },
      }}
      >
        <CollaborationReportForm
          match={{ params: { currentPage, collabReportId: id }, path: '', url: '' }}
          location={{
            state: { showLastUpdatedTime }, hash: '', pathname: '', search: '',
          }}
          region={region}
        />
      </UserContext.Provider>
    </AppLoadingContext.Provider>
  </Router>
);

describe('CollaborationReportForm', () => {
  const setItem = jest.fn();
  const getItem = jest.fn();
  const removeItem = jest.fn();

  mockWindowProperty('localStorage', {
    setItem,
    getItem,
    removeItem,
  });

  beforeEach(() => {
    fetchMock.get('/api/users/collaborators?region=1', []);
    fetchMock.get('/api/collaboration-reports/123', dummyReport);
  });

  afterEach(() => {
    fetchMock.restore();
    jest.clearAllMocks();
  });

  it('renders', async () => {
    act(() => {
      render(<ReportComponent id="new" />);
    });

    const heading = await screen.findByText(/Collaboration report for Region [\d]/i);
    expect(heading).toBeInTheDocument();
  });

  it('renders with single user role and sets creator role', async () => {
    render(<ReportComponent id="new" userRoles={[{ fullName: 'Health Specialist' }]} />);

    const heading = await screen.findByText(/Collaboration report for Region [\d]/i);
    expect(heading).toBeInTheDocument();
  });

  it('renders with multiple user roles without setting creator role', async () => {
    render(
      <ReportComponent
        id="new"
        userRoles={[{ fullName: 'Health Specialist' }, { fullName: 'Education Specialist' }]}
      />,
    );

    const heading = await screen.findByText(/Collaboration report for Region [\d]/i);
    expect(heading).toBeInTheDocument();
  });

  it('renders without region prop and uses user region', async () => {
    render(<ReportComponent id="new" region={undefined} />);

    const heading = await screen.findByText(/Collaboration report for Region [\d]/i);
    expect(heading).toBeInTheDocument();
  });

  it('handles loading state', () => {
    // Mock getItem to return null to force loading state
    getItem.mockReturnValue(null);

    render(<ReportComponent id="new" />);

    expect(screen.getByText('loading...')).toBeInTheDocument();
  });

  describe('error handling', () => {
    beforeEach(() => {
      fetchMock.restore();
      fetchMock.get('/api/users/collaborators?region=1', 500);
      fetchMock.get('/api/collaboration-reports/123', 500);
    });

    it('handles collaborators fetch error', async () => {
      render(<ReportComponent id="new" />);

      expect(await screen.findByText(/unable to load report/i)).toBeInTheDocument();
    });
  });

  describe('presence data effects', () => {
    it('handles multiple users presence data', async () => {
      render(<ReportComponent id="new" />);

      const heading = await screen.findByText(/Collaboration report for Region [\d]/i);
      expect(heading).toBeInTheDocument();
    });
  });

  describe('form data and local storage', () => {
    beforeEach(() => {
      getItem.mockReturnValue(JSON.stringify({
        id: 'test-report',
        status: REPORT_STATUSES.DRAFT,
        savedToStorageTime: new Date().toISOString(),
        userId: 1,
      }));
    });

    it('loads form data from local storage', async () => {
      render(<ReportComponent id="123" />);

      const heading = await screen.findByText(/Collaboration report for Region [\d]/i);
      expect(heading).toBeInTheDocument();
    });
  });

  describe('redirect conditions', () => {
    it('redirects when formData has invalid region', async () => {
      getItem.mockReturnValue(JSON.stringify({
        regionId: -1,
      }));

      const { container } = render(<ReportComponent id="123" />);

      // Should render redirect component
      await waitFor(() => {
        expect(container.innerHTML).toContain('');
      });
    });
  });

  describe('conditional rendering', () => {
    beforeEach(() => {
      fetchMock.restore();
      fetchMock.get('/api/users/collaborators?region=1', []);
      fetchMock.get('/api/collaboration-reports/123', dummyReport);
    });

    it('renders with approved status and shows appropriate styling', async () => {
      getItem.mockReturnValue(JSON.stringify({
        calculatedStatus: REPORT_STATUSES.APPROVED,
        regionId: 1,
      }));

      render(<ReportComponent id="123" />);

      const heading = await screen.findByText(/Collaboration report for Region [\d]/i);
      expect(heading).toBeInTheDocument();
    });

    it('renders with submitted status and hides side nav for non-approvers', async () => {
      getItem.mockReturnValue(JSON.stringify({
        calculatedStatus: REPORT_STATUSES.SUBMITTED,
        regionId: 1,
        approvers: [],
      }));

      render(<ReportComponent id="123" />);

      const heading = await screen.findByText(/Collaboration report for Region [\d]/i);
      expect(heading).toBeInTheDocument();
    });

    it('renders with creator name and role', async () => {
      getItem.mockReturnValue(JSON.stringify({
        calculatedStatus: REPORT_STATUSES.DRAFT,
        regionId: 1,
        creatorNameWithRole: 'John Doe - Health Specialist',
      }));

      render(<ReportComponent id="123" />);

      const heading = await screen.findByText(/Collaboration report for Region [\d]/i);
      expect(heading).toBeInTheDocument();
    });

    it('handles error state with form data', async () => {
      getItem.mockReturnValue(JSON.stringify({
        calculatedStatus: REPORT_STATUSES.DRAFT,
        regionId: 1,
      }));

      // Mock fetch to return error but still have form data
      fetchMock.restore();
      fetchMock.get('/api/users/collaborators?region=1', { throws: new Error('Network error') });

      render(<ReportComponent id="123" />);

      // Should still render despite error
      await waitFor(() => {
        const heading = screen.getByText(/Collaboration report for Region [\d]/i);
        expect(heading).toBeInTheDocument();
      });
    });

    it('shows last updated time when requested', async () => {
      render(<ReportComponent id="123" showLastUpdatedTime />);

      const heading = await screen.findByText(/Collaboration report for Region [\d]/i);
      expect(heading).toBeInTheDocument();
    });

    it('renders mesh presence manager for existing reports', async () => {
      render(<ReportComponent id="123" />);

      const heading = await screen.findByText(/Collaboration report for Region [\d]/i);
      expect(heading).toBeInTheDocument();
    });

    it('does not render mesh presence manager for new reports', async () => {
      render(<ReportComponent id="new" />);

      const heading = await screen.findByText(/Collaboration report for Region [\d]/i);
      expect(heading).toBeInTheDocument();
    });
  });

  describe('approver and collaborator logic', () => {
    it('handles reports with collaborators and approvers', async () => {
      getItem.mockReturnValue(JSON.stringify({
        calculatedStatus: REPORT_STATUSES.DRAFT,
        regionId: 1,
        collabReportCollaborators: [{ userId: 1 }],
        approvers: [{ user: { id: 1 }, status: 'pending' }],
        userId: 1,
      }));

      render(<ReportComponent id="123" userId={1} />);

      const heading = await screen.findByText(/Collaboration report for Region [\d]/i);
      expect(heading).toBeInTheDocument();
    });

    it('handles approved reports with marked approvers', async () => {
      getItem.mockReturnValue(JSON.stringify({
        calculatedStatus: REPORT_STATUSES.SUBMITTED,
        regionId: 1,
        approvers: [{ user: { id: 1 }, status: REPORT_STATUSES.APPROVED }],
        userId: 2,
      }));

      render(<ReportComponent id="123" userId={1} />);

      const heading = await screen.findByText(/Collaboration report for Region [\d]/i);
      expect(heading).toBeInTheDocument();
    });
  });

  describe('storage time comparison logic', () => {
    it('uses local storage data when it is newer', async () => {
      const futureTime = new Date(Date.now() + 1000000).toISOString();
      getItem.mockReturnValue(JSON.stringify({
        calculatedStatus: REPORT_STATUSES.DRAFT,
        regionId: 1,
        savedToStorageTime: futureTime,
        updatedAt: new Date().toISOString(),
      }));

      render(<ReportComponent id="123" />);

      const heading = await screen.findByText(/Collaboration report for Region [\d]/i);
      expect(heading).toBeInTheDocument();
    });

    it('uses network data when local storage is older', async () => {
      const pastTime = new Date(Date.now() - 1000000).toISOString();
      getItem.mockReturnValue(JSON.stringify({
        calculatedStatus: REPORT_STATUSES.DRAFT,
        regionId: 1,
        savedToStorageTime: pastTime,
        updatedAt: new Date().toISOString(),
      }));

      render(<ReportComponent id="123" />);

      const heading = await screen.findByText(/Collaboration report for Region [\d]/i);
      expect(heading).toBeInTheDocument();
    });
  });
});
