import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import fetchMock from 'fetch-mock';
import React, { useContext } from 'react';
import CommunicationLogUsersProvider, {
  CommunicationLogUsersContext,
} from '../CommunicationLogUsersProvider';

const Consumer = () => {
  const { users } = useContext(CommunicationLogUsersContext);
  return (
    <ul>
      {users.map((u) => (
        <li key={u.id}>{`${u.id}:${u.name}`}</li>
      ))}
    </ul>
  );
};

describe('CommunicationLogUsersProvider', () => {
  afterEach(() => fetchMock.restore());

  it('fetches regional users and maps them into the context', async () => {
    fetchMock.get('/api/communication-logs/region/1/additional-data', {
      regionalUsers: [
        { value: 74, label: 'Test User' },
        { value: 75, label: 'Another User' },
      ],
    });

    render(
      <CommunicationLogUsersProvider regionId="1">
        <Consumer />
      </CommunicationLogUsersProvider>
    );

    expect(await screen.findByText('74:Test User')).toBeInTheDocument();
    expect(screen.getByText('75:Another User')).toBeInTheDocument();
  });

  it('does not fetch and provides no users when regionId is missing', async () => {
    render(
      <CommunicationLogUsersProvider regionId={null}>
        <Consumer />
      </CommunicationLogUsersProvider>
    );

    await waitFor(() => expect(screen.queryByRole('listitem')).not.toBeInTheDocument());
    expect(fetchMock.called()).toBe(false);
  });

  it('handles a response without a regionalUsers array', async () => {
    fetchMock.get('/api/communication-logs/region/1/additional-data', {});

    render(
      <CommunicationLogUsersProvider regionId="1">
        <Consumer />
      </CommunicationLogUsersProvider>
    );

    await waitFor(() => expect(fetchMock.called()).toBe(true));
    expect(screen.queryByRole('listitem')).not.toBeInTheDocument();
  });
});
