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

  const renderFilterMenu = (filters = [], onApplyFilters = jest.fn()) => {
    render(
      <div>
        <h1>Filter menu</h1>
        <div>
          <FilterMenu
            filters={filters}
            onApplyFilters={onApplyFilters}
          />
        </div>
      </div>,
    );
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

  it('a filter can be updated and removed', () => {
    const filters = [
      {
        id: 'filter1234',
        topic: 'startDate',
        condition: 'Is within',
        query: '2021/01/01-2021/11/05',
      },
    ];

    renderFilterMenu(filters);

    const button = screen.getByRole('button', {
      name: /filters/i,
    });

    userEvent.click(button);

    const condition = screen.getByRole('combobox', { name: 'condition' });
    userEvent.selectOptions(condition, 'Is after');

    const del = screen.getByRole('button', { name: /remove Date range Is after 2021\/01\/01-2021\/11\/05 filter. click apply filters to make your changes/i });
    userEvent.click(del);

    expect(document.querySelectorAll('[name="topic"]').length).toBe(0);
  });

  it('filters out bad results', () => {
    const filters = [
      { id: '1', topic: 'tt' },
      { id: '2', topic: 't', condition: 'dfs' },
      {
        id: '3', topic: 'sdfs', condition: 'dfgfdg', query: 'dfdfg',
      },
    ];
    const onApply = jest.fn();
    renderFilterMenu(filters, onApply);

    const button = screen.getByRole('button', {
      name: /filters/i,
    });

    userEvent.click(button);

    const apply = screen.getByRole('button', { name: /apply filters to grantee record data/i });
    userEvent.click(apply);

    expect(onApply).toHaveBeenCalledWith([{
      id: '3', topic: 'sdfs', condition: 'dfgfdg', query: 'dfdfg',
    }]);
  });

  it('closes the menu on blur', async () => {
    const filters = [
      {
        id: 'filter-2',
        display: '',
        conditions: [],
        topic: 'role',
        query: [
          'Family Engagement Specialist',
        ],
        condition: 'Contains',
      },
    ];

    renderFilterMenu(filters);

    const button = screen.getByRole('button', {
      name: /filters/i,
    });

    userEvent.click(button);

    const message = await screen.findByText('Show results matching the following conditions.');
    userEvent.click(message);

    const specialists = await screen.findByRole('button', { name: /Open the Change filter by specialists menu/i });
    userEvent.click(specialists);

    const check = await screen.findByRole('checkbox', { name: /select health specialist \(hs\)/i });
    userEvent.click(check);

    expect(message).toBeVisible();
  });
});
