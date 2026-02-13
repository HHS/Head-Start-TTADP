import '@testing-library/jest-dom'
import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import FilterDateRange from '../FilterDateRange'
import FilterErrorContext from '../FilterErrorContext'

describe('FilterDateRange', () => {
  const renderFilterDateRange = (
    query,
    condition = 'is on or after',
    onApplyDateRange = jest.fn(),
    setError = jest.fn(),
    customDateOptions = null
  ) => {
    const updateSingleDate = jest.fn()

    render(
      <FilterErrorContext.Provider value={{ setError }}>
        <FilterDateRange
          condition={condition}
          query={query}
          updateSingleDate={updateSingleDate}
          onApplyDateRange={onApplyDateRange}
          customDateOptions={customDateOptions}
        />
      </FilterErrorContext.Provider>
    )
  }

  it('handles an empty query', async () => {
    const onApplyDateRange = jest.fn()
    renderFilterDateRange('', 'is on or after', onApplyDateRange)
    const date = screen.getByRole('textbox', { name: /date/i })
    userEvent.type(date, '10/31/2021')
    expect(onApplyDateRange).toHaveBeenCalled()
    const [hidden] = await screen.findAllByRole('textbox', { hidden: true })
    expect(hidden).toHaveValue('2021-10-31')
  })

  it('checks for valid dates', async () => {
    const onApplyDateRange = jest.fn()
    const setError = jest.fn()
    renderFilterDateRange('', 'is on or after', onApplyDateRange, setError)
    const date = screen.getByRole('textbox', { name: /date/i })
    userEvent.type(date, 'pppppp')

    const message = 'Please enter a valid date'
    expect(setError).toHaveBeenCalledWith(message)
  })

  it('renders the is dropdown', async () => {
    const onApplyDateRange = jest.fn()
    renderFilterDateRange('', 'is', onApplyDateRange)
    const date = screen.getByRole('combobox', { name: /date/i })
    userEvent.selectOptions(date, 'Last thirty days')
    expect(onApplyDateRange).toHaveBeenCalled()
  })

  it('renders custom date options', async () => {
    const customDateOptions = [
      {
        label: 'Last three months',
        value: jest.fn(),
      },
      {
        label: 'Last six months',
        value: jest.fn(),
      },
    ]
    const onApplyDateRange = jest.fn()
    renderFilterDateRange('', 'is', onApplyDateRange, jest.fn(), customDateOptions)
    const date = screen.getByRole('combobox', { name: /date/i })
    userEvent.selectOptions(date, 'Last three months')
    userEvent.selectOptions(date, 'Last six months')
    expect(onApplyDateRange).toHaveBeenCalled()
  })
})
