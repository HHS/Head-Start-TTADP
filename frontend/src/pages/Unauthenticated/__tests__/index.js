import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';

import Unauthenticated from '../index';

describe('Unauthenticated Page', () => {
  describe('with no log out message', () => {
    beforeEach(() => {
      render(<Unauthenticated />);
    });

    test('displays welcome message', () => {
      expect(screen.getByText('Welcome to the TTA Smart Hub!')).toBeVisible();
    });

    test('does not display the logged out message', () => {
      expect(screen.queryByText('You have successfully logged out of the TTA Smart Hub')).toBeNull();
    });
  });

  describe('with a log out message', () => {
    beforeEach(() => {
      render(<Unauthenticated loggedOut />);
    });

    test('displays the logged out message', () => {
      expect(screen.getByText('You have successfully logged out of the TTA Smart Hub')).toBeVisible();
    });
  });
});
