/* eslint-disable react/jsx-props-no-spreading */
import '@testing-library/jest-dom';
import React from 'react';
import moment from 'moment';
import { render, screen } from '@testing-library/react';
import FeedArticle from '../FeedArticle';

describe('FeedArticle', () => {
  const renderFeedArticle = (props) => {
    const defaultProps = {
      title: 'Title',
      content: 'Content',
      published: moment('1970-01-01', 'YYYY-MM-DD'),
      unread: false,
    };
    render(<FeedArticle {...defaultProps} {...props} />);
  };

  it('renders the title', () => {
    renderFeedArticle();
    expect(screen.getByText('Title')).toBeInTheDocument();
  });

  it('renders the content', () => {
    renderFeedArticle();
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('renders the published date', () => {
    renderFeedArticle();
    expect(screen.getByText('January 1, 1970')).toBeInTheDocument();
  });

  it('renders the unread class', () => {
    renderFeedArticle({ unread: true });
    expect(document.querySelector('article').classList).toContain('ttahub-feed-article__whats-new--unread');
  });

  it('does not render the unread class', () => {
    renderFeedArticle();
    expect(document.querySelector('article').classList).not.toContain('ttahub-feed-article__whats-new--unread');
  });
});
