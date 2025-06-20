import React, { useLayoutEffect } from 'react';
import PropTypes from 'prop-types';
import parse from 'html-react-parser';
import './FeedArticle.scss';

const TAG_CLASSES = {
  P: 'usa-prose',
  TABLE: 'usa-table',
  UL: 'usa-list',
};

const FeedArticle = ({
  title,
  content,
  unread,
  partial,
  openLinksInNewTab,
}) => {
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
    <article className={`${className} position-relative margin-bottom-3 padding-bottom-3 ${unread ? 'ttahub-feed-article--unread' : ''}`}>
      <div className="ttahub-feed-article-content position-relative maxw-tablet">
        {title && (<h4 className="ttahub-feed-article-title usa-prose margin-0 padding-0">{title}</h4>)}
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
};

FeedArticle.defaultProps = {
  partial: false,
  openLinksInNewTab: false,
};

export default FeedArticle;
