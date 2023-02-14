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

describe('Groups', () => {
  const renderGroups = () => {
    render(<MemoryRouter><Groups /></MemoryRouter>);
  };

  afterEach(() => fetchMock.restore());

  it('renders without crashing', async () => {
    fetchMock.get('/api/groups', []);
    act(renderGroups);
    expect(screen.getByText(/you have no groups/i)).toBeInTheDocument();
  });

  it('renders groups', async () => {
    fetchMock.get('/api/groups', [
      {
        id: 1,
        name: 'group1',
      },
      {
        id: 2,
        name: 'group2',
      },
    ]);

    act(renderGroups);

    await waitFor(() => {
      expect(screen.getByText(/group1/i)).toBeInTheDocument();
      expect(screen.getByText(/group2/i)).toBeInTheDocument();
    });
  });

  it('handles fetch errors', async () => {
    fetchMock.get('/api/groups', 500);

    act(renderGroups);

    await waitFor(() => {
      expect(screen.getByText(/you have no groups/i)).toBeInTheDocument();
    });
  });

  it('you can delete a group', async () => {
    fetchMock.get('/api/groups', [
      {
        id: 1,
        name: 'group1',
      },
    ]);
    fetchMock.delete('/api/groups/1', {});

    act(renderGroups);

    await waitFor(() => {
      expect(screen.getByText(/group1/i)).toBeInTheDocument();
    });

    userEvent.click(screen.getByText(/delete/i));

    await waitFor(() => {
      expect(screen.getByText(/you have no groups/i)).toBeInTheDocument();
    });
  });

  it('handles delete errors', async () => {
    fetchMock.get('/api/groups', [
      {
        id: 1,
        name: 'group1',
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
