import '@testing-library/jest-dom';
import React from 'react';
import {
  render, screen, within,
} from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import fetchMock from 'fetch-mock';

import UserContext from '../../../UserContext';
import Landing from '../index';
import activityReports from '../mocks';
import * as page from '../index';

describe('Landing Page', () => {
  beforeEach(() => {
    fetchMock.get('/api/activity-reports', activityReports);
    const user = {
      name: 'test@test.com',
    };

    render(
      <MemoryRouter>
        <UserContext.Provider value={{ user }}>
          <Landing authenticated />
        </UserContext.Provider>
      </MemoryRouter>,
    );
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

  test('displays Report ID Grantee Start date Creator Topic(s) Collaborator(s) Last saved Status', async () => {
    const columnHeaders = await screen.findByRole('row', {
      name:
        'Report ID Grantee Start date Creator Topic(s) Collaborator(s) Last saved Status ...',
    });
    expect(columnHeaders).toBeVisible();
  });

  test('displays the correct report id', async () => {
    const reportIdLink = await screen.findByRole('link', {
      name: /r14-000001/i,
    });

    expect(reportIdLink).toBeVisible();
    expect(reportIdLink.closest('a')).toHaveAttribute(
      'href',
      '/activity-reports/1/activity-summary',
    );
  });

  test('displays the correct grantees', async () => {
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

    expect(lastSavedDates.length).toBe(2);
  });

  test('displays the correct statuses', async () => {
    const statuses = await screen.findAllByText(/draft/i);

    expect(statuses.length).toBe(2);
  });

  test('displays the options buttons', async () => {
    const optionButtons = await screen.findAllByRole('button', /.../i);

    expect(optionButtons.length).toBe(2);
  });



  test('activityReportId is correct', () => {
    const spy = jest.spyOn(page, 'activityReportId');
    const reportId = page.activityReportId(333, 9);

    expect(spy).toHaveBeenCalled();
    expect(reportId).toBe('R09-000333');

    spy.mockRestore();
  });
});

describe('Landing Page error', () => {
  afterEach(() => fetchMock.restore());

  it('handles errors by displaying an error message', async () => {
    fetchMock.get('/api/activity-reports', 500);
    render(<MemoryRouter><Landing authenticated /></MemoryRouter>);
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Unable to fetch reports');
  });

  it('displays an empty row if there are no reports', async () => {
    fetchMock.get('/api/activity-reports', []);
    render(<MemoryRouter><Landing authenticated /></MemoryRouter>);
    const rowCells = await screen.findAllByRole('cell');
    expect(rowCells.length).toBe(9);
    const reportId = within(rowCells[0]).getByRole('link');
    expect(reportId).toHaveTextContent('');
  });
});
