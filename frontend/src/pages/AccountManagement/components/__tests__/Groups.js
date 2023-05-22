import React from 'react';
import {
  act,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import fetchMock from 'fetch-mock';
import { MemoryRouter } from 'react-router';
import Groups from '../Groups';
import UserContext from '../../../../UserContext';

describe('Groups', () => {
  const renderGroups = () => {
    render(
      <MemoryRouter>
        <UserContext.Provider value={{ user: { id: 1 } }}>
          <Groups />
        </UserContext.Provider>
      </MemoryRouter>,
    );
  };

  afterEach(() => fetchMock.restore());

  it('renders without crashing', async () => {
    fetchMock.get('/api/groups', []);
    act(renderGroups);
    expect(screen.getByText(/you haven't created any groups/i)).toBeInTheDocument();
  });

  it('renders groups', async () => {
    fetchMock.get('/api/groups', [
      {
        id: 1,
        name: 'group1',
        userId: 1,
        isPublic: false,
      },
      {
        id: 2,
        name: 'group2',
        userId: 1,
        isPublic: true,
      },
      {
        id: 3,
        name: 'group3',
        userId: 2,
        isPublic: true,
        user: {
          name: 'Tim User',
        },
      },
    ]);

    act(renderGroups);

    const group1 = await screen.findByText(/group1/i);
    const group2 = await screen.findByText(/group2/i);

    // this is a public group from another user
    const group3 = await screen.findByText(/group3/i);

    expect(group1).toBeInTheDocument();
    expect(group2).toBeInTheDocument();
    expect(group3).toBeInTheDocument();

    // group 1 should have the proper buttons for a user owned group
    const group1row = group1.parentElement.parentElement;
    expect(group1row.querySelector('a[href="/account/my-groups/1"]')).toBeInTheDocument();
    const del = group1row.querySelector('button');
    expect(del).toBeInTheDocument();
    expect(del.getAttribute('aria-label')).toBe('delete group1');

    // group 3 should have the proper buttons for a public group
    const group3row = group3.parentElement.parentElement;
    const group3viewLink = group3row.querySelector('a[href="/account/group/3"]');
    expect(group3viewLink).toBeInTheDocument();
    expect(group3viewLink.getAttribute('aria-label')).toBe('view group3');
    expect(group3row.querySelector('button')).toBeNull();

    // and it shows the user's name
    expect(screen.getByText(/Tim User/i)).toBeInTheDocument();
  });

  it('renders only public groups when the user has not created one', async () => {
    fetchMock.get('/api/groups', [
      {
        id: 3,
        name: 'group3',
        userId: 2,
        isPublic: true,
        user: {
          name: 'Tim User',
        },
      },
    ]);

    act(renderGroups);
    // this is a public group from another user
    const group3 = await screen.findByText(/group3/i);
    expect(group3).toBeInTheDocument();

    expect(screen.getByText(/you haven't created any groups/i)).toBeInTheDocument();
  });

  it('renders only user created groups when there are no public groups', async () => {
    fetchMock.get('/api/groups', [
      {
        id: 1,
        name: 'group1',
        userId: 1,
        isPublic: false,
      },
    ]);

    act(renderGroups);

    const group1 = await screen.findByText(/group1/i);
    expect(group1).toBeInTheDocument();

    expect(screen.getByText(/No one has made any groups in your region public yet/i)).toBeInTheDocument();
  });

  it('handles fetch errors', async () => {
    fetchMock.get('/api/groups', 500);

    act(renderGroups);

    await waitFor(() => {
      expect(screen.getByText(/you haven't created any groups/i)).toBeInTheDocument();
    });
  });

  it('you can delete a group', async () => {
    fetchMock.get('/api/groups', [
      {
        id: 1,
        name: 'group1',
        userId: 1,
        isPublic: false,
      },
    ]);
    fetchMock.delete('/api/groups/1', {});

    act(renderGroups);

    await waitFor(() => {
      expect(screen.getByText(/group1/i)).toBeInTheDocument();
    });

    userEvent.click(screen.getByText(/delete/i));

    await waitFor(() => {
      expect(screen.getByText(/you haven't created any groups/i)).toBeInTheDocument();
    });
  });

  it('handles delete errors', async () => {
    fetchMock.get('/api/groups', [
      {
        id: 1,
        name: 'group1',
        userId: 1,
        isPublic: false,
      },
    ]);
    fetchMock.delete('/api/groups/1', 500);

    act(renderGroups);

    await waitFor(() => {
      expect(screen.getByText(/group1/i)).toBeInTheDocument();
    });

    userEvent.click(screen.getByText(/delete/i));

    await waitFor(() => {
      expect(screen.getByText(/group1/i)).toBeInTheDocument();
      expect(screen.getByText(/There was an error deleting your group/i)).toBeInTheDocument();
    });
  });
});
