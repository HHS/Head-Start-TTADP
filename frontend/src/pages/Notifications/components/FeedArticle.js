import React from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import ReadOnlyEditor from '../../../components/ReadOnlyEditor';

const FULL_DATE_FORMAT = 'MMMM D, YYYY';

const FeedArticle = ({
  title, content, published, unread,
}) => (
  <article className={`ttahub-feed-article ttahub-feed-article__whats-new position-relative margin-bottom-3 ${unread ? 'ttahub-feed-article__whats-new--unread' : ''}`}>
    <span className="ttahub-feed-article__whats-new--date font-body-xs padding-left-4">{published.format(FULL_DATE_FORMAT)}</span>
    <div className="ttahub-feed-article__whats-new-content position-relative padding-left-4">
      <h4 className="ttahub-feed-article__whats-new-title usa-prose margin-0 padding-0">{title}</h4>
      <ReadOnlyEditor value={content} ariaLabel={title} />
    </div>
  </article>
);

FeedArticle.propTypes = {
  title: PropTypes.string.isRequired,
  content: PropTypes.string.isRequired,
  published: PropTypes.instanceOf(moment).isRequired,
  unread: PropTypes.bool.isRequired,
};

export default FeedArticle;
