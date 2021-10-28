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

    it('shows a dummy select', () => {
      renderMenu();
      userEvent.click(screen.getByRole('button', { name: /add new filter/i }));

      const dummy = screen.getByRole('combobox', { name: /select a topic and condition first and then select a query/i });
      expect(dummy).toBeDisabled();
    });

    it('calls the apply filters function passed in', () => {
      const onApplyFilters = jest.fn();
      renderMenu({
        filters: [], onApplyFilters, hidden: false, toggleMenu: jest.fn(),
      });

      const apply = screen.getByRole('button', { name: /apply filters/i });
      userEvent.click(apply);

      expect(onApplyFilters).toHaveBeenCalled();
    });

    it('cancel closes the menu', () => {
      const toggleMenu = jest.fn();
      renderMenu({
        filters: [], onApplyFilters: jest.fn(), hidden: false, toggleMenu,
      });
      userEvent.click(screen.getByRole('button', { name: /cancel/i }));

      expect(toggleMenu).toHaveBeenCalled();
    });

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

    it('displays a date filter correctly', () => {
      const filter = {
        topic: 'startDate',
        condition: 'within',
        id: 'gibberish',
      };
      const onRemove = jest.fn();
      const onUpdate = jest.fn();
      renderFilterItem(filter, onRemove, onUpdate);

      const selector = screen.getByRole('combobox', { name: 'condition' });

      userEvent.selectOptions(selector, 'Is after');

      expect(screen.getByRole('textbox', { name: /date/i })).toBeVisible();

      userEvent.selectOptions(selector, 'Is within');
    });

    it('display a specialist filter correctly', () => {
      const filter = {
        topic: 'role',
        condition: 'Contains',
        id: 'gibberish',
      };
      const onRemove = jest.fn();
      const onUpdate = jest.fn();
      renderFilterItem(filter, onRemove, onUpdate);

      const button = screen.getByText(/all specialists/i);
      userEvent.click(button);

      const apply = screen.getByRole('button', { name: /apply filters for change filter by specialists menu/i });
      userEvent.click(apply);
      expect(onUpdate).toHaveBeenCalled();

      userEvent.click(screen.getByRole('button', {
        name: /remove filter/i,
      }));

      expect(onRemove).toHaveBeenCalled();
    });
  });
});
