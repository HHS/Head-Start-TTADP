import '@testing-library/jest-dom';
import React from 'react';
import {
  render,
  screen,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import FilterMenu, { Menu, FilterItem } from '../FilterMenu';

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
  });
  describe('Filter menu popup', () => {
    const renderMenu = (
      params = {
        filters: [], onApplyFilters: jest.fn(), hidden: false, toggleMenu: jest.fn(),
      },
    ) => {
      const {
        filters, onApplyFilters, hidden, toggleMenu,
      } = params;
      render(<Menu
        filters={filters}
        onApplyFilters={onApplyFilters}
        toggleMenu={toggleMenu}
        hidden={hidden}
      />);
    };

    it('hides the menu when appropriate', () => {
      renderMenu({
        filters: [], onApplyFilters: jest.fn(), hidden: true, toggleMenu: jest.fn(),
      });

      const menu = document.querySelector('.ttahub-filter-menu-filters');
      expect(menu).toHaveAttribute('hidden');
    });
  });

  describe('Filter menu item', () => {
    const renderFilterItem = (filter, onRemoveFilter = jest.fn(), onUpdateFilter = jest.fn()) => {
      render(<FilterItem
        filter={filter}
        onRemoveFilter={onRemoveFilter}
        onUpdateFilter={onUpdateFilter}
      />);
    };

    it('display a specialist filter correctly', () => {
      const filter = {
        topic: 'role',
        condition: 'Contains',
        query: ['Early Childhood Specialist'],
        id: 'gibberish',
      };
      renderFilterItem(filter);

      screen.logTestingPlaygroundURL();

      expect(true).toBe(false);
    });
  });
});
