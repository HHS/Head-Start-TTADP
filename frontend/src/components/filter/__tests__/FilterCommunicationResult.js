import '@testing-library/jest-dom'
import React from 'react'
import { render, screen } from '@testing-library/react'
import selectEvent from 'react-select-event'
import FilterCommunicationResult from '../FilterCommunicationResult'

const { findByText } = screen

describe('FilterCommunicationResult', () => {
  const renderFilterCommunicationResult = (onApply) => render(<FilterCommunicationResult onApply={onApply} inputId="curly" query={[]} />)

  it('calls the onapply handler', async () => {
    const onApply = jest.fn()
    renderFilterCommunicationResult(onApply)

    const select = await findByText(/Select result to filter by/i)
    await selectEvent.select(select, ['RTTAPA declined'])
    expect(onApply).toHaveBeenCalledWith(['RTTAPA declined'])
  })
})
