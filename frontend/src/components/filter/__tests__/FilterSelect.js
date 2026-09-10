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
      labelText: 'select user to filter by',
      inputId: 'inputId',
      options: [
        { id: 10, name: 'Ada Lovelace' },
        { id: 20, name: 'Grace Hopper' },
        { id: 30, name: 'Katherine Johnson' },
      ],
      selectedValues: [10, 20, 30],
      mapByValue: true,
      labelProp: 'name',
      valueProp: 'id',
    };
    // eslint-disable-next-line react/jsx-props-no-spreading
    render(<FilterSelect {...props} />);

    expect((await screen.findAllByText('Ada Lovelace')).length).toBeGreaterThan(0);
    expect(await screen.findByText('+ 2 more tags')).toBeVisible();
    expect(screen.queryByText('10')).not.toBeInTheDocument();
  });
});
