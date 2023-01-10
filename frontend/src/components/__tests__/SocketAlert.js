import '@testing-library/jest-dom';
import React from 'react';
import { screen, render } from '@testing-library/react';
import UserContext from '../../UserContext';
import SocketAlert from '../SocketAlert';

describe('SocketAlert', () => {
  it('renders the alert', () => {
    const mockStore = { user: 'John' };
    render(
      <UserContext.Provider value={{ user: { name: 'Todd' } }}>
        <SocketAlert store={mockStore} />
      </UserContext.Provider>,
    );
    expect(screen.getByText(/john is now also working in this section\. your changes may not be saved\./i)).toBeInTheDocument();
    expect(screen.queryByText('Todd')).not.toBeInTheDocument();
  });
  it('excludes the current user from the list of users', () => {
    const mockStore = { user: 'Todd' };
    render(
      <UserContext.Provider value={{ user: { name: 'Todd' } }}>
        <SocketAlert store={mockStore} />
      </UserContext.Provider>,
    );
    expect(screen.queryByText('Todd')).not.toBeInTheDocument();
  });
});
