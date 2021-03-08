import '@testing-library/jest-dom';
import React from 'react';
import {
  render, screen, fireEvent, waitFor,
} from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import fetchMock from 'fetch-mock';

import UserContext from '../../../UserContext';
import Landing from '../index';
import activityReports, { activityReportsSorted, generateXFakeReports } from '../mocks';

const renderLanding = (user) => {
  render(
    <MemoryRouter>
      <UserContext.Provider value={{ user }}>
        <Landing authenticated />
      </UserContext.Provider>
    </MemoryRouter>,
  );
};

describe('Landing Page', () => {
  beforeEach(() => {
    fetchMock.get(
      '/api/activity-reports?sortBy=updatedAt&sortDir=desc&offset=0&limit=10',
      { count: 2, rows: activityReports },
    );
    fetchMock.get('/api/activity-reports/alerts', []);
    const user = {
      name: 'test@test.com',
      permissions: [
        {
          scopeId: 3,
          regionId: 1,
        },
      ],
    };

    renderLanding(user);
  });
  afterEach(() => fetchMock.restore());

  test('displays activity reports heading', async () => {
    expect(await screen.findByText('Activity Reports')).toBeVisible();
  });

  test('displays report id column', async () => {
    const reportIdColumnHeader = await screen.findByRole('columnheader', {
      name: /report id/i,
    });
    expect(reportIdColumnHeader).toBeVisible();
  });

  test('displays grantee column', async () => {
    const granteeColumnHeader = await screen.findByRole('columnheader', {
      name: /grantee/i,
    });
    expect(granteeColumnHeader).toBeVisible();
  });

  test('displays start date column', async () => {
    const startDateColumnHeader = await screen.findByRole('columnheader', {
      name: /start date/i,
    });
    expect(startDateColumnHeader).toBeVisible();
  });

  test('displays creator column', async () => {
    const creatorColumnHeader = await screen.findByRole('columnheader', {
      name: /creator/i,
    });
    expect(creatorColumnHeader).toBeVisible();
  });

  test('displays topics column', async () => {
    const topicsColumnHeader = await screen.findByRole('columnheader', {
      name: /topic\(s\)/i,
    });
    expect(topicsColumnHeader).toBeVisible();
  });

  test('displays the correct report id', async () => {
    const reportIdLink = await screen.findByRole('link', {
      name: /r14-ar-1/i,
    });

    expect(reportIdLink).toBeVisible();
    expect(reportIdLink.closest('a')).toHaveAttribute(
      'href',
      '/activity-reports/1',
    );
  });

  test('displays the correct grantees', async () => {
    const grantee = await screen.findByRole('cell', {
      name: /johnston-romaguera\njohnston-romaguera\ngrantee name/i,
    });
    const nonGrantee = await screen.findByRole('cell', {
      name: /qris system/i,
    });

    expect(grantee).toBeVisible();
    expect(nonGrantee).toBeVisible();
  });

  test('displays the correct start date', async () => {
    const startDate = await screen.findByRole('cell', {
      name: /02\/08\/2021/i,
    });

    expect(startDate).toBeVisible();
  });

  test('displays the correct topics', async () => {
    const topics = await screen.findByRole('cell', {
      name: /behavioral \/ mental health\nclass: instructional support/i,
    });

    expect(topics).toBeVisible();
  });

  test('displays the correct collaborators', async () => {
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

  test('displays the correct last saved dates', async () => {
    const lastSavedDates = await screen.findAllByText(/02\/04\/2021/i);

    expect(lastSavedDates.length).toBe(1);
  });

  test('displays the correct statuses', async () => {
    const draft = await screen.findByText(/draft/i);
    const needsAction = await screen.findByText(/needs action/i);

    expect(draft).toBeVisible();
    expect(needsAction).toBeVisible();
  });

  test('displays the options buttons', async () => {
    const optionButtons = await screen.findAllByRole('button', /.../i);

    expect(optionButtons.length).toBe(2);
  });

  test('displays the new activity report button', async () => {
    const newActivityReportBtns = await screen.findAllByText(/New Activity Report/);

    expect(newActivityReportBtns.length).toBe(1);
  });
});

describe('Landing Page sorting', () => {
  afterEach(() => fetchMock.restore());

  beforeEach(() => {
    fetchMock.get('/api/activity-reports/alerts', []);
    fetchMock.get(
      '/api/activity-reports?sortBy=updatedAt&sortDir=desc&offset=0&limit=10',
      { count: 2, rows: activityReports },
    );
    const user = {
      name: 'test@test.com',
      permissions: [
        {
          scopeId: 3,
          regionId: 1,
        },
      ],
    };

    renderLanding(user);
  });

  it('clicking status column header will sort by status', async () => {
    const statusColumnHeader = await screen.findByRole('columnheader', {
      name: /status/i,
    });
    fetchMock.reset();
    fetchMock.get('/api/activity-reports/alerts', []);
    fetchMock.get(
      '/api/activity-reports?sortBy=status&sortDir=asc&offset=0&limit=10',
      { count: 2, rows: activityReportsSorted },
    );

    fireEvent.click(statusColumnHeader);
    await waitFor(() => expect(screen.getAllByRole('cell')[6]).toHaveTextContent(/needs action/i));
    await waitFor(() => expect(screen.getAllByRole('cell')[14]).toHaveTextContent(/draft/i));

    fetchMock.get(
      '/api/activity-reports?sortBy=status&sortDir=desc&offset=0&limit=10',
      { count: 2, rows: activityReports },
    );

    fireEvent.click(statusColumnHeader);
    await waitFor(() => expect(screen.getAllByRole('cell')[6]).toHaveTextContent(/draft/i));
    await waitFor(() => expect(screen.getAllByRole('cell')[14]).toHaveTextContent(/needs action/i));
  });

  it('clicking Last saved column header will sort by updatedAt', async () => {
    const columnHeader = await screen.findByRole('columnheader', {
      name: /last saved/i,
    });
    fetchMock.get(
      '/api/activity-reports?sortBy=updatedAt&sortDir=asc&offset=0&limit=10',
      { count: 2, rows: activityReportsSorted },
    );

    fireEvent.click(columnHeader);
    await waitFor(() => expect(screen.getAllByRole('cell')[5]).toHaveTextContent(/02\/04\/2021/i));
    await waitFor(() => expect(screen.getAllByRole('cell')[13]).toHaveTextContent(/02\/05\/2021/i));
  });

  it('clicking Collaborators column header will sort by collaborators', async () => {
    const columnHeader = await screen.findByRole('columnheader', {
      name: /collaborator\(s\)/i,
    });
    fetchMock.get(
      '/api/activity-reports?sortBy=collaborators&sortDir=asc&offset=0&limit=10',
      { count: 2, rows: activityReportsSorted },
    );

    fireEvent.click(columnHeader);
    await waitFor(() => expect(screen.getAllByRole('cell')[4]).toHaveTextContent('Cucumber User, GSHermione Granger, SS'));
    await waitFor(() => expect(screen.getAllByRole('cell')[12]).toHaveTextContent('Orange, GSHermione Granger, SS'));
  });

  it('clicking Topics column header will sort by topics', async () => {
    const columnHeader = await screen.findByRole('columnheader', {
      name: /topic\(s\)/i,
    });

    fetchMock.get(
      '/api/activity-reports?sortBy=topics&sortDir=asc&offset=0&limit=10',
      { count: 2, rows: activityReportsSorted },
    );

    fireEvent.click(columnHeader);
    await waitFor(() => expect(screen.getAllByRole('cell')[3]).toHaveTextContent(''));
    await waitFor(() => expect(screen.getAllByRole('cell')[11]).toHaveTextContent('Behavioral / Mental HealthCLASS: Instructional Support'));
  });

  it('clicking Creator column header will sort by author', async () => {
    const columnHeader = await screen.findByRole('columnheader', {
      name: /creator/i,
    });

    fetchMock.get(
      '/api/activity-reports?sortBy=author&sortDir=asc&offset=0&limit=10',
      { count: 2, rows: activityReportsSorted },
    );

    fireEvent.click(columnHeader);
    await waitFor(() => expect(screen.getAllByRole('cell')[2]).toHaveTextContent('Kiwi, GS'));
    await waitFor(() => expect(screen.getAllByRole('cell')[10]).toHaveTextContent('Kiwi, TTAC'));
  });

  it('clicking Start date column header will sort by start date', async () => {
    const columnHeader = await screen.findByRole('columnheader', {
      name: /start date/i,
    });

    fetchMock.get(
      '/api/activity-reports?sortBy=startDate&sortDir=asc&offset=0&limit=10',
      { count: 2, rows: activityReportsSorted },
    );

    fireEvent.click(columnHeader);
    await waitFor(() => expect(screen.getAllByRole('cell')[1]).toHaveTextContent('02/01/2021'));
    await waitFor(() => expect(screen.getAllByRole('cell')[9]).toHaveTextContent('02/08/2021'));
  });

  it('clicking Grantee column header will sort by grantee', async () => {
    const columnHeader = await screen.findByRole('columnheader', {
      name: /grantee/i,
    });

    fetchMock.get(
      '/api/activity-reports?sortBy=activityRecipients&sortDir=asc&offset=0&limit=10',
      { count: 2, rows: activityReportsSorted },
    );

    fireEvent.click(columnHeader);
    await waitFor(() => expect(screen.getAllByRole('cell')[0]).toHaveTextContent('Johnston-RomagueraJohnston-RomagueraGrantee Name'));
  });

  it('clicking Report id column header will sort by region and id', async () => {
    const columnHeader = await screen.findByRole('columnheader', {
      name: /report id/i,
    });

    fetchMock.get(
      '/api/activity-reports?sortBy=regionId&sortDir=asc&offset=0&limit=10',
      { count: 2, rows: activityReportsSorted },
    );

    fireEvent.click(columnHeader);
    await waitFor(() => expect(screen.getAllByRole('link')[4]).toHaveTextContent('R14-AR-2'));
    await waitFor(() => expect(screen.getAllByRole('link')[5]).toHaveTextContent('R14-AR-1'));
  });

  it('Pagination links are visible', async () => {
    const prevLink = await screen.findByRole('link', {
      name: /go to previous page/i,
    });
    const pageOne = await screen.findByRole('link', {
      name: /go to page number 1/i,
    });
    const nextLink = await screen.findByRole('link', {
      name: /go to next page/i,
    });

    expect(prevLink).toBeVisible();
    expect(pageOne).toBeVisible();
    expect(nextLink).toBeVisible();
  });

  it('clicking on pagination page works', async () => {
    const pageOne = await screen.findByRole('link', {
      name: /go to page number 1/i,
    });
    fetchMock.reset();
    fetchMock.get('/api/activity-reports/alerts', []);
    fetchMock.get(
      '/api/activity-reports?sortBy=updatedAt&sortDir=desc&offset=0&limit=10',
      { count: 2, rows: activityReportsSorted },
    );

    fireEvent.click(pageOne);
    await waitFor(() => expect(screen.getAllByRole('cell')[5]).toHaveTextContent(/02\/05\/2021/i));
    await waitFor(() => expect(screen.getAllByRole('cell')[13]).toHaveTextContent(/02\/04\/2021/i));
  });

  it('clicking on the second page updates to, from and total', async () => {
    expect(generateXFakeReports(10).length).toBe(10);
    await screen.findByRole('link', {
      name: /go to page number 1/i,
    });
    fetchMock.reset();
    fetchMock.get('/api/activity-reports/alerts', []);
    fetchMock.get(
      '/api/activity-reports?sortBy=updatedAt&sortDir=desc&offset=0&limit=10',
      { count: 17, rows: generateXFakeReports(10) },
    );
    const user = {
      name: 'test@test.com',
      permissions: [
        {
          scopeId: 3,
          regionId: 1,
        },
      ],
    };

    renderLanding(user);

    const pageTwo = await screen.findByRole('link', {
      name: /go to page number 2/i,
    });

    fetchMock.get(
      '/api/activity-reports?sortBy=updatedAt&sortDir=desc&offset=10&limit=10',
      { count: 17, rows: generateXFakeReports(10) },
    );

    fireEvent.click(pageTwo);
    await waitFor(() => expect(screen.getByText(/11-17 of 17/i)).toBeVisible());
  });
});

describe('Landing Page error', () => {
  afterEach(() => fetchMock.restore());

  beforeEach(() => {
    fetchMock.get('/api/activity-reports/alerts', []);
  });

  it('handles errors by displaying an error message', async () => {
    fetchMock.get('/api/activity-reports?sortBy=updatedAt&sortDir=desc&offset=0&limit=10', 500);
    const user = {
      name: 'test@test.com',
      permissions: [
        {
          scopeId: 3,
          regionId: 1,
        },
      ],
    };
    renderLanding(user);
    const alert = await screen.findByRole('alert');
    expect(alert).toBeVisible();
    expect(alert).toHaveTextContent('Unable to fetch reports');
  });

  it('displays an empty row if there are no reports', async () => {
    fetchMock.get(
      '/api/activity-reports?sortBy=updatedAt&sortDir=desc&offset=0&limit=10',
      { count: 0, rows: [] },
    );
    const user = {
      name: 'test@test.com',
      permissions: [
        {
          scopeId: 3,
          regionId: 1,
        },
      ],
    };
    renderLanding(user);
    const rowCells = await screen.findAllByRole('cell');
    expect(rowCells.length).toBe(8);
    const grantee = rowCells[0];
    expect(grantee).toHaveTextContent('');
  });

  it('does not displays new activity report button without permission', async () => {
    fetchMock.get(
      '/api/activity-reports?sortBy=updatedAt&sortDir=desc&offset=0&limit=10',
      { count: 2, rows: activityReports },
    );
    const user = {
      name: 'test@test.com',
      permissions: [
        {
          scopeId: 2,
          regionId: 1,
        },
      ],
    };
    renderLanding(user);

    await expect(screen.findAllByText(/New Activity Report/)).rejects.toThrow();
  });
});
