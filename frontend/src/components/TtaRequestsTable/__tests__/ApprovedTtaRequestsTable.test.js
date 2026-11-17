import '@testing-library/jest-dom';
import { render, screen, within } from '@testing-library/react';
import fetchMock from 'fetch-mock';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import ApprovedTtaRequestsTable from '../ApprovedTtaRequestsTable';

const RECIPIENT_ID = '45';
const REGION_ID = '14';
const RECIPIENT_URL = `/api/tta-requests/region/${REGION_ID}/recipient/${RECIPIENT_ID}/approved`;
const ALL_REGIONS_URL = 'begin:/api/tta-requests/approved';

/** an approved request as the approved list endpoints return it */
const APPROVED = {
  id: 101,
  displayId: 'R14-REQ-101',
  regionId: 14,
  recipientId: 4001,
  status: 'approved',
  createdAt: '2026-06-01T16:00:00.000Z',
  // midday UTC, so the date reads the same in every US time zone
  approvedAt: '2026-06-23T16:00:00.000Z',
  creator: { id: 1, name: 'Rachel Green' },
  reviewer: { id: 2, name: 'Ross Geller' },
  recipient: { id: 4001, name: 'Children and Families First' },
  goalTemplate: { id: 3, templateName: 'The recipient will develop a plan.', standard: 'FEI' },
  grants: [
    { id: 1, stateCode: 'DE' },
    { id: 2, stateCode: 'DE' },
  ],
  assignedStaff: [
    { id: 7, name: 'Monica Geller' },
    { id: 8, name: 'Phoebe Buffay' },
  ],
};

const listOf = (rows) => ({ count: rows.length, rows });

const renderTable = (props = { recipientId: RECIPIENT_ID, regionId: REGION_ID }) =>
  render(
    <MemoryRouter>
      <ApprovedTtaRequestsTable {...props} />
    </MemoryRouter>
  );

describe('ApprovedTtaRequestsTable', () => {
  afterEach(() => {
    fetchMock.restore();
    window.sessionStorage.clear();
  });

  it("lists the recipient's approved requests, each opening read only", async () => {
    fetchMock.get(RECIPIENT_URL, listOf([APPROVED]));
    renderTable();

    const link = await screen.findByRole('link', { name: 'R14-REQ-101' });
    expect(link).toHaveAttribute(
      'href',
      `/recipient-tta-records/${RECIPIENT_ID}/region/${REGION_ID}/tta-request/view/101`
    );

    const row = link.closest('tr');
    const cells = within(row)
      .getAllByRole('cell')
      .map((cell) => cell.textContent);
    expect(cells).toEqual(
      expect.arrayContaining(['06/23/2026', 'Rachel Green', 'Monica Geller, Phoebe Buffay', 'FEI'])
    );
    // the recipient's own tab doesn't repeat which recipient each request is for
    expect(screen.queryByRole('columnheader', { name: /recipient/i })).toBeNull();
  });

  it('names the recipient, region and state across recipients', async () => {
    fetchMock.get(ALL_REGIONS_URL, listOf([APPROVED]));
    renderTable({ showRecipientColumns: true, filters: [] });

    const link = await screen.findByRole('link', { name: 'R14-REQ-101' });
    expect(link).toHaveAttribute('href', '/tta-requests/view/101');
    expect(screen.getByRole('link', { name: 'Children and Families First' })).toHaveAttribute(
      'href',
      '/recipient-tta-records/4001/region/14/profile'
    );

    const cells = within(link.closest('tr'))
      .getAllByRole('cell')
      .map((cell) => cell.textContent);
    expect(cells).toEqual(expect.arrayContaining(['14', 'DE']));
  });

  it.each([
    ['on a recipient record', { recipientId: RECIPIENT_ID, regionId: REGION_ID }, RECIPIENT_URL],
    ['across recipients', { showRecipientColumns: true, filters: [] }, ALL_REGIONS_URL],
  ])('says there are no approved requests %s', async (_label, props, url) => {
    fetchMock.get(url, listOf([]));
    renderTable(props);

    expect(screen.getByRole('heading', { name: 'Approved TTA requests', level: 2 })).toBeVisible();
    expect(await screen.findByText('You have no approved TTA requests.')).toBeVisible();
    expect(screen.queryByRole('table')).toBeNull();
    // this table only states the fact, it has no call to action
    expect(screen.queryByRole('link', { name: /new tta request/i })).toBeNull();
  });
});
