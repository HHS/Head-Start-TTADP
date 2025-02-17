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
import { Router } from 'react-router';
import { createMemoryHistory } from 'history';
import { GROUP_SHARED_WITH } from '@ttahub/common/src/constants';
import MyGroups, { GROUP_FIELD_NAMES } from '../MyGroups';
import MyGroupsProvider from '../../../components/MyGroupsProvider';
import AppLoadingContext from '../../../AppLoadingContext';
import UserContext from '../../../UserContext';

const error = 'This group name already exists, please use a different name';

const user = {
  id: 23,
};

describe('MyGroups', () => {
  const history = createMemoryHistory();

  const renderMyGroups = (groupId = null) => {
    render(
      <Router history={history}>
        <UserContext.Provider value={{ user }}>
          <AppLoadingContext.Provider value={{ isAppLoading: false, setIsAppLoading: jest.fn() }}>
            <MyGroupsProvider>
              <MyGroups match={{ params: { groupId }, path: '/my-groups/', url: '' }} />
            </MyGroupsProvider>
          </AppLoadingContext.Provider>
        </UserContext.Provider>
      </Router>,
    );
  };

  afterEach(() => fetchMock.restore());
  beforeEach(async () => {
    const mockGrants = [
      {
        grantId: 1,
        grantNumber: '111111',
        recipientId: 1,
        name: 'grant1',
        regionId: 1,
        programTypes: [
          'EHS',
          'HS',
        ],
      },
      {
        grantId: 2,
        grantNumber: '222222',
        recipientId: 2,
        name: 'grant2',
        regionId: 1,
        programTypes: [
          'EHS',
        ],
      },
      {
        grantId: 3,
        grantNumber: '333333',
        recipientId: 3,
        name: 'grant3',
        regionId: 2,
        programTypes: [
          'HS',
        ],
      },
    ];

    const mockUsers = [
      {
        id: 1,
        userId: 1,
        name: 'co-owner1',
        regionId: 1,
      },
      {
        id: 2,
        userId: 2,
        name: 'co-owner2',
        regionId: 1,
      },
      {
        id: 3,
        userId: 3,
        name: 'co-owner3',
        regionId: 1,
      },
      {
        id: 4,
        userId: 4,
        name: 'co-owner4',
        regionId: 1,
      },
      {
        id: 3,
        userId: 3,
        name: 'individual1',
        regionId: 1,
      },
      {
        id: 4,
        userId: 4,
        name: 'individual2',
        regionId: 1,
      },
    ];

    // Mock the group.
    fetchMock.get('/api/groups', [{ id: 1, name: 'group1', isPublic: false }]);

    // Mock the grants.
    fetchMock.get('/api/groups/new/grants', mockGrants);
    fetchMock.get('/api/groups/1/grants', mockGrants);

    // Mock the users.
    fetchMock.get('/api/groups/new/eligibleUsers', mockUsers);
    fetchMock.get('/api/groups/1/eligibleUsers', mockUsers);
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
      isPublic: true,
      groupCollaborators: [],
      sharedWith: GROUP_SHARED_WITH.INDIVIDUALS,
      grants: [
        {
          recipientInfo: 'Grant 1 - 11111111 - HS',
          regionId: 1,
          recipientId: 1,
          number: '11111111',
          id: 1,
          granteeName: 'Grant Name 1',
          recipient: {
            name: 'Recipient Name 1',
            id: 1,
          },
          GroupGrant: {
            id: 1,
            grantId: 1,
            groupId: 1,
          },
        },
      ],
      coOwners: [
        {
          id: 1,
          name: 'co-owner1',
        },
        {
          id: 2,
          name: 'co-owner2',
        },
      ],
      individuals: [
        {
          id: 3,
          name: 'individual1',
        },
        {
          id: 4,
          name: 'individual2',
        },
      ],
      creator: {
        id: 23,
        name: 'Creator User',
      },
    });

    act(() => {
      renderMyGroups(1);
    });

    const input = screen.getByLabelText(/Group name/i);
    expect(input).toBeInTheDocument();
    await act(async () => {
      await waitFor(() => {
        expect(input.value).toBe('group1');
        expect(screen.getByText(/grant 1 - 11111111 - hs/i)).toBeInTheDocument();

        expect(screen.getByText(/co-owner1/i)).toBeInTheDocument();
        expect(screen.getByText(/co-owner2/i)).toBeInTheDocument();
        expect(screen.getByText(/individual1/i)).toBeInTheDocument();
        expect(screen.getByText(/individual2/i)).toBeInTheDocument();

        // Expect check box 'Keep this group private.' to not be checked.
        const isPrivate = screen.getByRole('checkbox', { name: /keep this group private\./i });
        expect(isPrivate).not.toBeNull();
        expect(isPrivate).not.toBeChecked();

        // Assert radio button 'Individuals in my region' is checked.
        const radio = screen.getByLabelText(/Individuals in my region/i);
        expect(radio).toBeChecked();
      });
    });
  });

  it('handles fetch errors', async () => {
    const spy = jest.spyOn(history, 'push');
    fetchMock.get('/api/group/1', 500);
    await act(async () => {
      renderMyGroups(1);
      await waitFor(() => {
        expect(spy).toHaveBeenCalledWith('/something-went-wrong/500');
      });
    });
  });

  it('you can create a new public group with shared individuals', async () => {
    act(() => {
      renderMyGroups();
    });
    const input = screen.getByLabelText(/Group name/i);
    await act(async () => {
      userEvent.type(input, 'group3');
      await selectEvent.select(screen.getByLabelText(/Recipients/i), ['grant1 - 111111 - EHS, HS', 'grant2 - 222222 - EHS']);
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
    expect(screen.queryAllByText(/individual1/i).length).toBe(2);
    expect(screen.queryAllByText(/individual2/i).length).toBe(2);

    // Prepare save mock.
    fetchMock.post('/api/groups', {});
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
      await selectEvent.select(screen.getByLabelText(/Recipients/i), ['grant1 - 111111 - EHS, HS', 'grant2 - 222222 - EHS']);
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
      await selectEvent.select(screen.getByLabelText(/Recipients/i), ['grant1 - 111111 - EHS, HS', 'grant2 - 222222 - EHS']);
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
      await selectEvent.select(screen.getByLabelText(/Recipients/i), ['grant1 - 111111 - EHS, HS', 'grant2 - 222222 - EHS']);
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

    // Populate group name with the value "Test Group".
    const input = screen.getByLabelText(/Group name/i);
    userEvent.type(input, 'Test Group');

    // Select recipient where value is 'grant1 - 111111 - EHS, HS'.
    await selectEvent.select(screen.getByLabelText(/Recipients/i), ['grant1 - 111111 - EHS, HS']);

    // Select the co-owner "co-owner1".
    await selectEvent.select(screen.getByLabelText(/Add co-owner/i), ['co-owner1']);

    // Check the radio button 'Everyone with access to my region'.
    const radio = screen.getByLabelText(/Everyone with access to my region/i);
    await act(async () => {
      userEvent.click(radio);
    });

    // Click the "Save group" button.
    fetchMock.post('/api/groups', 500);
    const save = screen.getByText(/Save group/i);
    act(() => {
      userEvent.click(save);
    });

    // Expect an error message to be displayed.
    const e = await screen.findByText(/There was an error saving your group/i);
    expect(e).toBeInTheDocument();
  });

  it('you can edit an existing group', async () => {
    fetchMock.get('/api/groups/1', {
      id: 1,
      name: 'group1',
      isPublic: false,
      sharedWith: null,
      grants: [
        {
          recipientInfo: 'Grant 1 - 11111111 - HS',
          regionId: 1,
          recipientId: 1,
          number: '11111111',
          id: 1,
          granteeName: 'Grant Name 1',
          recipient: {
            name: 'Recipient Name 1',
            id: 1,
          },
          GroupGrant: {
            id: 1,
            grantId: 1,
            groupId: 1,
          },
        },
        {
          recipientInfo: 'Grant 2 - 22222222 - HS',
          regionId: 2,
          recipientId: 2,
          number: '22222222',
          id: 14921,
          granteeName: 'Grant Name 2',
          recipient: {
            name: 'Recipient Name 2',
            id: 2,
          },
          GroupGrant: {
            id: 2,
            grantId: 2,
            groupId: 2,
          },
        },
      ],
      groupCollaborators: [],
      individuals: [],
      coOwners: [],
      creator: {
        id: 23,
        name: 'Creator User',
      },
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

    let coOwnerSelect;
    // verify the state of the check box is checked.
    await act(async () => {
      // Uncheck the is private checkbox.
      userEvent.click(isPrivate);
      await waitFor(() => {
        // Is private should no longer be checked.
        expect(isPrivate).not.toBeChecked();
        // Add co-owner2.
        coOwnerSelect = screen.getByLabelText(/Add co-owner/i);
        expect(coOwnerSelect).not.toBeNull();
      });
    });

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

    const save = screen.getByText(/Save group/i);
    act(() => {
      userEvent.click(save);
    });

    expect(fetchMock.called('/api/groups/1')).toBe(true);
  });

  it('handles an error fetching recipients', async () => {
    fetchMock.restore();

    fetchMock.get('/api/groups', [{ id: 1, name: 'group1', isPublic: false }]);
    fetchMock.get('/api/groups/1/grants', 500);

    act(() => {
      renderMyGroups(1);
    });

    const recipientError = await screen.findByText('There was an error fetching your recipients');

    expect(recipientError).toBeInTheDocument();
  });

  it('handles an error fetching users', async () => {
    fetchMock.get('/api/groups/new/eligibleUsers', 500, { overwriteRoutes: true });
    act(() => {
      renderMyGroups();
    });

    const userError = await screen.findByText('There was an error fetching co-owners and individuals');
    expect(userError).toBeInTheDocument();
  });

  it('you cannot select more than three co-owners', async () => {
    act(() => {
      renderMyGroups();
    });
    const input = screen.getByLabelText(/Group name/i);
    await act(async () => {
      userEvent.type(input, 'group3');
      await selectEvent.select(screen.getByLabelText(/Recipients/i), ['grant1 - 111111 - EHS, HS', 'grant2 - 222222 - EHS']);
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
        selectEvent.select(coOwnerSelect, ['co-owner1', 'co-owner2', 'co-owner3', 'co-owner4']);
      });
    });

    // Expect co-owner1 and co-owner2 to be selected.
    expect(screen.getByText(/co-owner1/i)).toBeInTheDocument();
    expect(screen.getByText(/co-owner2/i)).toBeInTheDocument();
    expect(screen.getByText(/co-owner3/i)).toBeInTheDocument();
    expect(screen.getByText(/co-owner4/i)).toBeInTheDocument();

    // Check the radio button 'Everyone with access to my region'.
    const radio = screen.getByLabelText(/Everyone with access to my region/i);
    await act(async () => {
      userEvent.click(radio);
    });

    // Attempt to save.
    fetchMock.post('/api/groups', {});
    const save = screen.getByText(/Save group/i);
    act(() => {
      userEvent.click(save);
    });

    // Expect an error message to be displayed.
    const coOwnerMessge = await screen.findByText(/you can only choose up to three co-owners./i);
    expect(coOwnerMessge).toBeInTheDocument();

    // Remove co-owner4.
    const removeCoOwner = await screen.findByRole('button', { name: /remove co-owner4/i });
    expect(removeCoOwner).not.toBeNull();

    await act(async () => {
      userEvent.click(removeCoOwner);
      await waitFor(() => {
        expect(screen.queryByText(/you can only choose up to three co-owners./i)).not.toBeInTheDocument();
      });
    });
  });

  it('coOwners cant change the is public check box', async () => {
    fetchMock.get('/api/groups/1', {
      id: 1,
      name: 'group1',
      isPublic: true,
      groupCollaborators: [],
      sharedWith: GROUP_SHARED_WITH.INDIVIDUALS,
      grants: [
        {
          recipientInfo: 'Grant 1 - 11111111 - HS',
          regionId: 1,
          recipientId: 1,
          number: '11111111',
          id: 1,
          granteeName: 'Grant Name 1',
          recipient: {
            name: 'Recipient Name 1',
            id: 1,
          },
          GroupGrant: {
            id: 1,
            grantId: 1,
            groupId: 1,
          },
        },
      ],
      coOwners: [
        {
          id: 23, // Active co-owner.
          name: 'co-owner1',
        },
      ],
      individuals: [
        {
          id: 3,
          name: 'individual1',
        },
      ],
      creator: {
        id: 1,
        name: 'Creator User',
      },
    });

    act(() => {
      renderMyGroups(1);
    });

    const input = screen.getByLabelText(/Group name/i);
    expect(input).toBeInTheDocument();
    await act(async () => {
      await waitFor(() => {
        expect(input.value).toBe('group1');
        expect(screen.getByText(/grant 1 - 11111111 - hs/i)).toBeInTheDocument();

        expect(screen.getByText(/co-owner1/i)).toBeInTheDocument();
        expect(screen.getByText(/individual1/i)).toBeInTheDocument();

        // Expect check box 'Keep this group private.' to not be checked.
        expect(screen.queryAllByRole('checkbox', { name: /keep this group private\./i }).length).toBe(0);

        // Assert radio button 'Individuals in my region' is checked.
        const radio = screen.getByLabelText(/Individuals in my region/i);
        expect(radio).toBeChecked();
      });
    });
  });
});
