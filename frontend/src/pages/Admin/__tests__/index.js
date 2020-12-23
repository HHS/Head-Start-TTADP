import '@testing-library/jest-dom';
import React from 'react';
import { Router } from 'react-router';
import {
  render, screen, within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryHistory } from 'history';
import Admin from '../index';

describe('UserInfo', () => {
  const history = createMemoryHistory();

  describe('with no user selected', () => {
    beforeEach(() => {
      render(<Router history={history}><Admin match={{ path: '', url: '', params: { userId: undefined } }} /></Router>);
    });

    it('user list is filterable', async () => {
      const filter = await screen.findByLabelText('Filter Users');
      userEvent.type(filter, 'Harry');
      const sideNav = screen.getByTestId('sidenav');
      const links = within(sideNav).getAllByRole('link');
      expect(links.length).toBe(1);
      expect(links[0]).toHaveTextContent('Harry Potter');
    });

    it('new user button properly sets url', async () => {
      const newUser = await screen.findByText('Create New User');
      userEvent.click(newUser);
      expect(history.location.pathname).toBe('/admin/new');
    });

    it('allows a user to be selected', async () => {
      const button = await screen.findByText('Harry Potter');
      userEvent.click(button);
      expect(history.location.pathname).toBe('/admin/3');
    });
  });

  it('displays a new user', async () => {
    render(<Router history={history}><Admin match={{ path: '', url: '', params: { userId: 'new' } }} /></Router>);
    const userInfo = await screen.findByRole('group', { name: 'User Info' });
    expect(userInfo).toBeVisible();
  });

  it('displays an existing user', async () => {
    render(<Router history={history}><Admin match={{ path: '', url: '', params: { userId: '3' } }} /></Router>);
    const userInfo = await screen.findByRole('group', { name: 'User Info' });
    expect(userInfo).toBeVisible();
  });
});
