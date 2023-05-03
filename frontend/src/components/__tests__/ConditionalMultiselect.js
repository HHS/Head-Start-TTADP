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
    isOnReport = false,
    onBlur = jest.fn(),
    onChange = jest.fn(),
    error = <></>,
    isComplete = false,
  }) => (
    <>
      <ConditionalMultiselect
        fieldData={fieldData}
        validations={validations}
        fieldName={fieldName}
        fieldValue={fieldValue}
        isOnReport={isOnReport}
        onBlur={onBlur}
        onChange={onChange}
        error={error}
        isComplete={isComplete}
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
});
