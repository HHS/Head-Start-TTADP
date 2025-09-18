import '@testing-library/jest-dom';
import React from 'react';
import { APPROVER_STATUSES, REPORT_STATUSES } from '@ttahub/common';
import {
  render, screen,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Router } from 'react-router';
import { createMemoryHistory } from 'history';

import MyAlerts from '../MyAlerts';
import activityReports from '../mocks';
import { ALERTS_PER_PAGE } from '../../../Constants';
import UserContext from '../../../UserContext';

const user = {
  name: 'test@test.com',
  fullName: 'a',
  id: 999,
};

const renderMyAlerts = (report = false) => {
  const history = createMemoryHistory();
  const newBtn = true;
  const alertsSortConfig = { sortBy: 'startDate', direction: 'desc' };
  const alertsOffset = 0;
  const alertsPerPage = ALERTS_PER_PAGE;
  const alertsActivePage = 1;
  const alertReportsCount = 10;
  const updateReportAlerts = jest.fn();
  const setAlertReportsCount = jest.fn();
  const requestAlertsSort = jest.fn();

  render(
    <Router history={history}>
      <UserContext.Provider value={{ user }}>
        <MyAlerts
          loading={false}
          reports={report ? [report] : activityReports}
          newBtn={newBtn}
          alertsSortConfig={alertsSortConfig}
          alertsOffset={alertsOffset}
          alertsPerPage={alertsPerPage}
          alertsActivePage={alertsActivePage}
          alertReportsCount={alertReportsCount}
          sortHandler={requestAlertsSort}
          updateReportAlerts={updateReportAlerts}
          setAlertReportsCount={setAlertReportsCount}
          fetchReports={() => { }}
          updateReportFilters={() => { }}
          handleDownloadAllAlerts={() => { }}
        />
      </UserContext.Provider>
    </Router>,
  );
  return history;
};

describe('My Alerts', () => {
  test('displays report id column', async () => {
    renderMyAlerts();
    const reportIdColumnHeader = await screen.findByRole('columnheader', {
      name: /report id/i,
    });
    expect(reportIdColumnHeader).toBeVisible();
  });

  test('displays recipient column', async () => {
    renderMyAlerts();
    const recipientColumnHeader = await screen.findByRole('columnheader', {
      name: /recipient/i,
    });
    expect(recipientColumnHeader).toBeVisible();
  });

  test('displays date started column', async () => {
    renderMyAlerts();
    const startDateColumnHeader = await screen.findByRole('columnheader', {
      name: /date started/i,
    });
    expect(startDateColumnHeader).toBeVisible();
  });

  test('displays approvers column', async () => {
    renderMyAlerts();
    expect(await screen.findByText(/Approver manager 1/i)).toBeVisible();
    expect(await screen.findByText(/Approver manager 2/i)).toBeVisible();
    expect(await screen.findByText(/Approver manager 3/i)).toBeVisible();
  });

  test('displays creator column', async () => {
    renderMyAlerts();
    const creatorColumnHeader = await screen.findByRole('columnheader', {
      name: /creator/i,
    });
    expect(creatorColumnHeader).toBeVisible();
  });

  test('displays the correct recipients', async () => {
    renderMyAlerts();
    const recipients = await screen.findByRole('button', { name: /click to visually reveal the recipients for r14-ar-1/i });
    expect(recipients.textContent).toContain('Johnston-Romaguera');
    const otherEntity = await screen.findByRole('cell', {
      name: /qris system/i,
    });

    expect(recipients).toBeVisible();
    expect(otherEntity).toBeVisible();
  });

  test('displays the correct start date', async () => {
    renderMyAlerts();
    const startDate = await screen.findByRole('cell', {
      name: /02\/08\/2021/i,
    });

    expect(startDate).toBeVisible();
  });

  test('displays the correct collaborators', async () => {
    renderMyAlerts();
    const collaborators = await screen.findByRole('button', { name: /click to visually reveal the collaborators for r14-ar-1/i });
    expect(collaborators).toBeVisible();
    expect(collaborators.firstChild).toHaveClass('smart-hub--ellipsis');
    const truncated = collaborators.firstChild.firstChild.firstChild;
    expect(truncated).toHaveClass('smart-hub-tooltip--truncated');
    expect(truncated).toHaveTextContent('Orange, GS');
  });

  test('displays the reviewed status', async () => {
    const report = {
      startDate: '02/01/2021',
      lastSaved: '02/04/2021',
      id: 2,
      displayId: 'R14-AR-2',
      regionId: 14,
      topics: [],
      sortedTopics: [],
      pendingApprovals: '2 of 2',
      approvers: [
        {
          user: {
            fullName: 'Approver Manager 4',
          },
          status: APPROVER_STATUSES.APPROVED,
          id: 4,
        },
        {
          status: null,
          id: 5,
          user: {
            fullName: 'Approver Manager 5',
          },
        },
      ],
      calculatedStatus: REPORT_STATUSES.SUBMITTED,
      activityRecipients: [
        {
          activityRecipientId: 3,
          name: 'QRIS System',
          id: 31,
          grant: null,
          otherEntity: {
            id: 3,
            name: 'QRIS System',
            createdAt: '2021-02-03T21:00:57.149Z',
            updatedAt: '2021-02-03T21:00:57.149Z',
          },
        },
      ],
      author: {
        fullName: 'Kiwi, GS',
        name: 'Kiwi',
        role: 'Grants Specialist',
        homeRegionId: 14,
      },
      activityReportCollaborators: [
        {
          fullName: 'Cucumber User, GS',
          user: {
            fullName: 'Cucumber User, GS',
            name: 'Cucumber User',
            role: 'Grantee Specialist',
          },
        },
        {
          fullName: 'Hermione Granger, SS',
          user: {
            fullName: 'Hermione Granger, SS',
            name: 'Hermione Granger',
            role: 'System Specialist',
          },
        },
      ],
    };

    renderMyAlerts(report);

    const reviewed = await screen.findByText(/reviewed/i);
    expect(reviewed).toBeVisible();
  });

  test('displays the needs action status', async () => {
    const report = {
      startDate: '02/01/2021',
      lastSaved: '02/04/2021',
      id: 2,
      displayId: 'R14-AR-2',
      regionId: 14,
      topics: [],
      sortedTopics: [],
      pendingApprovals: '2 of 2',
      approvers: [
        {
          user: {
            fullName: 'Approver Manager 4',
          },
          status: APPROVER_STATUSES.APPROVED,
          id: 4,
        },
        {
          status: APPROVER_STATUSES.NEEDS_ACTION,
          id: 5,
          user: {
            fullName: 'Approver Manager 5',
          },
        },
      ],
      calculatedStatus: REPORT_STATUSES.SUBMITTED,
      activityRecipients: [
        {
          activityRecipientId: 3,
          name: 'QRIS System',
          id: 31,
          grant: null,
          otherEntity: {
            id: 3,
            name: 'QRIS System',
            createdAt: '2021-02-03T21:00:57.149Z',
            updatedAt: '2021-02-03T21:00:57.149Z',
          },
        },
      ],
      author: {
        fullName: 'Kiwi, GS',
        name: 'Kiwi',
        role: 'Grants Specialist',
        homeRegionId: 14,
      },
      activityReportCollaborators: [
        {
          fullName: 'Cucumber User, GS',
          user: {
            fullName: 'Cucumber User, GS',
            name: 'Cucumber User',
            role: 'Grantee Specialist',
          },
        },
        {
          fullName: 'Hermione Granger, SS',
          user: {
            fullName: 'Hermione Granger, SS',
            name: 'Hermione Granger',
            role: 'System Specialist',
          },
        },
      ],
    };

    renderMyAlerts(report);

    const needsAction = await screen.findByText(/needs action/i);
    expect(needsAction).toBeVisible();
  });

  test('shows both context menu items when I am creator or collaborator', async () => {
    renderMyAlerts(false);
    const menuButtons = await screen.findAllByTestId('context-menu-actions-btn');
    userEvent.click(menuButtons[0]);

    const viewButton = await screen.findAllByRole('button', {
      name: 'View',
    });

    const deleteButton = await screen.findAllByRole('button', {
      name: 'Delete',
    });

    expect(viewButton.length).toBe(1);
    expect(deleteButton.length).toBe(1);
  });

  test('does not show Delete when I am not a creator or collaborator', async () => {
    const report = {
      startDate: '02/08/2021',
      lastSaved: '02/05/2021',
      id: 1,
      displayId: 'R14-AR-1',
      regionId: 14,
      topics: ['Behavioral / Mental Health', 'CLASS: Instructional Support'],
      status: 'draft',
      approvers: [{ user: { ...user } }],
      activityRecipients: [
        {
          activityRecipientId: 5,
          name: 'Johnston-Romaguera - 14CH00003',
          id: 1,
          grant: {
            id: 5,
            number: '14CH00003',
            recipient: { name: 'Johnston-Romaguera' },
          },
          otherEntity: null,
        },
        {
          activityRecipientId: 4,
          name: 'Johnston-Romaguera - 14CH00002',
          id: 2,
          grant: {
            id: 4,
            number: '14CH00002',
            recipient: { name: 'Johnston-Romaguera' },
          },
          otherEntity: null,
        },
        {
          activityRecipientId: 1,
          name: 'Recipient Name - 14CH1234',
          id: 3,
          grant: {
            id: 1,
            number: '14CH1234',
            recipient: { name: 'Recipient Name' },
          },
          otherEntity: null,
        },
      ],
      author: {
        fullName: 'Kiwi, GS',
        name: 'Kiwi',
        role: 'Grants Specialist',
        homeRegionId: 14,
      },
      collaborators: [],
    };

    renderMyAlerts(report);

    const menuButtons = await screen.findAllByTestId('context-menu-actions-btn');
    userEvent.click(menuButtons[0]);

    const viewButton = await screen.findAllByRole('button', {
      name: 'View',
    });

    expect(viewButton.length).toBe(1);

    expect(screen.queryByRole('button', { name: 'Delete' })).toBeNull();
  });

  test('redirects to view activity report when clicked from context menu', async () => {
    const history = renderMyAlerts();
    const menuButtons = await screen.findAllByTestId('context-menu-actions-btn');
    userEvent.click(menuButtons[0]);

    const viewButton = await screen.findByRole('button', {
      name: 'View',
    });
    userEvent.click(viewButton);

    expect(history.location.pathname).toBe('/activity-reports/1');
  });

  test('Deletes selected report', async () => {
    const report = {
      startDate: '02/08/2021',
      lastSaved: '02/05/2021',
      id: 1,
      userId: user.id,
      displayId: 'R14-AR-1',
      regionId: 14,
      topics: ['Behavioral / Mental Health', 'CLASS: Instructional Support'],
      status: 'draft',
      approvers: [],
      activityRecipients: [
        {
          activityRecipientId: 5,
          name: 'Johnston-Romaguera - 14CH00003',
          id: 1,
          grant: {
            id: 5,
            number: '14CH00003',
            recipient: {
              name: 'Johnston-Romaguera',
            },
          },
          otherEntity: null,
        },
        {
          activityRecipientId: 4,
          name: 'Johnston-Romaguera - 14CH00002',
          id: 2,
          grant: {
            id: 4,
            number: '14CH00002',
            recipient: {
              name: 'Johnston-Romaguera',
            },
          },
          otherEntity: null,
        },
        {
          activityRecipientId: 1,
          name: 'Recipient Name - 14CH1234',
          id: 3,
          grant: {
            id: 1,
            number: '14CH1234',
            recipient: {
              name: 'Recipient Name',
            },
          },
          otherEntity: null,
        },
      ],
      author: {
        fullName: 'Kiwi, GS',
        name: 'Kiwi',
        role: 'Grants Specialist',
        homeRegionId: 14,
      },
      collaborators: [],
    };

    renderMyAlerts(report);
    const menuButtons = await screen.findAllByTestId('context-menu-actions-btn');
    userEvent.click(menuButtons[0]);

    const viewButton = await screen.findByRole('button', {
      name: 'Delete',
    });
    userEvent.click(viewButton);

    const contextMenu = await screen.findAllByTestId('context-menu-actions-btn');
    expect(contextMenu).toBeTruthy();
    const button = await screen.findByRole('button', { name: /this button will permanently delete the report\./i, hidden: true });
    userEvent.click(button);

    const modal = document.querySelector('#DeleteReportModal');
    expect(modal).toHaveClass('is-hidden');
  });
});
