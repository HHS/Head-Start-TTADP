import '@testing-library/jest-dom';
import React from 'react';
import fetchMock from 'fetch-mock';
import { SCOPE_IDS } from '@ttahub/common/src/constants';
import { render, screen } from '@testing-library/react';
import Profile from '../Profile';
import UserContext from '../../../../UserContext';
import { GrantDataProvider } from '../GrantDataContext';
import { mockRSSData } from '../../../../testHelpers';

describe('Recipient Record - Profile', () => {
  const user = {
    name: 'harry potter',
    permissions: [{ regionId: 1, scopeId: SCOPE_IDS.ADMIN }],
  };

  const renderRecipientProfile = (summary) => {
    fetchMock.get('/api/recipient/1/region/1/leadership', []);
    fetchMock.get('/api/feeds/item?tag=ttahub-class-thresholds', mockRSSData());

    render(
      <UserContext.Provider value={{ user }}>
        <GrantDataProvider>
          <Profile recipientSummary={summary} recipientId={1} regionId={1} />
        </GrantDataProvider>
      </UserContext.Provider>,
    );
  };

  afterEach(() => {
    fetchMock.restore();
  });

  it('renders the recipient summary approriately', async () => {
    fetchMock.get('/api/monitoring/1/region/1/grant/asdfsjkfd', {
      recipientId: 1, regionId: 1, reviewStatus: 'Compliant', reviewDate: '02/02/2024', reviewType: 'Follow-up', grant: 'asdfsjkfd',
    });
    fetchMock.get('/api/monitoring/class/1/region/1/grant/asdfsjkfd', {});
    fetchMock.get('/api/recipient-spotlight?sortBy=recipientName&direction=asc&offset=0&recipientId.in=1&region.in=1&grantId=1', { recipients: [], overview: {} });
    const summary = {
      recipientId: '44',
      grants: [
        {
          id: 1,
          number: 'asdfsjkfd',
          status: 'Froglike',
          endDate: '2021-09-28',
        },
      ],
    };
    renderRecipientProfile(summary);

    expect(screen.getByText(summary.grants[0].status)).toBeInTheDocument();
    expect(screen.getByText('09/28/2021')).toBeInTheDocument();
    expect(screen.getByText(summary.grants[0].number)).toBeInTheDocument();

    expect(screen.getByRole('heading', { name: /recipient summary/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /grants/i })).toBeInTheDocument();

    expect(fetchMock.called('/api/monitoring/1/region/1/grant/asdfsjkfd')).toBe(true);
    expect(fetchMock.called('/api/monitoring/class/1/region/1/grant/asdfsjkfd')).toBe(true);

    expect(await screen.findByRole('heading', { name: /grant number asdfsjkfd/i })).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: /Monitoring review/i })).toBeInTheDocument();
  });

  it('always shows grant heading even when no class or monitoring data', async () => {
    fetchMock.get('/api/monitoring/1/region/1/grant/asdfsjkfd', { body: null });
    fetchMock.get('/api/monitoring/class/1/region/1/grant/asdfsjkfd', {});
    fetchMock.get('/api/recipient-spotlight?sortBy=recipientName&direction=asc&offset=0&recipientId.in=1&region.in=1&grantId=1', { recipients: [], overview: {} });
    const summary = {
      recipientId: '44',
      grants: [{
        id: 1,
        number: 'asdfsjkfd',
        status: 'Froglike',
        endDate: '2021-09-28',
      }],
    };
    renderRecipientProfile(summary);

    // Grant heading should always be visible now
    expect(await screen.findByRole('heading', { name: /grant number asdfsjkfd/i })).toBeInTheDocument();
  });

  it('displays class data', async () => {
    fetchMock.get('/api/monitoring/1/region/1/grant/asdfsjkfd', { body: null });
    fetchMock.get('/api/monitoring/class/1/region/1/grant/asdfsjkfd', {
      recipientId: 1, regionId: 1, grantNumber: 'asdfsjkfd', received: '03/30/2023', ES: '5.8611', CO: '5.6296', IS: '3.2037',
    });
    fetchMock.get('/api/recipient-spotlight?sortBy=recipientName&direction=asc&offset=0&recipientId.in=1&region.in=1&grantId=1', { recipients: [], overview: {} });
    const summary = {
      recipientId: '44',
      grants: [{
        id: 1,
        number: 'asdfsjkfd',
        status: 'Froglike',
        endDate: '2021-09-28',
      }],
    };
    renderRecipientProfile(summary);

    expect(await screen.findByRole('heading', { name: /grant number asdfsjkfd/i })).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: /CLASS® review/i })).toBeInTheDocument();
  });
});
