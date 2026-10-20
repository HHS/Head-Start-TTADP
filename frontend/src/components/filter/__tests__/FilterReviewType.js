/* eslint-disable react/prop-types */
import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import fetchMock from 'fetch-mock';
import React from 'react';
import FilterReviewType from '../FilterReviewType';

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

describe('FilterReviewType', () => {
  afterEach(() => {
    fetchMock.restore();
  });

  it('renders with empty data when API returns []', async () => {
    fetchMock.get('/api/delivered-reviews/citation-review-types', []);
    const onApply = jest.fn();

    render(<FilterReviewType onApply={onApply} inputId="test-review-type" query={[]} />);

    await waitFor(() => {
      expect(screen.getByTestId('mock-filter-select')).toBeInTheDocument();
    });

    expect(screen.getByTestId('options')).toHaveTextContent('[]');
  });

  it('transforms fetched types into { value: type, label: type } options', async () => {
    fetchMock.get('/api/delivered-reviews/citation-review-types', [
      'Annual',
      'Follow-up',
      'Special',
    ]);
    const onApply = jest.fn();

    render(<FilterReviewType onApply={onApply} inputId="test-review-type" query={[]} />);

    await waitFor(() => {
      const optionsElement = screen.getByTestId('options');
      const options = JSON.parse(optionsElement.textContent);
      expect(options).toHaveLength(3);
    });

    const options = JSON.parse(screen.getByTestId('options').textContent);
    expect(options[0]).toEqual({ value: 'Annual', label: 'Annual' });
    expect(options[1]).toEqual({ value: 'Follow-up', label: 'Follow-up' });
    expect(options[2]).toEqual({ value: 'Special', label: 'Special' });
  });

  it('passes query as selectedValues to FilterSelect', async () => {
    fetchMock.get('/api/delivered-reviews/citation-review-types', ['Annual', 'Follow-up']);
    const onApply = jest.fn();
    const query = ['Annual', 'Follow-up'];

    render(<FilterReviewType onApply={onApply} inputId="test-review-type" query={query} />);

    await waitFor(() => {
      const selectedValues = JSON.parse(screen.getByTestId('selected-values').textContent);
      expect(selectedValues).toEqual(['Annual', 'Follow-up']);
    });
  });

  it('calls onApply with selected values when apply button is clicked', async () => {
    fetchMock.get('/api/delivered-reviews/citation-review-types', ['Annual']);
    const onApply = jest.fn();

    render(<FilterReviewType onApply={onApply} inputId="test-review-type" query={['Annual']} />);

    await waitFor(() => {
      expect(screen.getByTestId('apply-button')).toBeInTheDocument();
    });

    screen.getByTestId('apply-button').click();

    expect(onApply).toHaveBeenCalledWith(['Annual']);
  });

  it('handles API error gracefully (shows empty options)', async () => {
    fetchMock.get('/api/delivered-reviews/citation-review-types', { status: 500 });
    const onApply = jest.fn();

    render(<FilterReviewType onApply={onApply} inputId="test-review-type" query={[]} />);

    await waitFor(() => {
      const options = JSON.parse(screen.getByTestId('options').textContent);
      expect(options).toEqual([]);
    });
  });

  it('passes correct inputId to FilterSelect', async () => {
    fetchMock.get('/api/delivered-reviews/citation-review-types', []);
    const onApply = jest.fn();

    render(<FilterReviewType onApply={onApply} inputId="custom-input-id-456" query={[]} />);

    await waitFor(() => {
      expect(screen.getByTestId('input-id')).toHaveTextContent('custom-input-id-456');
    });
  });

  it('renders with the label text "Select review type to filter by"', async () => {
    fetchMock.get('/api/delivered-reviews/citation-review-types', ['Annual']);
    const onApply = jest.fn();

    render(<FilterReviewType onApply={onApply} inputId="test-review-type" query={[]} />);

    await waitFor(() => {
      expect(screen.getByTestId('label-text')).toHaveTextContent('Select review type to filter by');
    });
  });
});
