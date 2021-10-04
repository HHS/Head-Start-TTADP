import '@testing-library/jest-dom';
import React from 'react';
import {
  render, screen,
} from '@testing-library/react';
import FeatureFlag from '../FeatureFlag';

describe('feature flag', () => {
  it('shows content if the user has the flag', () => {
    const flag = 'tell_your_children';
    const user = {
      flags: ['tell_your_children'],
    };
    render(<div><FeatureFlag flag={flag} user={user}><h1>This is a test</h1></FeatureFlag></div>);

    expect(screen.getByText('This is a test')).toBeVisible();
  });

  it('hides content if the user has no flag', () => {
    const flag = 'tell_your_children';
    const user = {
      flags: [],
    };
    render(<div><FeatureFlag flag={flag} user={user}><h1>This is a test</h1></FeatureFlag></div>);

    expect(document.querySelectorAll('h1').length).toBe(0);
  });
});
