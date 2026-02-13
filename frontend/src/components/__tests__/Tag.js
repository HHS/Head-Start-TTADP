import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import Tag from '../Tag'

describe('Tag', () => {
  const renderTag = ({ clickable, handleClick }) => {
    render(
      <Tag clickable={clickable} handleClick={handleClick}>
        Tag Content
      </Tag>
    )
  }

  afterAll(() => {
    jest.clearAllMocks()
  })

  it('renders correctly', async () => {
    renderTag({})
    expect(await screen.findByText(/Tag Content/i)).toBeVisible()
  })

  it('renders with underline', () => {
    renderTag({ clickable: true })
    expect(document.querySelector('.text-underline')).toBeInTheDocument()
  })

  it('handles click events', async () => {
    const handleClick = jest.fn()
    renderTag({ handleClick })
    const tag = await screen.findByText(/Tag Content/i)
    expect(tag).toBeVisible()
    fireEvent.click(tag)
    expect(handleClick).toHaveBeenCalled()
  })
})
