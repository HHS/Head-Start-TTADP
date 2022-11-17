import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
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

  it('allows you to edit roles', async () => {
    const input = await screen.findByLabelText(/Name for 1/i);
    userEvent.clear(input);
    userEvent.type(input, 'BANANANANANANA');
    fetchMock.restore();
    expect(fetchMock.called()).not.toBeTruthy();

    const putResponse = [{ fullName: 'BANANANANANANA', name: 'GS', id: 1 }, { fullName: 'COR', name: 'COR', id: 2 }];
    fetchMock.put('/api/admin/roles', putResponse);
    userEvent.click(await screen.findByText(/save changes/i));
    expect(fetchMock.called()).toBeTruthy();
    const { body } = fetchMock.calls()[0][1];
    expect(body).toEqual(JSON.stringify({ roles: putResponse }));
  });
});
