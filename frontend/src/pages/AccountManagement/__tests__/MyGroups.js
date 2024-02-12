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
          recipient: {
            name: 'grant2',
          },
        },
      ],
    },
    ]);
  });

  it('renders without crashing', async () => {
    act(() => {
      renderMyGroups();
    });
    expect(screen.getByLabelText(/Group name/i)).toBeInTheDocument();
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

  it('you can create a new group', async () => {
    act(() => {
      renderMyGroups();
    });
    const input = screen.getByLabelText(/Group name/i);
    await act(async () => {
      userEvent.type(input, 'group3');
      await selectEvent.select(screen.getByLabelText(/Recipients/i), ['grant1', 'grant2']);
    });

    fetchMock.post('/api/groups', {
      id: 3,
      name: 'group3',
      grants: [
        {
          id: 1,
          name: 'grant1',
        },
        {
          id: 2,
          name: 'grant2',
        },
      ],

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
    await act(async () => {
      userEvent.type(input, 'group3');
      await selectEvent.select(screen.getByLabelText(/Recipients/i), ['grant1', 'grant2']);
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
        },
      ],
      isPublic: false,
    });

    act(() => {
      renderMyGroups(1);
    });

    const input = screen.getByLabelText(/Group name/i);
    act(() => {
      userEvent.clear(input);
      userEvent.type(input, 'group DING DONG');
    });

    const checkbox = screen.getByRole('checkbox');
    act(() => {
      userEvent.click(checkbox);
    });

    fetchMock.put('/api/groups/1', {
      id: 1,
      name: 'group DING DONG',
      grants: [
        {
          id: 1,
          name: 'grant1',
        },
      ],
      isPublic: true,
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
});
