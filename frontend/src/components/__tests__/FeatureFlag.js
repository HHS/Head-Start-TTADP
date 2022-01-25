import '@testing-library/jest-dom';
import React from 'react';
import {
  render, screen,
} from '@testing-library/react';
import { Router } from 'react-router';
import { createMemoryHistory } from 'history';
import FeatureFlag from '../FeatureFlag';
import UserContext from '../../UserContext';
import { SCOPE_IDS } from '../../Constants';

const { ADMIN } = SCOPE_IDS;

describe('feature flag', () => {
  const renderFeatureFlag = (flag, user, renderNotFound = false) => {
    const history = createMemoryHistory();

    render(
      <Router history={history}>
        <UserContext.Provider value={{ user }}>
          <FeatureFlag flag={flag} renderNotFound={renderNotFound}>
            <h1>This is a test</h1>
          </FeatureFlag>
        </UserContext.Provider>
      </Router>,
    );
  };

  it('shows content if the user has the flag', () => {
    const flag = 'tell_your_children';
    const user = {
      flags: [flag],
      permissions: [],
    };
    renderFeatureFlag(flag, user);

    expect(screen.getByText('This is a test')).toBeVisible();
  });

  it('hides content if the user has no flag', () => {
    const flag = 'tell_your_children';
    const user = {
      flags: [],
      permissions: [],
    };
    renderFeatureFlag(flag, user);

    expect(document.querySelectorAll('h1').length).toBe(0);
  });

  it('shows content if the user is an admin', () => {
    const flag = 'tell_your_children';
    const user = {
      flags: [],
      permissions: [
        {
          scopeId: ADMIN,
        },
      ],
    };
    renderFeatureFlag(flag, user);

    expect(screen.getByText('This is a test')).toBeVisible();
  });

  it('renders not found where appropriate', () => {
    const flag = 'tell_your_children';
    const user = {
      flags: [],
      permissions: [],
    };
    const renderNotFound = true;
    renderFeatureFlag(flag, user, renderNotFound);
    expect(screen.getByRole('link', { name: /home page/i })).toBeVisible();
  });
});
