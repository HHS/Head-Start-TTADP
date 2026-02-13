import React from 'react'
import { useFormContext } from 'react-hook-form'
import { render, screen } from '@testing-library/react'
import HtmlReviewItem from '../HtmlReviewItem'

// Mock useFormContext to control the values returned by watch
jest.mock('react-hook-form', () => ({
  useFormContext: jest.fn(),
}))

describe('HtmlReviewItem', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('properly displays an array value passed in as name from the react hook form', () => {
    useFormContext.mockReturnValue({
      watch: jest.fn(() => ['testValue']),
    })

    render(<HtmlReviewItem label="Test Label" name="testName" />)

    expect(screen.getByText('testValue')).toBeInTheDocument()
  })

  it('properly a value passed in as name from the react hook form', () => {
    useFormContext.mockReturnValue({
      watch: jest.fn(() => 'testValue'),
    })

    render(<HtmlReviewItem label="Test Label" name="testName" />)

    expect(screen.getByText('testValue')).toBeInTheDocument()
  })
})
