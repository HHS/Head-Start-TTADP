import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, Route } from 'react-router';
import FeatureFlag from '../../../components/FeatureFlag';
import UserContext from '../../../UserContext';
import Notifications from '../index';

describe('Notifications Page', () => {
  test('displays notifications page', () => {
    render(
      <MemoryRouter>
        <Notifications />
      </MemoryRouter>
    );

    expect(screen.getByText('Notifications')).toBeVisible();
  });

  test('redirects users without the actionable notifications flag to the 404 page', () => {
    const user = {
      name: 'user',
      permissions: [],
      flags: [],
    };

    render(
      <UserContext.Provider value={{ user }}>
        <MemoryRouter initialEntries={['/notifications']}>
          <FeatureFlag flag="actionable_notifications" renderNotFound>
            <Notifications />
          </FeatureFlag>
          <Route path="/something-went-wrong/404">
            <div>Not found page</div>
          </Route>
        </MemoryRouter>
      </UserContext.Provider>
    );

    expect(screen.getByText('Not found page')).toBeVisible();
    expect(screen.queryByText('Notifications')).toBe(null);
  });
});
