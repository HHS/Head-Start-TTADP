import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { getSingleFeedItemByTag } from '../fetchers/feed';
import { parseFeedIntoDom } from '../utils';
import FeedArticle from './FeedArticle';

export default function ContentFromFeedByTag({
  tagName,
  contentSelector,
}) {
  const [content, setContent] = useState('');

  useEffect(() => {
    async function fetchSingleItemByTag() {
      try {
        const response = await getSingleFeedItemByTag(tagName);
        const dom = parseFeedIntoDom(response);

        // get individual entries
        const [entry] = Array.from(dom.querySelectorAll('entry'));
        if (entry) {
          const summaryContent = entry.querySelector('summary').textContent;
          if (contentSelector) {
            const div = document.createElement('div');
            div.innerHTML = summaryContent;

            const contentElement = div.querySelector(contentSelector);
            if (contentElement) {
              setContent(contentElement.outerHTML);
            } else {
              // eslint-disable-next-line no-console
              console.log('No content element found with selector', contentSelector, 'displaying entire contents instead');
              setContent(summaryContent);
            }
          } else if (summaryContent) {
            setContent(summaryContent);
          }
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.log('There was an error fetching content with tag', tagName, err);
      }
    }

    fetchSingleItemByTag();
  }, [tagName]);

  const className = `ttahub-single-feed-item--by-tag ${contentSelector ? 'ttahub-single-feed-item--by-tag--with-selector' : ''}`;

  return (
    <div className={className}>
      <FeedArticle title="" content={content} unread={false} key={content} partial />
    </div>
  );
}

ContentFromFeedByTag.propTypes = {
  tagName: PropTypes.string.isRequired,
  contentSelector: PropTypes.string,
};

ContentFromFeedByTag.defaultProps = {
  contentSelector: '',
};
