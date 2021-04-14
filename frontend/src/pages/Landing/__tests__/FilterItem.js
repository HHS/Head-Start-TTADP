/* eslint-disable react/prop-types */
import '@testing-library/jest-dom';
import React from 'react';
import {
  render,
  screen,
  within,
  waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import FilterItem from '../FilterItem';

const RenderFilterItem = ({
  onUpdateFilter = () => {},
  onRemoveFilter = () => {},
  topic = 'reportId',
  condition = 'in',
  query = '',
  forMyAlerts = false,
}) => (
  <FilterItem
    id="id"
    onUpdateFilter={onUpdateFilter}
    onRemoveFilter={onRemoveFilter}
    topic={topic}
    condition={condition}
    query={query}
    forMyAlerts={forMyAlerts}
  />
);

describe('FilterItem', () => {
  it('calls `onUpdateFilter` when the topic is updated', async () => {
    const onUpdate = jest.fn();
    render(<RenderFilterItem onUpdateFilter={onUpdate} />);
    const topic = await screen.findByRole('combobox', { name: 'topic' });
    userEvent.selectOptions(topic, 'grantee');
    expect(onUpdate).toHaveBeenCalledWith('topic', 'grantee');
  });

  it('calls `onUpdateFilter` when the condition is updated', async () => {
    const onUpdate = jest.fn();
    render(<RenderFilterItem onUpdateFilter={onUpdate} topic="reportId" />);
    const topic = await screen.findByRole('combobox', { name: 'condition' });
    userEvent.selectOptions(topic, 'Contains');
    expect(onUpdate).toHaveBeenCalledWith('condition', 'Contains');
  });

  it('calls `onUpdateFilter` when the query is updated', async () => {
    const onUpdate = jest.fn();
    render(<RenderFilterItem onUpdateFilter={onUpdate} topic="reportId" condition="Contains" />);
    const input = await screen.findByRole('textbox');
    userEvent.type(input, 't');
    expect(onUpdate).toHaveBeenCalledWith('query', 't');
  });

  it('handles unknown topics', async () => {
    render(<RenderFilterItem topic="notatopic" />);
    const condition = await screen.findByRole('combobox', { name: 'condition' });
    const options = await waitFor(() => within(condition).queryAllByRole('option'));
    expect(options.length).toBe(0);
  });

  it('calls `onRemoveFilter` when the filter is removed', async () => {
    const onRemove = jest.fn();
    render(<RenderFilterItem onRemoveFilter={onRemove} />);
    const remove = await screen.findByRole('button');
    userEvent.click(remove);
    expect(onRemove).toHaveBeenCalled();
  });

  describe('for the reports table', () => {
    it('has the correct topic options', async () => {
      render(<RenderFilterItem />);
      const topic = await screen.findByRole('combobox', { name: 'topic' });
      const options = await within(topic).findAllByRole('option');
      expect(options.length).toBe(7);
      const text = options.map((o) => o.textContent);
      const expectedOptions = [
        'Report ID',
        'Grantee',
        'Start date',
        'Creator',
        'Collaborator',
        'Topic',
        'Last saved',
      ];

      expect(text).toEqual(expectedOptions);
    });
  });

  describe('for the MyAlerts table', () => {
    it('has the correct topic options', async () => {
      render(<RenderFilterItem forMyAlerts />);
      const topic = await screen.findByRole('combobox', { name: 'topic' });
      const options = await within(topic).findAllByRole('option');
      expect(options.length).toBe(6);
      const text = options.map((o) => o.textContent);
      const expectedOptions = [
        'Report ID',
        'Grantee',
        'Start date',
        'Creator',
        'Collaborator',
        'Status',
      ];

      expect(text).toEqual(expectedOptions);
    });
  });

  describe('for non-date topics', () => {
    it('has the correct conditions', async () => {
      render(<RenderFilterItem />);
      const condition = await screen.findByRole('combobox', { name: 'condition' });
      const options = await within(condition).findAllByRole('option');

      expect(options.length).toBe(2);
      const text = options.map((o) => o.textContent);
      const expectedOptions = [
        'Contains',
        'Does not contain',
      ];
      expect(text).toEqual(expectedOptions);
    });

    it('uses the filter item input', async () => {
      render(<RenderFilterItem />);
      const input = await screen.findByRole('textbox');
      expect(input).toBeVisible();
    });
  });

  describe('for date topics', () => {
    it('has the correct conditions', async () => {
      render(<RenderFilterItem topic="startDate" />);
      const condition = await screen.findByRole('combobox', { name: 'condition' });
      const options = await within(condition).findAllByRole('option');

      expect(options.length).toBe(3);
      const text = options.map((o) => o.textContent);
      const expectedOptions = [
        'Is before',
        'Is after',
        'Is within',
      ];
      expect(text).toEqual(expectedOptions);
    });

    it('uses the date picker', async () => {
      render(<RenderFilterItem topic="startDate" condition="Is before" />);
      const input = await screen.findByRole('textbox', { name: 'Date' });
      expect(input).toBeVisible();
    });

    it('uses the date range picker', async () => {
      render(<RenderFilterItem topic="startDate" condition="Is within" />);
      const input = await screen.findByRole('textbox', { name: 'Start Date' });
      expect(input).toBeVisible();
    });
  });
});
