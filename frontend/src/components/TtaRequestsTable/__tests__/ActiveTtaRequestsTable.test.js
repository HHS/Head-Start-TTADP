import '@testing-library/jest-dom';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { blobToCsvDownload } from '../../../utils';
import ActiveTtaRequestsTable from '../ActiveTtaRequestsTable';
import { ACTIVE_TTA_REQUESTS_PLACEHOLDER_DATA } from '../placeholderData';

jest.mock('../../../utils', () => ({
  ...jest.requireActual('../../../utils'),
  blobToCsvDownload: jest.fn(),
}));

const RECIPIENT_ID = '45';
const REGION_ID = '2';
const RECIPIENT_PATH = `/recipient-tta-records/${RECIPIENT_ID}/region/${REGION_ID}`;

const renderTable = () =>
  render(
    <MemoryRouter>
      <ActiveTtaRequestsTable recipientId={RECIPIENT_ID} regionId={REGION_ID} />
    </MemoryRouter>
  );

const rowRequestIds = () =>
  screen
    .getAllByRole('row')
    .slice(1) // drop the header row
    .map((row) => within(row).getAllByRole('cell')[0].textContent);

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
    window.sessionStorage.clear();
    jest.clearAllMocks();
  });

  it('renders every column', () => {
    renderTable();

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

  it('sorts by created date descending by default', () => {
    renderTable();

    expect(rowRequestIds()[0]).toBe('R14-REQ-14322');
    expect(screen.getByRole('columnheader', { name: /created date/i })).toHaveAttribute(
      'aria-sort',
      'descending'
    );
  });

  it('sorts when a column header is clicked', async () => {
    renderTable();

    await userEvent.click(screen.getByRole('button', { name: /^request id/i }));

    expect(screen.getByRole('columnheader', { name: /request id/i })).toHaveAttribute(
      'aria-sort',
      'ascending'
    );
    expect(rowRequestIds()[0]).toBe('R14-REQ-11997');

    await userEvent.click(screen.getByRole('button', { name: /^request id/i }));

    expect(screen.getByRole('columnheader', { name: /request id/i })).toHaveAttribute(
      'aria-sort',
      'descending'
    );
    expect(rowRequestIds()[0]).toBe('R14-REQ-14322');
  });

  it('paginates the requests', async () => {
    renderTable();

    expect(rowRequestIds()).toHaveLength(10);
    expect(screen.getByTestId('pagination-card-count-header')).toHaveTextContent(
      `1-10 of ${ACTIVE_TTA_REQUESTS_PLACEHOLDER_DATA.length}`
    );

    await userEvent.click(screen.getByRole('button', { name: /page 2/i }));

    expect(rowRequestIds()).toHaveLength(ACTIVE_TTA_REQUESTS_PLACEHOLDER_DATA.length - 10);
  });

  it('changes the number of rows shown per page', async () => {
    renderTable();

    await userEvent.selectOptions(screen.getByTestId('perPage'), 'all');

    expect(rowRequestIds()).toHaveLength(ACTIVE_TTA_REQUESTS_PLACEHOLDER_DATA.length);
  });

  it('links the request id, and only links draft statuses', () => {
    renderTable();

    const firstRow = screen.getAllByRole('row')[1];
    const draft = ACTIVE_TTA_REQUESTS_PLACEHOLDER_DATA[0];

    // every link stays within the recipient record being viewed, so none of them 401
    expect(within(firstRow).getByRole('link', { name: draft.requestId })).toHaveAttribute(
      'href',
      `${RECIPIENT_PATH}/tta-request`
    );
    expect(within(firstRow).getByRole('link', { name: 'Draft' })).toHaveAttribute(
      'href',
      `${RECIPIENT_PATH}/tta-request`
    );

    const secondRow = screen.getAllByRole('row')[2];
    expect(within(secondRow).getByText('COR approval pending')).toBeVisible();
    expect(within(secondRow).queryByRole('link', { name: 'COR approval pending' })).toBeNull();
  });

  it('freezes the status column to the right of the table', () => {
    renderTable();

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

    await openActionsMenu();

    expect(screen.getByRole('button', { name: /export table/i })).toBeVisible();
  });

  it('exports every row, not just the page being displayed', async () => {
    renderTable();

    await openActionsMenu();
    await userEvent.click(screen.getByRole('button', { name: /export table/i }));

    expect(blobToCsvDownload).toHaveBeenCalledWith(expect.any(Blob), 'active-tta-requests.csv');

    const [blob] = blobToCsvDownload.mock.calls[0];
    const csv = await readBlob(blob);
    const rows = csv.split('\n');

    // a header row plus every placeholder request
    expect(rows).toHaveLength(ACTIVE_TTA_REQUESTS_PLACEHOLDER_DATA.length + 1);
    expect(rows[0]).toBe('Request ID,Created date,Goal,Reviewer,Approver,Assigned staff,Status');
    expect(rows[1]).toBe(
      'R14-REQ-14322,06/23/2026,Monitoring,"Ross Geller, TTAC","Phoebe Buffay, COR","Rachel Green, ECS",Draft'
    );
  });

  // FOR FRONTEND TESTING ONLY - remove with the placeholder data
  it('toggles the empty state from the link beside the title', async () => {
    renderTable();

    expect(rowRequestIds()).toHaveLength(10);

    await userEvent.click(screen.getByRole('button', { name: /show empty state/i }));

    // the empty state replaces the table outright, headers and all
    expect(screen.queryByRole('table')).toBeNull();
    expect(screen.queryByTestId('pagination-card-count-header')).toBeNull();

    await userEvent.click(screen.getByRole('button', { name: /show placeholder data/i }));

    expect(rowRequestIds()).toHaveLength(10);
  });

  it('offers to start a request when there are none', async () => {
    renderTable();

    await userEvent.click(screen.getByRole('button', { name: /show empty state/i }));

    // the title bar survives, everything table shaped does not
    expect(screen.getByRole('heading', { name: 'Active TTA requests', level: 2 })).toBeVisible();
    expect(screen.getByRole('heading', { name: "You're all caught up!", level: 3 })).toBeVisible();
    expect(screen.getByText('Would you like to begin a new TTA request?')).toBeVisible();

    const newRequest = screen.getByRole('button', { name: 'New TTA request' });
    expect(newRequest).toBeVisible();

    // there is no creation flow yet, so the button goes nowhere on purpose
    expect(newRequest).toHaveAttribute('type', 'button');
    expect(screen.queryByRole('link', { name: 'New TTA request' })).toBeNull();

    expect(screen.queryAllByRole('columnheader')).toHaveLength(0);
    expect(
      screen.queryByRole('button', { name: /open actions for active tta requests/i })
    ).toBeNull();
  });
  describe('with the recipient columns', () => {
    const renderAllRegionsTable = () =>
      render(
        <MemoryRouter>
          <ActiveTtaRequestsTable showRecipientColumns />
        </MemoryRouter>
      );

    it('renders the recipient, region and creator columns alongside the rest', () => {
      renderAllRegionsTable();

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

    it('fills the recipient, region, creator and state cells from the request', () => {
      renderAllRegionsTable();

      const firstRow = screen.getAllByRole('row')[1];
      const request = ACTIVE_TTA_REQUESTS_PLACEHOLDER_DATA[0];
      const cells = within(firstRow).getAllByRole('cell');

      expect(cells[1]).toHaveTextContent(request.recipient);
      expect(cells[2]).toHaveTextContent(String(request.regionId));
      expect(cells[4]).toHaveTextContent(request.creator);
      // the state the recipient's grant is in, not the state of the request
      expect(cells[6]).toHaveTextContent(request.stateCode);
    });

    it("links the recipient to that recipient's record", () => {
      renderAllRegionsTable();

      const firstRow = screen.getAllByRole('row')[1];
      const request = ACTIVE_TTA_REQUESTS_PLACEHOLDER_DATA[0];

      expect(within(firstRow).getByRole('link', { name: request.recipient })).toHaveAttribute(
        'href',
        `/recipient-tta-records/${request.recipientId}/region/${request.regionId}/profile`
      );

      // the request itself has nowhere of its own to go yet
      expect(within(firstRow).getByRole('link', { name: request.requestId })).toHaveAttribute(
        'href',
        '/tta-requests'
      );
    });

    it('sorts by recipient', async () => {
      renderAllRegionsTable();

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

      // the status column's header starts with the same word, so match the whole label
      await userEvent.click(screen.getByRole('button', { name: /^state\. activate/i }));

      const states = screen
        .getAllByRole('row')
        .slice(1)
        .map((row) => within(row).getAllByRole('cell')[6].textContent);

      expect(states).toEqual([...states].sort((a, b) => a.localeCompare(b)));
    });

    it('sorts by region', async () => {
      renderAllRegionsTable();

      await userEvent.click(screen.getByRole('button', { name: /^region/i }));

      expect(screen.getByRole('columnheader', { name: /region/i })).toHaveAttribute(
        'aria-sort',
        'ascending'
      );
      // every placeholder request is in region 14, so the order is unchanged
      expect(rowRequestIds()).toHaveLength(10);
    });

    it('keeps the status column frozen to the right', () => {
      renderAllRegionsTable();

      expect(screen.getByRole('columnheader', { name: /status/i })).toHaveClass(
        'smarthub-horizontal-table-sticky-last-data-column'
      );
    });

    it('exports the recipient columns too', async () => {
      renderAllRegionsTable();

      await openActionsMenu();
      await userEvent.click(screen.getByRole('button', { name: /export table/i }));

      const [blob] = blobToCsvDownload.mock.calls[0];
      const rows = (await readBlob(blob)).split('\n');

      expect(rows[0]).toBe(
        'Request ID,Recipient,Region,Created date,Creator,Goal,State,Reviewer,Approver,Assigned staff,Status'
      );
      expect(rows[1]).toBe(
        'R14-REQ-14322,Children and Families First,14,06/23/2026,"Rachel Green, ECS",Monitoring,DE,"Ross Geller, TTAC","Phoebe Buffay, COR","Rachel Green, ECS",Draft'
      );
    });
  });
});
