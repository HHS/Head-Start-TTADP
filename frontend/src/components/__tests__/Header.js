import '@testing-library/jest-dom';
import React from 'react';
import {
  render, screen,
} from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import Header from '../Header';
import UserContext from '../../UserContext';

describe('Header', () => {
  const renderHeader = (authenticated, alert) => {
    render((
      <MemoryRouter>
        <UserContext.Provider value={{ user: { id: 1, permissions: [], name: 'Ted User' } }}>
          <Header
            authenticated={authenticated}
            alert={alert}
            areThereUnreadNotifications={false}
            setAreThereUnreadNotifications={jest.fn()}
          />
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
});
