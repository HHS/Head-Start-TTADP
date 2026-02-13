/* eslint-disable react/jsx-props-no-spreading */
import '@testing-library/jest-dom'
import React from 'react'
import { render, screen } from '@testing-library/react'
import FeedArticle from '../FeedArticle'

describe('FeedArticle', () => {
  const renderFeedArticle = (props) => {
    const defaultProps = {
      title: 'Title',
      content: 'Content',
      unread: false,
    }
    render(<FeedArticle {...defaultProps} {...props} />)
  }

  it('renders the title', () => {
    renderFeedArticle()
    expect(screen.getByText('Title')).toBeInTheDocument()
  })

  it('renders the content', () => {
    renderFeedArticle()
    expect(screen.getByText('Content')).toBeInTheDocument()
  })

  it('renders the unread class', () => {
    renderFeedArticle({ unread: true })
    expect(document.querySelector('article').classList).toContain('ttahub-feed-article--unread')
  })

  it('does not render the unread class', () => {
    renderFeedArticle()
    expect(document.querySelector('article').classList).not.toContain('ttahub-feed-article--unread')
  })
})
