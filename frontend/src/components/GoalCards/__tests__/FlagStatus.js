import '@testing-library/jest-dom'
import React from 'react'
import { render, screen } from '@testing-library/react'
import FlagStatus from '../FlagStatus'

// we mock the constants to ensure test stability in case the actual constants change
jest.mock('../../../pages/ActivityReport/constants', () => ({
  reasonsToMonitor: ['Monitoring | Deficiency', 'Monitoring | Noncompliance'],
}))

describe('FlagStatus', () => {
  it('renders the flag icon and tooltip when a reason matches reasonsToMonitor', () => {
    const reasons = ['Monitoring | Deficiency', 'Other Reason']
    const goalNumbers = 'G-123'
    render(<FlagStatus reasons={reasons} goalNumbers={goalNumbers} />)

    // find the button rendered by the tooltip
    const button = screen.getByRole('button')
    expect(button).toBeInTheDocument()

    // verify the screen reader text exists within the button
    const expectedText = `Reason for flag on goal ${goalNumbers} is monitoring. Click button to visually reveal this information.`
    const screenReaderText = screen.getByText(expectedText)
    expect(screenReaderText).toBeInTheDocument()
    expect(screenReaderText).toHaveClass('usa-sr-only')
  })

  it('renders null when no reason matches reasonsToMonitor', () => {
    const reasons = ['Other Reason 1', 'Other Reason 2']
    const goalNumbers = 'G-456'
    // use container to check for null render
    const { container } = render(<FlagStatus reasons={reasons} goalNumbers={goalNumbers} />)

    expect(container.firstChild).toBeNull()
  })

  it('renders null when reasons array is empty', () => {
    const reasons = []
    const goalNumbers = 'G-789'
    const { container } = render(<FlagStatus reasons={reasons} goalNumbers={goalNumbers} />)

    expect(container.firstChild).toBeNull()
  })

  it('renders null when reasons prop is not provided (uses defaultProps)', () => {
    const goalNumbers = 'G-000'
    const { container } = render(<FlagStatus goalNumbers={goalNumbers} />)

    expect(container.firstChild).toBeNull()
  })

  it('renders the flag icon when multiple reasons match', () => {
    const reasons = ['Monitoring | Deficiency', 'Monitoring | Noncompliance', 'Other Reason']
    const goalNumbers = 'G-101'
    render(<FlagStatus reasons={reasons} goalNumbers={goalNumbers} />)

    // find the button rendered by the tooltip
    const button = screen.getByRole('button')
    expect(button).toBeInTheDocument()

    // verify the screen reader text exists within the button
    const expectedText = `Reason for flag on goal ${goalNumbers} is monitoring. Click button to visually reveal this information.`
    const screenReaderText = screen.getByText(expectedText)
    expect(screenReaderText).toBeInTheDocument()
    expect(screenReaderText).toHaveClass('usa-sr-only')
  })
})
