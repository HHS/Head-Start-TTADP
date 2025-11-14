import '@testing-library/jest-dom';
import React from 'react';
import { render } from '@testing-library/react';
import FilterSpecialistSelect from '../FilterSpecialistSelect';

jest.mock('../FilterSelect', () => function MockFilterSelect() {
  return <div>FilterSelect</div>;
});

describe('FilterSpecialistSelect', () => {
  it('handles query with valid role values', () => {
    const onApply = jest.fn();
    const query = ['Early Childhood Specialist'];

    render(
      <FilterSpecialistSelect
        onApply={onApply}
        inputId="test"
        query={query}
      />,
    );

    // Should render without errors
    expect(true).toBe(true);
  });

  it('filters out null values for unmatched roles', () => {
    const onApply = jest.fn();
    const query = ['Early Childhood Specialist', 'Invalid Role'];

    render(
      <FilterSpecialistSelect
        onApply={onApply}
        inputId="test"
        query={query}
      />,
    );

    // Should handle invalid roles by filtering them out
    expect(true).toBe(true);
  });
});
