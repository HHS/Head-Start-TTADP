import '@testing-library/jest-dom';
import React from 'react';
import {
  render,
  screen,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FilterTTAType, { displayTtaTypeQuery } from '../FilterTTAType';

const { findByRole } = screen;

describe('displayTtaTypeQuery', () => {
  it('returns the correct string for training', () => {
    expect(displayTtaTypeQuery('training')).toEqual('Training');
  });

  it('returns the correct string for technical-assistance', () => {
    expect(displayTtaTypeQuery('technical-assistance')).toEqual('Technical assistance');
  });

  it('returns the correct string for both', () => {
    expect(displayTtaTypeQuery('training,technical-assistance')).toEqual('Training and technical assistance');
  });

  it('returns an empty string for an empty string', () => {
    expect(displayTtaTypeQuery('')).toEqual('');
  });
});

describe('FilterTTAType', () => {
  const renderTTATypeSelect = (appliedType, onApply) => (
    render(
      <FilterTTAType
        onApply={onApply}
        inputId="curly"
        appliedTTAType={appliedType}
      />,
    ));

  it('calls the onapply handler', async () => {
    const onApply = jest.fn();
    renderTTATypeSelect('technical-assistance', onApply);
    const select = await findByRole('combobox', { name: /Select tta type to filter by/i });
    userEvent.selectOptions(select, 'training');
    expect(onApply).toHaveBeenCalled();
  });
});
