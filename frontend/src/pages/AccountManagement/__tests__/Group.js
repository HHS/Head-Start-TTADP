import React from 'react';
import {
  act,
  render,
  screen,
} from '@testing-library/react';
import fetchMock from 'fetch-mock';
import join from 'url-join';
import { MemoryRouter } from 'react-router';
import Group from '../Group';
import AppLoadingContext from '../../../AppLoadingContext';

const endpoint = join('/', 'api', 'groups');

describe('Group', () => {
  afterEach(() => {
    fetchMock.restore();
  });

  const renderGroup = (groupId) => {
    render(
      <MemoryRouter>
        <AppLoadingContext.Provider value={{ isAppLoading: false, setIsAppLoading: jest.fn() }}>
          <Group match={{ params: { groupId }, path: '', url: '' }} />
        </AppLoadingContext.Provider>
      </MemoryRouter>,
    );
  };

  it('renders existing group', async () => {
    fetchMock.get(join(endpoint, '1'), {
      name: 'Test Group',
      creator: { id: 1, name: 'Test Creator' },
      coOwners: [{ id: 2, name: 'Test CoOwner' }, { id: 3, name: 'Test CoOwner2' }],
      individuals: [{ id: 4, name: 'Test SharedWith' }, { id: 5, name: 'Test SharedWith2' }],
      grants: [
        {
          id: 1,
          number: 'Test Grant',
          recipientNameWithPrograms: 'Test Recipient1 - Test Grant - HS',
          recipient: {
            name: 'Test Recipient1',
          },
        },
        {
          id: 2,
          number: 'Test Grant 2',
          recipientNameWithPrograms: 'Test Recipient2 - Test Grant 2 - HS',
          recipient: {
            name: 'Test Recipient2',
          },
        },
      ],
    });

    act(() => {
      renderGroup(1);
    });

    const groupName = await screen.findByText('Test Group');

    expect(groupName).toBeInTheDocument();

    const grant1 = await screen.findByText('Test Recipient1 - Test Grant - HS');
    const grant2 = await screen.findByText('Test Recipient2 - Test Grant 2 - HS');

    expect(grant1).toBeInTheDocument();
    expect(grant2).toBeInTheDocument();

    expect(await screen.findByText('Test Creator')).toBeInTheDocument();
    expect(await screen.findByText('Test CoOwner')).toBeInTheDocument();
    expect(await screen.findByText('Test CoOwner2')).toBeInTheDocument();
    expect(await screen.findByText('Test SharedWith')).toBeInTheDocument();
    expect(await screen.findByText('Test SharedWith2')).toBeInTheDocument();
  });

  it('handles null response', async () => {
    fetchMock.get(join(endpoint, '1'), null);

    act(() => {
      renderGroup(1);
    });

    const error = await screen.findByText('There was an error fetching your group');
    expect(error).toBeInTheDocument();
  });

  it('handles 404', async () => {
    fetchMock.get(join(endpoint, '1'), 404);

    act(() => {
      renderGroup(1);
    });

    const error = await screen.findByText('There was an error fetching your group');
    expect(error).toBeInTheDocument();
  });

  it('handles 500', async () => {
    fetchMock.get(join(endpoint, '1'), 500);

    act(() => {
      renderGroup(1);
    });

    const error = await screen.findByText('There was an error fetching your group');
    expect(error).toBeInTheDocument();
  });

  it('handles no group id', async () => {
    fetchMock.get(endpoint, null);

    act(() => {
      renderGroup(null);
    });

    expect(fetchMock.called(endpoint)).toBe(false);
  });
});
