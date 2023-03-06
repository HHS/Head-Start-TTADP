import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import fetchMock from 'fetch-mock';
import RoleManagement from '../RoleManagement';

describe('RoleManagement', () => {
  const response = [{ fullName: 'Grantee Specialist', name: 'GS', id: 1 }, { fullName: 'COR', name: 'COR', id: 2 }];
  beforeEach(async () => {
    fetchMock.get('/api/admin/roles', response);
    render(<RoleManagement />);
  });
  afterEach(() => fetchMock.restore());

  it('displays roles', async () => {
    const input = await screen.findByLabelText(/Name for 1/i);
    expect(input.value).toBe('Grantee Specialist');
  });
});
