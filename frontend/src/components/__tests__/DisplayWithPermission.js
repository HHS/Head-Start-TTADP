import '@testing-library/jest-dom';
import React from 'react';
import { SCOPE_IDS } from '@ttahub/common';
import {
  render, screen,
} from '@testing-library/react';
import { Router } from 'react-router';
import { createMemoryHistory } from 'history';
import DisplayWithPermission from '../DisplayWithPermission';
import UserContext from '../../UserContext';

const { ADMIN, READ_WRITE_TRAINING_REPORTS, READ_ACTIVITY_REPORTS } = SCOPE_IDS;

describe('display with permissions', () => {
  const history = createMemoryHistory();
  const renderDisplayWithPermission = (scopes, user, renderNotFound = false) => {
    render(
      <Router history={history}>
        <UserContext.Provider value={{ user }}>
          <DisplayWithPermission scopes={scopes} renderNotFound={renderNotFound}>
            <h1>This is a test</h1>
          </DisplayWithPermission>
        </UserContext.Provider>
      </Router>,
    );
  };

  it('shows content if the user has the permission', () => {
    const user = {
      permissions: [
        {
          scopeId: READ_WRITE_TRAINING_REPORTS,
        },
      ],
    };
    renderDisplayWithPermission([READ_ACTIVITY_REPORTS, READ_WRITE_TRAINING_REPORTS], user);
    expect(screen.getByText('This is a test')).toBeVisible();
  });

  it('hides content if the user has no permission', () => {
    const user = {
      permissions: [
        {
          scopeId: READ_ACTIVITY_REPORTS,
        },
      ],
    };
    renderDisplayWithPermission([READ_WRITE_TRAINING_REPORTS], user);

    expect(document.querySelectorAll('h1').length).toBe(0);
  });

  it('shows content if the user is an admin', () => {
    const user = {

      permissions: [
        {
          scopeId: ADMIN,
        },
      ],
    };
    renderDisplayWithPermission([READ_WRITE_TRAINING_REPORTS], user);

    expect(screen.getByText('This is a test')).toBeVisible();
  });

  it('renders not found where appropriate', async () => {
    const user = {
      flags: [],
      permissions: [],
    };
    const renderNotFound = true;

    renderDisplayWithPermission([READ_WRITE_TRAINING_REPORTS], user, renderNotFound);
    expect(history.entries.pop().pathname).toBe('/something-went-wrong/404');
  });
});
