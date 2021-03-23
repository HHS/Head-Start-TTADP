import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import selectEvent from 'react-select-event';
import { act } from 'react-dom/test-utils';
import { useForm } from 'react-hook-form/dist/index.ie11';
import userEvent from '@testing-library/user-event';
import { Label } from '@trussworks/react-uswds';

import MultiSelect from '../MultiSelect';

const options = [
  { label: 'one', value: 'one' },
  { label: 'two', value: 'two' },
];

describe('MultiSelect', () => {
  // eslint-disable-next-line react/prop-types
  const TestMultiSelect = ({ onSubmit }) => {
    const { control, handleSubmit } = useForm({
      defaultValues: { name: [] },
      mode: 'all',
    });

    const submit = (data) => {
      onSubmit(data);
    };

    return (
      <form onSubmit={handleSubmit(submit)}>
        <Label>
          label
          <MultiSelect
            control={control}
            name="name"
            options={options}
            required={false}
          />
          <button data-testid="submit" type="submit">submit</button>
        </Label>
      </form>
    );
  };

  it('selected value is an array of strings', async () => {
    const onSubmit = jest.fn();
    render(<TestMultiSelect onSubmit={onSubmit} />);
    await selectEvent.select(screen.getByLabelText('label'), ['one']);
    await act(async () => {
      userEvent.click(screen.getByTestId('submit'));
    });
    expect(onSubmit).toHaveBeenCalledWith({ name: ['one'] });
  });

  it('null values do not cause an error', async () => {
    const onSubmit = jest.fn();
    render(<TestMultiSelect onSubmit={onSubmit} />);
    const select = screen.getByLabelText('label');
    await selectEvent.select(select, ['one']);
    await selectEvent.clearAll(select);
    await act(async () => {
      userEvent.click(screen.getByTestId('submit'));
    });
    expect(onSubmit).toHaveBeenCalledWith({ name: [] });
  });
});
