import '@testing-library/jest-dom';
import React from 'react';
import fetchMock from 'fetch-mock';
import { SCOPE_IDS } from '@ttahub/common/src/constants';
import { render, screen } from '@testing-library/react';
import Profile from '../Profile';
import UserContext from '../../../../UserContext';
import { GrantDataProvider } from '../GrantDataContext';

describe('Recipient Record - Profile', () => {
  const user = {
    name: 'harry potter',
    permissions: [{ regionId: 1, scopeId: SCOPE_IDS.ADMIN }],
  };

  const renderRecipientProfile = (summary) => {
    fetchMock.get('/api/recipient/1/region/1/leadership', []);
    render(
      <UserContext.Provider value={{ user }}>
        <GrantDataProvider>
          <Profile recipientSummary={summary} recipientId={1} regionId={1} />
        </GrantDataProvider>
      </UserContext.Provider>,
    );
  };

  it('renders the recipient summary approriately', async () => {
    const summary = {
      recipientId: '44',
      grants: [
        {
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

    fetchMock.restore();
  });

  it('doesnt show the class/monitoring review headings if there is no grant data', async () => {
    const summary = {
      recipientId: '44',
      grants: [{
        number: 'asdf',
        status: 'Froglike',
        endDate: '2021-09-28',
      }],
    };
    renderRecipientProfile(summary);

    // should not see the heading "Grant number asdf"
    expect(screen.queryByRole('heading', { name: /grant number asdf/i })).not.toBeInTheDocument();

    fetchMock.restore();
  });
});
