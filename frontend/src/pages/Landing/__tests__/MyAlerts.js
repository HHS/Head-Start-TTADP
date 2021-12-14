import '@testing-library/jest-dom';
import React from 'react';
import {
  render, screen,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Router } from 'react-router';
import { createMemoryHistory } from 'history';

import MyAlerts, { ReportsRow } from '../MyAlerts';
import activityReports from '../mocks';
import { ALERTS_PER_PAGE } from '../../../Constants';

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
      <MyAlerts
        loading={false}
        reports={report ? [...activityReports, report] : activityReports}
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
    const granteeColumnHeader = await screen.findByRole('columnheader', {
      name: /recipient/i,
    });
    expect(granteeColumnHeader).toBeVisible();
  });

  test('displays start date column', async () => {
    renderMyAlerts();
    const startDateColumnHeader = await screen.findByRole('columnheader', {
      name: /start date/i,
    });
    expect(startDateColumnHeader).toBeVisible();
  });

  test('displays approvers column', async () => {
    renderMyAlerts();
    const approverListToolTip1 = screen.getByRole('button', { name: /1 of 3 pending approvals: approver manager 1,approver manager 2,approver manager 3\. click button to visually reveal this information\./i });
    expect(approverListToolTip1).toBeVisible();
    const approverListToolTip2 = screen.getByRole('button', { name: /2 of 2 pending approvals: approver manager 4,approver manager 5\. click button to visually reveal this information\./i });
    expect(approverListToolTip2).toBeVisible();
    const reportIdColumnHeader = await screen.findByRole('columnheader', {
      name: /report id/i,
    });
    expect(reportIdColumnHeader).toBeVisible();
  });

  test('displays creator column', async () => {
    renderMyAlerts();
    const creatorColumnHeader = await screen.findByRole('columnheader', {
      name: /creator/i,
    });
    expect(creatorColumnHeader).toBeVisible();
  });

  test('displays the correct grantees', async () => {
    renderMyAlerts();
    const grantees = await screen.findByRole('button', { name: /johnston-romaguera johnston-romaguera grantee name click to visually reveal the recipients for r14-ar-1/i });
    const nonGrantees = await screen.findByRole('cell', {
      name: /qris system/i,
    });

    expect(grantees).toBeVisible();
    expect(nonGrantees).toBeVisible();
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
    const collaborators = await screen.findByRole('button', { name: /orange, gs hermione granger, ss click to visually reveal the collaborators for r14-ar-1/i });

    expect(collaborators).toBeVisible();
    expect(collaborators.firstChild).toHaveClass('smart-hub--ellipsis');
    const truncated = collaborators.firstChild.firstChild.firstChild;
    expect(truncated).toHaveClass('smart-hub--tooltip-truncated');
    expect(truncated).toHaveTextContent('Orange, GS');
  });

  test('displays the correct statuses', async () => {
    renderMyAlerts();
    const draft = await screen.findByText(/draft/i);
    const needsAction = await screen.findByText(/needs action/i);

    expect(draft).toBeVisible();
    expect(needsAction).toBeVisible();
  });

  test('reports row shows the correct status', async () => {
    const report = {
      ...activityReports[0],
      id: activityReports[0].id.toString(),
      calculatedStatus: 'needs_action',
    };

    const message = {
      reportId: report.id,
      status: 'unlocked',
    };
    const history = createMemoryHistory();

    render(
      <Router history={history}>
        <ReportsRow
          reports={[...activityReports, report]}
          removeAlert={jest.fn()}
          message={message}
        />
      </Router>,
    );

    const needsAction = await screen.findAllByText(/needs action/i);
    expect(needsAction.length).toBe(2);
  });

  test('displays the context menu buttons', async () => {
    renderMyAlerts();
    const menuButtons = await screen.findAllByTestId('ellipsis-button');
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

  test('redirects to view activity report when clicked from context menu', async () => {
    const history = renderMyAlerts();
    const menuButtons = await screen.findAllByTestId('ellipsis-button');
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
            grantee: {
              name: 'Johnston-Romaguera',
            },
          },
          nonGrantee: null,
        },
        {
          activityRecipientId: 4,
          name: 'Johnston-Romaguera - 14CH00002',
          id: 2,
          grant: {
            id: 4,
            number: '14CH00002',
            grantee: {
              name: 'Johnston-Romaguera',
            },
          },
          nonGrantee: null,
        },
        {
          activityRecipientId: 1,
          name: 'Grantee Name - 14CH1234',
          id: 3,
          grant: {
            id: 1,
            number: '14CH1234',
            grantee: {
              name: 'Grantee Name',
            },
          },
          nonGrantee: null,
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
    const menuButtons = await screen.findAllByTestId('ellipsis-button');
    userEvent.click(menuButtons[0]);

    const viewButton = await screen.findByRole('button', {
      name: 'Delete',
    });
    userEvent.click(viewButton);

    const contextMenu = await screen.findAllByTestId('ellipsis-button');
    expect(contextMenu).toBeTruthy();
    const button = await screen.findByRole('button', { name: /this button will permanently delete the report\./i, hidden: true });
    userEvent.click(button);

    const modal = document.querySelector('#DeleteReportModal');
    expect(modal).toHaveClass('is-hidden');
  });
});
