/* eslint-disable react/prop-types */
import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import FilterGoalStandard from '../FilterGoalStandard';

jest.mock('../../../fetchers/goalTemplates', () => ({
  getGoalTemplateFilterStandards: jest.fn(),
}));

// eslint-disable-next-line import/no-unresolved
const { getGoalTemplateFilterStandards } = require('../../../fetchers/goalTemplates');

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

describe('FilterGoalStandard', () => {
  beforeEach(() => {
    getGoalTemplateFilterStandards.mockReset();
  });

  it('renders with empty standards list', async () => {
    getGoalTemplateFilterStandards.mockResolvedValue([]);
    const onApply = jest.fn();

    render(<FilterGoalStandard onApply={onApply} inputId="test-goal-standard" query={[]} />);

    await waitFor(() => {
      expect(screen.getByTestId('mock-filter-select')).toBeInTheDocument();
    });

    expect(screen.getByTestId('label-text')).toHaveTextContent('Select goal standard to filter by');
    expect(screen.getByTestId('options')).toHaveTextContent('[]');
  });

  it('transforms standards into options with label and value as text', async () => {
    getGoalTemplateFilterStandards.mockResolvedValue([
      'Early Language and Literacy',
      'Social Emotional Development',
      'Health and Wellness',
    ]);
    const onApply = jest.fn();

    render(<FilterGoalStandard onApply={onApply} inputId="test-goal-standard" query={[]} />);

    await waitFor(() => {
      const optionsElement = screen.getByTestId('options');
      const options = JSON.parse(optionsElement.textContent);
      expect(options).toHaveLength(3);
    });

    const optionsElement = screen.getByTestId('options');
    const options = JSON.parse(optionsElement.textContent);

    expect(options[0]).toEqual({
      label: 'Early Language and Literacy',
      value: 'Early Language and Literacy',
    });
    expect(options[1]).toEqual({
      label: 'Social Emotional Development',
      value: 'Social Emotional Development',
    });
    expect(options[2]).toEqual({ label: 'Health and Wellness', value: 'Health and Wellness' });
  });

  it('includes Monitoring as an option', async () => {
    getGoalTemplateFilterStandards.mockResolvedValue(['ERSEA', 'FEI', 'Monitoring']);
    const onApply = jest.fn();

    render(<FilterGoalStandard onApply={onApply} inputId="test-goal-standard" query={[]} />);

    await waitFor(() => {
      const optionsElement = screen.getByTestId('options');
      const options = JSON.parse(optionsElement.textContent);
      expect(options).toHaveLength(3);
      expect(options.some(({ label }) => label === 'Monitoring')).toBe(true);
    });
  });

  it('passes query values as selectedValues to FilterSelect', async () => {
    getGoalTemplateFilterStandards.mockResolvedValue(['Standard 1', 'Standard 2']);
    const onApply = jest.fn();
    const query = ['Standard 1', 'Standard 2'];

    render(<FilterGoalStandard onApply={onApply} inputId="test-goal-standard" query={query} />);

    await waitFor(() => {
      const selectedValuesElement = screen.getByTestId('selected-values');
      const selectedValues = JSON.parse(selectedValuesElement.textContent);
      expect(selectedValues).toEqual(['Standard 1', 'Standard 2']);
    });
  });

  it('calls onApply with selected values', async () => {
    getGoalTemplateFilterStandards.mockResolvedValue(['Standard 1']);
    const onApply = jest.fn();

    render(
      <FilterGoalStandard onApply={onApply} inputId="test-goal-standard" query={['Standard 1']} />
    );

    await waitFor(() => {
      expect(screen.getByTestId('apply-button')).toBeInTheDocument();
    });

    screen.getByTestId('apply-button').click();

    expect(onApply).toHaveBeenCalledWith(['Standard 1']);
  });

  it('handles error when fetching standards', async () => {
    getGoalTemplateFilterStandards.mockRejectedValue(new Error('fetch failed'));
    const onApply = jest.fn();

    render(<FilterGoalStandard onApply={onApply} inputId="test-goal-standard" query={[]} />);

    await waitFor(() => {
      const optionsElement = screen.getByTestId('options');
      const options = JSON.parse(optionsElement.textContent);
      expect(options).toEqual([]);
    });
  });

  it('passes correct inputId to FilterSelect', async () => {
    getGoalTemplateFilterStandards.mockResolvedValue([]);
    const onApply = jest.fn();

    render(<FilterGoalStandard onApply={onApply} inputId="custom-input-id-123" query={[]} />);

    await waitFor(() => {
      expect(screen.getByTestId('input-id')).toHaveTextContent('custom-input-id-123');
    });
  });

  it('renders correct label text for filter', async () => {
    getGoalTemplateFilterStandards.mockResolvedValue(['Test Standard']);
    const onApply = jest.fn();

    render(<FilterGoalStandard onApply={onApply} inputId="test-goal-standard" query={[]} />);

    await waitFor(() => {
      expect(screen.getByTestId('label-text')).toHaveTextContent(
        'Select goal standard to filter by'
      );
    });
  });
});
