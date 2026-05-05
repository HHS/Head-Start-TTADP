import { render } from '@testing-library/react';
import React from 'react';
import Logout from '../../pages/Logout';
import UserContext from '../../UserContext';

describe('Logout', () => {
  const logout = jest.fn();

  const renderLogout = () => {
    render(
      <UserContext.Provider value={{ logout }}>
        <Logout />
      </UserContext.Provider>
    );
  };

  it('renders the logout page and calls logout from context', () => {
    renderLogout();
    expect(logout).toHaveBeenCalled();
  });
});
