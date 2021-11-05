import '@testing-library/jest-dom';
import React from 'react';
import {
  render,
  screen,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FilterMenu from '../FilterMenu';

describe('Filter Menu', () => {
  afterAll(() => {
    jest.restoreAllMocks();
  });

  describe('filter menu button', () => {
    const renderFilterMenu = (filters = [], onApplyFilters = jest.fn()) => {
      render(<FilterMenu
        filters={filters}
        onApplyFilters={onApplyFilters}
      />);
    };

    it('opens the menu when the button is clicked', async () => {
      renderFilterMenu();

      const button = screen.getByRole('button', {
        name: /filters/i,
      });

      userEvent.click(button);

      const message = await screen.findByText('Show results matching the following conditions.');
      expect(message).toBeVisible();
      userEvent.click(button);
      expect(message).not.toBeVisible();
    });

    it('closes the menu when cancel is clicked', async () => {

    });
  });
});
