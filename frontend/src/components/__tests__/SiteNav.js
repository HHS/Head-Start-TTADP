import '@testing-library/jest-dom';
import React from 'react';
import join from 'url-join';
import {
  screen, render,
} from '@testing-library/react';
import fetchMock from 'fetch-mock';
import { MemoryRouter } from 'react-router';

import SiteNav from '../SiteNav';

describe('SiteNav', () => {
  describe('when authenticated', () => {
    afterEach(() => fetchMock.restore());

    const userUrl = join('api', 'user');

    beforeEach(() => {
      const user = { name: 'name' };
      fetchMock.get(userUrl, { ...user });

      render(
        <MemoryRouter>
          <SiteNav authenticated user={user} />
        </MemoryRouter>,
      );
    });

    test('nav items are visible', () => {
      expect(screen.queryAllByRole('link').length).not.toBe(0);
    });
  });

  describe('when unauthenticated', () => {
    beforeEach(() => {
      render(<MemoryRouter><SiteNav authenticated={false} /></MemoryRouter>);
    });

    test('nav items are not visible', () => {
      expect(screen.queryAllByRole('link').length).toBe(1);
    });
  });
});
