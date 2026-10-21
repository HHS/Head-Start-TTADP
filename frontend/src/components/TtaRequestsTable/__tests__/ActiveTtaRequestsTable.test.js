import '@testing-library/jest-dom';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import fetchMock from 'fetch-mock';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { blobToCsvDownload } from '../../../utils';
import ActiveTtaRequestsTable from '../ActiveTtaRequestsTable';

jest.mock('../../../utils', () => ({
  ...jest.requireActual('../../../utils'),
  blobToCsvDownload: jest.fn(),
}));

const RECIPIENT_ID = '45';
const REGION_ID = '2';
const RECIPIENT_PATH = `/recipient-tta-records/${RECIPIENT_ID}/region/${REGION_ID}`;
const RECIPIENT_URL = `/api/tta-requests/region/${REGION_ID}/recipient/${RECIPIENT_ID}`;
const ALL_REGIONS_URL = 'begin:/api/tta-requests?';

const RECIPIENTS = [
  { id: 4001, name: 'Children and Families First' },
  { id: 4002, name: "Children's Council, Inc." },
  { id: 4003, name: 'Willow Street Development' },
];

const STATES = ['DE', 'CA', 'OH'];

/** a draft as the list endpoints return it; the higher n, the more recently it was created */
const apiRequest = (n, overrides = {}) => ({
  id: 100 + n,
  displayId: `R14-REQ-${100 + n}`,
  regionId: 14,
  recipientId: RECIPIENTS[n % 3].id,
  status: 'draft',
  // midday UTC, so the date reads the same in every US time zone
  createdAt: `2026-06-${String(n).padStart(2, '0')}T16:00:00.000Z`,
  creator: { id: 1, name: 'Rachel Green' },
  reviewer: { id: 2, name: 'Ross Geller' },
  recipient: RECIPIENTS[n % 3],
  goalTemplate: {
    id: 3,
    templateName: 'The recipient will develop and implement a plan to correct its findings.',
    standard: 'Monitoring',
  },
  grants: [{ id: n, stateCode: STATES[n % 3] }],
  ...overrides,
});

const TWELVE_REQUESTS = Array.from({ length: 12 }, (_, i) => apiRequest(i + 1));
const NEWEST = TWELVE_REQUESTS[11];

const listOf = (rows) => ({ count: rows.length, rows });

const renderTable = (rows = TWELVE_REQUESTS) => {
  fetchMock.get(RECIPIENT_URL, listOf(rows));
  render(
    <MemoryRouter>
      <ActiveTtaRequestsTable recipientId={RECIPIENT_ID} regionId={REGION_ID} />
    </MemoryRouter>
  );
};

const rowRequestIds = () =>
  screen
    .getAllByRole('row')
    .slice(1) // drop the header row
    .map((row) => within(row).getAllByRole('cell')[0].textContent);

const waitForRows = () => screen.findByRole('table');

// jsdom's Blob has no text(), so read it the long way around
const readBlob = (blob) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsText(blob);
  });

const openActionsMenu = () =>
  userEvent.click(screen.getByRole('button', { name: /open actions for active tta requests/i }));

describe('ActiveTtaRequestsTable', () => {
  afterEach(() => {
    fetchMock.restore();
    window.sessionStorage.clear();
    jest.clearAllMocks();
  });

  it("fetches the recipient's requests from the API", async () => {
    renderTable();
    await waitForRows();

    expect(fetchMock.called(RECIPIENT_URL)).toBe(true);
  });

  it('renders every column', async () => {
    renderTable();
    await waitForRows();

    expect(screen.getByRole('heading', { name: 'Active TTA requests' })).toBeVisible();

    [
      'Request ID',
      'Created date',
      'Goal',
      'Reviewer',
      'Approver',
      'Assigned staff',
      'Status',
    ].forEach((column) => {
      expect(screen.getByRole('columnheader', { name: new RegExp(column, 'i') })).toBeVisible();
    });
  });

  it('sorts by created date descending by default', async () => {
    renderTable();
    await waitForRows();

    expect(rowRequestIds()[0]).toBe(NEWEST.displayId);
    expect(screen.getByRole('columnheader', { name: /created date/i })).toHaveAttribute(
      'aria-sort',
      'descending'
    );
  });

  it('sorts when a column header is clicked', async () => {
    renderTable();
    await waitForRows();

    await userEvent.click(screen.getByRole('button', { name: /^request id/i }));

    expect(screen.getByRole('columnheader', { name: /request id/i })).toHaveAttribute(
      'aria-sort',
      'ascending'
    );
    expect(rowRequestIds()[0]).toBe('R14-REQ-101');

    await userEvent.click(screen.getByRole('button', { name: /^request id/i }));

    expect(screen.getByRole('columnheader', { name: /request id/i })).toHaveAttribute(
      'aria-sort',
      'descending'
    );
    expect(rowRequestIds()[0]).toBe('R14-REQ-112');
  });

  it('paginates the requests', async () => {
    renderTable();
    await waitForRows();

    expect(rowRequestIds()).toHaveLength(10);
    expect(screen.getByTestId('pagination-card-count-header')).toHaveTextContent('1-10 of 12');

    await userEvent.click(screen.getByRole('button', { name: /page 2/i }));

    expect(rowRequestIds()).toHaveLength(2);
  });

  it('changes the number of rows shown per page', async () => {
    renderTable();
    await waitForRows();

    await userEvent.selectOptions(screen.getByTestId('perPage'), 'all');

    expect(rowRequestIds()).toHaveLength(12);
  });

  it('fills the cells from the request, leaving what a draft lacks blank', async () => {
    renderTable();
    await waitForRows();

    const cells = within(screen.getAllByRole('row')[1]).getAllByRole('cell');

    expect(cells[1]).toHaveTextContent('06/12/2026');
    expect(cells[2]).toHaveTextContent('Monitoring');
    expect(cells[3]).toHaveTextContent('Ross Geller');
    // a draft has no approver or assigned staff yet
    expect(cells[4]).toHaveTextContent('-');
    expect(cells[5]).toHaveTextContent('-');
    expect(cells[6]).toHaveTextContent('Draft');
  });

  it('leaves the goal and reviewer blank when the draft has none yet', async () => {
    renderTable([apiRequest(1, { goalTemplate: null, reviewer: null })]);
    await waitForRows();

    const cells = within(screen.getAllByRole('row')[1]).getAllByRole('cell');

    expect(cells[2]).toHaveTextContent('-');
    expect(cells[3]).toHaveTextContent('-');
  });

  it("shows the goal's category rather than its full name", async () => {
    renderTable();
    await waitForRows();

    const goalCell = within(screen.getAllByRole('row')[1]).getAllByRole('cell')[2];

    expect(goalCell).toHaveTextContent(/^Monitoring$/);
  });

  it('leaves the goal blank when its template has no category', async () => {
    renderTable([
      apiRequest(1, { goalTemplate: { id: 4, templateName: 'A goal', standard: null } }),
    ]);
    await waitForRows();

    const goalCell = within(screen.getAllByRole('row')[1]).getAllByRole('cell')[2];

    expect(goalCell).toHaveTextContent(/^-$/);
  });

  it('links the request id and the draft status back into the request', async () => {
    renderTable();
    await waitForRows();

    const firstRow = screen.getAllByRole('row')[1];

    expect(within(firstRow).getByRole('link', { name: NEWEST.displayId })).toHaveAttribute(
      'href',
      `${RECIPIENT_PATH}/tta-request/${NEWEST.id}`
    );
    expect(within(firstRow).getByRole('link', { name: 'Draft' })).toHaveAttribute(
      'href',
      `${RECIPIENT_PATH}/tta-request/${NEWEST.id}`
    );
  });

  it('links a submitted request id to its read-only view, and leaves its status unlinked', async () => {
    renderTable([apiRequest(1, { status: 'submitted', submittedAt: '2026-06-02T16:00:00.000Z' })]);
    await waitForRows();

    const firstRow = screen.getAllByRole('row')[1];

    expect(within(firstRow).getByRole('link', { name: 'R14-REQ-101' })).toHaveAttribute(
      'href',
      `${RECIPIENT_PATH}/tta-request/view/101`
    );
    expect(within(firstRow).getByText('Submitted')).toBeVisible();
    expect(within(firstRow).queryByRole('link', { name: 'Submitted' })).toBeNull();
  });

  it('freezes the status column to the right of the table', async () => {
    renderTable();
    await waitForRows();

    expect(screen.getByRole('columnheader', { name: /status/i })).toHaveClass(
      'smarthub-horizontal-table-sticky-last-data-column'
    );

    const firstRow = screen.getAllByRole('row')[1];
    const statusCell = within(firstRow).getAllByRole('cell').slice(-1)[0];

    expect(statusCell).toHaveClass('smarthub-horizontal-table-sticky-last-data-column');
    expect(statusCell).toHaveTextContent('Draft');
  });

  it('renders the actions menu', async () => {
    renderTable();
    await waitForRows();

    await openActionsMenu();

    expect(screen.getByRole('button', { name: /export table/i })).toBeVisible();
  });

  it('exports every row, not just the page being displayed', async () => {
    renderTable();
    await waitForRows();

    await openActionsMenu();
    await userEvent.click(screen.getByRole('button', { name: /export table/i }));

    expect(blobToCsvDownload).toHaveBeenCalledWith(expect.any(Blob), 'active-tta-requests.csv');

    const [blob] = blobToCsvDownload.mock.calls[0];
    const csv = await readBlob(blob);
    const rows = csv.split('\n');

    // a header row plus every request
    expect(rows).toHaveLength(13);
    expect(rows[0]).toBe('Request ID,Created date,Goal,Reviewer,Approver,Assigned staff,Status');
    expect(rows[1]).toBe('R14-REQ-112,06/12/2026,Monitoring,Ross Geller,,,Draft');
  });

  it("says the requests couldn't load, rather than that there are none", async () => {
    fetchMock.get(RECIPIENT_URL, 500);
    render(
      <MemoryRouter>
        <ActiveTtaRequestsTable recipientId={RECIPIENT_ID} regionId={REGION_ID} />
      </MemoryRouter>
    );

    expect(await screen.findByText('Unable to load TTA requests.')).toBeVisible();
    expect(screen.queryByText("You're all caught up!")).toBeNull();
    expect(screen.queryByRole('table')).toBeNull();
  });

  it('offers to start a request when there are none', async () => {
    renderTable([]);

    // the title bar survives, everything table shaped does not
    expect(
      await screen.findByRole('heading', { name: "You're all caught up!", level: 3 })
    ).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Active TTA requests', level: 2 })).toBeVisible();
    expect(screen.getByText('Would you like to begin a new TTA request?')).toBeVisible();

    const newRequest = screen.getByRole('link', { name: 'New TTA request' });
    expect(newRequest).toBeVisible();

    // the empty state starts a request for the recipient whose record this is
    expect(newRequest).toHaveAttribute('href', `${RECIPIENT_PATH}/tta-request/new`);

    expect(screen.queryByRole('table')).toBeNull();
    expect(
      screen.queryByRole('button', { name: /open actions for active tta requests/i })
    ).toBeNull();
  });

  describe('with the recipient columns', () => {
    const REGION_FILTERS = [{ id: '1', topic: 'region', condition: 'is', query: '14' }];

    const renderAllRegionsTable = (rows = TWELVE_REQUESTS) => {
      fetchMock.get(ALL_REGIONS_URL, listOf(rows));
      render(
        <MemoryRouter>
          <ActiveTtaRequestsTable showRecipientColumns filters={REGION_FILTERS} />
        </MemoryRouter>
      );
    };

    it("fetches the requests in the page's filtered regions", async () => {
      renderAllRegionsTable();
      await waitForRows();

      expect(fetchMock.lastUrl(ALL_REGIONS_URL)).toBe('/api/tta-requests?region.in[]=14');
    });

    it('renders the recipient, region and creator columns alongside the rest', async () => {
      renderAllRegionsTable();
      await waitForRows();

      [
        'Request ID',
        'Recipient',
        'Region',
        'Created date',
        'Creator',
        'Goal',
        'State',
        'Reviewer',
        'Approver',
        'Assigned staff',
        'Status',
      ].forEach((column) => {
        expect(screen.getByRole('columnheader', { name: new RegExp(column, 'i') })).toBeVisible();
      });
    });

    it('fills the recipient, region, creator and state cells from the request', async () => {
      renderAllRegionsTable();
      await waitForRows();

      const cells = within(screen.getAllByRole('row')[1]).getAllByRole('cell');

      expect(cells[1]).toHaveTextContent(NEWEST.recipient.name);
      expect(cells[2]).toHaveTextContent('14');
      expect(cells[4]).toHaveTextContent('Rachel Green');
      // the state the request's grant is in
      expect(cells[6]).toHaveTextContent(NEWEST.grants[0].stateCode);
    });

    it('lists each state once when the grants are in several', async () => {
      renderAllRegionsTable([
        apiRequest(1, {
          grants: [
            { id: 1, stateCode: 'DE' },
            { id: 2, stateCode: 'MD' },
            { id: 3, stateCode: 'DE' },
          ],
        }),
      ]);
      await waitForRows();

      const cells = within(screen.getAllByRole('row')[1]).getAllByRole('cell');
      expect(cells[6]).toHaveTextContent('DE, MD');
    });

    it('leaves the recipient blank, and unlinked, until the draft has one', async () => {
      renderAllRegionsTable([apiRequest(1, { recipient: null, recipientId: null, grants: [] })]);
      await waitForRows();

      const row = screen.getAllByRole('row')[1];
      const cells = within(row).getAllByRole('cell');

      expect(cells[1]).toHaveTextContent('-');
      expect(
        within(row)
          .getAllByRole('link')
          .map((link) => link.textContent)
      ).toEqual(['R14-REQ-101', 'Draft']);
    });

    it("links the recipient to that recipient's record", async () => {
      renderAllRegionsTable();
      await waitForRows();

      const firstRow = screen.getAllByRole('row')[1];

      expect(within(firstRow).getByRole('link', { name: NEWEST.recipient.name })).toHaveAttribute(
        'href',
        `/recipient-tta-records/${NEWEST.recipient.id}/region/${NEWEST.regionId}/profile`
      );

      expect(within(firstRow).getByRole('link', { name: NEWEST.displayId })).toHaveAttribute(
        'href',
        `/tta-requests/${NEWEST.id}`
      );
    });

    it('sorts by recipient', async () => {
      renderAllRegionsTable();
      await waitForRows();

      await userEvent.click(screen.getByRole('button', { name: /^recipient/i }));

      expect(screen.getByRole('columnheader', { name: /recipient/i })).toHaveAttribute(
        'aria-sort',
        'ascending'
      );

      const recipients = screen
        .getAllByRole('row')
        .slice(1)
        .map((row) => within(row).getAllByRole('cell')[1].textContent);

      expect(recipients).toEqual([...recipients].sort((a, b) => a.localeCompare(b)));
    });

    it('sorts by state', async () => {
      renderAllRegionsTable();
      await waitForRows();

      // the status column's header starts with the same word, so match the whole label
      await userEvent.click(screen.getByRole('button', { name: /^state\. activate/i }));

      const states = screen
        .getAllByRole('row')
        .slice(1)
        .map((row) => within(row).getAllByRole('cell')[6].textContent);

      expect(states).toEqual([...states].sort((a, b) => a.localeCompare(b)));
    });

    it('sorts by region numerically', async () => {
      renderAllRegionsTable([
        apiRequest(1, { regionId: 10 }),
        apiRequest(2, { regionId: 9 }),
        apiRequest(3, { regionId: 2 }),
      ]);
      await waitForRows();

      await userEvent.click(screen.getByRole('button', { name: /^region/i }));

      expect(screen.getByRole('columnheader', { name: /region/i })).toHaveAttribute(
        'aria-sort',
        'ascending'
      );
      await waitFor(() => {
        const regions = screen
          .getAllByRole('row')
          .slice(1)
          .map((row) => within(row).getAllByRole('cell')[2].textContent);
        expect(regions).toEqual(['2', '9', '10']);
      });
    });

    it('keeps the status column frozen to the right', async () => {
      renderAllRegionsTable();
      await waitForRows();

      expect(screen.getByRole('columnheader', { name: /status/i })).toHaveClass(
        'smarthub-horizontal-table-sticky-last-data-column'
      );
    });

    it('exports the recipient columns too', async () => {
      renderAllRegionsTable();
      await waitForRows();

      await openActionsMenu();
      await userEvent.click(screen.getByRole('button', { name: /export table/i }));

      const [blob] = blobToCsvDownload.mock.calls[0];
      const rows = (await readBlob(blob)).split('\n');

      expect(rows[0]).toBe(
        'Request ID,Recipient,Region,Created date,Creator,Goal,State,Reviewer,Approver,Assigned staff,Status'
      );
      expect(rows[1]).toBe(
        `R14-REQ-112,Children and Families First,14,06/12/2026,Rachel Green,Monitoring,DE,Ross Geller,,,Draft`
      );
    });
  });
});
