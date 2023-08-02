/* eslint-disable react/prop-types */
import '@testing-library/jest-dom';
import React from 'react';
import {
  render,
  screen,
  act,
} from '@testing-library/react';
import selectEvent from 'react-select-event';
import userEvent from '@testing-library/user-event';
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

  it('renders nothing if null prompts', async () => {
    const prompts = null;
    act(() => {
      render(<CF prompts={prompts} />);
    });
    expect(screen.queryByText('What is a test?')).toBeNull();
  });

  it('renders nothing if fieldType is not in dictionary', async () => {
    const prompts = [{
      fieldType: 'partytime',
      title: 'Test',
      prompt: 'What is a test?',
      options: ['option1', 'option2'],
      validations: { rules: [] },
      response: [],
    }];
    act(() => {
      render(<CF prompts={prompts} />);
    });
    expect(screen.queryByText('What is a test?')).toBeNull();
  });

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

  it('calls on change', async () => {
    const setPrompts = jest.fn();
    const prompts = [{
      fieldType: 'multiselect',
      title: 'Test',
      prompt: 'What is a test?',
      options: ['option1', 'option2', 'option3'],
      validations: {
        rules: [
          {
            name: 'maxSelections',
            value: 1,
            message: 'How DARE you',
          },
        ],
      },
      response: [],
    }];
    act(() => {
      render(<CF prompts={prompts} setPrompts={setPrompts} />);
    });

    await selectEvent.select(screen.getByLabelText('What is a test?'), ['option1']);
    expect(setPrompts).toHaveBeenCalled();
  });

  it('calls on blur', async () => {
    const setPrompts = jest.fn();
    const prompts = [{
      fieldType: 'multiselect',
      title: 'Test',
      prompt: 'What is a test?',
      options: ['option1', 'option2', 'option3'],
      validations: {
        rules: [
          {
            name: 'maxSelections',
            value: 1,
            message: 'How DARE you',
          },
        ],
      },
      response: [],
    }];
    act(() => {
      render(<CF prompts={prompts} setPrompts={setPrompts} />);
    });

    await selectEvent.select(screen.getByLabelText('What is a test?'), ['option1', 'option2']);
    const btn = document.querySelector('button');
    userEvent.click(btn);
    expect(btn).toHaveFocus();

    await selectEvent.select(screen.getByLabelText('What is a test?'), ['option1']);
    userEvent.click(btn);
    expect(btn).toHaveFocus();
  });
});
