/* eslint-disable react/prop-types */
import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import Filter, { filtersToQueryString } from '../Filter';

const RenderFilterItem = ({ applyFilters = () => {} }) => (
  <Filter applyFilters={applyFilters} />
);

describe('filter', () => {
  describe('toggle button', () => {
    it('can be opened and closed', async () => {
      render(<RenderFilterItem />);
      const button = await screen.findByRole('button');
      expect(button).not.toHaveClass('smart-hub--filter-menu-button__open');
      userEvent.click(button);
      expect(button).toHaveClass('smart-hub--filter-menu-button__open');
      expect(button).not.toHaveClass('smart-hub--filter-menu-button__selected');
      const addFilter = await screen.findByRole('button', { name: 'Add filter' });
      userEvent.click(addFilter);
      userEvent.click(button);
      expect(button).toHaveClass('smart-hub--filter-menu-button__selected');
    });

    it('shows the current number of filters', async () => {
      render(<RenderFilterItem />);
      const button = await screen.findByRole('button');
      userEvent.click(button);
      const addFilter = await screen.findByRole('button', { name: 'Add filter' });
      userEvent.click(addFilter);
      userEvent.click(addFilter);
      expect(button.textContent).toContain('2 Filters');
    });
  });

  it('can remove filters', async () => {
    render(<RenderFilterItem />);
    const button = await screen.findByRole('button');
    userEvent.click(button);

    const addFilter = await screen.findByRole('button', { name: 'Add filter' });
    userEvent.click(addFilter);

    const remove = await screen.findByRole('button', { name: 'remove filter' });
    userEvent.click(remove);

    const message = await screen.findByText('No filters have been applied');
    expect(message).toBeVisible();
  });

  it('applyFilters calls `applyFilters`', async () => {
    const applyFilters = jest.fn();
    render(<RenderFilterItem applyFilters={applyFilters} />);
    const button = await screen.findByRole('button');
    userEvent.click(button);

    const addFilter = await screen.findByRole('button', { name: 'Add filter' });
    userEvent.click(addFilter);

    const topic = await screen.findByRole('combobox', { name: 'topic' });
    userEvent.selectOptions(topic, 'reportId');

    const condition = await screen.findByRole('combobox', { name: 'condition' });
    userEvent.selectOptions(condition, 'Contains');

    const query = await screen.findByRole('textbox');
    userEvent.type(query, 'test');

    const apply = await screen.findByRole('button', { name: 'Apply' });
    userEvent.click(apply);
    expect(applyFilters).toHaveBeenCalledWith([
      {
        id: expect.anything(),
        topic: 'reportId',
        condition: 'Contains',
        query: 'test',
      },
    ]);
  });
});

describe('filtersToQueryString', () => {
  it('excludes filters with no query', () => {
    const filters = [
      { condition: 'Contains', topic: 'reportId', query: 'test' },
      { condition: 'Does not contain', topic: 'reportId', query: '' },
    ];

    const queryString = filtersToQueryString(filters);
    expect(queryString).toEqual('reportId.in[]=test');
  });

  it('excludes within filters without a start and end date', () => {
    const filters = [
      { condition: 'Contains', topic: 'reportId', query: 'test' },
      { condition: 'Is within', topic: 'startDate', query: '2000/02/02-' },
    ];

    const queryString = filtersToQueryString(filters);
    expect(queryString).toEqual('reportId.in[]=test');
  });

  it('properly builds the query with no filters', () => {
    const queryString = filtersToQueryString([]);
    expect(queryString).toEqual('');
  });

  it('properly builds the query with multiple filters', () => {
    const filters = [
      { condition: 'Contains', topic: 'reportId', query: 'first' },
      { condition: 'Does not contain', topic: 'reportId', query: 'second' },
    ];

    const queryString = filtersToQueryString(filters);
    expect(queryString).toEqual('reportId.in[]=first&reportId.nin[]=second');
  });
});
