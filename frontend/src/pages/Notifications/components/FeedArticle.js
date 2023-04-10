import React from 'react';
import PropTypes from 'prop-types';
import ReadOnlyEditor from '../../../components/ReadOnlyEditor';

const FeedArticle = ({
  title, content, unread,
}) => (
  <article className={`ttahub-feed-article ttahub-feed-article__whats-new position-relative margin-bottom-3 padding-bottom-3 ${unread ? 'ttahub-feed-article__whats-new--unread' : ''}`}>
    <div className="ttahub-feed-article__whats-new-content position-relative padding-left-4 maxw-tablet">
      <h4 className="ttahub-feed-article__whats-new-title usa-prose margin-0 padding-0">{title}</h4>
      <ReadOnlyEditor value={content} ariaLabel={title} />
    </div>
  </article>
);

FeedArticle.propTypes = {
  title: PropTypes.string.isRequired,
  content: PropTypes.string.isRequired,
  unread: PropTypes.bool.isRequired,
};

export default FeedArticle;
