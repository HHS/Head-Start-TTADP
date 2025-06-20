import '@testing-library/jest-dom';
import React from 'react';
import {
  render,
  screen,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FilterPills from '../FilterPills';
import { TTAHISTORY_FILTER_CONFIG } from '../../../pages/RecipientRecord/pages/constants';

describe('Filter Pills', () => {
  afterAll(() => {
    jest.restoreAllMocks();
  });

  describe('filter menu button render tests', () => {
    const renderFilterMenu = (filters = [], onRemoveFilter = jest.fn()) => {
      render(<FilterPills
        filters={filters}
        filterConfig={TTAHISTORY_FILTER_CONFIG}
        onRemoveFilter={onRemoveFilter}
      />);
    };

    it('renders correctly', async () => {
      const filters = [{
        id: '1',
        topic: 'role',
        condition: 'contains',
        query: [],
      },
      {
        id: '2',
        topic: 'startDate',
        condition: 'is within',
        query: '2021/10/01-2021/10/31',
      }];

      renderFilterMenu(filters);

      // Role.
      expect(await screen.findByText(/contains/i)).toBeVisible();
      expect(await screen.findByRole('button', { name: /this button removes the filter: specialist roles contains/i })).toBeVisible();

      // Date.
      expect(await screen.findByText(/date started/i)).toBeVisible();
      expect(await screen.findByText(/is within/i)).toBeVisible();
      expect(await screen.findByText(/10\/01\/2021-10\/31\/2021/i)).toBeVisible();
      expect(await screen.findByRole('button', { name: /this button removes the filter: date started \(ar\) is within/i })).toBeVisible();
    });

    it('removes filters', async () => {
      const filters = [
        {
          id: '1',
          topic: 'role',
          condition: 'is',
          query: [],
          displayQuery: (q) => q.join(', '),
          display: 'Specialist role',
        },
        {
          id: '2',
          topic: 'startDate',
          condition: 'is on or after',
          query: '2021/01/01',
          displayQuery: (q) => q,
          display: 'Date range',
        },
      ];

      const onRemoveFilter = jest.fn();
      renderFilterMenu(filters, onRemoveFilter);

      // All filter pills exist.
      expect(await screen.findByText(/date started/i)).toBeVisible();

      // Remove filter pill.
      const remoteButton = await screen.findByRole('button', { name: /this button removes the filter: date started \(ar\) is on or after /i });
      userEvent.click(remoteButton);
      expect(onRemoveFilter).toHaveBeenCalledWith('2');
    });

    it('renders long filter query with ellipsis', async () => {
      const filters = [{
        id: '1',
        topic: 'role',
        condition: 'is',
        query: ['Specialist 1', 'Specialist 2', 'Specialist 3', 'Specialist 4', 'Specialist 5', 'Specialist 6', 'Specialist 7'],
        displayQuery: (q) => q.join(', '),
        display: 'Specialist role',
      },
      ];

      renderFilterMenu(filters);
      expect((await screen.findAllByText(/specialist 1, specialist 2, specialist 3\.\.\./i)).length).toBe(2);
    });

    it('shows correct condition text for my reports filter', async () => {
      const filters = [{
        id: '1',
        topic: 'myReports',
        condition: 'where I\'m the',
        query: ['Creator'],
        displayQuery: (q) => q.join(', '),
        display: 'My reports',
      },
      ];

      renderFilterMenu(filters);
      // Check we keep the correct case for I'm.
      expect(await screen.findByText('where I\'m the')).toBeVisible();
    });
  });
});
