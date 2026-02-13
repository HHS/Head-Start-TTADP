import '@testing-library/jest-dom'
import React from 'react'
import { render, screen } from '@testing-library/react'
import selectEvent from 'react-select-event'
import FilterRoles from '../FilterRoles'

const { findByText } = screen

describe('FilterRoles', () => {
  const renderStatusSelect = (onApply) => render(<FilterRoles onApply={onApply} inputId="oh" query={[]} />)

  it('calls the onapply handler', async () => {
    const onApply = jest.fn()
    renderStatusSelect(onApply)

    const select = await findByText(/select role to filter by/i)
    await selectEvent.select(select, [/ecs/i])
    expect(onApply).toHaveBeenCalled()
  })
})
