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
      expect(screen.getByLabelText('Role')).toHaveValue('default');
    });

    test('has a blank last login', async () => {
      expect(screen.getByTestId('last-login')).toHaveTextContent('');
    });
  });

  describe('with a full user object', () => {
    let user;
    beforeEach(() => {
      user = {
        id: 8192,
        email: 'user8192@test.gov',
        hsesUsername: 'User8192',
        hsesUserId: '8192',
        name: 'User8192',
        homeRegionId: 1,
        role: 'Grantee Specialist',
        lastLogin: '2021-02-09T16:15:00Z',
      };

      render(<UserInfo user={user} onUserChange={() => {}} />);
    });

    test('has correct email', async () => {
      expect(screen.getByLabelText('Email')).toHaveValue(user.email);
    });

    test('has correct username', () => {
      expect(screen.getByTestId('hses-username')).toHaveTextContent(user.hsesUsername);
    });

    test('has correct fullName', () => {
      expect(screen.getByLabelText('Full Name')).toHaveValue(user.name);
    });

    test('has correct region', () => {
      expect(screen.getByLabelText('Region')).toHaveValue(user.homeRegionId);
    });

    test('has correct jobTitle', () => {
      expect(screen.getByLabelText('Role')).toHaveValue(user.role);
    });

    test('has correct lastLogin', () => {
      expect(screen.getByTestId('last-login')).toHaveTextContent(user.lastLogin);
    });
  });
});
