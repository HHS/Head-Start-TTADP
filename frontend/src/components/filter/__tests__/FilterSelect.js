import React from 'react';
import { render, screen } from '@testing-library/react';
import FilterSelect from '../FilterSelect';

describe('FilterSelect', () => {
  const renderFilterSelect = () => {
    const props = {
      onApply: jest.fn(),
      labelText: 'pick your favorite',
      inputId: 'inputId',
      options: [{
        value: 1,
        label: 'bananagrams',
      }, {
        value: 2,
        label: 'monopoly (classic edition)',
      }, {
        value: 3,
        label: 'clue but a fancy tin version like the kind you get at barnes and noble',
      }],
      selectedValues: ['clue but a fancy tin version like the kind you get at barnes and noble', 'bananagrams'],
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
});
