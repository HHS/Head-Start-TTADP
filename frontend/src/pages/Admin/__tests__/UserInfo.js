import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import fetchMock from 'fetch-mock';
import UserInfo from '../UserInfo';

describe('UserInfo', () => {
  beforeEach(async () => {
    fetchMock.reset();
    fetchMock.get('/api/admin/roles', [{ fullName: 'Grantee Specialist', name: 'GS', id: 1 }, { fullName: 'COR', name: 'COR', id: 2 }]);
  });

  afterEach(() => fetchMock.restore());

  describe('with an empty user object', () => {
    beforeEach(() => {
      render(<UserInfo user={{}} onUserChange={() => {}} />);
    });

    test('has a blank hsesUsername', () => {
      expect(screen.getByTestId('hses-username')).toHaveTextContent('');
    });

    test('has a blank email', async () => {
      expect(screen.getByLabelText('Email')).toHaveValue('');
    });

    test('has a blank fullName', () => {
      expect(screen.getByLabelText('Full Name')).toHaveValue('');
    });

    test('has the default region', () => {
      expect(screen.getByLabelText('Region')).toHaveValue('0');
    });

    test('has the default jobTitle', async () => {
      const rolesSelect = await screen.findByLabelText('Role(s)');
      expect(rolesSelect).toBeDefined();
    });

    test('has a blank last login', async () => {
      expect(screen.getByTestId('last-login')).toHaveTextContent('');
    });
  });

  describe('with a full user object', () => {
    beforeEach(() => {
      const user = {
        email: 'email',
        hsesUsername: 'username',
        name: 'first last',
        homeRegionId: 1,
        roles: [{ fullName: 'Grantee Specialist', name: 'GS', id: 1 }],
        lastLogin: '2021-02-09T16:15:00Z',
        hsesAuthorities: ['Federal'],
      };

      render(<UserInfo user={user} onUserChange={() => {}} />);
    });

    test('has correct email', async () => {
      expect(screen.getByLabelText('Email')).toHaveValue('email');
    });

    test('has correct username', () => {
      expect(screen.getByTestId('hses-username')).toHaveTextContent('username');
    });

    test('has correct fullName', () => {
      expect(screen.getByLabelText('Full Name')).toHaveValue('first last');
    });

    test('has correct region', () => {
      expect(screen.getByLabelText('Region')).toHaveValue('1');
    });

    test('has correct jobTitle', () => {
      const rolesSelect = screen.getByText(/grantee specialist/i);
      expect(rolesSelect).toBeDefined();
    });

    test('has correct lastLogin', () => {
      expect(screen.getByTestId('last-login')).toHaveTextContent('Feb 9, 2021 11:15 AM -05:00');
    });

    test('has correct hses authorities', () => {
      expect(screen.getByTestId('hses-authorities')).toHaveTextContent('Federal');
    });
  });

  describe('HSES authorities display', () => {
    beforeEach(() => {
      fetchMock.reset();
      fetchMock.get('/api/admin/roles', [
        { fullName: 'Grantee Specialist', name: 'GS', id: 1 },
        { fullName: 'COR', name: 'COR', id: 2 },
      ]);
    });

    afterEach(() => fetchMock.restore());

    test('shows ROLE_* plus first two, and expands to full list', async () => {
      const user = {
        email: 'email',
        hsesUsername: 'username',
        name: 'first last',
        homeRegionId: 1,
        roles: [{ fullName: 'Grantee Specialist', name: 'GS', id: 1 }],
        lastLogin: '2021-02-09T16:15:00Z',
        // ROLE_FEDERAL is last; first two are A, B
        hsesAuthorities: ['A', 'B', 'C', 'D', 'ROLE_FEDERAL'],
      };

      render(<UserInfo user={user} onUserChange={() => {}} />);

      const listScope = screen.getByTestId('hses-authorities');
      // collapsed: should render exactly 3 items -> ROLE_* + first two ("A","B")
      let items = within(listScope).getAllByRole('listitem');
      expect(items).toHaveLength(3);
      expect(items[0]).toHaveTextContent('ROLE_FEDERAL');
      expect(items[1]).toHaveTextContent('A');
      expect(items[2]).toHaveTextContent('B');

      // toggle to expand
      const toggleBtn = within(listScope).getByRole('button', { name: /show all/i });
      await userEvent.click(toggleBtn);

      // expanded: all 5 items visible (deduped)
      items = within(listScope).getAllByRole('listitem');
      expect(items.map((li) => li.textContent)).toEqual(
        ['ROLE_FEDERAL', 'A', 'B', 'C', 'D'],
      );

      // toggle back to collapse
      await userEvent.click(within(listScope).getByRole('button', { name: /show less/i }));
      items = within(listScope).getAllByRole('listitem');
      expect(items).toHaveLength(3);
    });

    test('without a ROLE_* entry, shows only first two and no toggle when <=2', async () => {
      const user = {
        email: 'email',
        hsesUsername: 'username',
        name: 'first last',
        homeRegionId: 1,
        roles: [{ fullName: 'Grantee Specialist', name: 'GS', id: 1 }],
        lastLogin: '2021-02-09T16:15:00Z',
        hsesAuthorities: ['Alpha', 'Beta'],
      };

      render(<UserInfo user={user} onUserChange={() => {}} />);

      const listScope = screen.getByTestId('hses-authorities');
      const items = within(listScope).getAllByRole('listitem');
      expect(items).toHaveLength(2);
      expect(items[0]).toHaveTextContent('Alpha');
      expect(items[1]).toHaveTextContent('Beta');

      // No toggle button because nothing is hidden
      expect(within(listScope).queryByRole('button', { name: /show all/i })).toBeNull();
    });
  });
});
