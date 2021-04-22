import '@testing-library/jest-dom';
import React from 'react';
import { Router } from 'react-router';
import {
  render, screen,
} from '@testing-library/react';
import { createMemoryHistory } from 'history';

import Admin from '../index';

describe('Admin landing page', () => {
  const history = createMemoryHistory();

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
