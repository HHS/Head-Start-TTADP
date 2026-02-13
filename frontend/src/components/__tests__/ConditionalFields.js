/* eslint-disable react/prop-types */
import '@testing-library/jest-dom'
import React from 'react'
import { render, screen, act, fireEvent } from '@testing-library/react'
import selectEvent from 'react-select-event'
import userEvent from '@testing-library/user-event'
import ConditionalFields from '../ConditionalFields'

describe('ConditionalFields', () => {
  const CF = ({ errors = {}, prompts = [], setPrompts = jest.fn(), validatePrompts = jest.fn() }) => (
    <>
      <ConditionalFields errors={errors} prompts={prompts} setPrompts={setPrompts} validatePrompts={validatePrompts} userCanEdit />
      <button type="button">for blurrin</button>
    </>
  )

  it('renders nothing if null prompts', async () => {
    const prompts = null
    act(() => {
      render(<CF prompts={prompts} />)
    })
    expect(screen.queryByText('What is a test?')).toBeNull()
  })

  it('renders nothing if fieldType is not in dictionary', async () => {
    const prompts = [
      {
        fieldType: 'partytime',
        title: 'Test',
        prompt: 'What is a test?',
        options: ['option1', 'option2'],
        validations: { rules: [] },
        response: [],
      },
    ]
    act(() => {
      render(<CF prompts={prompts} />)
    })
    expect(screen.queryByText('What is a test?')).toBeNull()
  })

  it('renders a prompt', async () => {
    const prompts = [
      {
        fieldType: 'multiselect',
        title: 'Test',
        prompt: 'What is a test?',
        options: ['option1', 'option2'],
        validations: { rules: [] },
        response: [],
      },
    ]
    act(() => {
      render(<CF prompts={prompts} />)
    })
    expect(screen.getByText('What is a test?')).toBeInTheDocument()
  })

  it('calls on change', async () => {
    const setPrompts = jest.fn()
    const prompts = [
      {
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
      },
    ]
    act(() => {
      render(<CF prompts={prompts} setPrompts={setPrompts} />)
    })

    await selectEvent.select(screen.getByLabelText('What is a test?'), ['option1'])
    expect(setPrompts).toHaveBeenCalled()
  })

  it('calls on blur', async () => {
    const setPrompts = jest.fn()
    const prompts = [
      {
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
      },
    ]
    act(() => {
      render(<CF prompts={prompts} setPrompts={setPrompts} />)
    })

    await selectEvent.select(screen.getByLabelText('What is a test?'), ['option1', 'option2'])
    const btn = document.querySelector('button')
    userEvent.click(btn)
    expect(btn).toHaveFocus()

    await selectEvent.select(screen.getByLabelText('What is a test?'), ['option1'])
    userEvent.click(btn)
    expect(btn).toHaveFocus()
  })

  it('validates field on blur', async () => {
    const validatePrompts = jest.fn()
    const prompts = [
      {
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
      },
    ]
    act(() => {
      render(<CF prompts={prompts} validatePrompts={validatePrompts} />)
    })

    // Select an option to have a value to blur from
    await selectEvent.select(screen.getByLabelText('What is a test?'), ['option1'])

    // Simulate the onBlur event
    fireEvent.blur(screen.getByLabelText('What is a test?'))

    // Check if validatePrompts has been called with the expected arguments
    expect(validatePrompts).toHaveBeenCalledWith('Test', false, expect.any(String))
  })

  it('validates when given a rule that fails on blur', async () => {
    const validatePrompts = jest.fn()
    const prompts = [
      {
        fieldType: 'multiselect',
        title: 'Test',
        prompt: 'What is a test?',
        options: ['option1', 'option2', 'option3'],
        validations: {
          rules: [
            {
              name: 'minSelections',
              value: 2, // This will fail validation if only one option is selected
              message: 'How DARE you',
            },
          ],
        },
        response: [],
      },
    ]
    act(() => {
      render(<CF prompts={prompts} validatePrompts={validatePrompts} />)
    })

    // Select an option to have a value to blur from
    await selectEvent.select(screen.getByLabelText('What is a test?'), ['option1'])

    // Simulate the onBlur event
    fireEvent.blur(screen.getByLabelText('What is a test?'))

    // Check if validatePrompts has been called with the expected arguments
    expect(validatePrompts).toHaveBeenCalledWith('Test', true, expect.any(String))
  })

  it('validates field on blur and reports error when validation fails', async () => {
    const validatePrompts = jest.fn()
    const errorMessage = 'How DARE you'
    const prompts = [
      {
        fieldType: 'multiselect',
        title: 'Test',
        prompt: 'What is a test?',
        options: ['option1', 'option2', 'option3'],
        validations: {
          rules: [
            {
              name: 'maxSelections',
              value: 1,
              message: errorMessage,
            },
          ],
        },
        // Set the initial response to already have 2 options selected,
        // which exceeds the maxSelections of 1, so validation will fail on blur
        response: ['option1', 'option2'],
      },
    ]
    act(() => {
      render(<CF prompts={prompts} validatePrompts={validatePrompts} />)
    })

    // Simulate the onBlur event directly on the input field
    // This will trigger validation with the already-exceeded maxSelections
    fireEvent.blur(screen.getByLabelText('What is a test?')) // Check if validatePrompts has been called with the expected arguments for failure
    // This specifically tests lines 78-79 in ConditionalFields.js
    expect(validatePrompts).toHaveBeenCalledWith('Test', true, errorMessage)

    // Validate that validatePrompts was called only once, which confirms
    // the return false; statement was executed, stopping further validation
    expect(validatePrompts).toHaveBeenCalledTimes(1)
  })
})
