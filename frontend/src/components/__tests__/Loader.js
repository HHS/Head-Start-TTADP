import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';

import Loader from '../Loader';

describe('Loader', () => {
  it('is fixed when isFixed is true', async () => {
    render(<Loader loading loadingLabel="Loading" text="Loading" isFixed />);
    const overlay = await screen.findByRole('status');
    expect(overlay).toHaveStyle('position: fixed');
  });

  it('is absolute when isFixed is false', async () => {
    render(<Loader loading loadingLabel="Loading" text="Loading" />);
    const overlay = await screen.findByRole('status');
    expect(overlay).toHaveStyle('position: absolute');
  });
});
