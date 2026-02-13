import '@testing-library/jest-dom'
import React from 'react'
import { render, screen } from '@testing-library/react'
import selectEvent from 'react-select-event'
import FilterDomainResultSelect from '../FilterDomainResultSelect'

const { findByText } = screen

describe('FilterDomainResultSelect', () => {
  const renderSelect = (onApply) => render(<FilterDomainResultSelect onApply={onApply} inputId="oh" query={[]} />)

  it('calls the onapply handler', async () => {
    const onApply = jest.fn()
    renderSelect(onApply)

    const select = await findByText(/Select domain threshold to filter by/i)
    await selectEvent.select(select, [/Below quality/i])
    expect(onApply).toHaveBeenCalled()
  })
})
