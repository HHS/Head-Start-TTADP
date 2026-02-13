/* eslint-disable react/prop-types */
/* eslint-disable react/jsx-props-no-spreading */
import React from 'react'
import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import SpecialistTags from '../SpecialistTags'

// Mock Tag and Tooltip so tests can inspect props easily
jest.mock('../../../../../../components/Tag', () => ({ clickable, children }) => (
  <div data-testid="tag" data-clickable={clickable}>
    {children}
  </div>
))

jest.mock('../../../../../../components/Tooltip', () => ({ displayText, tooltipText, buttonLabel, className }) => (
  <div data-testid="tooltip" data-displaytext={displayText} data-tooltiptext={tooltipText} data-buttonlabel={buttonLabel} data-classname={className}>
    {displayText}
  </div>
))

describe('SpecialistTags', () => {
  it('renders Unavailable when no specialists provided', () => {
    render(<SpecialistTags />)

    const tooltips = screen.getAllByTestId('tooltip')
    expect(tooltips).toHaveLength(1)
    expect(tooltips[0]).toHaveAttribute('data-displaytext', 'Unavailable')
    expect(tooltips[0]).toHaveAttribute('data-tooltiptext', 'Unknown')
  })

  it('renders System-generated with its role', () => {
    const specialists = [{ name: 'System-generated', roles: ['OHS'] }]
    render(<SpecialistTags specialists={specialists} />)

    const tooltips = screen.getAllByTestId('tooltip')
    expect(tooltips).toHaveLength(1)
    expect(tooltips[0]).toHaveAttribute('data-displaytext', 'OHS')
    expect(tooltips[0]).toHaveAttribute('data-tooltiptext', 'System-generated')
  })

  it('renders a tag per role for a specialist with array roles', () => {
    const specialists = [{ name: 'Alice', roles: ['Coach', 'Mentor'] }]
    render(<SpecialistTags specialists={specialists} />)

    const tooltips = screen.getAllByTestId('tooltip')
    const texts = tooltips.map((t) => t.getAttribute('data-displaytext'))
    expect(texts).toContain('Coach')
    expect(texts).toContain('Mentor')
  })

  it('splits comma-separated role strings into multiple tags', () => {
    const specialists = [{ name: 'Bob', roles: 'Coach, Mentor' }]
    render(<SpecialistTags specialists={specialists} />)

    const tooltips = screen.getAllByTestId('tooltip')
    const texts = tooltips.map((t) => t.getAttribute('data-displaytext'))
    expect(texts).toContain('Coach')
    expect(texts).toContain('Mentor')
  })

  it('handles roles as mixed objects and strings', () => {
    const specialists = [{ name: 'Carol', roles: [{ role: { name: 'Advisor' } }, 'Coach'] }]
    render(<SpecialistTags specialists={specialists} />)

    const tooltips = screen.getAllByTestId('tooltip')
    const texts = tooltips.map((t) => t.getAttribute('data-displaytext'))
    expect(texts).toContain('Advisor')
    expect(texts).toContain('Coach')
  })

  it('renders Unavailable tag when specialist has no roles', () => {
    const specialists = [{ name: 'Dana' }]
    render(<SpecialistTags specialists={specialists} />)

    const tooltips = screen.getAllByTestId('tooltip')
    expect(tooltips).toHaveLength(1)
    expect(tooltips[0]).toHaveAttribute('data-displaytext', 'Unavailable')
    expect(tooltips[0]).toHaveAttribute('data-tooltiptext', 'Dana')
  })
})
