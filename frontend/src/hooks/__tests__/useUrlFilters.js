/* eslint-disable react/prop-types */
import '@testing-library/jest-dom';
import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { MemoryRouter, Router } from 'react-router';
import { createMemoryHistory } from 'history';
import useUrlFilters from '../useUrlFilters';

const defaultFilters = [{
  id: 'default-filter',
  topic: 'region',
  condition: 'is',
  query: 1,
}];

const UrlFilters = ({ defaults = defaultFilters }) => {
  const [filters] = useUrlFilters(defaults);

  return (<pre id="filters">{JSON.stringify(filters)}</pre>);
};

const UrlFiltersUpdater = ({ defaults = [], nextFilters }) => {
  const [, updateUrl] = useUrlFilters(defaults);

  React.useEffect(() => {
    updateUrl(nextFilters);
  }, [nextFilters, updateUrl]);

  return null;
};

const renderUrlFilters = (initialEntries = ['/dashboards/regional-dashboard/activity-reports?topic.in[]=Behavioral%20%2F%20Mental%20Health%20%2F%20Trauma']) => render(
  <MemoryRouter initialEntries={initialEntries}>
    <UrlFilters />
  </MemoryRouter>,
);

describe('useUrlFilters', () => {
  it('derives filters from the URL when present', async () => {
    renderUrlFilters();

    const filters = JSON.parse(document.querySelector('#filters').textContent);
    expect(filters.length).toBe(1);
    expect(filters[0].topic).toBe('topic');
    expect(filters[0].condition).toBe('is');
    expect(JSON.stringify(filters[0].query)).toBe(JSON.stringify(['Behavioral / Mental Health / Trauma']));
  });

  it('falls back to the provided default filters when the URL has no filters', async () => {
    renderUrlFilters(['/activity-reports']);

    const filters = JSON.parse(document.querySelector('#filters').textContent);
    expect(filters).toEqual(defaultFilters);
  });

  it('updates the URL when filters change', async () => {
    const history = createMemoryHistory({
      initialEntries: ['/activity-reports'],
    });

    render(
      <Router history={history}>
        <UrlFiltersUpdater
          nextFilters={[{
            topic: 'region',
            condition: 'is',
            query: 1,
          }]}
        />
      </Router>,
    );

    await waitFor(() => expect(history.location.search).toBe('?region.in[]=1'));
  });

  it('does not push a new history entry when the search string is unchanged', async () => {
    const history = createMemoryHistory({
      initialEntries: ['/activity-reports?region.in[]=1'],
    });
    const pushSpy = jest.spyOn(history, 'push');

    render(
      <Router history={history}>
        <UrlFiltersUpdater
          nextFilters={[{
            topic: 'region',
            condition: 'is',
            query: 1,
          }]}
        />
      </Router>,
    );

    await waitFor(() => expect(history.location.search).toBe('?region.in[]=1'));
    expect(pushSpy).not.toHaveBeenCalled();
  });
});
