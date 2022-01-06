import '@testing-library/jest-dom';
import React from 'react';
import {
  render,
  screen,
  act,
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
            applyButtonAria="apply test filters"
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
    const message = await screen.findByText('Show results for the following filters.');
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

    const del = screen.getByRole('button', { name: /remove Date range Is after/i });
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

    const apply = screen.getByRole('button', { name: /apply test filters/i });
    userEvent.click(apply);

    expect(onApply).not.toHaveBeenCalledWith();
  });

  it('clears the query if the topic is changed', async () => {
    const filters = [
      {
        id: 'filter1234',
        topic: 'startDate',
        condition: 'Is after',
        query: '2021/10/31',
      },
    ];

    renderFilterMenu(filters);

    const button = screen.getByRole('button', {
      name: /filters/i,
    });

    userEvent.click(button);

    let date = screen.getByRole('textbox', { name: /date/i });
    expect(date.value).toBe('10/31/2021');

    const topic = screen.getByRole('combobox', { name: 'topic' });
    userEvent.selectOptions(topic, 'role');
    userEvent.selectOptions(topic, 'startDate');

    await screen.findByRole('combobox', { name: 'select a topic and condition first and then select a query' });

    expect(document.querySelectorAll('[name="topic"]').length).toBe(1);

    const condition = await screen.findByRole('combobox', { name: 'condition' });
    userEvent.selectOptions(condition, 'Is before');

    date = await screen.findByRole('textbox', { name: /date/i });
    userEvent.type(date, '10/31/2020');

    const addNew = screen.getByRole('button', { name: /Add new filter/i });
    userEvent.click(addNew);

    expect(document.querySelectorAll('[name="topic"]').length).toBe(2);
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

    const message = await screen.findByText('Show results for the following filters.');
    userEvent.click(message);

    expect(message).toBeVisible();
  });

  it('the clear all button works', async () => {
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
      {
        id: 'filter-3',
        display: '',
        conditions: [],
        topic: 'programSpecialist',
        query: '',
        condition: 'Contains',
      },
      {
        id: 'filter-4',
        display: '',
        conditions: [],
        topic: 'grantNumber',
        query: '',
        condition: 'Contains',
      },
      {
        id: 'filter-5',
        display: '',
        conditions: [],
        topic: 'programType',
        query: ['EHS'],
        condition: 'Contains',
      },
      {
        id: 'filter-6',
        display: '',
        conditions: [],
        topic: 'reason',
        query: ['COVID-19 response'],
        condition: 'Contains',
      },
      {
        id: 'filter-7',
        display: '',
        conditions: [],
        topic: 'grantee',
        query: '',
        condition: 'Contains',
      },
      {
        id: 'filter-8',
        display: '',
        conditions: [],
        topic: 'targetPopulation',
        query: [],
        condition: 'Contains',
      },
      {
        id: 'filter-9',
        display: '',
        conditions: [],
        topic: 'topic',
        query: [],
        condition: 'Contains',
      },
    ];

    renderFilterMenu(filters);

    const button = screen.getByRole('button', {
      name: /filters/i,
    });

    userEvent.click(button);

    let topics = await screen.findAllByRole('combobox', { name: 'topic' });
    expect(topics.length).toBe(8);

    const clear = await screen.findByRole('button', { name: /Clear all filters/i });
    act(() => userEvent.click(clear));

    // findAll errors out here
    topics = document.querySelectorAll('[name="topic"]');
    expect(topics.length).toBe(0);
  });
  it('validates input and sets focus', async () => {
    const filters = [
      {
        id: 'filter1234',
        topic: 'startDate',
        condition: 'Is after',
        query: '2021/10/31',
      },
    ];

    renderFilterMenu(filters);

    const button = screen.getByRole('button', {
      name: /filters/i,
    });

    userEvent.click(button);

    const addNew = screen.getByRole('button', { name: /Add new filter/i });
    act(() => userEvent.click(addNew));

    const [topic] = Array.from(document.querySelectorAll('[name="topic"]')).slice(-1);
    expect(topic).toHaveFocus();
    userEvent.tab();
    userEvent.tab();
    userEvent.tab();
    expect(screen.getByText(/please enter a filter/i)).toBeVisible();

    userEvent.selectOptions(topic, ['role']);
    const apply = screen.getByRole('button', { name: /apply test filters/i });
    userEvent.click(apply);
    expect(screen.getByText(/please enter a condition/i)).toBeVisible();
  });
});
