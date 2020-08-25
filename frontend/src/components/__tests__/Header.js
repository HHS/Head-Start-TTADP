import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';

import Header from '../Header';

describe('Header', () => {
  beforeEach(() => {
    render(<MemoryRouter><Header /></MemoryRouter>);
  });

  test('nav items are visible', () => {
    expect(screen.getByText('Home')).toBeVisible();
  });

  test('search is present', async () => {
    expect(screen.getByLabelText('Search')).toBeVisible();
  });
});
