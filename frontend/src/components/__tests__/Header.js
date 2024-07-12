import '@testing-library/jest-dom';
import React from 'react';
import {
  render, screen,
} from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import Header from '../Header';
import UserContext from '../../UserContext';
import SomethingWentWrongContext from '../../SomethingWentWrongContext';

describe('Header', () => {
  const renderHeader = (
    authenticated,
    alert,
    errorResponseCode = null,
    showingNotFound = false,
  ) => {
    render((
      <MemoryRouter>
        <UserContext.Provider value={{ user: { id: 1, permissions: [], name: 'Ted User' } }}>
          <SomethingWentWrongContext.Provider value={{ errorResponseCode, showingNotFound }}>
            <Header
              authenticated={authenticated}
              alert={alert}
              areThereUnreadNotifications={false}
              setAreThereUnreadNotifications={jest.fn()}
            />
          </SomethingWentWrongContext.Provider>
        </UserContext.Provider>
      </MemoryRouter>
    ));
  };

  it('does not render an alert if one is not passed', () => {
    renderHeader(true, null);
    expect(document.querySelector('.usa-alert')).toBeNull();
  });

  it('does not render an alert if the user is not authenticated', () => {
    renderHeader(false, { title: 'Test', message: 'this is a test' });

    expect(document.querySelector('.usa-alert')).toBeNull();
    expect(screen.queryByText('this is a test')).toBeNull();
  });

  it('renders an alert if the user is authenticated', () => {
    renderHeader(true, { title: 'Test', message: 'this is a test' });
    expect(document.querySelector('.usa-alert')).not.toBeNull();
    expect(screen.queryByText('this is a test')).not.toBeNull();
  });

  it('does not render the user menu if there is an error response code', () => {
    renderHeader(true, null, 500);
    expect(screen.queryByRole('button', { name: 'User Menu' })).toBeNull();
  });

  it('does not render the user menu if showing not found', () => {
    renderHeader(true, null, null, true);
    expect(screen.queryByRole('button', { name: 'User Menu' })).toBeNull();
  });
});
