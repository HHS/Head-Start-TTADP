import '@testing-library/jest-dom';
import React from 'react';
import { render } from '@testing-library/react';
import useUrlFilters from '../useUrlFilters';
import { mockWindowProperty } from '../../testHelpers';

const UrlFilters = () => {
  const [filters] = useUrlFilters('test');

  return (
    <>
      <pre id="filters">{JSON.stringify(filters)}</pre>
    </>
  );
};

const renderUrlFilters = () => render(<UrlFilters />);

describe('useUrlFilters', () => {
  mockWindowProperty('location', new URL('http://localhost:3000/regional-dashboard?topic.in[]=Behavioral%20%2F%20Mental%20Health%20%2F%20Trauma'));

  it('saves state to local storage', async () => {
    renderUrlFilters();

    const filters = JSON.parse(document.querySelector('#filters').textContent);
    expect(filters.length).toBe(1);
    expect(filters[0].topic).toBe('topic');
    expect(filters[0].condition).toBe('Is');
    expect(JSON.stringify(filters[0].query)).toBe(JSON.stringify(['Behavioral / Mental Health / Trauma']));
  });
});
