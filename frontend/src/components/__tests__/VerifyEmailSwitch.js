import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { SCOPE_IDS } from '@ttahub/common';
import { MemoryRouter, Route, Switch } from 'react-router-dom';
import UserContext from '../../UserContext';
import VerifyEmailSwitch from '../VerifyEmailSwitch';

const renderSwitch = (user, token = 'abc123') =>
  render(
    <MemoryRouter initialEntries={[`/notifications/verify-email/${token}`]}>
      <UserContext.Provider value={{ user }}>
        <Switch>
          <Route exact path="/notifications/verify-email/:token" component={VerifyEmailSwitch} />
          <Route
            exact
            path="/account/notifications/:token"
            render={({ match }) => <div>{`Notifications destination: ${match.params.token}`}</div>}
          />
          <Route
            exact
            path="/account/verify-email/:token"
            render={({ match }) => <div>{`Legacy destination: ${match.params.token}`}</div>}
          />
        </Switch>
      </UserContext.Provider>
    </MemoryRouter>
  );

describe('VerifyEmailSwitch', () => {
  const nonAdminPermissions = [{ regionId: 1, scopeId: SCOPE_IDS.READ_REPORTS }];

  it('redirects flagged users to the notifications management page', () => {
    renderSwitch({
      name: 'user',
      permissions: nonAdminPermissions,
      flags: ['actionable_notifications'],
    });
    expect(screen.getByText('Notifications destination: abc123')).toBeInTheDocument();
  });

  it('redirects unflagged users to the legacy account verification page', () => {
    renderSwitch({ name: 'user', permissions: nonAdminPermissions, flags: [] });
    expect(screen.getByText('Legacy destination: abc123')).toBeInTheDocument();
  });

  it('treats admins as flagged and redirects to the notifications management page', () => {
    renderSwitch({
      name: 'admin',
      permissions: [{ regionId: 1, scopeId: SCOPE_IDS.ADMIN }],
      flags: [],
    });
    expect(screen.getByText('Notifications destination: abc123')).toBeInTheDocument();
  });

  it('passes the token through to the redirect destination', () => {
    renderSwitch({ name: 'user', permissions: nonAdminPermissions, flags: [] }, 'token-xyz-789');
    expect(screen.getByText('Legacy destination: token-xyz-789')).toBeInTheDocument();
  });
});
