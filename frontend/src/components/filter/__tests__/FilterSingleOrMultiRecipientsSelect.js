import '@testing-library/jest-dom'
import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import FilterSingleOrMultiRecipientsSelect, { mapDisplayValue } from '../FilterSingleOrMultiRecipientsSelect'

describe('FilterSingleOrMultiSelect', () => {
  const renderSingleOrMultiSelect = (onApply) =>
    render(<FilterSingleOrMultiRecipientsSelect onApply={onApply} inputId="single-or-multi" query={[]} />)

  it('calls the onapply handler', async () => {
    const onApply = jest.fn()
    renderSingleOrMultiSelect(onApply)
    const select = await screen.findByRole('combobox')
    userEvent.selectOptions(select, 'Multiple recipient reports')
    expect(onApply).toHaveBeenCalled()
  })

  describe('mapDisplayValue', () => {
    it('is predictable: single recipient', () => {
      const result = mapDisplayValue(['single-recipient'])
      expect(result).toBe('Single recipient reports')
    })

    it('is predictable: multi recipient', () => {
      const result = mapDisplayValue(['multi-recipients'])
      expect(result).toBe('Multiple recipient reports')
    })

    it('is predictable: empty', () => {
      const result = mapDisplayValue(['foo'])
      expect(result).toBe('')
    })

    it('accepts a string', () => {
      const result = mapDisplayValue('single-recipient')
      expect(result).toBe('Single recipient reports')
    })
  })
})
