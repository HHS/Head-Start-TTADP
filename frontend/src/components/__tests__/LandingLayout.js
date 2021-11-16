import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';

import LandingLayout from '../LandingLayout';

describe('LandingLayout', () => {
  it('renders correctly', () => {
    render(<LandingLayout><h1>Landing Layout</h1></LandingLayout>);
    expect(screen.getByText('Landing Layout')).toBeVisible();
  });
});
