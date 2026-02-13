import '@testing-library/jest-dom'
import React from 'react'
import { render, screen } from '@testing-library/react'
import selectEvent from 'react-select-event'
import { act } from 'react-dom/test-utils'
import { useForm } from 'react-hook-form'
import userEvent from '@testing-library/user-event'
import { Label } from '@trussworks/react-uswds'

import MultiSelect, { sortSelect } from '../MultiSelect'

const options = [
  { label: 'one', value: 'one' },
  { label: 'two', value: 'two' },
]

const customOptions = [
  { id: 1, name: 'Approver 1', user: { id: 1, fullName: 'Approver 1' } },
  { id: 2, name: 'Approver 2', user: { id: 2, fullName: 'Approver 2' } },
  { id: 3, name: 'Approver 3', user: { id: 3, fullName: 'Approver 3' } },
]

describe('MultiSelect', () => {
  // eslint-disable-next-line react/prop-types
  const TestMultiSelect = ({ onSubmit, disabled = false }) => {
    const { control, handleSubmit } = useForm({
      defaultValues: { name: [] },
      mode: 'all',
    })

    const submit = (data) => {
      onSubmit(data)
    }

    return (
      <form onSubmit={handleSubmit(submit)}>
        <Label>
          label
          <MultiSelect control={control} name="name" options={options} required={false} onClick={() => {}} disabled={disabled} />
          <button data-testid="submit" type="submit">
            submit
          </button>
        </Label>
      </form>
    )
  }

  const CustomOptionMultiSelect = ({
    // eslint-disable-next-line react/prop-types
    onSubmit,
    valueProperty,
    valueLabel,
  }) => {
    const { control, handleSubmit } = useForm({
      defaultValues: { name: [] },
      mode: 'all',
    })

    const submit = (data) => {
      onSubmit(data)
    }

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
          <button data-testid="submit" type="submit">
            submit
          </button>
        </Label>
      </form>
    )
  }

  it('expects multi select to remain open after selection', async () => {
    const onSubmit = jest.fn()
    render(<TestMultiSelect onSubmit={onSubmit} />)
    await selectEvent.select(screen.getByLabelText('label'), ['one'])
    expect(await screen.findByText('two')).toBeVisible()
  })

  it('selected value is an array of strings', async () => {
    const onSubmit = jest.fn()
    render(<TestMultiSelect onSubmit={onSubmit} />)
    await selectEvent.select(screen.getByLabelText('label'), ['one'])
    await act(async () => {
      userEvent.click(screen.getByTestId('submit'))
    })
    expect(onSubmit).toHaveBeenCalledWith({ name: ['one'] })
  })

  it('null values do not cause an error', async () => {
    const onSubmit = jest.fn()
    render(<TestMultiSelect onSubmit={onSubmit} />)
    const select = screen.getByLabelText('label')
    await selectEvent.select(select, ['one'])
    await selectEvent.clearAll(select)
    await act(async () => {
      userEvent.click(screen.getByTestId('submit'))
    })
    expect(onSubmit).toHaveBeenCalledWith({ name: [] })
  })

  it('expects multi select to maintain original options structure', async () => {
    const onSubmit = jest.fn()
    render(<CustomOptionMultiSelect onSubmit={onSubmit} valueLabel="user.fullName" valueProperty="user.id" />)
    await selectEvent.select(screen.getByLabelText('label'), ['Approver 1'])
    await act(async () => {
      userEvent.click(screen.getByTestId('submit'))
    })
    expect(onSubmit).toHaveBeenCalledWith({ name: [{ value: 1, label: 'Approver 1', user: { id: 1, fullName: 'Approver 1' } }] })
  })

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
    ]

    data.sort(sortSelect)

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
    ])
  })

  describe('the div wrapper', () => {
    it('forwards space to the Selector, expanding the multiselect', async () => {
      render(<TestMultiSelect />)
      const container = screen.getByTestId('name-click-container')
      container.focus()
      await act(async () => {
        userEvent.type(container, '{space}')
      })
      expect(await screen.findByText('one')).toBeVisible()
    })
    it('forwards enter to the Selector, giving it focus', async () => {
      render(<TestMultiSelect disabled onSubmit={() => {}} />)
      const container = screen.getByTestId('name-click-container')
      container.focus()
      await act(async () => {
        userEvent.type(container, '{enter}')
      })
      const selector = container.querySelector('input')
      expect(selector).toHaveFocus()
    })
    it('hides the Selector with aria-hidden when disabled', async () => {
      render(<TestMultiSelect disabled />)
      const container = screen.getByTestId('name-click-container')
      const div = container.querySelector('div')
      expect(div).toHaveAttribute('aria-hidden', 'true')
    })
  })
})
