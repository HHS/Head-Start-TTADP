/* eslint-disable react/jsx-props-no-spreading */
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import React from 'react';
import FeedArticle from '../FeedArticle';

describe('FeedArticle', () => {
  const renderFeedArticle = (props) => {
    const defaultProps = {
      title: 'Title',
      content: 'Content',
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

  it('renders the unread class', () => {
    renderFeedArticle({ unread: true });
    expect(document.querySelector('article').classList).toContain('ttahub-feed-article--unread');
  });

  it('does not render the unread class', () => {
    renderFeedArticle();
    expect(document.querySelector('article').classList).not.toContain(
      'ttahub-feed-article--unread'
    );
  });

  it('hides &nbsp;-only paragraphs when hideEmptyParagraphs=true', () => {
    renderFeedArticle({ content: '<p>\u00a0</p><p>Real content</p>', hideEmptyParagraphs: true });
    const paragraphs = document.querySelectorAll('.ttahub-feed-article-content p');
    const nbspPara = Array.from(paragraphs).find((p) => p.textContent === '\u00a0');
    expect(nbspPara.style.display).toBe('none');
  });

  it('shows &nbsp;-only paragraphs by default (hideEmptyParagraphs=false)', () => {
    renderFeedArticle({ content: '<p>\u00a0</p><p>Real content</p>' });
    const paragraphs = document.querySelectorAll('.ttahub-feed-article-content p');
    const nbspPara = Array.from(paragraphs).find((p) => p.textContent === '\u00a0');
    expect(nbspPara.style.display).not.toBe('none');
  });

  it('does not hide paragraphs with real text', () => {
    renderFeedArticle({ content: '<p>Real content</p>' });
    const paragraphs = document.querySelectorAll('.ttahub-feed-article-content p');
    const realPara = Array.from(paragraphs).find((p) => p.textContent === 'Real content');
    expect(realPara.style.display).not.toBe('none');
  });
});
