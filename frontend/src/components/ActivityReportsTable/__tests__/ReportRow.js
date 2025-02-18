import '@testing-library/jest-dom';
import React from 'react';
import {
  render, screen,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Router } from 'react-router';
import { createMemoryHistory } from 'history';
import ReportRow from '../ReportRow';
import { generateXFakeReports } from '../mocks';

const history = createMemoryHistory();

const [report] = generateXFakeReports(1);

describe('ReportRow', () => {
  const renderReportRow = (numberOfSelectedReports = 0, exportSelected = jest.fn()) => (
    render(
      <Router history={history}>
        <ReportRow
          report={report}
          openMenuUp={false}
          handleReportSelect={jest.fn()}
          isChecked={false}
          numberOfSelectedReports={numberOfSelectedReports}
          exportSelected={exportSelected}
        />
      </Router>,
    )
  );

  beforeAll(async () => {
    global.navigator.clipboard = jest.fn();
    global.navigator.clipboard.writeText = jest.fn(() => Promise.resolve());
  });

  afterAll(() => {
    delete global.navigator;
  });

  it('the view link works', async () => {
    history.push = jest.fn();
    renderReportRow();
    userEvent.click(await screen.findByRole('button', { name: 'Actions for activity report R14-AR-1' }));
    userEvent.click(await screen.findByRole('button', { name: /view/i }));

    expect(history.push).toHaveBeenCalled();
  });

  it('you can copy', async () => {
    renderReportRow();
    userEvent.click(await screen.findByRole('button', { name: 'Actions for activity report R14-AR-1' }));
    userEvent.click(await screen.findByRole('button', { name: /copy url/i }));

    expect(navigator.clipboard.writeText).toHaveBeenCalled();
  });

  it('the export all button appears when a report is selected', () => {
    const exportSelected = jest.fn();
    renderReportRow(1, exportSelected);

    userEvent.tab();
    userEvent.tab();
    userEvent.keyboard('{enter}');
    expect(exportSelected).toHaveBeenCalled();
  });

  it('shows the correct URL for a legacy report', () => {
    const legacyReport = {
      startDate: '02/08/2021',
      lastSaved: '02/05/2021',
      id: 1,
      displayId: 'R14-AR-1',
      regionId: 14,
      legacyId: 123456,
      topics: ['Behavioral / Mental Health', 'CLASS: Instructional Support'],
      sortedTopics: ['Behavioral / Mental Health', 'CLASS: Instructional Support'],
      calculatedStatus: 'approved',
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
          name: 'Grantee Name - 14CH1234',
          id: 3,
          grant: {
            id: 1,
            number: '14CH1234',
            recipient: {
              name: 'Grantee Name',
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
      activityReportCollaborators: [
        {
          fullName: 'Orange, GS',
          user: {
            fullName: 'Orange, GS',
            name: 'Orange',
            role: 'Grants Specialist',
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
    render(
      <Router history={history}>
        <ReportRow
          report={legacyReport}
          openMenuUp={false}
          handleReportSelect={jest.fn()}
          isChecked={false}
          numberOfSelectedReports={0}
          exportSelected={jest.fn()}
        />
      </Router>,
    );

    expect(screen.getByText('R14-AR-1')).toHaveAttribute('href', '/activity-reports/legacy/123456');
  });

  it('shows the correct URL for an approved report', () => {
    const legacyReport = {
      startDate: '02/08/2021',
      lastSaved: '02/05/2021',
      id: 1,
      displayId: 'R14-AR-1',
      regionId: 14,
      topics: ['Behavioral / Mental Health', 'CLASS: Instructional Support'],
      sortedTopics: ['Behavioral / Mental Health', 'CLASS: Instructional Support'],
      calculatedStatus: 'approved',
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
          name: 'Grantee Name - 14CH1234',
          id: 3,
          grant: {
            id: 1,
            number: '14CH1234',
            recipient: {
              name: 'Grantee Name',
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
      activityReportCollaborators: [
        {
          fullName: 'Orange, GS',
          user: {
            fullName: 'Orange, GS',
            name: 'Orange',
            role: 'Grants Specialist',
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
    render(
      <Router history={history}>
        <ReportRow
          report={legacyReport}
          openMenuUp={false}
          handleReportSelect={jest.fn()}
          isChecked={false}
          numberOfSelectedReports={0}
          exportSelected={jest.fn()}
        />
      </Router>,
    );

    expect(screen.getByText('R14-AR-1')).toHaveAttribute('href', '/activity-reports/view/1');
  });
});
