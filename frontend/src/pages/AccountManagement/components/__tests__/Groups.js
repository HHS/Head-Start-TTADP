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
import AppLoadingContext from '../../../../AppLoadingContext';
import MyGroupsProvider from '../../../../components/MyGroupsProvider';

describe('Groups', () => {
  const renderGroups = () => {
    render(
      <MemoryRouter>
        <MyGroupsProvider authenticated>
          <AppLoadingContext.Provider value={{ isAppLoading: false, setIsAppLoading: jest.fn() }}>
            <UserContext.Provider value={{ user: { id: 1 } }}>
              <Groups />
            </UserContext.Provider>
          </AppLoadingContext.Provider>
        </MyGroupsProvider>
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
        groupCollaborators: [],
        coOwners: [],
        sharedWith: [],
        creator: {
          name: 'Tom Jones',
          id: 1,
        },
      },
      {
        id: 2,
        name: 'group2',
        userId: 1,
        isPublic: true,
        groupCollaborators: [],
        coOwners: [],
        sharedWith: [],
        creator: {
          name: 'Tom Jones',
          id: 1,
        },
      },
      {
        id: 3,
        name: 'group3',
        userId: 2,
        isPublic: true,
        groupCollaborators: [],
        coOwners: [],
        sharedWith: [],
        creator: {
          name: 'Tim User',
          id: 2,
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
        groupCollaborators: [],
        coOwners: [],
        sharedWith: [],
        creator: {
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
        groupCollaborators: [],
        coOwners: [],
        sharedWith: [],
        creator: {
          name: 'Tim User',
          id: 1,
        },
      },
    ]);

    act(renderGroups);

    const group1 = await screen.findByText(/group1/i);
    expect(group1).toBeInTheDocument();

    expect(screen.getByText(/you don't have any shared groups yet/i)).toBeInTheDocument();
  });

  it('handles fetch errors', async () => {
    fetchMock.get('/api/groups', 500);

    act(renderGroups);

    await waitFor(() => {
      expect(screen.getByText(/you haven't created any groups/i)).toBeInTheDocument();
    });
  });

  it('you can delete a group', async () => {
    fetchMock.get('/api/groups', [{
      id: 1,
      name: 'group1',
      userId: 1,
      isPublic: false,
      groupCollaborators: [],
      coOwners: [],
      sharedWith: [],
      creator: {
        name: 'Tim User',
        id: 1,
      },
    },
    ]);
    fetchMock.delete('/api/groups/1', {});

    act(renderGroups);

    await waitFor(() => {
      expect(screen.getByText(/group1/i)).toBeInTheDocument();
    });

    act(() => {
      userEvent.click(screen.getByText(/delete/i));
    });

    // it shows the modal
    expect(await screen.findByText(/Are you sure you want to continue\?/i)).toBeInTheDocument();

    const continueButton = screen.getByRole('button', { name: /continue/i });

    expect(fetchMock.called('/api/groups/1', { method: 'delete' })).toBe(false);

    act(() => {
      userEvent.click(continueButton);
    });

    expect(fetchMock.called('/api/groups/1', { method: 'delete' })).toBe(true);
  });

  it('handles delete errors', async () => {
    fetchMock.get('/api/groups', [
      {
        id: 1,
        name: 'group1',
        userId: 1,
        isPublic: false,
        groupCollaborators: [],
        coOwners: [],
        sharedWith: [],
        creator: {
          name: 'Tim User',
          id: 1,
        },
      },
    ]);
    fetchMock.delete('/api/groups/1', 500);

    act(renderGroups);

    await waitFor(() => {
      expect(screen.getByText(/group1/i)).toBeInTheDocument();
    });

    userEvent.click(screen.getByText(/delete/i));

    expect(await screen.findByText(/Are you sure you want to continue\?/i)).toBeInTheDocument();

    const cancelButton = screen.getByRole('button', { name: /cancel/i });

    act(() => {
      userEvent.click(cancelButton);
      userEvent.click(screen.getByText(/delete/i));
    });

    const continueButton = screen.getByRole('button', { name: /continue/i });

    act(() => {
      userEvent.click(continueButton);
    });

    await waitFor(() => {
      expect(screen.getByText(/group1/i)).toBeInTheDocument();
      expect(screen.getByText(/There was an error deleting your group/i)).toBeInTheDocument();
    });
  });

  it('handles null response', async () => {
    fetchMock.get('/api/groups', null);

    act(() => {
      renderGroups();
    });
    expect(screen.getByText(/you haven't created any groups yet/i)).toBeInTheDocument();
    expect(screen.getByText(/you haven't been added as a co-owner yet/i)).toBeInTheDocument();
    expect(screen.getByText(/you don't have any shared groups yet/i)).toBeInTheDocument();
  });

  it('displays groups in creator section', async () => {
    fetchMock.get('/api/groups', [
      {
        id: 1,
        name: 'group1',
        isPublic: true,
        updatedAt: '2024-01-01T00:00:00.000Z',
        groupCollaborators: [],
        coOwners: [
          {
            id: 2,
            name: 'CoOwner User',
          },
        ],
        sharedWith: [
          {
            id: 3,
            name: 'SharedWith User',
          },
        ],
        creator: {
          name: 'Creator User',
          id: 1,
        },
      },
    ]);

    act(renderGroups);

    await waitFor(() => {
      expect(screen.queryAllByText(/you haven't created any groups yet/i).length).toBe(0);
      expect(screen.getByText(/you haven't been added as a co-owner yet/i)).toBeInTheDocument();
      expect(screen.getByText(/You don't have any shared groups yet/i)).toBeInTheDocument();
      expect(screen.getByText('group1')).toBeInTheDocument();
      expect(screen.getByText('Creator User')).toBeInTheDocument();
      expect(screen.getByText('Public')).toBeInTheDocument();
      expect(screen.getByText('01/01/2024')).toBeInTheDocument();
      expect(screen.getByText('Edit group')).toBeInTheDocument();
      expect(screen.getByText('Delete group')).toBeInTheDocument();
    });
  });

  it('displays groups in co-owner section', async () => {
    fetchMock.get('/api/groups', [
      {
        id: 1,
        name: 'group1',
        isPublic: false,
        updatedAt: '2024-01-01T00:00:00.000Z',
        groupCollaborators: [],
        coOwners: [
          {
            id: 1,
            name: 'CoOwner User',
          },
        ],
        sharedWith: [
          {
            id: 3,
            name: 'SharedWith User',
          },
        ],
        creator: {
          name: 'Creator User',
          id: 4,
        },
      },
    ]);

    act(renderGroups);

    await waitFor(() => {
      expect(screen.getByText(/you haven't created any groups yet/i)).toBeInTheDocument();
      expect(screen.queryAllByText(/you haven't been added as a co-owner yet/i).length).toBe(0);
      expect(screen.getByText(/You don't have any shared groups yet/i)).toBeInTheDocument();
      expect(screen.getByText('group1')).toBeInTheDocument();
      expect(screen.getByText('Creator User')).toBeInTheDocument();
      expect(screen.getByText('Individuals')).toBeInTheDocument();
      expect(screen.getByText('01/01/2024')).toBeInTheDocument();
      expect(screen.getByText('Edit group')).toBeInTheDocument();
      expect(screen.getByText('Delete group')).toBeInTheDocument();
    });
  });

  it('displays groups in shared section', async () => {
    fetchMock.get('/api/groups', [
      {
        id: 1,
        name: 'group1',
        isPublic: false,
        updatedAt: '2024-01-01T00:00:00.000Z',
        groupCollaborators: [],
        coOwners: [
          {
            id: 2,
            name: 'CoOwner User',
          },
        ],
        sharedWith: [
          {
            id: 1,
            name: 'SharedWith User',
          },
        ],
        creator: {
          name: 'Creator User',
          id: 5,
        },
      },
      {
        id: 2,
        name: 'group2',
        isPublic: true,
        updatedAt: '2024-01-02T00:00:00.000Z',
        groupCollaborators: [],
        coOwners: [
          {
            id: 10,
            name: 'CoOwner User',
          },
        ],
        sharedWith: [
          {
            id: 12,
            name: 'SharedWith User',
          },
        ],
        creator: {
          name: 'Creator User2',
          id: 14,
        },
      },
    ]);

    act(renderGroups);

    await waitFor(() => {
      expect(screen.getByText(/you haven't created any groups yet/i)).toBeInTheDocument();
      expect(screen.getByText(/you haven't been added as a co-owner yet/i)).toBeInTheDocument();
      expect(screen.queryAllByText(/You don't have any shared groups yet/i).length).toBe(0);

      // Shared collaborator group.
      expect(screen.getByText('group1')).toBeInTheDocument();
      expect(screen.getByText('Creator User')).toBeInTheDocument();
      expect(screen.getByText('Private')).toBeInTheDocument();
      expect(screen.getByText('01/01/2024')).toBeInTheDocument();
      expect(screen.queryAllByText('Edit group').length).toBe(0);
      expect(screen.queryAllByText('Delete group').length).toBe(0);

      // Is public group.
      expect(screen.getByText('group2')).toBeInTheDocument();
      expect(screen.getByText('Creator User2')).toBeInTheDocument();
      expect(screen.getByText('Public')).toBeInTheDocument();
      expect(screen.getByText('01/02/2024')).toBeInTheDocument();
      expect(screen.queryAllByText('Edit group').length).toBe(0);
      expect(screen.queryAllByText('Delete group').length).toBe(0);

      // One view for each row.
      expect(screen.queryAllByText('View group').length).toBe(2);
    });
  });
});
