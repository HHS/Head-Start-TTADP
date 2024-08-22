import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import NotFound from '../index';

describe('NotFound', () => {
  it('Displays without issues', async () => {
    render(
      <MemoryRouter>
        <NotFound />
      </MemoryRouter>,
    );

    const text = await screen.findByText(/Page Not Found/);

    expect(text).toBeTruthy();
  });
});
