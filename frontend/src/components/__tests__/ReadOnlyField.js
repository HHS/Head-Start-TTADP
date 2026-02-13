import '@testing-library/jest-dom'
import React from 'react'
import { render, screen } from '@testing-library/react'
import ReadOnlyField from '../ReadOnlyField'

describe('ReadOnlyField', () => {
  const label = 'label'
  const children = 'children'

  test('renders label', () => {
    render(<ReadOnlyField label={label}>{children}</ReadOnlyField>)
    expect(screen.getByText(label)).toBeDefined()
  })

  test('renders children', () => {
    render(<ReadOnlyField label={label}>{children}</ReadOnlyField>)
    expect(screen.getByText(children)).toBeDefined()
  })

  test('does not render children when children is null', () => {
    render(<ReadOnlyField label={label}>{null}</ReadOnlyField>)
    expect(screen.queryByText(children)).toBeNull()
  })
})
