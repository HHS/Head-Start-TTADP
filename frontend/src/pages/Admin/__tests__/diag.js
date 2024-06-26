import '@testing-library/jest-dom';
import React from 'react';
import {
  render, screen, act, waitFor,
} from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import fetchMock from 'fetch-mock';
import Diag from '../diag';

const SUCCESSFUL_RESPONSE = {
  id: 1,
  responseCode: 500,
  method: 'GET',
  operation: 'Test Operation 1',
  responseBody: {
    name: { e: 'Error 1' },
    parent: { p: 'Error 1 Parent' },
    original: { o: 'Error 1 Original' },
    sql: { s: 'Error 1 SQL' },
    parameters: { p: 'Error 1 Parameters' },
    errorStack: { e: 'Error 1 Stack' },
  },
};

describe('diag', () => {
  const renderTest = (route = '/') => {
    render(<MemoryRouter initialEntries={[route]}><Diag /></MemoryRouter>);
  };

  afterEach(() => fetchMock.restore());

  it('renders a list of errors', async () => {
    fetchMock.get(
      '/api/admin/requestErrors?range=[1,9]&sort=[%22createdAt%22,%22desc%22]',
      [SUCCESSFUL_RESPONSE],
    );

    act(() => {
      renderTest();
    });

    await waitFor(() => expect(fetchMock.called('/api/admin/requestErrors?range=[1,9]&sort=[%22createdAt%22,%22desc%22]')).toBe(true));
    expect(screen.getByText('ID')).toBeInTheDocument();
    expect(screen.getByText('Operation')).toBeInTheDocument();
    expect(screen.getByText('URI')).toBeInTheDocument();
    expect(screen.getByText('Created at')).toBeInTheDocument();
  });

  it('renders a single error', async () => {
    fetchMock.get(
      '/api/admin/requestErrors/1',
      SUCCESSFUL_RESPONSE,
    );

    act(() => {
      renderTest('/1');
    });

    await waitFor(() => expect(fetchMock.called('/api/admin/requestErrors/1')).toBe(true));
  });
});
