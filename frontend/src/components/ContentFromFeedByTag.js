import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { getSingleFeedItemByTag } from '../fetchers/feed';
import { parseFeedIntoDom } from '../utils';
import FeedArticle from './FeedArticle';

export default function ContentFromFeedByTag({ tagName }) {
  const [content, setContent] = useState('');

  useEffect(() => {
    try {
      getSingleFeedItemByTag(tagName).then((response) => {
        const dom = parseFeedIntoDom(response);

        // get individual entries
        const [entry] = Array.from(dom.querySelectorAll('entry'));
        if (entry) {
          const summaryContent = entry.querySelector('summary').textContent;
          if (summaryContent) {
            setContent(summaryContent);
          }
        }
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.log('There was an error fetching content with tag', tagName, err);
    }
  }, [tagName]);

  return (
    <div className="ttahub-single-feed-item--by-tag">
      <FeedArticle title="" content={content} unread={false} key={content} />
    </div>
  );
}

ContentFromFeedByTag.propTypes = {
  tagName: PropTypes.string.isRequired,
};
