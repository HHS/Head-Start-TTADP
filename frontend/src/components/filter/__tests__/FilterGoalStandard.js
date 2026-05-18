/* eslint-disable react/prop-types */
import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import fetchMock from 'fetch-mock';
import React from 'react';
import FilterGoalStandard from '../FilterGoalStandard';

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

const FILTER_STANDARDS_URL = '/api/goal-templates/filter-standards';

describe('FilterGoalStandard', () => {
  afterEach(() => {
    fetchMock.restore();
  });

  it('renders with empty standards list', async () => {
    fetchMock.get(FILTER_STANDARDS_URL, []);
    const onApply = jest.fn();

    render(<FilterGoalStandard onApply={onApply} inputId="test-goal-standard" query={[]} />);

    await waitFor(() => {
      expect(screen.getByTestId('mock-filter-select')).toBeInTheDocument();
    });

    expect(screen.getByTestId('label-text')).toHaveTextContent('Select goal standard to filter by');
    expect(screen.getByTestId('options')).toHaveTextContent('[]');
  });

  it('transforms standards into options with label and value as text', async () => {
    fetchMock.get(FILTER_STANDARDS_URL, [
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

    expect(options[0]).toEqual({ label: 'Early Language and Literacy', value: 'Early Language and Literacy' });
    expect(options[1]).toEqual({ label: 'Social Emotional Development', value: 'Social Emotional Development' });
    expect(options[2]).toEqual({ label: 'Health and Wellness', value: 'Health and Wellness' });
  });

  it('includes Monitoring as an option', async () => {
    fetchMock.get(FILTER_STANDARDS_URL, ['ERSEA', 'FEI', 'Monitoring']);
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
    fetchMock.get(FILTER_STANDARDS_URL, ['Standard 1', 'Standard 2']);
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
    fetchMock.get(FILTER_STANDARDS_URL, ['Standard 1']);
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
    fetchMock.get(FILTER_STANDARDS_URL, { status: 500 });
    const onApply = jest.fn();

    render(<FilterGoalStandard onApply={onApply} inputId="test-goal-standard" query={[]} />);

    await waitFor(() => {
      const optionsElement = screen.getByTestId('options');
      const options = JSON.parse(optionsElement.textContent);
      expect(options).toEqual([]);
    });
  });

  it('passes correct inputId to FilterSelect', async () => {
    fetchMock.get(FILTER_STANDARDS_URL, []);
    const onApply = jest.fn();

    render(
      <FilterGoalStandard onApply={onApply} inputId="custom-input-id-123" query={[]} />
    );

    await waitFor(() => {
      expect(screen.getByTestId('input-id')).toHaveTextContent('custom-input-id-123');
    });
  });

  it('renders correct label text for filter', async () => {
    fetchMock.get(FILTER_STANDARDS_URL, ['Test Standard']);
    const onApply = jest.fn();

    render(<FilterGoalStandard onApply={onApply} inputId="test-goal-standard" query={[]} />);

    await waitFor(() => {
      expect(screen.getByTestId('label-text')).toHaveTextContent(
        'Select goal standard to filter by'
      );
    });
  });
});


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
  afterEach(() => {
    fetchMock.restore();
  });

  it('renders with empty goal templates', async () => {
    fetchMock.get('/api/goal-templates', []);
    const onApply = jest.fn();

    render(<FilterGoalStandard onApply={onApply} inputId="test-goal-standard" query={[]} />);

    await waitFor(() => {
      expect(screen.getByTestId('mock-filter-select')).toBeInTheDocument();
    });

    expect(screen.getByTestId('label-text')).toHaveTextContent('Select goal standard to filter by');
    expect(screen.getByTestId('options')).toHaveTextContent('[]');
  });

  it('transforms goal templates into options with label and value', async () => {
    const mockTemplates = [
      { id: 1, standard: 'Early Language and Literacy' },
      { id: 2, standard: 'Social Emotional Development' },
      { id: 3, standard: 'Health and Wellness' },
    ];
    fetchMock.get('/api/goal-templates', mockTemplates);
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
      value: 1,
    });
    expect(options[1]).toEqual({
      label: 'Social Emotional Development',
      value: 2,
    });
    expect(options[2]).toEqual({
      label: 'Health and Wellness',
      value: 3,
    });
  });

  it('passes query values as selectedValues to FilterSelect', async () => {
    const mockTemplates = [
      { id: 1, standard: 'Standard 1' },
      { id: 2, standard: 'Standard 2' },
    ];
    fetchMock.get('/api/goal-templates', mockTemplates);
    const onApply = jest.fn();
    const query = ['1', '2'];

    render(<FilterGoalStandard onApply={onApply} inputId="test-goal-standard" query={query} />);

    await waitFor(() => {
      const selectedValuesElement = screen.getByTestId('selected-values');
      const selectedValues = JSON.parse(selectedValuesElement.textContent);
      expect(selectedValues).toEqual(['1', '2']);
    });
  });

  it('calls onApply with selected values', async () => {
    const mockTemplates = [
      { id: 1, standard: 'Standard 1' },
      { id: 2, standard: 'Standard 2' },
    ];
    fetchMock.get('/api/goal-templates', mockTemplates);
    const onApply = jest.fn();

    render(<FilterGoalStandard onApply={onApply} inputId="test-goal-standard" query={['1']} />);

    await waitFor(() => {
      expect(screen.getByTestId('apply-button')).toBeInTheDocument();
    });

    const applyButton = screen.getByTestId('apply-button');
    applyButton.click();

    expect(onApply).toHaveBeenCalledWith(['1']);
  });

  it('handles error when fetching goal templates', async () => {
    fetchMock.get('/api/goal-templates', { status: 500 });
    const onApply = jest.fn();

    render(<FilterGoalStandard onApply={onApply} inputId="test-goal-standard" query={[]} />);

    await waitFor(() => {
      const optionsElement = screen.getByTestId('options');
      const options = JSON.parse(optionsElement.textContent);
      expect(options).toEqual([]);
    });
  });

  it('passes correct inputId to FilterSelect', async () => {
    fetchMock.get('/api/goal-templates', []);
    const onApply = jest.fn();
    const testInputId = 'custom-input-id-123';

    render(<FilterGoalStandard onApply={onApply} inputId={testInputId} query={[]} />);

    await waitFor(() => {
      expect(screen.getByTestId('input-id')).toHaveTextContent(testInputId);
    });
  });

  it('fetches goal templates on component mount', async () => {
    fetchMock.get('/api/goal-templates', []);
    const onApply = jest.fn();

    render(<FilterGoalStandard onApply={onApply} inputId="test-goal-standard" query={[]} />);

    await waitFor(() => {
      expect(fetchMock.called()).toBeTruthy();
    });
  });

  it('renders correct label text for filter', async () => {
    fetchMock.get('/api/goal-templates', [{ id: 1, standard: 'Test Standard' }]);
    const onApply = jest.fn();

    render(<FilterGoalStandard onApply={onApply} inputId="test-goal-standard" query={[]} />);

    await waitFor(() => {
      expect(screen.getByTestId('label-text')).toHaveTextContent(
        'Select goal standard to filter by'
      );
    });
  });

  it('includes Monitoring as an option', async () => {
    const mockTemplates = [
      { id: 1, standard: 'FEI' },
      { id: 2, standard: 'Monitoring' },
      { id: 3, standard: 'ERSEA' },
    ];
    fetchMock.get('/api/goal-templates', mockTemplates);
    const onApply = jest.fn();

    render(<FilterGoalStandard onApply={onApply} inputId="test-goal-standard" query={[]} />);

    await waitFor(() => {
      const optionsElement = screen.getByTestId('options');
      const options = JSON.parse(optionsElement.textContent);
      expect(options).toHaveLength(3);
      expect(options.some(({ label }) => label === 'Monitoring')).toBe(true);
    });
  });
});
