import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import FilterFindingType from '../FilterFindingType';

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

describe('FilterFindingType', () => {
  const defaultProps = {
    onApply: jest.fn(),
    inputId: 'finding-type-input',
    query: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<FilterFindingType {...defaultProps} />);
    expect(screen.getByTestId('mock-filter-select')).toBeInTheDocument();
  });

  it('renders with the correct label text', () => {
    render(<FilterFindingType {...defaultProps} />);
    expect(screen.getByTestId('label-text')).toHaveTextContent('Select finding type to filter by');
  });

  it('renders all 3 finding type options', () => {
    render(<FilterFindingType {...defaultProps} />);
    const options = JSON.parse(screen.getByTestId('options').textContent);
    expect(options).toHaveLength(3);
    expect(options[0]).toEqual({ value: 0, label: 'Area of Concern' });
    expect(options[1]).toEqual({ value: 1, label: 'Noncompliance' });
    expect(options[2]).toEqual({ value: 2, label: 'Deficiency' });
  });

  it('calls onApply with selectedValues when apply is clicked', async () => {
    const onApply = jest.fn();
    const query = ['Area of Concern', 'Noncompliance'];
    render(<FilterFindingType {...defaultProps} onApply={onApply} query={query} />);

    userEvent.click(screen.getByTestId('apply-button'));

    await waitFor(() => {
      expect(onApply).toHaveBeenCalledWith(query);
    });
  });

  it('passes the query prop as selectedValues', () => {
    const query = ['Deficiency'];
    render(<FilterFindingType {...defaultProps} query={query} />);
    const selectedValues = JSON.parse(screen.getByTestId('selected-values').textContent);
    expect(selectedValues).toEqual(query);
  });

  it('passes the inputId prop through', () => {
    render(<FilterFindingType {...defaultProps} inputId="test-id-123" />);
    expect(screen.getByTestId('input-id')).toHaveTextContent('test-id-123');
  });
});
