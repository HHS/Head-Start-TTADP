import '@testing-library/jest-dom';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import {
  render, screen,
} from '@testing-library/react';
import fetchMock from 'fetch-mock';
import join from 'url-join';

import Admin from '../index';

const grantsUrl = join('/', 'api', 'admin', 'grants', 'cdi?unassigned=false&active=true');
const recipientsUrl = join('/', 'api', 'admin', 'recipients');
const usersUrl = join('/', 'api', 'admin', 'users');
const featuresUrl = join('/api', 'admin', 'users', 'features');

describe('Admin landing page', () => {
  afterEach(() => fetchMock.restore());

  beforeEach(() => {
    fetchMock.get(grantsUrl, []);
    fetchMock.get(recipientsUrl, []);
    fetchMock.get(usersUrl, []);
    fetchMock.get(featuresUrl, []);
  });

  it('displays the cdi page', async () => {
    render(
      <MemoryRouter initialEntries={['/admin/cdi']}>
        <Admin />
      </MemoryRouter>,
    );
    const grantView = await screen.findByText('Please select a grant');
    expect(grantView).toBeVisible();
  });

  it('displays the user page', async () => {
    render(
      <MemoryRouter initialEntries={['/admin/users']}>
        <Admin />
      </MemoryRouter>,
    );
    const grantView = await screen.findByText('Select a user...');
    expect(grantView).toBeVisible();
  });

  it('displays the flags page', async () => {
    render(
      <MemoryRouter initialEntries={['/admin/flags']}>
        <Admin />
      </MemoryRouter>,
    );
    const flagsHeading = await screen.findByText('Active feature flags');
    expect(flagsHeading).toBeVisible();
  });

  it('displays the diag page', async () => {
    fetchMock.get('/api/admin/requestErrors?filter=%7B%7D&range=%5B0%2C9%5D&sort=%5B%22id%22%2C%22ASC%22%5D', []);
    render(
      <MemoryRouter initialEntries={['/admin/diag']}>
        <Admin />
      </MemoryRouter>,
    );

    const requestErrors = await screen.findByRole('heading', { name: /requesterrors/i });
    expect(requestErrors).toBeVisible();
  });
  it('displays the site alerts page', async () => {
    fetchMock.get('/api/admin/alerts', []);
    render(
      <MemoryRouter initialEntries={['/admin/site-alerts']}>
        <Admin />
      </MemoryRouter>,
    );

    const heading = await screen.findByRole('heading', { name: /site alerts/i });
    expect(heading).toBeVisible();
  });

  it('displays the national centers page', async () => {
    fetchMock.get('/api/national-center', { centers: [], users: [] });
    render(
      <MemoryRouter initialEntries={['/admin/national-centers']}>
        <Admin />
      </MemoryRouter>,
    );

    const heading = await screen.findByRole('heading', { name: /national centers/i });
    expect(heading).toBeVisible();
  });
});
