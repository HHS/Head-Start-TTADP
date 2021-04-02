import '@testing-library/jest-dom';
import React from 'react';
import {
  render, screen,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Router } from 'react-router';
import { createMemoryHistory } from 'history';

import MyAlerts from '../MyAlerts';
import activityReports from '../mocks';
import { ALERTS_PER_PAGE } from '../../../Constants';

const renderMyAlerts = () => {
  const history = createMemoryHistory();
  const newBtn = true;
  const alertsSortConfig = { sortBy: 'startDate', direction: 'desc' };
  const alertsOffset = 0;
  const alertsPerPage = ALERTS_PER_PAGE;
  const alertsActivePage = 1;
  const alertReportsCount = 10;
  const requestAlertsSort = jest.fn();
  render(
    <Router history={history}>
      <MyAlerts
        reports={activityReports}
        newBtn={newBtn}
        alertsSortConfig={alertsSortConfig}
        alertsOffset={alertsOffset}
        alertsPerPage={alertsPerPage}
        alertsActivePage={alertsActivePage}
        alertReportsCount={alertReportsCount}
        sortHandler={requestAlertsSort}
        fetchReports={() => {}}
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

  test('displays grantee column', async () => {
    renderMyAlerts();
    const granteeColumnHeader = await screen.findByRole('columnheader', {
      name: /grantee/i,
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

  test('displays creator column', async () => {
    renderMyAlerts();
    const creatorColumnHeader = await screen.findByRole('columnheader', {
      name: /creator/i,
    });
    expect(creatorColumnHeader).toBeVisible();
  });

  test('displays the correct grantees', async () => {
    renderMyAlerts();
    const grantees = await screen.findByRole('cell', {
      name: /johnston-romaguera\njohnston-romaguera\ngrantee name/i,
    });
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
    const collaborators = await screen.findByRole('cell', {
      name: /cucumber user, gs\nhermione granger, ss/i,
    });

    expect(collaborators).toBeVisible();
    expect(collaborators.firstChild).toHaveClass('smart-hub--ellipsis');
    expect(collaborators.firstChild.children.length).toBe(2);
    expect(collaborators.firstChild.firstChild).toHaveClass('usa-tag smart-hub--table-collection');
    expect(collaborators.firstChild.firstChild).toHaveTextContent('Cucumber User');
    expect(collaborators.firstChild.lastChild).toHaveTextContent('Hermione Granger');
  });

  test('displays the correct statuses', async () => {
    renderMyAlerts();
    const draft = await screen.findByText(/draft/i);
    const needsAction = await screen.findByText(/needs action/i);

    expect(draft).toBeVisible();
    expect(needsAction).toBeVisible();
  });

  test('displays the context menu buttons', async () => {
    renderMyAlerts();
    const menuButtons = await screen.findAllByTestId('ellipsis-button');
    userEvent.click(menuButtons[0]);

    const viewButton = await screen.findAllByRole('button', {
      name: 'Open report',
    });

    const deleteButton = await screen.findAllByRole('button', {
      name: 'Delete report',
    });

    expect(viewButton.length).toBe(1);
    expect(deleteButton.length).toBe(1);
  });

  test('redirects to view activity report when clicked from context menu', async () => {
    const history = renderMyAlerts();
    const menuButtons = await screen.findAllByTestId('ellipsis-button');
    userEvent.click(menuButtons[0]);

    const viewButton = await screen.findByRole('button', {
      name: 'Open report',
    });
    userEvent.click(viewButton);

    expect(history.location.pathname).toBe('/activity-reports/1');
  });

  test('Deletes selected report', async () => {
    renderMyAlerts();
    const menuButtons = await screen.findAllByTestId('ellipsis-button');
    userEvent.click(menuButtons[0]);

    const viewButton = await screen.findByRole('button', {
      name: 'Delete report',
    });
    userEvent.click(viewButton);

    const contextMenu = await screen.findAllByTestId('ellipsis-button');
    expect(contextMenu).toBeTruthy();

    const button = await screen.findByRole('button', {
      name: 'Delete',
    });

    userEvent.click(button);

    const modal = screen.queryByRole('modal');
    expect(modal).not.toBeTruthy();
  });
});
