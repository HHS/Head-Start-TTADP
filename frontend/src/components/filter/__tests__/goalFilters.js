import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import selectEvent from 'react-select-event';
import React from 'react';
import {
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import {
  createDateFilter, reasonsFilter, statusFilter, topicsFilter, grantNumberFilter,
} from '../goalFilters';
import FilterErrorContext from '../FilterErrorContext';

const renderFilter = (filter) => {
  render(
    <FilterErrorContext.Provider value={{ setError: () => {} }}>
      {filter()}
    </FilterErrorContext.Provider>,
  );
};

describe('goalFilters', () => {
  describe('createDateFilter', () => {
    it('displays the correct date', () => {
      const date = createDateFilter.displayQuery('2000/12/30');
      expect(date).toEqual('12/30/2000');
    });

    it('displays date ranges correctly', () => {
      const date = createDateFilter.displayQuery('2000/12/30-2000/12/31');
      expect(date).toEqual('12/30/2000-12/31/2000');
    });

    it('renders correctly', async () => {
      renderFilter(() => createDateFilter.renderInput(null, 'Is', '2000/12/30', () => {}));
      const dateInput = await screen.findByLabelText('date');
      expect(dateInput).toBeInTheDocument();
    });

    it('calls onApply', async () => {
      const apply = jest.fn();
      renderFilter(() => createDateFilter.renderInput(null, 'Is after', '', apply));
      const dateInput = await screen.findByLabelText('date');
      userEvent.type(dateInput, '01/02/2022');
      await waitFor(() => expect(apply).toHaveBeenCalled());
    });
  });

  describe('reasonsFilter', () => {
    it('renders correctly', async () => {
      renderFilter(() => reasonsFilter.renderInput('1', 'test', ['reason'], () => {}));
      const reasonInput = await screen.findByLabelText('Select reasons to filter by');
      expect(reasonInput).toBeInTheDocument();
    });

    it('calls onApply', async () => {
      const apply = jest.fn();
      renderFilter(() => reasonsFilter.renderInput('1', 'test', ['reason'], apply));
      const reasonInput = await screen.findByLabelText('Select reasons to filter by');
      await selectEvent.select(reasonInput, ['Complaint']);
      expect(apply).toHaveBeenCalled();
    });
  });

  describe('statusFilter', () => {
    it('renders correctly', async () => {
      renderFilter(() => statusFilter.renderInput('1', 'test', ['Draft'], () => {}));
      const statusInput = await screen.findByLabelText('Select status to filter by');
      expect(statusInput).toBeInTheDocument();
    });

    it('calls onApply', async () => {
      const apply = jest.fn();
      renderFilter(() => statusFilter.renderInput('1', 'test', [], apply));
      const statusInput = await screen.findByLabelText('Select status to filter by');
      await selectEvent.select(statusInput, ['Draft']);
      expect(apply).toHaveBeenCalled();
    });
  });

  describe('topicsFilter', () => {
    it('renders correctly', async () => {
      renderFilter(() => topicsFilter.renderInput('1', 'test', ['ERSEA'], () => {}));
      const topicsInput = await screen.findByLabelText('Select topics to filter by');
      expect(topicsInput).toBeInTheDocument();
    });

    it('calls onApply', async () => {
      const apply = jest.fn();
      renderFilter(() => topicsFilter.renderInput('1', 'test', [], apply));
      const topicsInput = await screen.findByLabelText('Select topics to filter by');
      await selectEvent.select(topicsInput, ['ERSEA']);
      expect(apply).toHaveBeenCalled();
    });
  });

  describe('grantNumberFilter', () => {
    const grantFilter = grantNumberFilter([{
      id: 1,
      number: 'number',
    }]);

    it('renders correctly', async () => {
      renderFilter(() => grantFilter.renderInput('1', 'test', ['number'], () => {}));
      const grantNumberInput = await screen.findByLabelText('Select grant numbers to filter by');
      expect(grantNumberInput).toBeInTheDocument();
    });

    it('calls onApply', async () => {
      const apply = jest.fn();
      renderFilter(() => grantFilter.renderInput('1', 'test', [], apply));
      const grantNumberInput = await screen.findByLabelText('Select grant numbers to filter by');
      await selectEvent.select(grantNumberInput, ['number']);
      expect(apply).toHaveBeenCalled();
    });
  });
});
