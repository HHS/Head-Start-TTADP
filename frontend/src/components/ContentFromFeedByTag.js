import React, { useState, useEffect } from 'react'
import PropTypes from 'prop-types'
import { getSingleFeedItemByTag } from '../fetchers/feed'
import { parseFeedIntoDom } from '../utils'
import FeedArticle from './FeedArticle'

/**
 * This component fetches a single item from the Confluence RSS feed, the first matching item
 * You can optionally pass it a (CSS) contentSelector, which will be used to select a specific
 * element within the item (if you don't pass a selector, or the selector finds nothing, the
 * entire item will be displayed)
 *
 * You can also pass a className prop, which is intended to help add bespoke styles (help us all)
 * to these items retrieved from the RSS feeds
 *
 * @param {props} props
 * @returns <ReactStuff (*tm) />
 */
export default function ContentFromFeedByTag({ tagName, contentSelector, className, openLinksInNewTab }) {
  const [content, setContent] = useState('')

  useEffect(() => {
    const abortController = new AbortController()
    async function fetchSingleItemByTag() {
      try {
        const response = await getSingleFeedItemByTag(tagName, abortController.signal)
        const dom = parseFeedIntoDom(response)

        // get individual entries
        const [entry] = Array.from(dom.querySelectorAll('entry'))
        if (entry) {
          const summaryContent = entry.querySelector('summary').textContent
          if (contentSelector) {
            const div = document.createElement('div')
            div.innerHTML = summaryContent

            const contentElement = div.querySelector(contentSelector)
            if (contentElement) {
              setContent(contentElement.outerHTML)
            } else {
              // eslint-disable-next-line no-console
              console.log('No content element found with selector', contentSelector, 'displaying entire contents instead: ', tagName)
              setContent(summaryContent)
            }
          } else if (summaryContent) {
            setContent(summaryContent)
          }
        }
      } catch (err) {
        // ignore abort error
        if (err.name === 'AbortError') {
          // eslint-disable-next-line no-console
          console.log('Fetch aborted')
          return
        }
        // eslint-disable-next-line no-console
        console.log('There was an error fetching content with tag', tagName, err)
      }
    }

    fetchSingleItemByTag()

    return () => {
      abortController.abort()
    }
  }, [contentSelector, tagName])

  const classNames = `${className} ttahub-single-feed-item--by-tag ${contentSelector ? 'ttahub-single-feed-item--by-tag--with-selector' : ''}`
  return (
    <div className={classNames}>
      <FeedArticle title="" content={content} unread={false} key={content} openLinksInNewTab={openLinksInNewTab} partial />
    </div>
  )
}

ContentFromFeedByTag.propTypes = {
  tagName: PropTypes.string.isRequired,
  contentSelector: PropTypes.string,
  className: PropTypes.string,
  openLinksInNewTab: PropTypes.bool,
}

ContentFromFeedByTag.defaultProps = {
  contentSelector: '',
  className: '',
  openLinksInNewTab: false,
}
