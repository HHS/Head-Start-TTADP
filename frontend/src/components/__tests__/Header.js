import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';

import Header from '../Header';

describe('Header', () => {
  describe('when authenticated', () => {
    beforeEach(() => {
      render(<MemoryRouter><Header authenticated /></MemoryRouter>);
    });

    test('nav items are visible', () => {
      expect(screen.queryAllByRole('link').length).not.toBe(0);
    });

    test('search is present', async () => {
      expect(screen.getByLabelText('Search')).toBeVisible();
    });
  });

  describe('when an admin', () => {
    it('the admin link is visible', () => {
      render(<MemoryRouter><Header authenticated admin /></MemoryRouter>);
      const adminLink = screen.getByRole('link', { name: 'Admin' });
      expect(adminLink).toBeVisible();
    });
  });

  describe('when unauthenticated', () => {
    beforeEach(() => {
      render(<MemoryRouter><Header authenticated={false} /></MemoryRouter>);
    });

    test('nav items are not visible', () => {
      expect(screen.queryAllByRole('link').length).toBe(0);
    });
  });
});
