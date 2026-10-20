import parse from 'html-react-parser';
import PropTypes from 'prop-types';
import React, { useLayoutEffect } from 'react';
import './FeedArticle.scss';

const TAG_CLASSES = {
  P: 'usa-prose',
  TABLE: 'usa-table',
  UL: 'usa-list',
};

const FeedArticle = ({ title, content, unread, partial, openLinksInNewTab, hideEmptyParagraphs }) => {
  /**
   * to match the styling in the design system, we attach USWDS classes to the
   * appropriate elements
   */
  useLayoutEffect(() => {
    const tags = document.querySelectorAll(`
        .ttahub-feed-article-content p,
        .ttahub-feed-article-content table,
        .ttahub-feed-article-content ul
    `);

    Array.from(tags).forEach((tag) => {
      const tagClass = TAG_CLASSES[tag.tagName];
      if (tagClass) {
        tag.classList.add(tagClass);
      }
      // Hide paragraphs that contain only &nbsp; or whitespace (common Confluence spacers)
      if (hideEmptyParagraphs && tag.tagName === 'P' && tag.textContent.replace(/\u00a0/g, '').trim() === '') {
        tag.style.display = 'none';
      }
    });

    if (openLinksInNewTab) {
      const links = document.querySelectorAll('.ttahub-feed-article-content a');
      Array.from(links).forEach((link) => {
        link.setAttribute('target', '_blank');
        link.setAttribute('rel', 'noopener noreferrer');
      });
    }
  });

  const className = `ttahub-feed-article ${partial ? 'ttahub-feed-article--partial' : ''}`;

  return (
    <article
      className={`${className} position-relative margin-bottom-3 padding-bottom-3 ${unread ? 'ttahub-feed-article--unread' : ''}`}
    >
      <div className="ttahub-feed-article-content position-relative maxw-tablet">
        {title && (
          <h4 className="ttahub-feed-article-title usa-prose margin-0 padding-0">{title}</h4>
        )}
        {parse(content)}
      </div>
    </article>
  );
};

FeedArticle.propTypes = {
  title: PropTypes.string.isRequired,
  content: PropTypes.string.isRequired,
  unread: PropTypes.bool.isRequired,
  partial: PropTypes.bool,
  openLinksInNewTab: PropTypes.bool,
  hideEmptyParagraphs: PropTypes.bool,
};

FeedArticle.defaultProps = {
  partial: false,
  openLinksInNewTab: false,
  hideEmptyParagraphs: false,
};

export default FeedArticle;
