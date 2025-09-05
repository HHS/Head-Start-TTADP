import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import CollabReports from '../components/CollabReports';
import { getReports } from '../../../fetchers/collaborationReports';

jest.mock('../../../fetchers/collaborationReports');

describe('CollabReports', () => {
  const mockReports = [
    { id: 1, name: 'Report 1' },
    { id: 2, name: 'Report 2' },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('Renders loading state and then reports table', async () => {
    getReports.mockResolvedValue({ rows: mockReports });

    render(<CollabReports title="Test Title" />);

    expect(screen.getByText('Test Title')).toBeInTheDocument();

    await waitFor(() => {
      expect(getReports).toHaveBeenCalled();
      expect(screen.getByText('Test Title')).toBeInTheDocument();
    });
  });

  test('Renders empty message when no reports', async () => {
    getReports.mockResolvedValue({ rows: [] });

    render(<CollabReports emptyMsg="No reports found" />);

    await waitFor(() => {
      expect(getReports).toHaveBeenCalled();
      expect(screen.getByText('No reports found')).toBeInTheDocument();
    });
  });

  test('Renders error alert on fetch failure', async () => {
    getReports.mockRejectedValue(new Error('Network error'));

    render(<CollabReports />);

    await waitFor(() => {
      expect(getReports).toHaveBeenCalled();
      expect(screen.getByRole('alert')).toHaveTextContent('Unable to fetch reports');
    });
  });

  test('Passes showCreateMsgOnEmpty prop to table', async () => {
    getReports.mockResolvedValue({ rows: [] });

    render(<CollabReports showCreateMsgOnEmpty />);

    await waitFor(() => {
      expect(getReports).toHaveBeenCalled();
      // The empty message should still be present
      expect(screen.getByText('You have no Collaboration Reports')).toBeInTheDocument();
    });
  });
});
