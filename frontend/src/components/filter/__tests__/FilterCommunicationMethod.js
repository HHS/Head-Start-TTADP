import '@testing-library/jest-dom'
import React from 'react'
import { render, screen } from '@testing-library/react'
import selectEvent from 'react-select-event'
import FilterCommunicationMethod from '../FilterCommunicationMethod'

const { findByText } = screen

describe('FilterCommunicationMethod', () => {
  const renderFilterCommunicationMethod = (onApply) => render(<FilterCommunicationMethod onApply={onApply} inputId="curly" query={[]} />)

  it('calls the onapply handler', async () => {
    const onApply = jest.fn()
    renderFilterCommunicationMethod(onApply)

    const select = await findByText(/Select method type to filter by/i)
    await selectEvent.select(select, ['Virtual'])
    expect(onApply).toHaveBeenCalledWith(['Virtual'])
  })
})
