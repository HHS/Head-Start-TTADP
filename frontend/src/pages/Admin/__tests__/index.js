import '@testing-library/jest-dom';
import React from 'react';
import { Router } from 'react-router';
import {
  render, screen,
} from '@testing-library/react';
import fetchMock from 'fetch-mock';
import join from 'url-join';
import { createMemoryHistory } from 'history';

import Admin from '../index';

const grantsUrl = join('/', 'api', 'admin', 'grants', 'cdi?unassigned=false&active=true');
const recipientsUrl = join('/', 'api', 'admin', 'recipients');
const usersUrl = join('/', 'api', 'admin', 'users');
const featuresUrl = join('/api', 'admin', 'users', 'features');

describe('Admin landing page', () => {
  const history = createMemoryHistory();

  afterEach(() => fetchMock.restore());

  beforeEach(() => {
    fetchMock.get(grantsUrl, []);
    fetchMock.get(recipientsUrl, []);
    fetchMock.get(usersUrl, []);
    fetchMock.get(featuresUrl, []);
  });

  it('displays the cdi page', async () => {
    history.push('/admin/cdi');
    render(
      <Router history={history}>
        <Admin />
      </Router>,
    );
    const grantView = await screen.findByText('Please select a grant');
    expect(grantView).toBeVisible();
  });

  it('displays the user page', async () => {
    history.push('/admin/users');
    render(
      <Router history={history}>
        <Admin />
      </Router>,
    );
    const grantView = await screen.findByText('Select a user...');
    expect(grantView).toBeVisible();
  });

  it('displays the flags page', async () => {
    history.push('/admin/flags');
    render(
      <Router history={history}>
        <Admin />
      </Router>,
    );
    const flagsHeading = await screen.findByText('Active feature flags');
    expect(flagsHeading).toBeVisible();
  });

  it('displays the diag page', async () => {
    fetchMock.get('/api/admin/requestErrors?filter=%7B%7D&range=%5B0%2C9%5D&sort=%5B%22id%22%2C%22ASC%22%5D', []);
    history.push('/admin/diag');
    render(
      <Router history={history}>
        <Admin />
      </Router>,
    );

    const requestErrors = await screen.findByRole('heading', { name: /requesterrors/i });
    expect(requestErrors).toBeVisible();
  });
});
