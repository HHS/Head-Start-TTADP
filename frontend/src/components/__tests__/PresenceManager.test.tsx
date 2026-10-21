import { render } from '@testing-library/react';
import React from 'react';
import { SESSION_STORAGE_IMPERSONATION_KEY } from '../../Constants';
import UserContext from '../../UserContext';
import RealtimeClient from '../../utils/realtimeClient';
import PresenceManager, { realtimeUrl, toPresenceUpdate } from '../PresenceManager';

jest.mock('../../utils/realtimeClient');

const MockClient = RealtimeClient as jest.MockedClass<typeof RealtimeClient>;

const renderManager = (props: Partial<React.ComponentProps<typeof PresenceManager>> = {}) =>
  render(
    <UserContext.Provider value={{ user: { id: 1, name: 'Alice' } }}>
      <PresenceManager room="ar-5" {...props} />
    </UserContext.Provider>
  );

const handlersFor = (index = 0) => MockClient.mock.calls[index][2];

describe('PresenceManager', () => {
  beforeEach(() => {
    MockClient.mockClear();
    window.sessionStorage.clear();
  });

  it('adds the impersonated user id to the socket url', () => {
    expect(realtimeUrl('wss://localhost')).toBe('wss://localhost');

    window.sessionStorage.setItem(SESSION_STORAGE_IMPERSONATION_KEY, '9');

    expect(realtimeUrl('wss://localhost')).toBe('wss://localhost/?impersonationId=9');
    expect(realtimeUrl('')).toBe('');
  });

  it('builds the presence summary from the current user perspective', () => {
    const users = [
      { userId: 1, username: 'Alice', tabs: 2 },
      { userId: 2, username: 'Bob', tabs: 1 },
    ];

    expect(toPresenceUpdate(users, 1)).toEqual({
      presentUsers: users,
      uniqueUserCount: 2,
      hasMultipleUsers: true,
      otherUsers: [users[1]],
      tabCount: 2,
    });
    expect(toPresenceUpdate([users[0]], 1).hasMultipleUsers).toBe(false);
  });

  it('connects to the room and closes on unmount', () => {
    const { unmount } = renderManager();

    expect(MockClient).toHaveBeenCalledWith('wss://localhost', 'ar-5', expect.any(Object));
    const client = MockClient.mock.instances[0];
    expect(client.connect).toHaveBeenCalled();

    unmount();
    expect(client.close).toHaveBeenCalled();
  });

  it('passes presence updates to the parent', () => {
    const onPresenceUpdate = jest.fn();
    renderManager({ onPresenceUpdate });

    handlersFor().onPresence([{ userId: 2, username: 'Bob', tabs: 1 }]);

    expect(onPresenceUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ uniqueUserCount: 1, otherUsers: [expect.any(Object)] })
    );
  });

  it('passes revision updates for this report only', () => {
    const onRevisionUpdate = jest.fn();
    renderManager({ onRevisionUpdate });
    const { onEvent } = handlersFor();

    onEvent('revision-updated', { reportId: 6, revision: 2, userId: 2, timestamp: 't' });
    onEvent('something-else', { reportId: 5 });
    expect(onRevisionUpdate).not.toHaveBeenCalled();

    onEvent('revision-updated', { reportId: 5, revision: 3, userId: 2, timestamp: 't' });
    expect(onRevisionUpdate).toHaveBeenCalledWith(3, { userId: 2, timestamp: 't', reportId: 5 });
  });
});
