import React from 'react';
import { render } from '@testing-library/react';
import UserContext from '../../UserContext';
import Logout from '../../pages/Logout';

describe('Logout', () => {
  const logout = jest.fn();

  const renderLogout = () => {
    render(
      <UserContext.Provider value={{ logout }}>
        <Logout />
      </UserContext.Provider>,
    );
  };

  it('renders the logout page and calls logout from context', () => {
    renderLogout();
    expect(logout).toHaveBeenCalled();
  });
});
