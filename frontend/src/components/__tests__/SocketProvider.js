import '@testing-library/jest-dom';
import React, { useContext } from 'react';
import { screen, render, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import UserContext from '../../UserContext';
import SocketProvider, { SocketContext, socketPath } from '../SocketProvider';

describe('SocketPath', () => {
  it('returns the correct path for a new activity report', () => {
    expect(socketPath('new', 'page')).toEqual('');
  });
  it('returns the correct path for an existing activity report', () => {
    expect(socketPath('123', 'page')).toEqual('/activity-report/edit/123/page');
  });
  it('returns nothing when the activity report id is not provided', () => {
    expect(socketPath(undefined, 'page')).toEqual('');
  });
});

const SocketTester = () => {
  const { socket } = useContext(SocketContext);

  const closer = () => socket.close();

  return (
    <div>
      <h1>Test</h1>
      <button type="button" onClick={closer}>Closer</button>
    </div>
  );
};

describe('SocketProvider', () => {
  it('renders and closes the socket without crashing', () => {
    render(
      <UserContext.Provider value={{ user: { euaId: '123' } }}>
        <SocketProvider path="/activity-report/edit/123/step-1">
          <SocketTester />
        </SocketProvider>
      </UserContext.Provider>,
    );
    act(() => userEvent.click(screen.getByText('Closer')));
    expect(screen.queryByText('Test')).toBeInTheDocument();
  });
});
