import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import useFetch from '../../../hooks/useFetch';
import FilterFindingCategory from '../FilterFindingCategory';

jest.mock('../../../hooks/useFetch');

jest.mock(
  '../FilterSelect',
  () =>
    function MockFilterSelect({ options, selectedValues, onApply, inputId, labelText }) {
      return (
        <div data-testid="mock-filter-select">
          <div data-testid="label-text">{labelText}</div>
          <div data-testid="options">{JSON.stringify(options)}</div>
          <div data-testid="selected-values">{JSON.stringify(selectedValues)}</div>
          <button
            type="button"
            data-testid="apply-button"
            onClick={() => onApply && onApply(selectedValues)}
          >
            Apply
          </button>
          <span data-testid="input-id">{inputId}</span>
        </div>
      );
    }
);

describe('FilterFindingCategory', () => {
  const defaultProps = {
    onApply: jest.fn(),
    inputId: 'finding-category-input',
    query: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    useFetch.mockReturnValue({ data: [] });
  });

  it('renders without crashing', () => {
    render(<FilterFindingCategory {...defaultProps} />);
    expect(screen.getByTestId('mock-filter-select')).toBeInTheDocument();
  });

  it('renders with the correct label text', () => {
    render(<FilterFindingCategory {...defaultProps} />);
    expect(screen.getByTestId('label-text')).toHaveTextContent(
      'Select finding category to filter by'
    );
  });

  it('maps fetched category names to options with matching value and label', () => {
    useFetch.mockReturnValue({ data: ['Area of Concern', 'Deficiency', 'Noncompliance'] });

    render(<FilterFindingCategory {...defaultProps} />);

    const options = JSON.parse(screen.getByTestId('options').textContent);
    expect(options).toHaveLength(3);
    expect(options[0]).toEqual({ value: 'Area of Concern', label: 'Area of Concern' });
    expect(options[1]).toEqual({ value: 'Deficiency', label: 'Deficiency' });
    expect(options[2]).toEqual({ value: 'Noncompliance', label: 'Noncompliance' });
  });

  it('renders empty options when data is empty', () => {
    useFetch.mockReturnValue({ data: [] });

    render(<FilterFindingCategory {...defaultProps} />);

    const options = JSON.parse(screen.getByTestId('options').textContent);
    expect(options).toEqual([]);
  });

  it('passes query as selectedValues to FilterSelect', () => {
    const query = ['Deficiency'];
    render(<FilterFindingCategory {...defaultProps} query={query} />);
    const selectedValues = JSON.parse(screen.getByTestId('selected-values').textContent);
    expect(selectedValues).toEqual(query);
  });

  it('passes inputId through to FilterSelect', () => {
    render(<FilterFindingCategory {...defaultProps} inputId="test-id-456" />);
    expect(screen.getByTestId('input-id')).toHaveTextContent('test-id-456');
  });

  it('calls onApply with selectedValues when apply is clicked', async () => {
    const onApply = jest.fn();
    const query = ['Area of Concern'];
    render(<FilterFindingCategory {...defaultProps} onApply={onApply} query={query} />);

    userEvent.click(screen.getByTestId('apply-button'));

    await waitFor(() => {
      expect(onApply).toHaveBeenCalledWith(query);
    });
  });

  it('calls useFetch with getFindingCategories fetcher and empty dependencies', () => {
    const { getFindingCategories } = require('../../../fetchers/monitoring');
    render(<FilterFindingCategory {...defaultProps} />);
    expect(useFetch).toHaveBeenCalledWith(
      [],
      getFindingCategories,
      [],
      'Error fetching finding categories'
    );
  });
});
