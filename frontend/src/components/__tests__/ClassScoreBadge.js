/* eslint-disable react/prop-types */
import '@testing-library/jest-dom'
import React from 'react'
import { render, screen } from '@testing-library/react'
import { getScoreBadge } from '../ClassScoreBadge'

describe('ClassScoreBadge', () => {
  it('returns above threshold for emotional support', async () => {
    render(<>{getScoreBadge('ES', 6, '01-01-2021')}</>)
    expect(screen.getByText('Above all thresholds')).toBeInTheDocument()
  })

  it('returns below quality for emotional support', async () => {
    render(<>{getScoreBadge('ES', 5, '01-01-2021')}</>)
    expect(screen.getByText('Below quality')).toBeInTheDocument()
  })

  it('returns below competitive for emotional support', async () => {
    render(<>{getScoreBadge('ES', 0, '01-01-2021')}</>)
    expect(screen.getByText('Below competitive')).toBeInTheDocument()
  })

  it('returns above threshold for classroom organization', async () => {
    render(<>{getScoreBadge('CO', 6, '01-01-2021')}</>)
    expect(screen.getByText('Above all thresholds')).toBeInTheDocument()
  })

  it('returns below quality for classroom organization', async () => {
    render(<>{getScoreBadge('CO', 5, '201-01-2021')}</>)
    expect(screen.getByText('Below quality')).toBeInTheDocument()
  })

  it('returns below competitive for classroom organization', async () => {
    render(<>{getScoreBadge('CO', 0, '01-01-2021')}</>)
    expect(screen.getByText('Below competitive')).toBeInTheDocument()
  })

  it('returns above threshold for instructional support', async () => {
    render(<>{getScoreBadge('IS', 3, '01-01-2021')}</>)
    expect(screen.getByText('Above all thresholds')).toBeInTheDocument()
  })

  it('returns below competitive for instructional support', async () => {
    render(<>{getScoreBadge('IS', 2.4, '08-02-2027')}</>)
    expect(screen.getByText('Below competitive')).toBeInTheDocument()
  })

  it('returns below quality for instructional support', async () => {
    render(<>{getScoreBadge('IS', 2.5, '08-02-2027')}</>)
    expect(screen.getByText('Below quality')).toBeInTheDocument()
  })

  it('returns below competitive second case for instructional support', async () => {
    render(<>{getScoreBadge('IS', 2.2, '01/01/2021')}</>)
    expect(screen.getByText('Below competitive')).toBeInTheDocument()
  })

  it('returns below quality second case for instructional support', async () => {
    render(<>{getScoreBadge('IS', 2.4, '01/01/2021')}</>)
    expect(screen.getByText('Below quality')).toBeInTheDocument()
  })
})
