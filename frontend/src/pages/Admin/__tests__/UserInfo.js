import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';

import UserInfo from '../UserInfo';

describe('UserInfo', () => {
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

    test('has the default jobTitle', () => {
      const rolesSelect = screen.getByText(/default/i);
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
        role: ['Grantee Specialist'],
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
});
