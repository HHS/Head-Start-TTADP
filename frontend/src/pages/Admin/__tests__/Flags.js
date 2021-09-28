import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import fetchMock from 'fetch-mock';
import join from 'url-join';
import { Router } from 'react-router';
import { createMemoryHistory } from 'history';
import Flags from '../Flags';

const featuresUrl = join('/', 'api', 'admin', 'users', 'features');

describe('Flags page', () => {
  afterEach(() => {
    fetchMock.restore();
    jest.clearAllMocks();
  });

  it('displays the flags page', async () => {
    fetchMock.get(featuresUrl, ['goose_neck']);
    const history = createMemoryHistory();
    render(<Router history={history}><Flags /></Router>);
    const gooseNeck = await screen.findByText(/goose_neck/i);
    expect(gooseNeck).toBeVisible();
    const link = await screen.findByRole('link', { name: /view users with the goose_neck feature flag/i });
    expect(link).toHaveAttribute('href', '/admin/users?flag=goose_neck');
  });

  it('displays an error', async () => {
    fetchMock.get(featuresUrl, 500);
    const history = createMemoryHistory();
    render(<Router history={history}><Flags /></Router>);
    const error = await screen.findByText(/Unable to fetch features/i);
    expect(error).toBeVisible();
  });
});
