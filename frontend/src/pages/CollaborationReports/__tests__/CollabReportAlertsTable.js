/* eslint-disable react/jsx-props-no-spreading */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { REPORT_STATUSES } from '@ttahub/common/src/constants';
import UserContext from '../../../UserContext';
import CollabReportAlertsTable from '../components/CollabReportAlertsTable';

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
          author: { fullName: 'John Doe' },
          createdAt: '2024-01-01T10:00:00Z',
          collaboratingSpecialists: [{ fullName: 'Jane Smith' }],
          updatedAt: '2024-01-02T10:00:00Z',
          link: '/collaboration-reports/1',
          approvers: [{ userId: 1, user: { fullName: 'Approver user' } }],
          submissionStatus: REPORT_STATUSES.SUBMITTED,
        },
        {
          id: 2,
          displayId: 'R01-2',
          name: 'Report 2',
          startDate: '2024-01-02',
          author: { fullName: 'Bob Johnson' },
          createdAt: '2024-01-02T10:00:00Z',
          collaboratingSpecialists: [{ fullName: 'Alice Brown' }],
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
          collaboratingSpecialists: [{ fullName: 'Jane Smith' }],
          updatedAt: '2024-01-02T10:00:00Z',
          link: '/collaboration-reports/3',
          approvers: [{ userId: 3, user: { fullName: 'Approver user 3' } }],
          submissionStatus: REPORT_STATUSES.SUBMITTED,
        },
      ],
      count: 2,
    };
    renderTest({ data });
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(document.querySelector('a[href="/collaboration-reports/1"]')).toBeTruthy();
    expect(document.querySelector('a[href="/collaboration-reports/3"]')).toBeNull();
    expect(document.querySelector('a[href="/collaboration-reports/view/3"]')).toBeTruthy();
  });

  it('shows loading state when loading is true', () => {
    renderTest({ loading: true });
    expect(screen.getByLabelText('Collaboration reports table loading')).toBeInTheDocument();
  });
});
