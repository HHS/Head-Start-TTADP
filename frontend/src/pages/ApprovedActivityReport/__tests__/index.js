import '@testing-library/jest-dom';
import React from 'react';
import {
  fireEvent,
  render, screen, waitFor, within,
} from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import fetchMock from 'fetch-mock';

import ApprovedActivityReport from '../index';

describe('Activity report print and share view', () => {
  const report = {
    regionId: 45,
    activityRecipients: [
      { name: 'Tim', grantId: 400 },
      { name: 'Tina', grantId: 401 },
    ],
    displayId: 'Boat',
    author: {
      fullName: 'Captain Tim Tina Boat',
    },
    collaborators: ['Test', 'Test 2'],
    approvingManager: {
      fullName: 'John Q Fullname',
    },
    participants: ['Commander of Pants', 'Princess of Castles'],
    numberOfParticipants: 3,
    programTypes: ['Party'],
    reason: ['Needed it'],
    startDate: 'Yesterday',
    endDate: 'Tomorrow',
    duration: 6.5,
    ttaType: ['training'],
    virtualDeliveryType: 'Phone',
    requester: 'grantee',
    topics: ['Tea', 'cookies'],
    ECLKCResourcesUsed: ['http://website'],
    nonECLKCResourcesUsed: ['http://betterwebsite'],
    attachments: [],
    context: '',
    goals: [],
    objectivesWithoutGoals: [
      {
        title: 'Objective',
        ttaProvided: 'All of it',
      },
    ],
    managerNotes: '',
    additionalNotes: '',
  };

  const user = {
    id: 2,
    permissions: [
      {
        regionId: 45,
        userId: 2,
        scopeId: 1,
      },
      {
        regionId: 45,
        userId: 2,
        scopeId: 2,
      },
      {
        regionId: 45,
        userId: 2,
        scopeId: 3,
      },
    ],
  };

  function renderApprovedActivityReport(id) {
    const match = {
      path: '',
      url: '',
      params: {
        activityReportId: id,
      },
    };

    render(<ApprovedActivityReport user={user} match={match} />);
  }
  afterEach(() => fetchMock.restore());

  beforeAll(() => {
    navigator.clipboard = jest.fn();
    navigator.clipboard.writeText = jest.fn(() => Promise.resolve());
    window.print = jest.fn();
  });

  beforeEach(() => {
    fetchMock.get('/api/user', user);
    fetchMock.get('/api/activity-reports/4999', {});
    fetchMock.get('/api/activity-reports/5000', report);
    fetchMock.get('/api/activity-reports/5001', {
      ...report,
      activityRecipients: [
        { name: 'Tim', grantId: 400 },
      ],
      eclkcResources: null,
      ttaType: ['technical assistance'],
      objectivesWithoutGoals: [],
      goals: [{
        name: 'Goal',
        objectives: [
          {
            title: 'Test',
            ttaProvided: 'Why not?',
          },
        ],
      }],
      requester: 'chud',
    });
    fetchMock.get('/api/activity-reports/5002', {
      regionId: 45,
    });

    fetchMock.get('/api/activity-reports/5003', {
      ...report,
      ttaType: ['training', 'technical-assistance'],
      requester: 'regionalOffice',
      activityRecipients: [
        { name: 'Anti-tim' },
      ],
    });
  });

  it('renders an activity report in clean view', async () => {
    act(() => renderApprovedActivityReport(5000));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /print to pdf/i })).toBeInTheDocument();
      expect(screen.getByText(report.author.fullName)).toBeInTheDocument();
      expect(screen.getByText(report.approvingManager.fullName)).toBeInTheDocument();
      expect(screen.getByText(report.activityRecipients.map((arRecipient) => arRecipient.name).join(', '))).toBeInTheDocument();
      expect(screen.getByText(report.reason.join(', '))).toBeInTheDocument();
      expect(screen.getByText(report.programTypes.join(', '))).toBeInTheDocument();
      expect(screen.getByText(report.startDate)).toBeInTheDocument();
      expect(screen.getByText(report.endDate)).toBeInTheDocument();
      expect(screen.getByText(report.duration)).toBeInTheDocument();
      expect(screen.getByText(/training, virtual \(phone\)/i)).toBeInTheDocument();

      const granteeRowHeader = screen.getByRole('rowheader', { name: /grantees/i });
      expect(within(granteeRowHeader).getByText('Grantees')).toBeInTheDocument();

      const eclkcResources = screen.getByRole('row', { name: /ohs \/ eclkc resources link/i });
      within(eclkcResources).getByRole('link', { name: /link/i });

      const nonEclkcResources = screen.getByRole('row', { name: /non-eclkc resources link/i });
      expect(within(nonEclkcResources).getByRole('link', { name: /link/i })).toBeInTheDocument();

      expect(screen.getByRole('rowheader', { name: /supporting attachments/i })).toBeInTheDocument();
      expect(screen.getByRole('rowheader', { name: /context/i })).toBeInTheDocument();
      expect(screen.getByRole('rowheader', { name: /objective 1/i })).toBeInTheDocument();

      const objectiveCell = screen.getByRole('cell', { name: /objective/i });
      expect(within(objectiveCell).getByText(/objective/i)).toBeInTheDocument();

      expect(screen.getByRole('rowheader', { name: /tta provided 1/i })).toBeInTheDocument();
      expect(screen.getByText(/all of it/i)).toBeInTheDocument();

      expect(screen.getByText(/review and submit/i)).toBeInTheDocument();
      expect(screen.getByRole('rowheader', { name: /creator notes/i })).toBeInTheDocument();
      expect(screen.getByRole('rowheader', { name: /manager notes/i })).toBeInTheDocument();
    });
  });

  it('handles alternate report data', async () => {
    act(() => renderApprovedActivityReport(5001));

    await waitFor(() => {
      expect(screen.getByText(/technical assistance, virtual \(phone\)/i)).toBeInTheDocument();
      expect(screen.getByRole('cell', { name: /goal/i })).toBeInTheDocument();
      expect(screen.getByRole('cell', { name: /test/i })).toBeInTheDocument();
    });
  });

  it('handles authorization errors', async () => {
    act(() => renderApprovedActivityReport(4999));

    await waitFor(() => {
      expect(screen.getByText(/sorry, you are not allowed to view this report/i)).toBeInTheDocument();
    });
  });

  it('handles data errors', async () => {
    act(() => renderApprovedActivityReport(5002));

    await waitFor(() => {
      expect(screen.getByText(/sorry, something went wrong\./i)).toBeInTheDocument();
    });
  });

  it('copies a url to clipboard', async () => {
    act(() => renderApprovedActivityReport(5000));
    await waitFor(() => {
      const copyButton = screen.getByRole('button', { name: /copy url link/i });
      fireEvent.click(copyButton);
      expect(navigator.clipboard.writeText).toHaveBeenCalled();
    });
  });

  it('opens a print dialog', async () => {
    act(() => renderApprovedActivityReport(5003));
    await waitFor(() => {
      const printButton = screen.getByRole('button', { name: /print to pdf/i });
      fireEvent.click(printButton);
      expect(window.print).toHaveBeenCalled();
    });
  });
});
