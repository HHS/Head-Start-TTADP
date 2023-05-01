/* eslint-disable react/prop-types */
import '@testing-library/jest-dom';
import React from 'react';
import {
  render,
  screen,
  act,
} from '@testing-library/react';
import selectEvent from 'react-select-event';
import ConditionalFields from '../ConditionalFields';

describe('ConditionalFields', () => {
  const CF = ({
    errors = {},
    prompts = [],
    isOnReport = false,
    setPrompts = jest.fn(),
    validatePrompts = jest.fn(),
  }) => (
    <>
      <ConditionalFields
        errors={errors}
        prompts={prompts}
        isOnReport={isOnReport}
        setPrompts={setPrompts}
        validatePrompts={validatePrompts}
      />
      <button type="button">for blurrin</button>
    </>
  );

  it('renders a prompt', async () => {
    const prompts = [{
      fieldType: 'multiselect',
      title: 'Test',
      prompt: 'What is a test?',
      options: ['option1', 'option2'],
      validations: { rules: [] },
      response: [],
    }];
    act(() => {
      render(<CF prompts={prompts} />);
    });
    expect(screen.getByText('What is a test?')).toBeInTheDocument();
  });

  it('calls on change & validate prompts', async () => {
    const setPrompts = jest.fn();
    const prompts = [{
      fieldType: 'multiselect',
      title: 'Test',
      prompt: 'What is a test?',
      options: ['option1', 'option2', 'option3'],
      validations: { rules: [] },
      response: [],
    }];
    act(() => {
      render(<CF prompts={prompts} setPrompts={setPrompts} />);
    });

    await selectEvent.select(screen.getByLabelText('What is a test?'), ['option1']);

    expect(setPrompts).toHaveBeenCalled();
  });
});
