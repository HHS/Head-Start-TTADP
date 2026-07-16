/* eslint-disable react/prop-types */
import '@testing-library/jest-dom';
import { act, render } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import React from 'react';
import { Router } from 'react-router';
import useSanitizedFilters from '../useSanitizedFilters';

const VALID_TOPICS = new Set(['startDate', 'endDate']);

const defaultFilters = [
  {
    id: 'default-1',
    topic: 'startDate',
    condition: 'is within',
    query: '2026/01/01-2026/07/01',
  },
];

const SanitizedFilters = ({ topics = VALID_TOPICS }) => {
  const [filters] = useSanitizedFilters('test-key', defaultFilters, topics);
  return <pre id="filters">{JSON.stringify(filters)}</pre>;
};

const renderWithHistory = (history) =>
  render(
    <Router history={history}>
      <SanitizedFilters />
    </Router>
  );

const readFilters = () => JSON.parse(document.querySelector('#filters').textContent);

describe('useSanitizedFilters', () => {
  afterEach(() => {
    window.sessionStorage.clear();
  });

  it('returns the default filters when the URL has none', () => {
    const history = createMemoryHistory({ initialEntries: ['/history'] });
    act(() => {
      renderWithHistory(history);
    });

    expect(readFilters()).toEqual(defaultFilters);
  });

  it('strips filters whose topic is not allowed', () => {
    const history = createMemoryHistory({
      initialEntries: ['/history?endDate.aft=2026%2F07%2F02&role.nin[]=Specialist'],
    });

    act(() => {
      renderWithHistory(history);
    });

    const filters = readFilters();
    expect(filters).toHaveLength(1);
    expect(filters[0].topic).toBe('endDate');
    expect(filters.some((f) => f.topic === 'role')).toBe(false);
  });

  it('cleans invalid filters out of the URL', async () => {
    const history = createMemoryHistory({
      initialEntries: ['/history?endDate.aft=2026%2F07%2F02&role.nin[]=Specialist'],
    });

    act(() => {
      renderWithHistory(history);
    });

    expect(history.location.search).not.toContain('role.nin');
    expect(history.location.search).toContain('endDate.aft');
  });

  it('does not rewrite the URL when all filters are valid', () => {
    const history = createMemoryHistory({
      initialEntries: ['/history?endDate.aft=2026%2F07%2F02'],
    });

    act(() => {
      renderWithHistory(history);
    });

    // The URL is untouched and no new history entry is pushed when the filters
    // are already valid.
    expect(history.location.search).toBe('?endDate.aft=2026%2F07%2F02');
    expect(history.length).toBe(1);
  });
});
