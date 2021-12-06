import '@testing-library/jest-dom';
import React from 'react';
import {
  render,
  screen,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { formatDateRange } from '../../DateRangeSelect';
import FilterItem from '../FilterItem';

describe('Filter menu item', () => {
  const renderFilterItem = (
    filter,
    onRemoveFilter = jest.fn(),
    onUpdateFilter = jest.fn(),
    setErrors = jest.fn(),
  ) => {
    render(
      <div>
        <FilterItem
          filter={filter}
          onRemoveFilter={onRemoveFilter}
          onUpdateFilter={onUpdateFilter}
          errors={['']}
          setErrors={setErrors}
          index={0}
        />
        <button type="button">BIG DUMB BUTTON</button>
      </div>,
    );
  };

  it('updates topic & condition', async () => {
    const filter = {
      id: 'gibberish', topic: 'startDate', condition: 'Is after', query: '2021/01/01',
    };
    const onRemove = jest.fn();
    const onUpdate = jest.fn();
    renderFilterItem(filter, onRemove, onUpdate);

    const topic = screen.getByRole('combobox', { name: 'topic' });
    userEvent.selectOptions(topic, 'role');
    expect(onUpdate).toHaveBeenCalledWith('gibberish', 'topic', 'role');

    const condition = screen.getByRole('combobox', { name: 'condition' });
    userEvent.selectOptions(condition, 'Is within');
    expect(onUpdate).toHaveBeenCalledWith('gibberish', 'condition', 'Is within');
  });

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
      name: /Toggle the date range select menu/i,
    });

    userEvent.click(button);

    userEvent.click(await screen.findByRole('button', {
      name: /select to view data from custom date range\. select apply filters button to apply selection/i,
    }));

    const sd = screen.getByRole('textbox', { name: /start date/i });
    const ed = screen.getByRole('textbox', { name: /end date/i });

    userEvent.type(sd, '01/01/2021');
    userEvent.type(ed, '01/02/2021');

    userEvent.click(screen.getByRole('button', { name: /apply date range filters/i }));
    expect(onUpdate).toHaveBeenCalledWith('c6d0b3a7-8d51-4265-908a-beaaf16f12d3', 'query', '2021/01/01-2021/01/02');

    userEvent.click(button);

    userEvent.click(screen.getByRole('button', {
      name: /select to view data from year to date\. select apply filters button to apply selection/i,
    }));

    userEvent.click(screen.getByRole('button', { name: /apply date range filters/i }));

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
      query: ['Early Childhood Specialist'],
      id: 'gibberish',
    };
    const onRemove = jest.fn();
    const onUpdate = jest.fn();
    renderFilterItem(filter, onRemove, onUpdate);

    const button = screen.getByRole('button', { name: /toggle the change filter by specialists menu/i });
    userEvent.click(button);

    const apply = screen.getByRole('button', { name: /apply filters for the change filter by specialists menu/i });
    userEvent.click(apply);
    expect(onUpdate).toHaveBeenCalled();

    userEvent.click(screen.getByRole('button', {
      name: /remove Specialist Is within Early Childhood Specialist filter. click apply filters to make your changes/i,
    }));

    expect(onRemove).toHaveBeenCalled();
  });

  it('validates on blur', async () => {
    const filter = {
      id: 'blah-de-dah',
      display: '',
      conditions: [],
      toggleAllChecked: true,
    };
    const onRemove = jest.fn();
    const onUpdate = jest.fn();
    const setErrors = jest.fn();
    renderFilterItem(filter, onRemove, onUpdate, setErrors);
    userEvent.tab();

    console.log(document.querySelectorAll(':focus'));

    expect(true).toBe(false);
  });
});
