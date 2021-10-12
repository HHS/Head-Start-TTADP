import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import selectEvent from 'react-select-event';
import { act } from 'react-dom/test-utils';
import { useForm } from 'react-hook-form/dist/index.ie11';
import userEvent from '@testing-library/user-event';
import { Label } from '@trussworks/react-uswds';

import MultiSelect, { sortSelect } from '../MultiSelect';

const options = [
  { label: 'one', value: 'one' },
  { label: 'two', value: 'two' },
];

const customOptions = [
  { id: 1, name: 'Approver 1', User: { id: 1, fullName: 'Approver 1' } },
  { id: 2, name: 'Approver 2', User: { id: 2, fullName: 'Approver 2' } },
  { id: 3, name: 'Approver 3', User: { id: 3, fullName: 'Approver 3' } },
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

  const CustomOptionMultiSelect = ({
    // eslint-disable-next-line react/prop-types
    onSubmit, valueProperty, valueLabel,
  }) => {
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
            required={false}
            simple={false}
            valueProperty={valueProperty}
            labelProperty={valueLabel}
            options={customOptions.map((a) => ({ value: a.id, label: a.name }))}
          />
          <button data-testid="submit" type="submit">submit</button>
        </Label>
      </form>
    );
  };

  it('expects multi select to remain open after selection', async () => {
    const onSubmit = jest.fn();
    render(<TestMultiSelect onSubmit={onSubmit} />);
    await selectEvent.select(screen.getByLabelText('label'), ['one']);
    expect(await screen.findByText('two')).toBeVisible();
  });

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

  it('expects multi select to maintain original options structure', async () => {
    const onSubmit = jest.fn();
    render(<CustomOptionMultiSelect onSubmit={onSubmit} valueLabel="User.fullName" valueProperty="User.id" />);
    await selectEvent.select(screen.getByLabelText('label'), ['Approver 1']);
    await act(async () => {
      userEvent.click(screen.getByTestId('submit'));
    });
    expect(onSubmit).toHaveBeenCalledWith({ name: [{ value: 1, label: 'Approver 1', User: { id: 1, fullName: 'Approver 1' } }] });
  });

  it('sorts correctly!', () => {
    const data = [
      {
        label: 'spinach',
      },
      {
        label: 'Hamburger',
      },
      {
        label: 'Cheeseburger',
      },
      {
        label: 'Happy meal',
      },
      {
        label: 'Arugula',
      },
    ];

    data.sort(sortSelect);

    expect(data).toStrictEqual([
      {
        label: 'Arugula',
      },
      {
        label: 'Cheeseburger',
      },
      {
        label: 'Hamburger',
      },
      {
        label: 'Happy meal',
      },

      {
        label: 'spinach',
      },
    ]);
  });
});
