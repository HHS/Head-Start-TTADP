import { render, screen } from '@testing-library/react';
import React from 'react';
import FilterSelect from '../FilterSelect';

describe('FilterSelect', () => {
  const renderFilterSelect = () => {
    const props = {
      onApply: jest.fn(),
      labelText: 'pick your favorite',
      inputId: 'inputId',
      options: [
        {
          value: 1,
          label: 'bananagrams',
        },
        {
          value: 2,
          label: 'monopoly (classic edition)',
        },
        {
          value: 3,
          label: 'clue but a fancy tin version like the kind you get at barnes and noble',
        },
      ],
      selectedValues: [
        'clue but a fancy tin version like the kind you get at barnes and noble',
        'bananagrams',
      ],
      mapByValue: false,
    };
    // eslint-disable-next-line react/jsx-props-no-spreading
    render(<FilterSelect {...props} />);
  };

  it('contracts the contents when there are long selections', async () => {
    renderFilterSelect();
    expect(await screen.findByText('clue but ...noble')).toBeVisible();
    expect(await screen.findByText('+ 1 more tag')).toBeVisible();
  });

  it('shows labels instead of raw values in the truncated display when mapByValue is set', async () => {
    const props = {
      onApply: jest.fn(),
      labelText: 'select group to filter by',
      inputId: 'inputId',
      options: [
        { value: '10', label: 'Region 1 Group' },
        { value: '20', label: 'Region 2 Group' },
        { value: '30', label: 'Region 3 Group' },
      ],
      selectedValues: [10, 20, 30],
      mapByValue: true,
      labelProp: 'label',
      valueProp: 'value',
    };
    // eslint-disable-next-line react/jsx-props-no-spreading
    render(<FilterSelect {...props} />);

    expect((await screen.findAllByText('Region 1 Group')).length).toBeGreaterThan(0);
    expect(await screen.findByText('+ 2 more tags')).toBeVisible();
    expect(screen.queryByText('10')).not.toBeInTheDocument();
  });
});
