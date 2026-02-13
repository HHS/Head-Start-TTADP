import React from 'react'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Goals from '..'

describe('Goals', () => {
  const renderTest = (initialEntries) => {
    render(
      <MemoryRouter initialEntries={initialEntries}>
        <Goals />
      </MemoryRouter>
    )
  }

  test('renders default page when no matching route is found', () => {
    renderTest(['/admin/goals'])
    expect(screen.getByText('A selection is in order')).toBeInTheDocument()
  })
})
