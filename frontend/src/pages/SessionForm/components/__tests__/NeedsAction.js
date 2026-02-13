/* eslint-disable react/prop-types */
import React from 'react'
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FormProvider, useForm } from 'react-hook-form'
import NeedsAction from '../NeedsAction'

jest.mock(
  '../../../../components/HookFormRichEditor',
  () =>
    function MockHookFormRichEditor({ id, name, ariaLabel }) {
      return <textarea id={id} name={name} aria-label={ariaLabel} data-testid="rich-editor" />
    }
)

jest.mock(
  '../../../../components/ReadOnlyEditor',
  () =>
    function MockReadOnlyEditor({ value, ariaLabel }) {
      return <textarea readOnly defaultValue={value || ''} aria-label={ariaLabel} data-testid="readonly-editor" />
    }
)

// eslint-disable-next-line react/prop-types
const FormWrapper = ({ defaultValues, onSubmit = jest.fn() }) => {
  const hookForm = useForm({
    mode: 'onChange',
    defaultValues,
  })

  return (
    // eslint-disable-next-line react/jsx-props-no-spreading
    <FormProvider {...hookForm}>
      <NeedsAction onSubmit={onSubmit} />
    </FormProvider>
  )
}

describe('NeedsAction', () => {
  it('calls onSubmit with the notes when the Update report button is clicked', async () => {
    const mockOnSubmit = jest.fn()
    const defaultValues = {
      additionalNotes: '',
      managerNotes: 'Please update the report with more details.',
      approver: { fullName: 'Jane Doe' },
      status: 'Needs Action',
    }

    act(() => {
      render(<FormWrapper defaultValues={defaultValues} onSubmit={mockOnSubmit} />)
    })
    const notesTextarea = screen.getByLabelText('Creator notes')
    userEvent.type(notesTextarea, 'Here are the additional notes.')

    const updateButton = screen.getByRole('button', { name: /Update report/i })
    userEvent.click(updateButton)

    expect(mockOnSubmit).toHaveBeenCalled()
  })
})
