import '@testing-library/jest-dom'
import React from 'react'
import { render, screen } from '@testing-library/react'
import Pill from '../Pill'

describe('Pill', () => {
  it('handles success type', () => {
    render(<Pill type="success">Success</Pill>)
    expect(screen.getByText('Success')).toHaveClass('bg-success-darker text-white')
  })

  it('handles default type', () => {
    render(<Pill>Default</Pill>)
    expect(screen.getByText('Default')).not.toHaveClass('bg-success-darker text-white')
  })
})
