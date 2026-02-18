import React from 'react';
import {
  render, waitFor, act, cleanup,
} from '@testing-library/react';
import UserContext from '../../UserContext';
import MeshPresenceManager from '../MeshPresenceManager';

// eslint-disable-next-line import/no-unresolved
jest.mock('@mesh-kit/core/client', () => ({
  MeshClient: jest.fn(),
}));

// eslint-disable-next-line import/no-unresolved
const { MeshClient } = require('@mesh-kit/core/client');

const renderComponent = ({
  room = 'ar-123',
  onPresenceUpdate = jest.fn(),
  onRevisionUpdate = jest.fn(),
} = {}) => render(
  <UserContext.Provider value={{ user: { id: 1, name: 'Test User' } }}>
    <MeshPresenceManager
      room={room}
      onPresenceUpdate={onPresenceUpdate}
      onRevisionUpdate={onRevisionUpdate}
    />
  </UserContext.Provider>,
);

const makeClient = (connectImpl) => ({
  connect: connectImpl,
  on: jest.fn(),
  joinRoom: jest.fn().mockResolvedValue(undefined),
  publishPresenceState: jest.fn().mockResolvedValue(undefined),
  subscribePresence: jest.fn().mockResolvedValue(undefined),
  command: jest.fn().mockResolvedValue({ states: {} }),
  close: jest.fn().mockResolvedValue(undefined),
});

describe('MeshPresenceManager retry behavior', () => {
  let consoleErrorSpy;

  beforeEach(() => {
    jest.useFakeTimers();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    MeshClient.mockReset();
  });

  afterEach(() => {
    cleanup();
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    consoleErrorSpy.mockRestore();
  });

  it('retries failed websocket connections and eventually succeeds', async () => {
    const clients = [];
    const attemptError1 = new Error('connect-failure-1');
    const attemptError2 = new Error('connect-failure-2');
    const connectMock = jest.fn()
      .mockRejectedValueOnce(attemptError1)
      .mockRejectedValueOnce(attemptError2)
      .mockResolvedValue(undefined);

    MeshClient.mockImplementation(() => {
      const client = makeClient(connectMock);
      clients.push(client);
      return client;
    });

    renderComponent();

    await waitFor(() => expect(connectMock).toHaveBeenCalledTimes(1));
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'MeshPresenceManager: failed to connect (attempt 1 of 3)',
      { room: 'ar-123' },
      attemptError1,
    );

    await act(async () => {
      jest.advanceTimersByTime(1000);
    });
    await waitFor(() => expect(connectMock).toHaveBeenCalledTimes(2));
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'MeshPresenceManager: failed to connect (attempt 2 of 3)',
      { room: 'ar-123' },
      attemptError2,
    );

    await act(async () => {
      jest.advanceTimersByTime(2000);
    });

    await waitFor(() => expect(connectMock).toHaveBeenCalledTimes(3));
    await waitFor(() => expect(clients[2].joinRoom).toHaveBeenCalledWith('ar-123'));
    expect(clients[2].publishPresenceState).toHaveBeenCalled();
    expect(consoleErrorSpy).not.toHaveBeenCalledWith(
      'MeshPresenceManager: giving up after 3 failed attempt(s)',
      { room: 'ar-123' },
      expect.any(Error),
    );
  });

  it('stops retrying after the max number of attempts', async () => {
    const connectError = new Error('permanent-connect-failure');
    const connectMock = jest.fn().mockRejectedValue(connectError);

    MeshClient.mockImplementation(() => makeClient(connectMock));

    renderComponent();

    await waitFor(() => expect(connectMock).toHaveBeenCalledTimes(1));

    await act(async () => {
      jest.advanceTimersByTime(1000);
    });
    await waitFor(() => expect(connectMock).toHaveBeenCalledTimes(2));

    await act(async () => {
      jest.advanceTimersByTime(2000);
    });
    await waitFor(() => expect(connectMock).toHaveBeenCalledTimes(3));

    await act(async () => {
      jest.advanceTimersByTime(15000);
    });
    expect(connectMock).toHaveBeenCalledTimes(3);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'MeshPresenceManager: giving up after 3 failed attempt(s)',
      { room: 'ar-123' },
      connectError,
    );
  });
});
