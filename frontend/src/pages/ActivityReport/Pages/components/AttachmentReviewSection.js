import React from 'react'
import PropTypes from 'prop-types'

export default function AttachmentReviewSection({ attachments }) {
  return (
    <div className="margin-top-1">
      <span className="text-bold">Resource attachments:</span>{' '}
      {attachments.map((attachment) => (
        <li key={attachment.url.url}>
          <a href={attachment.url.url} target={attachment.originalFileName.endsWith('.txt') ? '_blank' : '_self'} rel="noreferrer">
            {`${attachment.originalFileName}
                ${attachment.originalFileName.endsWith('.txt') ? ' (opens in new tab)' : ''}`}
          </a>
        </li>
      ))}
    </div>
  )
}

AttachmentReviewSection.propTypes = {
  attachments: PropTypes.arrayOf(
    PropTypes.shape({
      url: PropTypes.shape({
        url: PropTypes.string.isRequired,
      }).isRequired,
      originalFileName: PropTypes.string.isRequired,
    })
  ).isRequired,
}
