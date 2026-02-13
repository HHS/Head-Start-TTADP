import '@testing-library/jest-dom'
import React from 'react'
import { render, screen } from '@testing-library/react'
import GoalFormError from '../GoalFormError'

describe('GoalFormError', () => {
  it('renders nothing if there is no error', async () => {
    render(<GoalFormError error={null} />)

    const alert = screen.queryByTestId('alert')
    expect(alert).toBeNull()
  })

  it('renders error alert', async () => {
    render(<GoalFormError error="There has been an error" />)

    const alert = await screen.findByText('There has been an error')
    expect(alert).toBeInTheDocument()
  })
})
