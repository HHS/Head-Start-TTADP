import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';

import UserContext from '../../../UserContext';
import Home from '../index';

describe('Home Page', () => {
  beforeEach(() => {
    const user = {
      name: 'test@test.com',
    };

    render(
      <MemoryRouter>
        <UserContext.Provider value={{ user }}>
          <Home authenticated />
        </UserContext.Provider>
      </MemoryRouter>,
    );
  });

  test('displays welcome message', () => {
    expect(screen.getByText('Welcome to the TTA Smart Hub test@test.com')).toBeVisible();
  });
});
