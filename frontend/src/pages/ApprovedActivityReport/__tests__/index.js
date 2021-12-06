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
    approvers: [
      {
        id: 1, status: '', note: '', User: { id: 1, fullName: 'John Q Fullname' },
      },

      {
        id: 2, status: '', note: 'note', User: { id: 2, fullName: 'John Smith' },
      },
    ],
    targetPopulations: ['Mid size sedans'],
    specialistNextSteps: [],
    recipientNextSteps: [],
    participants: ['Commander of Pants', 'Princess of Castles'],
    numberOfParticipants: 3,
    reason: ['Needed it'],
    startDate: '08/01/1968',
    endDate: '08/02/1969',
    duration: 6.5,
    ttaType: ['training'],
    virtualDeliveryType: 'Phone',
    requester: 'recipient',
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

  function renderApprovedActivityReport(id, passedUser = user) {
    const match = {
      path: '',
      url: '',
      params: {
        activityReportId: id,
      },
    };

    render(<ApprovedActivityReport user={passedUser} match={match} />);
  }
  afterEach(() => fetchMock.restore());

  beforeAll(() => {
    // navigator.clipboard = jest.fn();
    // navigator.clipboard.writeText = jest.fn(() => Promise.resolve());
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
      ECLKCResourcesUsed: [''],
      nonECLKCResourcesUsed: [''],
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
      expect(screen.getByText(report.author.fullName)).toBeInTheDocument();
      expect(screen.getByText(/john q fullname:/i)).toBeInTheDocument();
      expect(screen.getByText(/john smith: note/i)).toBeInTheDocument();
      expect(screen.getByText(report.activityRecipients.map((arRecipient) => arRecipient.name).join(', '))).toBeInTheDocument();
      expect(screen.getByText(report.reason.join(', '))).toBeInTheDocument();
      expect(screen.getByText(/august 1, 1968/i)).toBeInTheDocument();
      expect(screen.getByText(/august 2, 1969/i)).toBeInTheDocument();
      expect(screen.getByText(`${report.duration} hours`)).toBeInTheDocument();
      expect(screen.getByText(/training, virtual \(phone\)/i)).toBeInTheDocument();

      const recipientRowHeader = screen.getByRole('rowheader', { name: /recipients/i });
      expect(within(recipientRowHeader).getByText('Recipients')).toBeInTheDocument();

      const resourcesTable = screen.getByRole('table', { name: /resources/i });
      expect(within(resourcesTable).getByRole('link', { name: /http:\/\/website/i })).toBeInTheDocument();

      expect(screen.getByRole('rowheader', { name: /supporting attachments/i })).toBeInTheDocument();
      expect(screen.getByRole('rowheader', { name: /context/i })).toBeInTheDocument();
      expect(screen.getByRole('rowheader', { name: /objective 1/i })).toBeInTheDocument();

      expect(screen.getByText('Objective')).toBeInTheDocument();

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
      expect(screen.getByText('Goal')).toBeInTheDocument();
      expect(screen.getByText(/test/i)).toBeInTheDocument();
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
    global.navigator.clipboard = jest.fn();
    global.navigator.clipboard.writeText = jest.fn(() => Promise.resolve());

    act(() => renderApprovedActivityReport(5000));
    await waitFor(() => {
      const copyButton = screen.getByRole('button', { name: /copy url link/i });
      fireEvent.click(copyButton);
      expect(navigator.clipboard.writeText).toHaveBeenCalled();
    });
  });

  it('handles a missing DOM API', async () => {
    global.navigator.clipboard = jest.fn();
    act(() => renderApprovedActivityReport(5000));
    await waitFor(() => {
      const copyButton = screen.getByRole('button', { name: /copy url link/i });
      fireEvent.click(copyButton);
      expect(screen.getByText(/sorry, something went wrong copying that url\. here it ishttp:\/\/localhost\//i)).toBeInTheDocument();
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

  it('shows unlock report button', async () => {
    const unlockUser = {
      id: 2,
      permissions: [
        {
          regionId: 45,
          userId: 2,
          scopeId: 4,
        },
        {
          regionId: 14,
          userId: 2,
          scopeId: 6,
        },
      ],
    };
    act(() => renderApprovedActivityReport(5000, unlockUser));
    await waitFor(() => {
      const unlockButton = screen.getByRole('button', { name: /unlock report/i });
      fireEvent.click(unlockButton);
      expect(screen.getByRole('heading', { name: /unlock activity report/i })).toBeInTheDocument();
    });
  });

  it('hides unlock report button', async () => {
    act(() => renderApprovedActivityReport(5000));
    await waitFor(() => {
      expect(screen.queryByText(/unlock report/i)).not.toBeInTheDocument();
    });
  });
});
