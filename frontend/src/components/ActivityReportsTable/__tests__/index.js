/* eslint-disable react/prop-types */
import '@testing-library/jest-dom';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import fetchMock from 'fetch-mock';
import React from 'react';
import { MemoryRouter } from 'react-router';
import AriaLiveContext from '../../../AriaLiveContext';
import { downloadActivityReportExport } from '../../../fetchers/activityReports';
import { getReportsDownloadURL } from '../../../fetchers/helpers';
import { convertToResponse, mockWindowProperty } from '../../../testHelpers';
import UserContext from '../../../UserContext';
import ActivityReportsTable from '../index';
import activityReports, { activityReportsSorted, generateXFakeReports } from '../mocks';

jest.mock('../../../fetchers/helpers', () => ({
  ...jest.requireActual('../../../fetchers/helpers'),
  getReportsDownloadURL: jest.fn(),
}));

jest.mock('../../../fetchers/activityReports', () => ({
  ...jest.requireActual('../../../fetchers/activityReports'),
  downloadActivityReportExport: jest.fn(),
}));

const oldWindowLocation = window.location;

const mockAnnounce = jest.fn();

const withRegionOne = '&region.in[]=1';
const base = '/api/activity-reports?sortBy=updatedAt&sortDir=desc&offset=0&limit=10';
const defaultBaseUrlWithRegionOne = `${base}${withRegionOne}`;

const mockFetchWithRegionOne = () => {
  fetchMock.get(defaultBaseUrlWithRegionOne, convertToResponse(activityReports, false, 17));
};

const TableMock = ({ user, dateTime }) => {
  const [resetPagination, setResetPagination] = React.useState(false);
  return (
    <MemoryRouter>
      <AriaLiveContext.Provider value={{ announce: mockAnnounce }}>
        <UserContext.Provider value={{ user }}>
          <button
            type="button"
            onClick={() => setResetPagination(!resetPagination)}
            data-testid="reset-pagination"
          >
            Reset pagination
          </button>
          <ActivityReportsTable
            filters={[
              {
                id: '1',
                topic: 'region',
                condition: 'is',
                query: '1',
              },
            ]}
            showFilter
            onUpdateFilters={() => {}}
            tableCaption="Activity Reports"
            dateTime={dateTime}
            exportIdPrefix="activity-reports-"
            resetPagination={resetPagination}
            setResetPagination={setResetPagination}
          />
        </UserContext.Provider>
      </AriaLiveContext.Provider>
    </MemoryRouter>
  );
};

const renderTable = (user, dateTime) => {
  render(<TableMock user={user} dateTime={dateTime} />);
};

describe('ActivityReportsTable', () => {
  describe('Table menus & selections', () => {
    mockWindowProperty('sessionStorage', {
      setItem: jest.fn(),
      getItem: jest.fn(),
      removeItem: jest.fn(),
    });

    describe('Table row context menu', () => {
      const oldGlobalUrl = global.URL;

      beforeAll(() => {
        delete global.window.location;
        global.window.location = {
          ...oldWindowLocation,
          toString: jest.fn(() => 'http://window.location.com'),
          assign: jest.fn(),
        };
        global.URL = jest.fn();
      });

      beforeEach(async () => {
        fetchMock.reset();
        fetchMock.get(
          defaultBaseUrlWithRegionOne,
          convertToResponse(generateXFakeReports(10, ['approved']))
        );
        const user = {
          name: 'test@test.com',
          homeRegionId: 1,
          permissions: [
            {
              scopeId: 3,
              regionId: 1,
            },
            {
              scopeId: 2,
              regionId: 1,
            },
          ],
        };

        renderTable(user);
        await screen.findByText('Activity Reports');
      });

      afterEach(() => {
        window.location.assign.mockReset();
        getReportsDownloadURL.mockClear();
        fetchMock.restore();
      });

      afterAll(() => {
        window.location = oldWindowLocation;
        global.URL = oldGlobalUrl;
      });

      it('can trigger an activity report download', async () => {
        const contextMenus = await screen.findAllByRole('button', {
          name: /actions for activity report /i,
        });

        await waitFor(() => {
          expect(contextMenus.length).not.toBe(0);
        });

        const menu = contextMenus[0];

        await waitFor(() => {
          expect(menu).toBeVisible();
        });

        fireEvent.click(menu);

        const viewButton = await screen.findByRole('button', { name: 'Download' });

        await waitFor(() => {
          expect(viewButton).toBeVisible();
        });

        fireEvent.click(viewButton);

        await waitFor(() => {
          expect(window.location.assign).toHaveBeenCalled();
        });
      });
    });

    describe('Table row checkboxes', () => {
      afterEach(() => fetchMock.restore());

      beforeEach(async () => {
        fetchMock.reset();
        fetchMock.get(defaultBaseUrlWithRegionOne, convertToResponse(generateXFakeReports(10)));
        const user = {
          name: 'test@test.com',
          homeRegionId: 14,
          permissions: [
            {
              scopeId: 3,
              regionId: 1,
            },
          ],
        };

        renderTable(user);
        await screen.findByText('Activity Reports');
      });

      it('Can select and deselect a single checkbox', async () => {
        const reportCheckboxes = await screen.findAllByRole('checkbox', { name: /select /i });

        // Element 0 is 'Select all', so we want 1 or later
        const singleReportCheck = reportCheckboxes[1];
        expect(singleReportCheck.value).toEqual('1');

        fireEvent.click(singleReportCheck);
        expect(singleReportCheck.checked).toBe(true);

        fireEvent.click(singleReportCheck);
        expect(singleReportCheck.checked).toBe(false);
      });
    });

    describe('Table header checkbox', () => {
      afterEach(() => fetchMock.restore());

      beforeEach(async () => {
        fetchMock.reset();
        fetchMock.get(defaultBaseUrlWithRegionOne, convertToResponse(generateXFakeReports(10)));
        const user = {
          name: 'test@test.com',
          homeRegionId: 14,
          permissions: [
            {
              scopeId: 3,
              regionId: 1,
            },
          ],
        };

        renderTable(user);
        await screen.findByText('Activity Reports');
      });

      it('Selects all reports when checked', async () => {
        const selectAllCheckbox = await screen.findByLabelText(/select or de-select all reports/i);

        fireEvent.click(selectAllCheckbox);

        await waitFor(() => {
          const checkboxes = screen.getAllByRole('checkbox');
          expect(checkboxes).toHaveLength(11); // 1 selectAllCheckbox + 10 report checkboxes
          checkboxes.forEach((c) => expect(c).toBeChecked());
        });
      });

      it('De-selects all reports if all are already selected', async () => {
        const selectAllCheckbox = await screen.findByLabelText(/select or de-select all reports/i);

        fireEvent.click(selectAllCheckbox);

        await waitFor(() => {
          const checkboxes = screen.getAllByRole('checkbox');
          expect(checkboxes).toHaveLength(11); // 1 selectAllCheckbox + 10 report checkboxes
          checkboxes.forEach((c) => expect(c).toBeChecked());
        });

        fireEvent.click(selectAllCheckbox);

        await waitFor(() => {
          const checkboxes = screen.getAllByRole('checkbox');
          expect(checkboxes).toHaveLength(11); // 1 selectAllCheckbox + 10 report checkboxes
          checkboxes.forEach((c) => expect(c).not.toBeChecked());
        });
      });
    });

    describe('Selection without a count badge', () => {
      it('can de-select all reports using the header checkbox without a selected pill', async () => {
        fetchMock.reset();
        fetchMock.get(defaultBaseUrlWithRegionOne, convertToResponse(generateXFakeReports(10)));

        const user = {
          name: 'test@test.com',
          homeRegionId: 14,
          permissions: [
            {
              scopeId: 3,
              regionId: 1,
            },
          ],
        };

        renderTable(user);
        await screen.findByText('Activity Reports');
        const selectAllCheckbox = await screen.findByLabelText(/select or de-select all reports/i);
        userEvent.click(selectAllCheckbox);
        await waitFor(() => {
          const checkboxes = screen.getAllByRole('checkbox');
          expect(checkboxes).toHaveLength(11); // 1 selectAllCheckbox + 10 report checkboxes
          checkboxes.forEach((c) => expect(c).toBeChecked());
        });

        expect(
          screen.queryByRole('button', { name: 'deselect all reports' })
        ).not.toBeInTheDocument();
        expect(screen.queryByText(/^10 selected$/)).not.toBeInTheDocument();
        userEvent.click(selectAllCheckbox);
        await waitFor(() => {
          const checkboxes = screen.getAllByRole('checkbox');
          expect(checkboxes).toHaveLength(11); // 1 selectAllCheckbox + 10 report checkboxes
          checkboxes.forEach((c) => expect(c).not.toBeChecked());
        });
      });
    });

    describe('download all reports button', () => {
      beforeAll(async () => {
        fetchMock.reset();
        fetchMock.get(defaultBaseUrlWithRegionOne, { count: 10, rows: [], recipients: [] });
      });

      it('opens the full-table format chooser without starting a download', async () => {
        const user = {
          name: 'test@test.com',
          homeRegionId: 14,
          permissions: [
            {
              scopeId: 3,
              regionId: 1,
            },
          ],
        };

        renderTable(user);
        const reportMenu = await screen.findByLabelText(/reports menu/i);
        userEvent.click(reportMenu);
        const downloadButton = await screen.findByRole('menuitem', { name: /^export table$/i });
        userEvent.click(downloadButton);
        expect(screen.getByRole('dialog', { name: 'Export entire table' })).toBeVisible();
        expect(downloadActivityReportExport).not.toHaveBeenCalled();
      });
    });

    it('offers all three full-table formats', async () => {
      const user = {
        name: 'test@test.com',
        permissions: [
          {
            scopeId: 3,
            regionId: 1,
          },
        ],
      };

      renderTable(user);
      const reportMenu = await screen.findByLabelText(/reports menu/i);
      userEvent.click(reportMenu);
      expect(await screen.findByRole('menuitem', { name: /^export table$/i })).not.toBeDisabled();
      const downloadButton = await screen.findByRole('menuitem', { name: /^export table$/i });
      userEvent.click(downloadButton);
      expect(screen.getByRole('button', { name: 'AR' })).toBeEnabled();
      expect(screen.getByRole('button', { name: 'Goals' })).toBeEnabled();
      expect(screen.getByRole('button', { name: 'Objectives' })).toBeEnabled();
    });
  });

  describe('Table sorting', () => {
    afterEach(() => fetchMock.restore());

    beforeEach(async () => {
      fetchMock.reset();
      mockFetchWithRegionOne();
      const user = {
        name: 'test@test.com',
        homeRegionId: 1,
        permissions: [
          {
            scopeId: 3,
            regionId: 1,
          },
          {
            scopeId: 2,
            regionId: 1,
          },
        ],
      };

      renderTable(user);
      await screen.findByText('Activity Reports');
    });

    it('places pagination below the table and keeps only Actions in the header', async () => {
      const pagination = await screen.findByRole('navigation', { name: 'Pagination, bottom' });
      const table = screen.getByRole('table');
      const header = screen
        .getByRole('heading', { name: 'Activity Reports' })
        .closest('.ttahub-table-header');

      expect(within(header).getByRole('button', { name: 'Reports menu' })).toHaveTextContent(
        'Actions'
      );
      expect(within(header).queryByTestId('pagination-card')).not.toBeInTheDocument();
      expect(screen.queryByRole('navigation', { name: 'Pagination, top' })).not.toBeInTheDocument();
      expect(
        table.compareDocumentPosition(pagination) & Node.DOCUMENT_POSITION_FOLLOWING
      ).toBeTruthy();
    });

    it('clicking Last saved column header will sort by updatedAt', async () => {
      const columnHeader = await screen.findByText(/last saved/i);

      fetchMock.get(
        '/api/activity-reports?sortBy=updatedAt&sortDir=asc&offset=0&limit=10&region.in[]=1',
        convertToResponse(activityReportsSorted, false, 17)
      );

      fireEvent.click(columnHeader);
      await waitFor(() =>
        expect(screen.getAllByRole('cell')[7]).toHaveTextContent(/02\/04\/2021/i)
      );
      await waitFor(() =>
        expect(screen.getAllByRole('cell')[17]).toHaveTextContent(/02\/05\/2021/i)
      );
    });

    it('clicking Collaborators column header will sort by collaborators', async () => {
      const columnHeader = await screen.findByRole('columnheader', { name: /collaborators/i });

      fetchMock.get(
        '/api/activity-reports?sortBy=collaborators&sortDir=asc&offset=0&limit=10&region.in[]=1',
        convertToResponse(activityReportsSorted, false, 17)
      );
      await waitFor(() =>
        expect(screen.getAllByRole('cell')[16]).toHaveTextContent(
          'Cucumber User, GS Hermione Granger, SS'
        )
      );
      await waitFor(() =>
        expect(screen.getAllByRole('cell')[6]).toHaveTextContent('Orange, GS Hermione Granger, SS')
      );

      act(() => fireEvent.click(columnHeader));
    });

    it('clicking Topics column header will sort by topics', async () => {
      const columnHeader = await screen.findByText('Topics');

      fetchMock.get(
        '/api/activity-reports?sortBy=topics&sortDir=asc&offset=0&limit=10&region.in[]=1',
        convertToResponse(activityReportsSorted, false, 17)
      );

      act(() => fireEvent.click(columnHeader));
      await waitFor(() =>
        expect(screen.getAllByRole('cell')[15]).toHaveTextContent(
          'Behavioral / Mental Health CLASS: Instructional Support click to visually reveal the topics for R14-AR-1Behavioral / Mental HealthCLASS: Instructional Support'
        )
      );
    });

    it('clicking Creator column header will sort by author', async () => {
      const columnHeader = await screen.findByText(/creator/i);

      fetchMock.get(
        '/api/activity-reports?sortBy=author&sortDir=asc&offset=0&limit=10&region.in[]=1',
        convertToResponse(activityReportsSorted, false, 17)
      );

      fireEvent.click(columnHeader);
      await waitFor(() => expect(screen.getAllByRole('cell')[3]).toHaveTextContent('Kiwi, GS'));
      await waitFor(() => expect(screen.getAllByRole('cell')[13]).toHaveTextContent('Kiwi, TTAC'));
    });

    it('clicking date started column header will sort by start date', async () => {
      const columnHeader = await screen.findByText(/date started/i);

      fetchMock.get(
        '/api/activity-reports?sortBy=startDate&sortDir=asc&offset=0&limit=10&region.in[]=1',
        convertToResponse(activityReportsSorted, false, 17)
      );

      fireEvent.click(columnHeader);
      await waitFor(() => expect(screen.getAllByRole('cell')[2]).toHaveTextContent('02/01/2021'));
      await waitFor(() => expect(screen.getAllByRole('cell')[12]).toHaveTextContent('02/08/2021'));
    });

    it('clicking Recipient column header will sort by recipient', async () => {
      const columnHeader = await screen.findByRole('button', {
        name: /recipient\. activate to sort ascending/i,
      });

      fetchMock.restore();

      fetchMock.get(
        '/api/activity-reports?sortBy=activityRecipients&sortDir=asc&offset=0&limit=10&region.in[]=1',
        convertToResponse(activityReportsSorted, false, 17)
      );

      expect(fetchMock.called()).toBe(false);
      fireEvent.click(columnHeader);
      expect(fetchMock.called()).toBe(true);
    });

    it('clicking Report id column header will sort by region and id', async () => {
      const columnHeader = await screen.findByText(/report id/i);
      fetchMock.restore();
      fetchMock.get(
        '/api/activity-reports?sortBy=regionId&sortDir=asc&offset=0&limit=10&region.in[]=1',
        convertToResponse(activityReportsSorted, false, 17)
      );

      expect(fetchMock.called()).toBe(false);
      fireEvent.click(columnHeader);
      expect(fetchMock.called()).toBe(true);
    });

    it('clicking on pagination page works', async () => {
      const [pageOne] = await screen.findAllByRole('button', {
        name: /page 1/i,
      });
      fetchMock.reset();
      fetchMock.get(defaultBaseUrlWithRegionOne, convertToResponse(activityReportsSorted));

      fireEvent.click(pageOne);
      const cells = await screen.findAllByRole('cell');
      expect(cells[7]).toHaveTextContent(/02\/05\/2021/i);
      expect(cells[17]).toHaveTextContent(/02\/04\/2021/i);
    });

    it('clicking on the second page updates to, from and total', async () => {
      fetchMock.reset();
      fetchMock.get(
        defaultBaseUrlWithRegionOne,
        convertToResponse(generateXFakeReports(10), false, 17)
      );
      const user = {
        name: 'test@test.com',
        homeRegionId: 14,
        permissions: [
          {
            scopeId: 3,
            regionId: 1,
          },
        ],
      };

      renderTable(user);

      const [pageTwo] = await screen.findAllByRole('button', {
        name: /page 2/i,
      });

      fetchMock.get(
        '/api/activity-reports?sortBy=updatedAt&sortDir=desc&offset=10&limit=10&region.in[]=1',
        convertToResponse(generateXFakeReports(10), false, 17)
      );

      fireEvent.click(pageTwo);
      await waitFor(() => expect(screen.getByText(/11-17 of 17/i)).toBeVisible());
    });

    it('resettting pagination calls a fetch', async () => {
      fetchMock.reset();
      fetchMock.get(
        defaultBaseUrlWithRegionOne,
        convertToResponse(generateXFakeReports(10), false, 17)
      );
      const user = {
        name: 'test@test.com',
        homeRegionId: 14,
        permissions: [
          {
            scopeId: 3,
            regionId: 1,
          },
        ],
      };

      renderTable(user);

      const [pageTwo] = await screen.findAllByRole('button', {
        name: /page 2/i,
      });

      fetchMock.get(
        '/api/activity-reports?sortBy=updatedAt&sortDir=desc&offset=10&limit=10&region.in[]=1',
        convertToResponse(generateXFakeReports(10), false, 17)
      );

      fireEvent.click(pageTwo);
      await waitFor(() => expect(screen.getByText(/11-17 of 17/i)).toBeVisible());

      const [resetButton] = await screen.findAllByTestId('reset-pagination');

      fetchMock.reset();
      expect(fetchMock.called()).toBe(false);

      fetchMock.get(
        '/api/activity-reports?sortBy=updatedAt&sortDir=desc&offset=10&limit=10&region.in[]=1',
        convertToResponse(generateXFakeReports(10), false, 17)
      );

      fetchMock.get(
        '/api/activity-reports?sortBy=updatedAt&sortDir=desc&offset=0&limit=10&region.in[]=1',
        convertToResponse(generateXFakeReports(10), false, 17)
      );

      act(() => fireEvent.click(resetButton));

      // confirm that the data has been refetched
      await waitFor(() => expect(fetchMock.called()).toBe(true));

      // check the pagination has reset
      const [pagination] = screen.getAllByText(/1-10 of 17/i);
      expect(pagination).toBeVisible();

      // check the active page is reset
      const [activePage] = screen.getAllByRole('button', {
        name: /page 1/i,
      });

      expect(activePage).toBeVisible();
    });

    it('shows the full filtered-table count in the chooser', async () => {
      const reportMenu = await screen.findByLabelText(/reports menu/i);
      userEvent.click(reportMenu);
      const downloadButton = await screen.findByRole('menuitem', { name: /^export table$/i });
      userEvent.click(downloadButton);
      expect(
        screen.getByText('Choose a format for the full 17 approved activity reports.')
      ).toBeVisible();
    });
  });

  it('waits for a format choice before downloading', async () => {
    fetchMock.reset();
    mockFetchWithRegionOne();
    const user = {
      name: 'test@test.com',
      permissions: [
        {
          scopeId: 3,
          regionId: 1,
        },
      ],
    };

    renderTable(user);
    await screen.findAllByRole('checkbox', { name: /select /i });
    const reportMenu = await screen.findByLabelText(/reports menu/i);
    userEvent.click(reportMenu);
    expect(await screen.findByRole('menuitem', { name: /^export table$/i })).not.toBeDisabled();
    const downloadButton = await screen.findByRole('menuitem', { name: /^export table$/i });
    userEvent.click(downloadButton);
    expect(screen.getByRole('dialog', { name: 'Export entire table' })).toBeVisible();
    expect(downloadActivityReportExport).not.toHaveBeenCalled();
  });

  describe('format downloads', () => {
    const originalCreateObjectURL = URL.createObjectURL;
    const originalRevokeObjectURL = URL.revokeObjectURL;
    let click;

    beforeEach(async () => {
      fetchMock.reset();
      mockFetchWithRegionOne();
      URL.createObjectURL = jest.fn(() => 'blob:export');
      URL.revokeObjectURL = jest.fn();
      click = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
      downloadActivityReportExport.mockResolvedValue(new Blob(['csv']));
      renderTable({ permissions: [{ scopeId: 3, regionId: 1 }] });
      await screen.findAllByRole('checkbox', { name: /select /i });
    });

    afterEach(() => {
      click.mockRestore();
      URL.createObjectURL = originalCreateObjectURL;
      URL.revokeObjectURL = originalRevokeObjectURL;
      fetchMock.restore();
    });

    it.each(['activity-reports', 'goals', 'objectives'])(
      'downloads the full %s dataset with active filters',
      async (dataSet) => {
        await userEvent.click(screen.getByRole('button', { name: 'Reports menu' }));
        await userEvent.click(screen.getByRole('menuitem', { name: 'Export table' }));
        const label = { 'activity-reports': 'AR', goals: 'Goals', objectives: 'Objectives' }[
          dataSet
        ];
        await userEvent.click(screen.getByRole('button', { name: label }));
        await waitFor(() => expect(click).toHaveBeenCalled());
        expect(downloadActivityReportExport).toHaveBeenCalledWith(
          dataSet,
          undefined,
          'region.in[]=1'
        );
        expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:export');
      }
    );

    it('downloads only checked reports', async () => {
      const checkboxes = screen.getAllByRole('checkbox', { name: /select /i });
      await userEvent.click(checkboxes[1]);
      await userEvent.click(screen.getByRole('button', { name: 'Reports menu' }));
      await userEvent.click(screen.getByRole('menuitem', { name: 'Export selected rows' }));
      await userEvent.click(screen.getByRole('button', { name: 'Goals' }));
      await waitFor(() => expect(click).toHaveBeenCalled());
      expect(downloadActivityReportExport).toHaveBeenCalledWith(
        'goals',
        [Number(checkboxes[1].value)],
        'region.in[]=1'
      );
    });

    it('shows a recoverable error when the export fails', async () => {
      downloadActivityReportExport.mockRejectedValueOnce(new Error('Network failed'));
      await userEvent.click(screen.getByRole('button', { name: 'Reports menu' }));
      await userEvent.click(screen.getByRole('menuitem', { name: 'Export table' }));
      await userEvent.click(screen.getByRole('button', { name: 'AR' }));
      expect(await screen.findByRole('alert')).toHaveTextContent(
        'Sorry, something went wrong. Please try your request again.'
      );
      expect(screen.getByRole('button', { name: 'AR' })).toBeEnabled();
    });
  });
});
