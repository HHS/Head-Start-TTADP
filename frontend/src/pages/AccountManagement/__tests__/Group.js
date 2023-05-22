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

const endpoint = join('/', 'api', 'groups');

describe('Group', () => {
  afterEach(() => {
    fetchMock.restore();
  });

  const renderGroup = (groupId) => {
    render(
      <MemoryRouter>
        <Group match={{ params: { groupId }, path: '', url: '' }} />
      </MemoryRouter>,
    );
  };

  it('renders existing group', async () => {
    fetchMock.get(join(endpoint, '1'), {
      name: 'Test Group',
      grants: [
        {
          id: 1,
          name: 'Test Grant',
        },
        {
          id: 2,
          name: 'Test Grant 2',
        },
      ],
    });

    act(() => {
      renderGroup(1);
    });

    const groupName = await screen.findByText('Test Group');

    expect(groupName).toBeInTheDocument();

    const grant1 = await screen.findByText('Test Grant');
    const grant2 = await screen.findByText('Test Grant 2');

    expect(grant1).toBeInTheDocument();
    expect(grant2).toBeInTheDocument();
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
