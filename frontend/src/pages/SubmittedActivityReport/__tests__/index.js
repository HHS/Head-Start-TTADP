import '@testing-library/jest-dom';
import React from 'react';
import { Router } from 'react-router';
import { SCOPE_IDS } from '@ttahub/common';
import {
  fireEvent,
  render,
  screen,
  waitFor,
  act,
} from '@testing-library/react';
import fetchMock from 'fetch-mock';

import { createMemoryHistory } from 'history';
import SubmittedActivityReport from '../index';

describe('Submitted activity report view', () => {
  const history = createMemoryHistory();

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
        id: 1, status: '', note: '', user: { id: 1, fullName: 'John Q Fullname' },
      },

      {
        id: 2, status: '', note: 'note', user: { id: 2, fullName: 'John Smith' },
      },
    ],
    targetPopulations: ['Mid size sedans'],
    language: [],
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

  function renderSubmittedActivityReport(id, passedUser = user) {
    const match = {
      path: '',
      url: '',
      params: {
        activityReportId: id,
      },
    };

    render(
      <Router history={history}>
        <SubmittedActivityReport user={passedUser} match={match} />
      </Router>,
    );
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
    fetchMock.get('/api/activity-reports/5002', { status: 500 });

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

    fetchMock.get('/api/activity-reports/5007', { status: 401 });
  });

  it('renders a submitted activity report', async () => {
    act(() => renderSubmittedActivityReport(5000));

    await waitFor(() => {
      expect(screen.getByText(report.author.fullName)).toBeInTheDocument();
    });
  });

  it('handles alternate report data', async () => {
    act(() => renderSubmittedActivityReport(5001));

    await waitFor(() => {
      expect(fetchMock.called('/api/activity-reports/5001')).toBeTruthy();
    });
  });

  it('handles authorization errors', async () => {
    const spy = jest.spyOn(history, 'push');
    act(() => renderSubmittedActivityReport(5007, user));

    await waitFor(() => {
      expect(fetchMock.called('/api/activity-reports/5007')).toBeTruthy();
    });

    expect(spy).toHaveBeenCalledWith('/something-went-wrong/401');
  });

  it('handles data errors', async () => {
    const spy = jest.spyOn(history, 'push');

    act(() => renderSubmittedActivityReport(5002, user));

    await waitFor(() => {
      expect(fetchMock.called('/api/activity-reports/5002')).toBeTruthy();
    });

    expect(spy).toHaveBeenCalledWith('/something-went-wrong/500');
  });

  it('copies a url to clipboard', async () => {
    global.navigator.clipboard = jest.fn();
    global.navigator.clipboard.writeText = jest.fn(() => Promise.resolve());

    act(() => renderSubmittedActivityReport(5000));
    await waitFor(() => {
      const copyButton = screen.getByRole('button', { name: /copy url link/i });
      fireEvent.click(copyButton);
      expect(navigator.clipboard.writeText).toHaveBeenCalled();
    });
  });

  it('handles a missing DOM API', async () => {
    global.navigator.clipboard = jest.fn();
    act(() => renderSubmittedActivityReport(5000));
    await waitFor(() => {
      const copyButton = screen.getByRole('button', { name: /copy url link/i });
      fireEvent.click(copyButton);
      expect(screen.getByText(/sorry, something went wrong copying that url\. here it ishttp:\/\/localhost\//i)).toBeInTheDocument();
    });
  });

  it('opens a print dialog', async () => {
    act(() => renderSubmittedActivityReport(5003));
    await waitFor(() => {
      const printButton = screen.getByRole('button', { name: /print to pdf/i });
      fireEvent.click(printButton);
      expect(window.print).toHaveBeenCalled();
    });
  });

  it('renders a version 2 report', async () => {
    act(() => renderSubmittedActivityReport(5004));
    await waitFor(() => {
      expect(screen.getByText(report.author.fullName)).toBeInTheDocument();
    });
  });

  it('handles a malformed url', async () => {
    const spy = jest.spyOn(history, 'push');
    fetchMock.get('/api/activity-reports/butter-lover', {});
    await act(async () => {
      renderSubmittedActivityReport('butter-lover', user);
    });

    await waitFor(() => {
      expect(spy).toHaveBeenCalledWith('/something-went-wrong/404');
    });
  });

  it('handles a missing version number', async () => {
    act(() => renderSubmittedActivityReport(5006));
    await waitFor(() => {
      expect(screen.getByText(report.author.fullName)).toBeInTheDocument();
    });
  });
});
