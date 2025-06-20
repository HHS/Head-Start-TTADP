import React from 'react';
import {
  act,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import fetchMock from 'fetch-mock';
import { createMemoryHistory } from 'history';
import join from 'url-join';
import { Router } from 'react-router';
import Group from '../Group';
import AppLoadingContext from '../../../AppLoadingContext';

const endpoint = join('/', 'api', 'groups');

describe('Group', () => {
  afterEach(() => {
    fetchMock.restore();
  });

  const history = createMemoryHistory();

  const renderGroup = (groupId) => {
    render(
      <Router history={history}>
        <AppLoadingContext.Provider value={{ isAppLoading: false, setIsAppLoading: jest.fn() }}>
          <Group match={{ params: { groupId }, path: '', url: '' }} />
        </AppLoadingContext.Provider>
      </Router>,
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
    const spy = jest.spyOn(history, 'push');
    fetchMock.get(join(endpoint, '1'), null);
    act(async () => {
      renderGroup(1);
    });

    await waitFor(() => {
      expect(spy).toHaveBeenCalledWith('/something-went-wrong/500');
    });
  });

  it('handles 404', async () => {
    const spy = jest.spyOn(history, 'push');
    fetchMock.get(join(endpoint, '1'), 404);
    act(async () => {
      renderGroup(1);
    });

    await waitFor(() => {
      expect(spy).toHaveBeenCalledWith('/something-went-wrong/404');
    });
  });

  it('handles 500', async () => {
    const spy = jest.spyOn(history, 'push');
    fetchMock.get(join(endpoint, '1'), 500);

    await act(async () => {
      renderGroup(1);
    });

    await waitFor(() => {
      expect(spy).toHaveBeenCalledWith('/something-went-wrong/500');
    });
  });

  it('handles no group id', async () => {
    fetchMock.get(endpoint, null);

    act(() => {
      renderGroup(null);
    });

    expect(fetchMock.called(endpoint)).toBe(false);
  });
});
