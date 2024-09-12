import React, { useLayoutEffect } from 'react';
import PropTypes from 'prop-types';
import parse from 'html-react-parser';
import './FeedArticle.scss';

const FeedArticle = ({
  title,
  content,
  unread,
  partial,
}) => {
  /**
   * to match the styling in the design system
   * we need to add the usa-prose class to all
   * paragraphs in the article content
   */
  useLayoutEffect(() => {
    const paragraphs = document.querySelectorAll('.ttahub-feed-article-content p');
    const paragraphsArray = Array.from(paragraphs);
    paragraphsArray.forEach((p) => {
      p.classList.add('usa-prose');
    });

    const tables = document.querySelectorAll('.ttahub-feed-article-content table');
    const tablesArray = Array.from(tables);
    tablesArray.forEach((table) => {
      table.classList.add('usa-table');
    });

    const lists = document.querySelectorAll('.ttahub-feed-article-content ul');
    const listsArray = Array.from(lists);
    listsArray.forEach((list) => {
      list.classList.add('usa-list');
    });
  });

  const className = `ttahub-feed-article ${partial ? 'ttahub-feed-article--partial' : ''}`;

  return (
    <article className={`${className} position-relative margin-bottom-3 padding-bottom-3 ${unread ? 'ttahub-feed-article--unread' : ''}`}>
      <div className="ttahub-feed-article-content position-relative maxw-tablet">
        <h4 className="ttahub-feed-article-title usa-prose margin-0 padding-0">{title}</h4>
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
};

FeedArticle.defaultProps = {
  partial: false,
};

export default FeedArticle;
