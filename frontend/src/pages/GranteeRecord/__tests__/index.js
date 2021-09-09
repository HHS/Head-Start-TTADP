import '@testing-library/jest-dom';
import React from 'react';
import {
  render, screen, waitFor,
} from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import fetchMock from 'fetch-mock';
import GranteeRecord from '../index';

describe('grantee record page', () => {
  const user = {
    id: 2,
    permissions: [
      {
        regionId: 45,
        userId: 2,
        scopeId: 1,
      },
      {
        regionId: 45,
        userId: 2,
        scopeId: 2,
      },
      {
        regionId: 45,
        userId: 2,
        scopeId: 3,
      },
    ],
  };

  function renderGranteeRecord() {
    const match = {
      path: '',
      url: '',
      params: {
        granteeId: 1,
        regionId: 45,
      },
    };

    render(<GranteeRecord user={user} match={match} />);
  }

  beforeEach(() => {
    fetchMock.get('/api/user', user);
    fetchMock.get('/api/grantee/1?region=45', { name: 'Charles the Grantee' });
  });
  afterEach(() => {
    fetchMock.restore();
  });

  it('shows the subtitle and grantee name', async () => {
    act(() => renderGranteeRecord());
    expect(screen.getByText(/grantee tta record/i)).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText('Charles the Grantee - Region 45')).toBeInTheDocument();
    });
  });
});
