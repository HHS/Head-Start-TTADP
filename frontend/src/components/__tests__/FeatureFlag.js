import '@testing-library/jest-dom';
import React from 'react';
import {
  render, screen,
} from '@testing-library/react';
import { Router } from 'react-router';
import { createMemoryHistory } from 'history';
import FeatureFlag from '../FeatureFlag';

const history = createMemoryHistory();

describe('feature flag', () => {
  it('shows content if the user has the flag', () => {
    const flag = 'tell_your_children';
    const user = {
      flags: ['tell_your_children'],
    };
    render(
      <Router history={history}>
        <div>
          <FeatureFlag admin={false} flag={flag} user={user}>
            <h1>This is a test</h1>
          </FeatureFlag>
        </div>
      </Router>,
    );

    expect(screen.getByText('This is a test')).toBeVisible();
  });

  it('hides content if the user has no flag', () => {
    const flag = 'tell_your_children';
    const user = {
      flags: [],
    };
    render(
      <Router history={history}>
        <div>
          <FeatureFlag admin={false} flag={flag} user={user}>
            <h1>This is a test</h1>
          </FeatureFlag>
        </div>
      </Router>,
    );

    expect(document.querySelectorAll('h1').length).toBe(0);
  });

  it('shows content if the user is an admin', () => {
    const flag = 'tell_your_children';
    const user = {
      flags: [],
    };
    render(
      <Router history={history}>
        <div>
          <FeatureFlag admin flag={flag} user={user}>
            <h1>This is a test</h1>
          </FeatureFlag>
        </div>
      </Router>,
    );

    expect(screen.getByText('This is a test')).toBeVisible();
  });

  it('renders not found where appropriate', () => {
    const flag = 'tell_your_children';
    const user = {
      flags: [],
    };
    render(
      <Router history={history}>
        <div>
          <FeatureFlag admin={false} flag={flag} renderNotFound user={user}>
            <h1>This is a test</h1>
          </FeatureFlag>
        </div>
      </Router>,
    );
    expect(screen.getByRole('link', { name: /home page/i })).toBeVisible();
  });
});
