import '@testing-library/jest-dom'
import React from 'react'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import GoalFormButton from '../GoalFormButton'
import { GOAL_FORM_BUTTON_TYPES } from '../constants'

describe('GoalFormButton', () => {
  it('renders a modal opener', async () => {
    render(<GoalFormButton type={GOAL_FORM_BUTTON_TYPES.MODAL_OPENER} label="Open Modal" />)

    const button = await screen.findByText('Open Modal')
    expect(button).toBeInTheDocument()

    expect(button).toHaveAttribute('data-open-modal', 'true')
  })

  it('renders a link', async () => {
    render(
      <MemoryRouter>
        <GoalFormButton type={GOAL_FORM_BUTTON_TYPES.LINK} label="Jibber Jabber" to="/jibber-jabber" />
      </MemoryRouter>
    )

    const button = await screen.findByText('Jibber Jabber')
    expect(button).toBeInTheDocument()

    expect(button.tagName).toBe('A')
  })

  it('renders nothing given a link and no to', async () => {
    render(
      <MemoryRouter>
        <GoalFormButton type={GOAL_FORM_BUTTON_TYPES.LINK} label="Jibber Jabber" />
      </MemoryRouter>
    )

    const button = screen.queryByText('Jibber Jabber')
    expect(button).toBeNull()
  })

  it('renders a regular button', async () => {
    render(
      <MemoryRouter>
        <GoalFormButton type={GOAL_FORM_BUTTON_TYPES.BUTTON} label="Regular button" onClick={jest.fn()} />
      </MemoryRouter>
    )

    const button = screen.queryByText('Regular button')
    expect(button).toBeInTheDocument()

    expect(button.tagName).toBe('BUTTON')
    expect(button).toHaveAttribute('type', 'button')
  })
})
