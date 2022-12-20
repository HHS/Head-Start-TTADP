import '@testing-library/jest-dom';
import React from 'react';
import {
  fireEvent,
  render,
  screen,
  waitFor,
  act,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import fetchMock from 'fetch-mock';
import { SCOPE_IDS } from '@ttahub/common';

import ApprovedActivityReport from '../index';

describe('Activity report print and share view', () => {
  const report = {
    version: 1,
    regionId: 45,
    activityRecipients: [
      { name: 'Tim', grantId: 400 },
      { name: 'Tina', grantId: 401 },
    ],
    displayId: 'Boat',
    author: {
      fullName: 'Captain Tim Tina Boat',
    },
    activityReportCollaborators: [
      {
        fullName: 'Test',
        user: { fullName: 'Test' },
      },
      {
        fullName: 'Test 2',
        user: { fullName: 'Test 2' },
      }],
    approvers: [
      {
        id: 1, status: '', note: '', User: { id: 1, fullName: 'John Q Fullname' },
      },

      {
        id: 2, status: '', note: 'note', User: { id: 2, fullName: 'John Smith' },
      },
    ],
    targetPopulations: ['Mid size sedans'],
    activityRecipientType: 'recipient',
    specialistNextSteps: [],
    recipientNextSteps: [],
    participants: ['Commander of Pants', 'Princess of Castles'],
    numberOfParticipants: 3,
    reason: ['Needed it'],
    startDate: '1968-08-01',
    endDate: '1969-08-02',
    duration: 6.5,
    ttaType: ['training'],
    virtualDeliveryType: 'Phone',
    requester: 'recipient',
    topics: ['Tea', 'cookies'],
    ECLKCResourcesUsed: ['http://website'],
    nonECLKCResourcesUsed: ['http://betterwebsite'],
    files: [],
    context: '',
    goalsAndObjectives: [],
    objectivesWithoutGoals: [
      {
        title: 'Objective',
        ActivityReportObjective: {
          ttaProvided: 'All of it',
        },
        topics: [{ label: 'being fancy' }],
        resources: [{ value: 'http://www.website.com' }],
        status: 'Test status',
        files: [
          {
            url: { url: 'http://www.website.com' },
            originalFileName: 'file.pdf',
          },
        ],
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
        scopeId: SCOPE_IDS.SITE_ACCESS,
      },
      {
        regionId: 45,
        userId: 2,
        scopeId: SCOPE_IDS.ADMIN,
      },
      {
        regionId: 45,
        userId: 2,
        scopeId: SCOPE_IDS.READ_ACTIVITY_REPORTS,
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
      goalsAndObjectives: [{
        name: 'Goal',
        objectives: [
          {
            title: 'Test',
            ActivityReportObjective: {
              ttaProvided: 'Why not?',
            },
          },
        ],
      }],
      requester: 'chud',
    });
    fetchMock.get('/api/activity-reports/5002', 500);

    fetchMock.get('/api/activity-reports/5003', {
      ...report,
      ttaType: ['training', 'technical-assistance'],
      requester: 'regionalOffice',
      activityRecipients: [
        { name: 'Anti-tim' },
      ],
    });

    fetchMock.get('/api/activity-reports/5004', {
      ...report,
      objectivesWithoutGoals: [
        {
          title: 'Objective',
          ActivityReportObjective: {
            ttaProvided: 'All of it',
          },
          topics: [{ label: 'being fancy' }],
          resources: [{ value: 'http://www.website.com' }],
          status: 'Test status',
          files: [],
        },
      ],
      version: 2,
    });

    fetchMock.get('/api/activity-reports/5005', {
      ...report,
      goalsAndObjectives: [{
        name: 'Goal',
        objectives: [
          {
            title: 'Objective',
            ActivityReportObjective: {
              ttaProvided: 'All of it',
            },
            topics: [{ label: 'being fancy' }],
            resources: [{ value: 'http://www.website.com' }],
            status: 'Test status',
            files: [
              {
                url: { url: 'http://www.website.com' },
                originalFileName: 'file.pdf',
              },
            ],
          },
        ],
      }],
    });

    fetchMock.get('/api/activity-reports/5006', {
      ...report,
      version: null,
    });
  });

  it('renders an activity report in clean view', async () => {
    act(() => renderApprovedActivityReport(5000));

    await waitFor(() => {
      expect(screen.getByText(report.author.fullName)).toBeInTheDocument();
    });
  });

  it('handles alternate report data', async () => {
    act(() => renderApprovedActivityReport(5001));

    await waitFor(() => {
      expect(fetchMock.called('/api/activity-reports/5001')).toBeTruthy();
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
    const unlockButton = await screen.findByRole('button', { name: /unlock report/i });
    act(() => userEvent.click(unlockButton));

    const heading = await screen.findByRole('heading', { name: /unlock activity report/i, hidden: true });
    expect(heading).toBeInTheDocument();
  });

  it('hides unlock report button', async () => {
    act(() => renderApprovedActivityReport(5000));
    expect(screen.queryByText(/unlock report/i)).not.toBeInTheDocument();
  });

  it('renders a version 2 report', async () => {
    act(() => renderApprovedActivityReport(5004));
    await waitFor(() => {
      expect(screen.getByText(report.author.fullName)).toBeInTheDocument();
    });
  });

  it('renders a version 2 report with goals', async () => {
    act(() => renderApprovedActivityReport(5005));
    await waitFor(() => {
      expect(screen.getByText(report.author.fullName)).toBeInTheDocument();
    });
  });

  it('handles a malformed url', async () => {
    act(() => renderApprovedActivityReport('butter-lover'));
    await waitFor(() => {
      expect(screen.getByText(/sorry, something went wrong\./i)).toBeInTheDocument();
    });
  });

  it('handles a missing version number', async () => {
    act(() => renderApprovedActivityReport(5006));
    await waitFor(() => {
      expect(screen.getByText(report.author.fullName)).toBeInTheDocument();
    });
  });

  it('handles unavailable local storage', async () => {
    const oldLocalStorage = global.localStorage;
    delete global.localStorage;

    act(() => renderApprovedActivityReport(5005));
    await waitFor(() => {
      expect(screen.getByText(report.author.fullName)).toBeInTheDocument();
    });

    global.localStorage = oldLocalStorage;
  });
});
