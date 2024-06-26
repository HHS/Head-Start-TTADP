import '@testing-library/jest-dom';
import React from 'react';
import {
  render, screen, act, waitFor,
} from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import fetchMock from 'fetch-mock';
import userEvent from '@testing-library/user-event';
import RequestErrors from '../RequestErrors';

const SUCCESSFUL_RESPONSE = [
  {
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
  },
];

describe('RequestErrors', () => {
  const renderTest = () => {
    render(<MemoryRouter><RequestErrors /></MemoryRouter>);
  };

  afterEach(() => fetchMock.restore());

  it('renders a list of errors', async () => {
    fetchMock.get(
      '/api/admin/requestErrors?range=[1,9]&sort=[%22createdAt%22,%22desc%22]',
      SUCCESSFUL_RESPONSE,
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

  it('you can change the number of items per page', async () => {
    fetchMock.get(
      '/api/admin/requestErrors?range=[1,9]&sort=[%22createdAt%22,%22desc%22]',
      SUCCESSFUL_RESPONSE,
    );

    fetchMock.get(
      '/api/admin/requestErrors?range=[1,49]&sort=[%22createdAt%22,%22desc%22]',
      SUCCESSFUL_RESPONSE,
    );

    act(() => {
      renderTest();
    });

    await waitFor(() => expect(fetchMock.called('/api/admin/requestErrors?range=[1,9]&sort=[%22createdAt%22,%22desc%22]')).toBe(true));

    const select = screen.getByRole('combobox');
    userEvent.selectOptions(select, '50');

    await waitFor(() => expect(fetchMock.called('/api/admin/requestErrors?range=[1,49]&sort=[%22createdAt%22,%22desc%22]')).toBe(true));
  });

  it('you can change the sort direction', async () => {
    fetchMock.get(
      '/api/admin/requestErrors?range=[1,9]&sort=[%22createdAt%22,%22desc%22]',
      SUCCESSFUL_RESPONSE,
    );

    fetchMock.get(
      '/api/admin/requestErrors?range=[1,9]&sort=[%22createdAt%22,%22asc%22]',
      SUCCESSFUL_RESPONSE,
    );

    act(() => {
      renderTest();
    });

    await waitFor(() => expect(fetchMock.called('/api/admin/requestErrors?range=[1,9]&sort=[%22createdAt%22,%22desc%22]')).toBe(true));

    const button = screen.getByRole('button', { name: 'Created at' });
    userEvent.click(button);

    await waitFor(() => expect(fetchMock.called('/api/admin/requestErrors?range=[1,9]&sort=[%22createdAt%22,%22asc%22]')).toBe(true));
  });

  it('handles error when fetching errors', async () => {
    fetchMock.get(
      '/api/admin/requestErrors?range=[1,9]&sort=[%22createdAt%22,%22desc%22]',
      500,
    );

    act(() => {
      renderTest();
    });

    await waitFor(() => expect(fetchMock.called('/api/admin/requestErrors?range=[1,9]&sort=[%22createdAt%22,%22desc%22]')).toBe(true));
  });
});
