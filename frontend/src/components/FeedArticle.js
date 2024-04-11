import React from 'react';
import PropTypes from 'prop-types';
import ReadOnlyEditor from './ReadOnlyEditor';
import './FeedArticle.scss';

const FeedArticle = ({
  title,
  content,
  unread,
  partial,
}) => {
  const className = `ttahub-feed-article ${partial ? 'ttahub-feed-article--partial' : ''}`;

  return (
    <article className={`${className} position-relative margin-bottom-3 padding-bottom-3 ${unread ? 'ttahub-feed-article--unread' : ''}`}>
      <div className="ttahub-feed-article-content position-relative maxw-tablet">
        <h4 className="ttahub-feed-article-title usa-prose margin-0 padding-0">{title}</h4>
        <ReadOnlyEditor value={content} ariaLabel={title} />
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
