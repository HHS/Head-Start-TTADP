import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import AppLoadingContext from '../../AppLoadingContext';
import UserContext from '../../UserContext';
import ManageNotifications from './ManageNotifications';

describe('ManageNotifications', () => {
  it('renders the notification preferences heading', () => {
    render(
      <AppLoadingContext.Provider value={{ setIsAppLoading: () => {} }}>
        <UserContext.Provider value={{ user: { id: 1, validationStatus: [] } }}>
          <MemoryRouter>
            <ManageNotifications updateUser={() => {}} />
          </MemoryRouter>
        </UserContext.Provider>
      </AppLoadingContext.Provider>
    );

    expect(screen.getByRole('heading', { name: /notification preferences/i })).toBeInTheDocument();
  });
});
