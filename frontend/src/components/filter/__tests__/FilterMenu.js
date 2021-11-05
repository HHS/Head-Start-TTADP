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

    it('toggles the menu', async () => {
      renderFilterMenu();

      const button = screen.getByRole('button', {
        name: /filters/i,
      });

      userEvent.click(button);
      const message = await screen.findByText('Show results matching the following conditions.');
      expect(message).toBeVisible();

      const cancel = await screen.findByRole('button', { name: /discard changes and close filter menu/i });
      userEvent.click(cancel);
      expect(message).not.toBeVisible();
    });
  });
});
