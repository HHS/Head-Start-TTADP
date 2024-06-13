import '@testing-library/jest-dom';
import join from 'url-join';
import React from 'react';
import { SCOPE_IDS } from '@ttahub/common';
import { MemoryRouter, Routes, Route } from 'react-router';
import { render, screen } from '@testing-library/react';
import fetchMock from 'fetch-mock';
import userEvent from '@testing-library/user-event';
import LegacyReport from '../index';
import UserContext from '../../../UserContext';

const defaultUser = ({ id: 1, roles: [], permissions: [] });

// eslint-disable-next-line react/prop-types
const RenderLegacyReport = ({ report, fail = false, user = defaultUser }) => {
  // eslint-disable-next-line react/prop-types
  const { id } = report;
  const url = `/api/activity-reports/legacy/${id}`;

  if (fail) {
    fetchMock.get(url, 500);
  } else {
    fetchMock.get(url, report);
  }

  return (
    <MemoryRouter initialEntries={[`/activity-reports/legacy/${id}`]}>
      <UserContext.Provider value={{ user }}>
        <Routes>
          <Route path="/activity-reports/legacy/:legacyId" element={<LegacyReport />} />
        </Routes>
      </UserContext.Provider>
    </MemoryRouter>
  );
};

const report = {
  id: '1',
  imported: {
    granteeName: 'first\nsecond\nlast',
  },
  attachments: [{
    id: 1,
    originalFileName: 'test',
    url: { url: 'url' },
    status: 'status',
  }],
};

describe('LegacyReport', () => {
  afterEach(() => fetchMock.restore());

  it('handles failure to fetch the report', async () => {
    render(<RenderLegacyReport report={report} fail />);
    const alert = await screen.findByTestId('alert');
    expect(alert).toHaveTextContent('Unable to load activity report');
  });

  it('shows edit form for admin', async () => {
    const adminUser = { ...defaultUser, permissions: [{ scopeId: SCOPE_IDS.ADMIN }] };
    render(<RenderLegacyReport report={report} user={adminUser} />);

    const editButton = await screen.findByRole('button', { name: 'Edit report users' });
    userEvent.click(editButton);

    expect(await screen.findByRole('heading', { name: 'Edit report users' })).toBeVisible();
    const url = join('/', 'api', 'admin', 'legacy-reports', String(report.id), 'users');
    fetchMock.put(url, { messages: ['success'] });
    const saveButton = await screen.findByRole('button', { name: 'Save report users' });
    userEvent.click(saveButton);
    expect(await screen.findByText('success')).toBeVisible();
  });

  it('handles error to update admin', async () => {
    const adminUser = { ...defaultUser, permissions: [{ scopeId: SCOPE_IDS.ADMIN }] };
    render(<RenderLegacyReport report={report} user={adminUser} />);

    const editButton = await screen.findByRole('button', { name: 'Edit report users' });
    userEvent.click(editButton);

    expect(await screen.findByRole('heading', { name: 'Edit report users' })).toBeVisible();
    const url = join('/', 'api', 'admin', 'legacy-reports', String(report.id), 'users');
    fetchMock.put(url, 500);
    const saveButton = await screen.findByRole('button', { name: 'Save report users' });
    userEvent.click(saveButton);
    expect(await screen.findByText('There was an error updating the report: Internal Server Error')).toBeVisible();
  });

  it('displays the report', async () => {
    render(<RenderLegacyReport report={report} />);
    const first = await screen.findByText('first');
    const second = await screen.findByText('second');
    const last = await screen.findByText('last');
    const attachment = await screen.findByText('test');

    expect(first).toBeVisible();
    expect(second).toBeVisible();
    expect(last).toBeVisible();
    expect(attachment).toBeVisible();
  });
});
