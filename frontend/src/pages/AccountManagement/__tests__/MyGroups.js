import React from 'react';
import {
  act,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import selectEvent from 'react-select-event';
import fetchMock from 'fetch-mock';
import { MemoryRouter } from 'react-router';
import MyGroups, { GROUP_FIELD_NAMES } from '../MyGroups';
import MyGroupsProvider from '../../../components/MyGroupsProvider';
import AppLoadingContext from '../../../AppLoadingContext';

const error = 'This group name already exists, please use a different name';

describe('MyGroups', () => {
  const renderMyGroups = (groupId = null) => {
    render(
      <MemoryRouter>
        <AppLoadingContext.Provider value={{ isAppLoading: false, setIsAppLoading: jest.fn() }}>
          <MyGroupsProvider>
            <MyGroups match={{ params: { groupId }, path: '/my-groups/', url: '' }} />
          </MyGroupsProvider>
        </AppLoadingContext.Provider>
      </MemoryRouter>,
    );
  };

  afterEach(() => fetchMock.restore());
  beforeEach(async () => {
    fetchMock.get('/api/groups', [{ id: 1, name: 'group1', isPublic: false }]);
    fetchMock.get('/api/recipient/user', [{
      id: 1,
      name: 'recipient1',
      grants: [
        {
          id: 1,
          regionId: 1,
          recipient: {
            name: 'grant1',
          },
        },
      ],
    },
    {
      id: 2,
      name: 'recipient2',
      grants: [
        {
          id: 2,
          name: 'grant2',
          regionId: 2,
          recipient: {
            name: 'grant2',
          },
        },
      ],
    },
    ]);

    const groupUsersRegion1 = {
      coOwnerUsers: [{
        id: 1,
        name: 'co-owner1',
        regionId: 1,
      },
      {
        id: 2,
        name: 'co-owner2',
        regionId: 1,
      },
      ],
      individualUsers: [
        {
          id: 1,
          name: 'individual1',
          regionId: 1,
        },
        {
          id: 2,
          name: 'individual2',
          regionId: 1,
        },
      ],
    };

    const groupUsersRegion1and2 = {
      coOwnerUsers: [{
        id: 1,
        name: 'co-owner1',
        regionId: 1,
      },
      {
        id: 2,
        name: 'co-owner2',
        regionId: 2,
      },
      ],
      individualUsers: [
        {
          id: 1,
          name: 'individual1',
          regionId: 1,
        },
        {
          id: 2,
          name: 'individual2',
          regionId: 2,
        },
      ],
    };

    // Users for region 1.
    fetchMock.get('/api/recipient/user/groupUsers?regionIds=1', groupUsersRegion1);
    // Users for region 1&2.
    fetchMock.get('/api/recipient/user/groupUsers?regionIds=1&regionIds=2', groupUsersRegion1and2);
  });

  it('renders without crashing', async () => {
    act(() => {
      renderMyGroups();
    });
    expect(screen.getByLabelText(/Group name/i)).toBeInTheDocument();
    expect(screen.getByText(/Add co-owner/i)).toBeInTheDocument();
    expect(screen.getByText(/Who do you want to share this group with?/i)).toBeInTheDocument();
  });

  it('renders an existing group', async () => {
    fetchMock.get('/api/groups/1', {
      id: 1,
      name: 'group1',
      grants: [
        {
          id: 1,
          recipient: {
            name: 'grant1',
          },
        },
      ],
      isPublic: false,
    });

    act(() => {
      renderMyGroups(1);
    });

    const input = screen.getByLabelText(/Group name/i);
    expect(input).toBeInTheDocument();
    await waitFor(() => {
      expect(input.value).toBe('group1');
      expect(screen.getByText(/grant1/i)).toBeInTheDocument();
    });
  });

  it('handles fetch errors', async () => {
    fetchMock.get('/api/group/1', 500);

    act(() => {
      renderMyGroups(1);
    });

    await waitFor(() => {
      expect(screen.getByText(/There was an error fetching your group/i)).toBeInTheDocument();
    });
  });

  it('you can create a new public group with shared individuals', async () => {
    act(() => {
      renderMyGroups();
    });
    const input = screen.getByLabelText(/Group name/i);
    await act(async () => {
      userEvent.type(input, 'group3');
      await selectEvent.select(screen.getByLabelText(/Recipients/i), ['grant1', 'grant2']);
    });

    // Check the 'Keep this group private.' is NOT checkbox.
    const isPrivate = screen.getByRole('checkbox', { name: /keep this group private\./i });
    expect(isPrivate).not.toBeNull();
    expect(isPrivate).not.toBeChecked();

    // Add co-owner1 and co-owner2.
    const coOwnerSelect = screen.getByLabelText(/Add co-owner/i);
    expect(coOwnerSelect).not.toBeNull();

    await act(async () => {
      // Select 'co-owner1' and 'co-owner2'.
      await waitFor(() => {
        selectEvent.select(coOwnerSelect, ['co-owner1', 'co-owner2']);
      });
    });

    // Expect co-owner1 and co-owner2 to be selected.
    expect(screen.getByText(/co-owner1/i)).toBeInTheDocument();
    expect(screen.getByText(/co-owner2/i)).toBeInTheDocument();

    // Check the radio button 'Individuals in my region'.
    const radio = screen.getByLabelText(/Individuals in my region/i);
    await act(async () => {
      userEvent.click(radio);
    });

    // Add individual1 and individual2.
    await act(async () => {
      await waitFor(() => {
        // Select 'individual1' and 'individual2'.
        selectEvent.select(screen.getByLabelText(/Invite individuals/i), ['individual1', 'individual2']);
      });
    });

    // Expect individual1 and individual2 to be selected.
    expect(screen.getByText(/individual1/i)).toBeInTheDocument();
    expect(screen.getByText(/individual2/i)).toBeInTheDocument();

    // Prepare save mock.
    fetchMock.post('/api/groups', {
      id: 3,
      name: 'group3',
      grants: [
        {
          id: 1,
          name: 'grant1',
          regionId: 1,
        },
        {
          id: 2,
          name: 'grant2',
          regionId: 1,
        },
      ],
      coOwners: [
        {
          id: 1,
          name: 'co-owner1',
          regionId: 1,
        },
        {
          id: 2,
          name: 'co-owner2',
          regionId: 1,
        },
      ],
      individuals: [
        {
          id: 1,
          name: 'individual1',
          regionId: 1,
        },
        {
          id: 2,
          name: 'individual2',
          regionId: 1,
        },
      ],
      shareWithEveryone: false,
    });
    const save = screen.getByText(/Save group/i);
    act(() => {
      userEvent.click(save);
    });

    expect(fetchMock.called()).toBe(true);
  });

  it('you can create a new private group', async () => {
    act(() => {
      renderMyGroups();
    });
    const input = screen.getByLabelText(/Group name/i);
    await act(async () => {
      userEvent.type(input, 'group3');
      await selectEvent.select(screen.getByLabelText(/Recipients/i), ['grant1', 'grant2']);
    });

    // Check the 'Keep this group private.' checkbox.
    const isPrivate = screen.getByRole('checkbox', { name: /keep this group private\./i });
    expect(isPrivate).not.toBeNull();
    expect(isPrivate).not.toBeChecked();

    // verify the state of the check box is checked.
    await act(async () => {
      // Check the is private checkbox.
      userEvent.click(isPrivate);
    });

    // Is private should be checked.
    expect(isPrivate).toBeChecked();

    // Expect the co-owner select to not be visible.
    expect(screen.queryByText(/Add co-owner/i)).not.toBeInTheDocument();

    // Expect the 'Who do you want to share this group with?' radio buttons to not be visible.
    expect(screen.queryByText(/Who do you want to share this group with?/i)).not.toBeInTheDocument();

    // Expect the individuals select to not be visible.
    expect(screen.queryByText(/Invite individuals/i)).not.toBeInTheDocument();

    fetchMock.post('/api/groups', {
      id: 3,
      name: 'group3',
      grants: [
        {
          id: 1,
          name: 'grant1',
          regionId: 1,
        },
        {
          id: 2,
          name: 'grant2',
          regionId: 1,
        },
      ],

    });
    const save = screen.getByText(/Save group/i);
    act(() => {
      userEvent.click(save);
    });

    expect(fetchMock.called()).toBe(true);
  });

  it('creating a new public group with everyone in my region hides individual options', async () => {
    act(() => {
      renderMyGroups();
    });
    const input = screen.getByLabelText(/Group name/i);
    await act(async () => {
      userEvent.type(input, 'group3');
      await selectEvent.select(screen.getByLabelText(/Recipients/i), ['grant1', 'grant2']);
    });

    // Check the 'Keep this group private.' is NOT checkbox.
    const isPrivate = screen.getByRole('checkbox', { name: /keep this group private\./i });
    expect(isPrivate).not.toBeNull();
    expect(isPrivate).not.toBeChecked();

    // Check the radio button 'Everyone in my region'.
    const radio = screen.getByLabelText(/Everyone with access to my region/i);
    await act(async () => {
      userEvent.click(radio);
    });

    // Assert the individual select is not visible.
    expect(screen.queryByText(/Invite individuals/i)).not.toBeInTheDocument();

    // Prepare save mock.
    fetchMock.post('/api/groups', {
      id: 3,
      name: 'group3',
      grants: [
        {
          id: 1,
          name: 'grant1',
          regionId: 1,
        },
        {
          id: 2,
          name: 'grant2',
          regionId: 1,
        },
      ],
      coOwners: [],
      individuals: [],
      shareWithEveryone: true,
    });

    const save = screen.getByText(/Save group/i);
    act(() => {
      userEvent.click(save);
    });

    expect(fetchMock.called()).toBe(true);
  });

  it('you cant create a new group that reuses an existing name', async () => {
    act(() => {
      renderMyGroups();
    });
    const input = screen.getByLabelText(/Group name/i);
    await act(async () => {
      userEvent.type(input, 'group3');
      await selectEvent.select(screen.getByLabelText(/Recipients/i), ['grant1', 'grant2']);
    });

    fetchMock.post('/api/groups', {
      error: GROUP_FIELD_NAMES.NAME,
      message: error,
    });

    const save = screen.getByText(/Save group/i);
    act(() => {
      userEvent.click(save);
    });

    expect(fetchMock.called()).toBe(true);
  });

  it('handles errors with the form submit', async () => {
    act(() => {
      renderMyGroups();
    });
    const input = screen.getByLabelText(/Group name/i);
    const coOwner = screen.queryAllByLabelText(/Add co-owner/i);
    await act(async () => {
      userEvent.type(input, 'sample group name');
      await selectEvent.select(screen.getByLabelText(/Recipients/i), ['grant1', 'grant2']);
      await selectEvent.select(coOwner[0], ['co-owner1']);
    });

    fetchMock.post('/api/groups', 500);
    const save = screen.getByText(/Save group/i);
    act(() => {
      userEvent.click(save);
    });

    const e = await screen.findByText(/There was an error saving your group/i);
    expect(e).toBeInTheDocument();
  });

  it('you can edit an existing group', async () => {
    fetchMock.get('/api/groups/1', {
      id: 1,
      name: 'group1',
      grants: [
        {
          id: 1,
          name: 'grant1',
          regionId: 1,
          recipient: {
            id: 1,
            name: 'grant1',
          },
        },
        {
          id: 2,
          name: 'grant2',
          regionId: 2,
          recipient: {
            id: 2,
            name: 'grant2',
          },
        },
      ],
      isPublic: false,
      coOwners: [],
      individuals: [],
      shareWithEveryone: null,
    });
    await act(async () => {
      renderMyGroups(1);
    });

    // Get group name input.
    const input = screen.getByLabelText(/Group name/i);

    // Change name.
    await act(async () => {
      userEvent.clear(input);
      userEvent.type(input, 'group DING DONG');
    });

    // Uncheck Is Private.
    const isPrivate = await screen.findByRole('checkbox', { name: /keep this group private\./i });
    expect(isPrivate).not.toBeNull();
    expect(isPrivate).toBeChecked();

    // verify the state of the check box is checked.
    await act(async () => {
      // Uncheck the is private checkbox.
      userEvent.click(isPrivate);
    });
    // Is private should no longer be checked.
    expect(isPrivate).not.toBeChecked();

    // Add co-owner2.
    const coOwnerSelect = screen.getByLabelText(/Add co-owner/i);
    expect(coOwnerSelect).not.toBeNull();

    await act(async () => {
      // Select 'co-owner2'.
      await waitFor(() => {
        selectEvent.select(coOwnerSelect, ['co-owner1', 'co-owner2']);
      });
    });

    // Check the radio button 'Individuals in my region'.
    const radio = screen.getByLabelText(/Individuals in my region/i);
    await act(async () => {
      userEvent.click(radio);
    });

    // Add individual.
    await act(async () => {
      await waitFor(() => {
        // Select 'individual2'.
        selectEvent.select(screen.getByLabelText(/Invite individuals/i), ['individual1', 'individual2']);
      });
    });

    // Users for region 1.
    fetchMock.get('/api/recipient/user/groupUsers?regionIds=2', {
      coOwnerUsers: [{
        id: 2,
        name: 'co-owner2',
        regionId: 2,
      },
      ],
      individualUsers: [
        {
          id: 2,
          name: 'individual2',
          regionId: 2,
        },
      ],
    });

    // Clear all recipients and select a new one.
    await act(async () => {
      await waitFor(() => {
        // Remove 'grant1'.
        userEvent.click(screen.getByRole('button', { name: /remove grant1/i }));
      });
    });

    // Assert that co-owner2 is the only option selected.
    expect(screen.getByText(/co-owner2/i)).toBeInTheDocument();
    expect(screen.queryByText(/co-owner1/i)).not.toBeInTheDocument();

    // Assert that individual2 is the only option selected.
    expect(screen.getByText(/individual2/i)).toBeInTheDocument();
    expect(screen.queryByText(/individual1/i)).not.toBeInTheDocument();

    // Prepare save mock.
    fetchMock.put('/api/groups/1', {
      id: 1,
      name: 'group DING DONG',
      grants: [
        {
          id: 1,
          name: 'grant1',
          regionId: 1,
        },
      ],
      coOwners: [
        {
          id: 1,
          name: 'co-owner2',
          regionId: 2,
        },
      ],
      individuals: [
        {
          id: 1,
          name: 'individual2',
          regionId: 2,
        }],
      shareWithEveryone: null,
      isPublic: false,
    });
    const save = screen.getByText(/Save group/i);
    act(() => {
      userEvent.click(save);
    });

    expect(fetchMock.called('/api/groups/1')).toBe(true);
  });

  it('handles an error fetching recipients', async () => {
    fetchMock.restore();

    fetchMock.get('/api/groups', [{ id: 1, name: 'group1', isPublic: false }]);
    fetchMock.get('/api/recipient/user', 500);

    act(() => {
      renderMyGroups(1);
    });

    const recipientError = await screen.findByText('There was an error fetching your recipients');

    expect(recipientError).toBeInTheDocument();
  });

  it('handles an error fetching users', async () => {
    fetchMock.get('/api/recipient/user/groupUsers?regionIds=1', 500, { overwriteRoutes: true });
    act(() => {
      renderMyGroups();
    });

    await act(async () => {
      await selectEvent.select(screen.getByLabelText(/Recipients/i), ['grant1', 'grant2']);
    });

    const userError = await screen.findByText('There was an error fetching co-owners and individuals');
    expect(userError).toBeInTheDocument();
  });
});
