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
const granteesUrl = join('/', 'api', 'admin', 'grantees');
const usersUrl = join('/', 'api', 'admin', 'users');

describe('Admin landing page', () => {
  const history = createMemoryHistory();

  afterEach(() => fetchMock.restore());

  beforeEach(() => {
    fetchMock.get(grantsUrl, []);
    fetchMock.get(granteesUrl, []);
    fetchMock.get(usersUrl, []);
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
});
