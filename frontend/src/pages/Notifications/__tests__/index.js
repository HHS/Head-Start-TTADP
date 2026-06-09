import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router';
import Notifications from '../index';

describe('Notifications Page', () => {
  beforeEach(() => {
    render(
      <MemoryRouter>
        <Notifications />
      </MemoryRouter>
    );
  });

  test('displays notifications page', () => {
    expect(screen.getByText('Notifications')).toBeVisible();
  });
});
