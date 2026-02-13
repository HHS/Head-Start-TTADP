/* eslint-disable react/jsx-props-no-spreading */
import React from 'react'
import { render } from '@testing-library/react'
import LogLine from '../LogLine'

describe('LogLine', () => {
  const defaultProps = {
    authorName: 'John Doe',
    communicationDate: '2022-01-01',
    duration: '2',
    method: 'Email',
  }

  it('renders author name', () => {
    const { getByText } = render(<LogLine {...defaultProps} />)
    expect(getByText('John Doe')).toBeInTheDocument()
  })

  it('renders communication method', () => {
    const { getByText } = render(<LogLine {...defaultProps} />)
    expect(getByText(/email/i)).toBeInTheDocument()
  })

  it('renders communication date', () => {
    const { getByText } = render(<LogLine {...defaultProps} />)
    expect(getByText('Jan 1st, 2022')).toBeInTheDocument()
  })

  it('renders duration', () => {
    const { getByText } = render(<LogLine {...defaultProps} />)
    expect(getByText('2')).toBeInTheDocument()
    expect(getByText(/hours/i)).toBeInTheDocument()
  })

  it('renders singular hour when duration is 1', () => {
    const { getByText } = render(<LogLine {...defaultProps} duration="1" />)
    expect(getByText('1')).toBeInTheDocument()
    expect(getByText(/hour/i)).toBeInTheDocument()
  })

  it('does not render communication method when not provided', () => {
    const { queryByText } = render(<LogLine {...defaultProps} method="" />)
    expect(queryByText('via')).toBeNull()
  })

  it('handles null method without error', () => {
    const { queryByText } = render(<LogLine {...defaultProps} method={null} />)
    expect(queryByText('via')).toBeNull()
  })

  it('does not render communication date when not provided', () => {
    const { queryByText } = render(<LogLine {...defaultProps} communicationDate="" />)
    expect(queryByText('on')).toBeNull()
  })

  it('does not render duration when not provided', () => {
    const { queryByText } = render(<LogLine {...defaultProps} duration="" />)
    expect(queryByText('for')).toBeNull()
  })
})
