import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { Router } from 'react-router';
import { createMemoryHistory } from 'history';

import NotFound from '../index';

describe('NotFound', () => {
  it('Displays without issues', async () => {
    const history = createMemoryHistory();
    render(
      <Router history={history}>
        <NotFound />
      </Router>,
    );

    const text = await screen.findByText(/Page Not Found/);

    expect(text).toBeTruthy();
  });
});
