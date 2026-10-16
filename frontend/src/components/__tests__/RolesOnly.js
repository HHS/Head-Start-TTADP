import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import React from 'react';
import UserContext from '../../UserContext';
import RolesOnly, { userHasRole } from '../RolesOnly';

describe('RolesOnly', () => {
  const renderRolesOnly = (user) => {
    render(
      <UserContext.Provider value={{ user }}>
        <RolesOnly roles={['PS', 'SPS', 'GMS']}>
          <h1>This is a test</h1>
        </RolesOnly>
      </UserContext.Provider>
    );
  };

  it('shows children if the user has one of the roles', () => {
    renderRolesOnly({ roles: [{ name: 'ECM' }, { name: 'SPS' }] });
    expect(screen.getByText('This is a test')).toBeVisible();
  });

  it('hides children if the user has none of the roles', () => {
    renderRolesOnly({ roles: [{ name: 'ECM' }] });
    expect(screen.queryByText('This is a test')).toBeNull();
  });

  it('hides children if the user has no roles', () => {
    renderRolesOnly({});
    expect(screen.queryByText('This is a test')).toBeNull();
  });

  it('hides children when there is no user context', () => {
    render(
      <RolesOnly roles={['PS']}>
        <h1>This is a test</h1>
      </RolesOnly>
    );
    expect(screen.queryByText('This is a test')).toBeNull();
  });

  describe('userHasRole', () => {
    it('handles a missing user', () => {
      expect(userHasRole(undefined, ['PS'])).toBe(false);
    });

    it('matches on role name', () => {
      expect(userHasRole({ roles: [{ name: 'GMS' }] }, ['PS', 'GMS'])).toBe(true);
    });
  });
});
