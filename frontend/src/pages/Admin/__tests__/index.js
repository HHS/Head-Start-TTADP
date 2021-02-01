import '@testing-library/jest-dom';
import React from 'react';
import { Router } from 'react-router';
import {
  render, screen, within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryHistory } from 'history';
import fetchMock from 'fetch-mock';
import join from 'url-join';

import Admin from '../index';

describe('Admin Page', () => {
  const usersUrl = join('/api', 'admin', 'users');
  const userPatchUrl = join(usersUrl, '3');

  const history = createMemoryHistory();
  afterEach(() => fetchMock.restore());

  it('displays an error if users are not "fetch-able"', async () => {
    fetchMock.get(usersUrl, 500);
    render(<Router history={history}><Admin match={{ path: '', url: '', params: { userId: undefined } }} /></Router>);
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Unable to fetch users');
  });

  describe('with fetched users', () => {
    const users = [
      {
        id: 2,
        email: 'gs@hogwarts.com',
        name: undefined,
        homeRegionId: 1,
        role: 'Grantee Specialist',
        permissions: [],
      },
      {
        id: 3,
        email: 'potter@hogwarts.com',
        name: 'Harry Potter',
        homeRegionId: 1,
        role: 'Grantee Specialist',
        permissions: [],
      },
    ];

    beforeEach(() => {
      fetchMock.get(usersUrl, users);
    });

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

      it('User list is filterable by email', async () => {
        const filter = await screen.findByLabelText('Filter Users');
        userEvent.type(filter, '@hogwarts.com');
        const sideNav = screen.getByTestId('sidenav');
        const links = within(sideNav).getAllByRole('link');
        expect(links.length).toBe(2);
      });

      it('user filtering is case-insentive', async () => {
        const filter = await screen.findByLabelText('Filter Users');
        userEvent.type(filter, 'harry');
        const sideNav = screen.getByTestId('sidenav');
        const links = within(sideNav).getAllByRole('link');
        expect(links.length).toBe(1);
        expect(links[0]).toHaveTextContent('Harry Potter');
      });

      it('allows a user to be selected', async () => {
        const button = await screen.findByText('Harry Potter');
        userEvent.click(button);
        expect(history.location.pathname).toBe('/admin/3');
      });
    });

    it('displays an existing user', async () => {
      render(<Router history={history}><Admin match={{ path: '', url: '', params: { userId: '3' } }} /></Router>);
      const userInfo = await screen.findByRole('group', { name: 'User Info' });
      expect(userInfo).toBeVisible();
    });

    describe('saving', () => {
      it('handles errors by displaying an error message', async () => {
        fetchMock.put(userPatchUrl, 500);
        render(<Router history={history}><Admin match={{ path: '', url: '', params: { userId: '3' } }} /></Router>);
        const save = await screen.findByRole('button', { name: 'Save' });
        userEvent.click(save);
        const alert = await screen.findByRole('alert');
        expect(alert).toHaveTextContent('Unable to save user');
      });

      it('updates the user list with the new version of the user', async () => {
        fetchMock.put(userPatchUrl, {
          id: 3,
          email: 'email',
          name: 'Potter Harry',
          homeRegionId: 1,
          role: 'Grantee Specialist',
          permissions: [],
        });
        render(<Router history={history}><Admin match={{ path: '', url: '', params: { userId: '3' } }} /></Router>);
        const save = await screen.findByRole('button', { name: 'Save' });
        userEvent.click(save);
        const alert = await screen.findByRole('link', { name: 'Potter Harry' });
        expect(alert).toBeVisible();
      });
    });
  });
});
