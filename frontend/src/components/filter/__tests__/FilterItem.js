import '@testing-library/jest-dom';
import React from 'react';
import {
  render,
  screen,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FilterItem from '../FilterItem';
import FilterErrorContext from '../FilterErrorContext';
import { TTAHISTORY_FILTER_CONFIG } from '../../../pages/RecipientRecord/pages/constants';

const selectedTopic = TTAHISTORY_FILTER_CONFIG[0];
const topicOptions = TTAHISTORY_FILTER_CONFIG.map(({ id: filterId, display }) => (
  <option key={filterId} value={filterId}>{display}</option>
));

describe('Filter menu item', () => {
  const renderFilterItem = (
    filter,
    onRemoveFilter = jest.fn(),
    onUpdateFilter = jest.fn(),
    setErrors = jest.fn(),
  ) => {
    const setError = jest.fn((error) => {
      setErrors([error]);
    });

    render(
      <div>
        <FilterErrorContext.Provider value={{ setError, error: '' }}>
          <FilterItem
            filter={filter}
            onRemoveFilter={onRemoveFilter}
            onUpdateFilter={onUpdateFilter}
            index={0}
            key={filter.id}
            topicOptions={topicOptions}
            selectedTopic={selectedTopic}
          />
        </FilterErrorContext.Provider>
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
      name: /change custom date range/i,
    });

    userEvent.click(button);

    const sd = screen.getByRole('textbox', { name: /start date/i });
    const ed = screen.getByRole('textbox', { name: /end date/i });

    userEvent.clear(sd);
    userEvent.clear(ed);
    userEvent.type(sd, '01/01/2021');
    userEvent.type(ed, '01/02/2021');

    userEvent.click(await screen.findByRole('button', { name: /apply date range changes/i }));
    expect(onUpdate).toHaveBeenCalledWith('c6d0b3a7-8d51-4265-908a-beaaf16f12d3', 'query', '2021/01/01-2021/01/02');
  });

  it('validates topic', async () => {
    const filter = {
      id: 'blah-de-dah',
      display: '',
      topic: '',
      condition: '',
      query: [],
    };
    const onRemove = jest.fn();
    const onUpdate = jest.fn();
    const setErrors = jest.fn();
    renderFilterItem(filter, onRemove, onUpdate, setErrors);
    userEvent.tab();
    userEvent.tab();
    userEvent.tab();
    userEvent.tab();
    expect(setErrors).toHaveBeenCalledWith(['Please enter a filter']);
  });

  it('validates condition', async () => {
    const filter = {
      id: 'blah-de-dah',
      display: '',
      topic: 'role',
      condition: '',
      query: [],
    };
    const onRemove = jest.fn();
    const onUpdate = jest.fn();
    const setErrors = jest.fn();
    renderFilterItem(filter, onRemove, onUpdate, setErrors);
    userEvent.tab();
    userEvent.tab();
    userEvent.tab();
    userEvent.tab();
    expect(setErrors).toHaveBeenCalledWith(['Please enter a condition']);
  });

  it('validates query', async () => {
    const filter = {
      id: 'blah-de-dah',
      display: '',
      topic: 'grantNumber',
      condition: 'Contains',
      query: '',
    };
    const onRemove = jest.fn();
    const onUpdate = jest.fn();
    const setErrors = jest.fn();
    renderFilterItem(filter, onRemove, onUpdate, setErrors);
    const bigDumbButton = await screen.findByRole('button', { name: /big dumb button/i });
    userEvent.tab();
    userEvent.tab();
    userEvent.tab();
    userEvent.tab();
    userEvent.tab();
    expect(bigDumbButton).toHaveFocus();
    expect(setErrors).toHaveBeenCalledWith(['Please enter a value']);
  });
});
