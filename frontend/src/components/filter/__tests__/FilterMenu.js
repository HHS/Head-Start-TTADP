import '@testing-library/jest-dom';
import React from 'react';
import {
  render,
  screen,
  act,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FilterMenu from '../FilterMenu';
import {
  grantNumberFilter,
  programSpecialistFilter,
  programTypeFilter,
  reasonsFilter,
  recipientFilter,
  stateCodeFilter,
  targetPopulationsFilter,
  topicsFilter,
  otherEntitiesFilter,
} from '../activityReportFilters';
import {
  createDateFilter,
  reasonsFilter as goalReasonsFilter,
  statusFilter,
  topicsFilter as goalTopicsFilter,
} from '../goalFilters';
import UserContext from '../../../UserContext';
import { SCOPE_IDS } from '../../../Constants';
import { TTAHISTORY_FILTER_CONFIG } from '../../../pages/RecipientRecord/pages/constants';

const { READ_ACTIVITY_REPORTS } = SCOPE_IDS;

describe('Filter Menu', () => {
  afterAll(() => {
    jest.restoreAllMocks();
  });

  const renderFilterMenu = (
    filters = [],
    onApplyFilters = jest.fn(),
    filterConfig = TTAHISTORY_FILTER_CONFIG,
  ) => {
    const user = {
      permissions: [
        {
          regionId: 1,
          scopeId: READ_ACTIVITY_REPORTS,
        },
      ],
    };

    render(
      <UserContext.Provider value={{ user }}>
        <h1>Filter menu</h1>
        <div>
          <FilterMenu
            filters={filters}
            onApplyFilters={onApplyFilters}
            applyButtonAria="apply test filters"
            filterConfig={filterConfig}
          />
        </div>
      </UserContext.Provider>,
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
        condition: 'is within',
        query: '2021/01/01-2021/11/05',
      },
    ];

    renderFilterMenu(filters);

    const button = screen.getByRole('button', {
      name: /filters/i,
    });

    userEvent.click(button);

    const condition = screen.getByRole('combobox', { name: 'condition' });
    userEvent.selectOptions(condition, 'is on or after');

    const del = screen.getByRole('button', { name: /remove start date is on or after/i });
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
        condition: 'is on or after',
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
    userEvent.selectOptions(condition, 'is on or before');

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
        condition: 'Is',
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
        condition: 'Is',
      },
      {
        id: 'filter-3',
        display: '',
        conditions: [],
        topic: 'programSpecialist',
        query: '',
        condition: 'is',
      },
      {
        id: 'filter-4',
        display: '',
        conditions: [],
        topic: 'grantNumber',
        query: '',
        condition: 'is',
      },
      {
        id: 'filter-5',
        display: '',
        conditions: [],
        topic: 'programType',
        query: ['EHS'],
        condition: 'Is',
      },
      {
        id: 'filter-6',
        display: '',
        conditions: [],
        topic: 'reason',
        query: ['COVID-19 response'],
        condition: 'Is',
      },
      {
        id: 'filter-7',
        display: '',
        conditions: [],
        topic: 'recipient',
        query: '',
        condition: 'is',
      },
      {
        id: 'filter-8',
        display: '',
        conditions: [],
        topic: 'targetPopulations',
        query: [],
        condition: 'Is',
      },
      {
        id: 'filter-9',
        display: '',
        conditions: [],
        topic: 'topic',
        query: [],
        condition: 'Is',
      },
      {
        id: 'filter-10',
        display: '',
        conditions: [],
        topic: 'stateCode',
        query: [],
        condition: 'is',
      },
    ];

    renderFilterMenu(filters);

    const button = screen.getByRole('button', {
      name: /filters/i,
    });

    userEvent.click(button);

    let topics = await screen.findAllByRole('combobox', { name: 'topic' });
    expect(topics.length).toBe(9);

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

  it('renders activity report filters', async () => {
    const config = [
      grantNumberFilter,
      programSpecialistFilter,
      programTypeFilter,
      reasonsFilter,
      recipientFilter,
      stateCodeFilter,
      targetPopulationsFilter,
      topicsFilter,
      otherEntitiesFilter,
    ];

    const filters = [];
    const onApply = jest.fn();
    renderFilterMenu(filters, onApply, config);

    const button = screen.getByRole('button', {
      name: /filters/i,
    });

    userEvent.click(button);

    const [topics] = await screen.findAllByRole('combobox', { name: /topic/i });

    // all the filters work
    userEvent.selectOptions(topics, 'Grant number');
    let [conditions] = await screen.findAllByRole('combobox', { name: /condition/i });
    userEvent.selectOptions(conditions, 'contains');

    userEvent.selectOptions(topics, 'Program specialist');
    [conditions] = await screen.findAllByRole('combobox', { name: /condition/i });
    userEvent.selectOptions(conditions, 'contains');

    userEvent.selectOptions(topics, 'Program types');
    [conditions] = await screen.findAllByRole('combobox', { name: /condition/i });
    userEvent.selectOptions(conditions, 'is');

    userEvent.selectOptions(topics, 'Reasons');
    [conditions] = await screen.findAllByRole('combobox', { name: /condition/i });
    userEvent.selectOptions(conditions, 'is');

    userEvent.selectOptions(topics, 'Recipient name');
    [conditions] = await screen.findAllByRole('combobox', { name: /condition/i });
    userEvent.selectOptions(conditions, 'contains');

    userEvent.selectOptions(topics, 'State');
    [conditions] = await screen.findAllByRole('combobox', { name: /condition/i });
    userEvent.selectOptions(conditions, 'contains');

    userEvent.selectOptions(topics, 'Target populations');
    [conditions] = await screen.findAllByRole('combobox', { name: /condition/i });
    userEvent.selectOptions(conditions, 'is');

    userEvent.selectOptions(topics, 'Topics');
    [conditions] = await screen.findAllByRole('combobox', { name: /condition/i });
    userEvent.selectOptions(conditions, 'is');

    userEvent.selectOptions(topics, 'Other entities');
    [conditions] = await screen.findAllByRole('combobox', { name: /condition/i });
    userEvent.selectOptions(conditions, 'is');

    // it renders an option for each config passed in (plus a dummy option)
    expect(topics.querySelectorAll('option:not([disabled])').length).toBe(config.length);
  });

  it('renders goal filters', async () => {
    const config = [
      createDateFilter,
      goalReasonsFilter,
      statusFilter,
      goalTopicsFilter,
    ];

    const filters = [];
    const onApply = jest.fn();
    renderFilterMenu(filters, onApply, config);

    const button = screen.getByRole('button', {
      name: /filters/i,
    });

    userEvent.click(button);

    const [topics] = await screen.findAllByRole('combobox', { name: /topic/i });

    // all the filters work
    userEvent.selectOptions(topics, 'Status');
    let [conditions] = await screen.findAllByRole('combobox', { name: /condition/i });
    userEvent.selectOptions(conditions, 'is');

    userEvent.selectOptions(topics, 'Create date');
    [conditions] = await screen.findAllByRole('combobox', { name: /condition/i });
    userEvent.selectOptions(conditions, 'is within');

    userEvent.selectOptions(topics, 'Reasons');
    [conditions] = await screen.findAllByRole('combobox', { name: /condition/i });
    userEvent.selectOptions(conditions, 'is');

    userEvent.selectOptions(topics, 'Topics');
    [conditions] = await screen.findAllByRole('combobox', { name: /condition/i });
    userEvent.selectOptions(conditions, 'is');

    // it renders an option for each config passed in (plus a dummy option)
    expect(topics.querySelectorAll('option:not([disabled])').length).toBe(config.length);
  });
});
