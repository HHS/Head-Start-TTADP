import '@testing-library/jest-dom';
import React from 'react';
import {
  render,
  screen,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { formatDateRange } from '../DateRangeSelect';
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
  describe('Filter menu', () => {
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

    it('closes on escape', () => {
      const toggleMenu = jest.fn();
      renderMenu({
        filters: [], onApplyFilters: jest.fn(), hidden: false, toggleMenu,
      });
      const menu = document.querySelector('.ttahub-filter-menu-filters');
      userEvent.type(menu, '{esc}');
      expect(toggleMenu).toHaveBeenCalledTimes(1);
      userEvent.type(menu, '{esc}');
      expect(toggleMenu).toHaveBeenCalledTimes(2);
    });

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

      const apply = screen.getByRole('button', { name: /Apply all filters and reload the data on this page/i });
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

    it('switches between specialist and date', () => {
      const filters = [{
        topic: 'role',
        condition: 'Contains',
        id: 'gibberish',
      }];
      const onApplyFilters = jest.fn();
      const toggleMenu = jest.fn();

      renderMenu({
        filters, onApplyFilters, hidden: false, toggleMenu,
      });

      const topic = screen.getByRole('combobox', { name: 'topic' });

      userEvent.selectOptions(topic, 'startDate');

      userEvent.click(screen.getByRole('button', { name: /Apply all filters and reload the data on this page/i }));

      expect(onApplyFilters).toHaveBeenCalledWith([
        {
          topic: 'startDate',
          condition: 'Contains',
          id: 'gibberish',
          query: '',
        },
      ]);

      const remove = screen.getByRole('button', { name: /remove Date range Contains filter. click apply filters to make your changes/i });

      userEvent.click(remove);
      userEvent.click(screen.getByRole('button', { name: /Apply all filters and reload the data on this page/i }));

      expect(onApplyFilters).toHaveBeenCalledWith([]);
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
        id: 'gibberish', topic: 'startDate', condition: 'Is after', query: '2021/01/01',
      };
      const onRemove = jest.fn();
      const onUpdate = jest.fn();
      renderFilterItem(filter, onRemove, onUpdate);

      const selector = screen.getByRole('combobox', { name: 'condition' });
      expect(selector).toBeVisible();
      expect(screen.getByRole('textbox', { name: /date/i })).toBeVisible();
    });

    it('applies the proper date range', async () => {
      const filter = {
        id: 'c6d0b3a7-8d51-4265-908a-beaaf16f12d3', topic: 'startDate', condition: 'Is within', query: '2021/01/01-2021/10/28',
      };
      const onRemove = jest.fn();
      const onUpdate = jest.fn();

      renderFilterItem(filter, onRemove, onUpdate);

      const button = screen.getByRole('button', {
        name: /open date range options menu/i,
      });

      userEvent.click(button);

      userEvent.click(await screen.findByRole('button', {
        name: /select to view data from custom date range\. select apply filters button to apply selection/i,
      }));

      const sd = screen.getByRole('textbox', { name: /start date/i });
      const ed = screen.getByRole('textbox', { name: /end date/i });

      userEvent.type(sd, '01/01/2021');
      userEvent.type(ed, '01/02/2021');

      userEvent.click(screen.getByRole('button', { name: /apply filters for the date range options menu/i }));
      expect(onUpdate).toHaveBeenCalledWith('c6d0b3a7-8d51-4265-908a-beaaf16f12d3', 'query', '2021/01/01-2021/01/02');

      userEvent.click(button);

      userEvent.click(screen.getByRole('button', {
        name: /select to view data from year to date\. select apply filters button to apply selection/i,
      }));

      userEvent.click(screen.getByRole('button', { name: /apply filters for the date range options menu/i }));

      const yearToDate = formatDateRange({
        yearToDate: true,
        forDateTime: true,
      });

      expect(onUpdate).toHaveBeenCalledWith('c6d0b3a7-8d51-4265-908a-beaaf16f12d3', 'query', yearToDate);
    });

    it('display a specialist filter correctly', () => {
      const filter = {
        topic: 'role',
        condition: 'Is within',
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
        name: /remove Specialist Is within undefined filter. click apply filters to make your changes/i,
      }));

      expect(onRemove).toHaveBeenCalled();
    });
  });
});
