import '@testing-library/jest-dom';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { blobToCsvDownload } from '../../../utils';
import ApprovedTtaRequestsTable from '../ApprovedTtaRequestsTable';
import { APPROVED_TTA_REQUESTS_PLACEHOLDER_DATA } from '../placeholderData';

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
      <ApprovedTtaRequestsTable recipientId={RECIPIENT_ID} regionId={REGION_ID} />
    </MemoryRouter>
  );

// jsdom's Blob has no text(), so read it the long way around
const readBlob = (blob) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsText(blob);
  });

const rowRequestIds = () =>
  screen
    .getAllByRole('row')
    .slice(1) // drop the header row
    .map((row) => within(row).getAllByRole('cell')[0].textContent);

describe('ApprovedTtaRequestsTable', () => {
  afterEach(() => {
    window.sessionStorage.clear();
    jest.clearAllMocks();
  });

  it('renders every column', () => {
    renderTable();

    expect(screen.getByRole('heading', { name: 'Approved TTA requests' })).toBeVisible();

    ['Request ID', 'Approved date', 'Creator', 'Assigned staff', 'Goal'].forEach((column) => {
      expect(screen.getByRole('columnheader', { name: new RegExp(column, 'i') })).toBeVisible();
    });

    expect(screen.queryByRole('columnheader', { name: /status/i })).toBeNull();
  });

  it('sorts by approved date descending by default', () => {
    renderTable();

    expect(rowRequestIds()[0]).toBe('R14-REQ-13221');
    expect(screen.getByRole('columnheader', { name: /approved date/i })).toHaveAttribute(
      'aria-sort',
      'descending'
    );
  });

  it('sorts when a column header is clicked', async () => {
    renderTable();

    await userEvent.click(screen.getByRole('button', { name: /^creator/i }));

    expect(screen.getByRole('columnheader', { name: /creator/i })).toHaveAttribute(
      'aria-sort',
      'ascending'
    );
    expect(rowRequestIds()[0]).toBe('R14-REQ-12265');
  });

  it('paginates the requests', async () => {
    renderTable();

    expect(rowRequestIds()).toHaveLength(10);
    expect(screen.getByTestId('pagination-card-count-header')).toHaveTextContent(
      `1-10 of ${APPROVED_TTA_REQUESTS_PLACEHOLDER_DATA.length}`
    );

    await userEvent.click(screen.getByRole('button', { name: /page 2/i }));

    expect(rowRequestIds()).toHaveLength(APPROVED_TTA_REQUESTS_PLACEHOLDER_DATA.length - 10);
  });

  it('lists each assigned staff member on their own line', () => {
    const multipleStaff = APPROVED_TTA_REQUESTS_PLACEHOLDER_DATA.find(
      (request) => request.assignedStaff.length > 1
    );

    renderTable();

    const row = screen
      .getAllByRole('row')
      .find((r) => within(r).queryByText(multipleStaff.requestId));
    const staffCell = within(row).getAllByRole('cell')[3];

    expect(staffCell).toHaveClass('ttahub-tta-requests-table--multiline');
    expect(staffCell).toHaveTextContent(multipleStaff.assignedStaff.join(' '));
  });

  it('links the request id back into the recipient record', () => {
    renderTable();

    const firstRow = screen.getAllByRole('row')[1];
    const approved = APPROVED_TTA_REQUESTS_PLACEHOLDER_DATA[0];

    expect(within(firstRow).getByRole('link', { name: approved.requestId })).toHaveAttribute(
      'href',
      `${RECIPIENT_PATH}/tta-request`
    );
  });

  it('exports every row, not just the page being displayed', async () => {
    renderTable();

    await userEvent.click(
      screen.getByRole('button', { name: /open actions for approved tta requests/i })
    );
    await userEvent.click(screen.getByRole('button', { name: /export table/i }));

    expect(blobToCsvDownload).toHaveBeenCalledWith(expect.any(Blob), 'approved-tta-requests.csv');

    const [blob] = blobToCsvDownload.mock.calls[0];
    const csv = await readBlob(blob);
    const rows = csv.split('\n');

    expect(rows[0]).toBe('Request ID,Approved date,Creator,Assigned staff,Goal');
    expect(rows[1]).toBe(
      'R14-REQ-13221,06/18/2026,"Rachel Green, ECS","Amy Bloom, ECM",Monitoring'
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

  it('says there are no approved requests when there are none', async () => {
    renderTable();

    await userEvent.click(screen.getByRole('button', { name: /show empty state/i }));

    expect(screen.getByRole('heading', { name: 'Approved TTA requests', level: 2 })).toBeVisible();
    expect(screen.getByText('You have no approved TTA requests.')).toBeVisible();

    expect(screen.queryAllByRole('columnheader')).toHaveLength(0);
    expect(
      screen.queryByRole('button', { name: /open actions for approved tta requests/i })
    ).toBeNull();

    // this table only states the fact, it has no call to action
    expect(screen.queryByRole('button', { name: /new tta request/i })).toBeNull();
  });
  describe('with the recipient columns', () => {
    const renderAllRegionsTable = () =>
      render(
        <MemoryRouter>
          <ApprovedTtaRequestsTable showRecipientColumns />
        </MemoryRouter>
      );

    it('renders the recipient and region columns alongside the rest', () => {
      renderAllRegionsTable();

      [
        'Request ID',
        'Recipient',
        'Region',
        'Approved date',
        'Creator',
        'Assigned staff',
        'Goal',
        'State',
      ].forEach((column) => {
        expect(screen.getByRole('columnheader', { name: new RegExp(column, 'i') })).toBeVisible();
      });

      // approved requests have nothing left to report a status on
      expect(screen.queryByRole('columnheader', { name: /status/i })).toBeNull();
    });

    it('fills the recipient, region and state cells from the request', () => {
      renderAllRegionsTable();

      const firstRow = screen.getAllByRole('row')[1];
      const request = APPROVED_TTA_REQUESTS_PLACEHOLDER_DATA[0];
      const cells = within(firstRow).getAllByRole('cell');

      expect(cells[1]).toHaveTextContent(request.recipient);
      expect(cells[2]).toHaveTextContent(String(request.regionId));
      // the state the recipient's grant is in
      expect(cells[7]).toHaveTextContent(request.stateCode);
    });

    it("links the recipient to that recipient's record", () => {
      renderAllRegionsTable();

      const firstRow = screen.getAllByRole('row')[1];
      const request = APPROVED_TTA_REQUESTS_PLACEHOLDER_DATA[0];

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

      await userEvent.click(screen.getByRole('button', { name: /^state\. activate/i }));

      expect(screen.getByRole('columnheader', { name: /state/i })).toHaveAttribute(
        'aria-sort',
        'ascending'
      );

      const states = screen
        .getAllByRole('row')
        .slice(1)
        .map((row) => within(row).getAllByRole('cell')[7].textContent);

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

    it('exports the recipient columns too', async () => {
      renderAllRegionsTable();

      await userEvent.click(
        screen.getByRole('button', { name: /open actions for approved tta requests/i })
      );
      await userEvent.click(screen.getByRole('button', { name: /export table/i }));

      const [blob] = blobToCsvDownload.mock.calls[0];
      const rows = (await readBlob(blob)).split('\n');

      expect(rows[0]).toBe(
        'Request ID,Recipient,Region,Approved date,Creator,Assigned staff,Goal,State'
      );
      expect(rows[1]).toBe(
        'R14-REQ-13221,Children and Families First,14,06/18/2026,"Rachel Green, ECS","Amy Bloom, ECM",Monitoring,DE'
      );
    });
  });
});
