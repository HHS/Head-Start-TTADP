/* eslint-disable react/prop-types */
import '@testing-library/jest-dom';
import React from 'react';
import {
  render,
  screen,
  act,
} from '@testing-library/react';
import selectEvent from 'react-select-event';
import ConditionalMultiselect from '../ConditionalMultiselect';

describe('ConditionalMultiselect', () => {
  const CM = ({
    fieldData = {
      fieldType: 'partytime',
      title: 'Test',
      prompt: 'What is a test?',
      options: ['option1', 'option2'],
      validations: {
        required: false,
        rules: [
          {
            name: 'maxSelections',
            value: 1,
            message: 'How DARE you',
          },
        ],
      },
      response: [],
    },
    validations = {
      required: false,
      rules: [
        {
          name: 'maxSelections',
          value: 1,
          message: 'How DARE you',
        },
      ],
    },
    fieldName = 'test',
    fieldValue = [],
    onBlur = jest.fn(),
    onChange = jest.fn(),
    error = <></>,
    userCanEdit = true,
  }) => (
    <>
      <ConditionalMultiselect
        fieldData={fieldData}
        validations={validations}
        fieldName={fieldName}
        fieldValue={fieldValue}
        onBlur={onBlur}
        onChange={onChange}
        error={error}
        userCanEdit={userCanEdit}
      />
      <button type="button">for blurrin</button>
    </>
  );

  it('renders a prompt', async () => {
    const onChange = jest.fn();
    act(() => {
      render(<CM onChange={onChange} />);
    });
    expect(screen.getByText('What is a test?')).toBeInTheDocument();

    await selectEvent.select(screen.getByLabelText('What is a test?'), ['option1']);

    expect(onChange).toHaveBeenCalled();
  });

  it('renders a prompt with null field value', async () => {
    act(() => {
      render(<CM fieldValue={null} />);
    });
    expect(screen.getByText('What is a test?')).toBeInTheDocument();
  });

  it('calls onBlur with selected options on blur', async () => {
    const onBlur = jest.fn();
    render(<CM onBlur={onBlur} fieldValue={['option1']} userCanEdit />);

    const selectInput = screen.getByLabelText('What is a test?');
    await selectEvent.select(selectInput, ['option1']);
    selectInput.focus();
    selectInput.blur();

    expect(onBlur).toHaveBeenCalledWith([{ label: 'option1', value: 0 }]);
  });
});
