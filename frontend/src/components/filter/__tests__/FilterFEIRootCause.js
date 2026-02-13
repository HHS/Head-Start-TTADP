import '@testing-library/jest-dom'
import React from 'react'
import { render, screen } from '@testing-library/react'
import selectEvent from 'react-select-event'
import FilterFEIRootCause from '../FilterFEIRootCause'

const { findByText } = screen

describe('FilterActivityReportGoalResponseSelect', () => {
  const renderFeiRootCauseSelect = async (onApply) =>
    render(<FilterFEIRootCause onApply={onApply} inputId="curly" query={[]} title="FEI root cause" />)

  it('calls the onapply handler', async () => {
    const onApply = jest.fn()
    await renderFeiRootCauseSelect(onApply)

    const select = await findByText(/Select FEI root cause to filter by/i)
    await selectEvent.select(select, ['Facilities'])
    expect(onApply).toHaveBeenCalledWith(['Facilities'])
  })
})
