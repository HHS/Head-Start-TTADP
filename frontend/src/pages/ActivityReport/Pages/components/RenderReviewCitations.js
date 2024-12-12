import React from 'react';
import { uniqueId, uniq } from 'lodash';
import PropTypes from 'prop-types';

// eslint-disable-next-line max-len
export const formatCitations = (citations, activityRecipients) => citations.reduce((acc, citation) => {
  const { monitoringReferences } = citation;
  monitoringReferences.forEach((reference) => {
    // eslint-disable-next-line max-len
    const recipient = activityRecipients.find((ar) => ar.activityRecipientId === reference.grantId);
    if (recipient) {
      if (acc[recipient.name]) {
        acc[recipient.name].push(citation.name);
      } else {
        acc[recipient.name] = [citation.name];
      }
    }
  });
  return acc;
}, {});

export default function RenderReviewCitations({ citations, activityRecipients, className }) {
  const formattedCitations = formatCitations(citations, activityRecipients);

  return Object.keys(formattedCitations).map((recipient) => (
    <div key={uniqueId('citation-review-')} className={className}>
      <p data-testid="review-citation-label" className="margin-top-0 margin-bottom-1">{recipient}</p>
      <ul data-testid="review-citation-list" className="usa-list margin-top-0">
        {uniq(formattedCitations[recipient]).map((citation) => (
          <li data-testid="review-citation-listitem" key={uniqueId('ar-citation-review-citation-name-')}>{citation}</li>
        ))}
      </ul>
    </div>
  ));
}

RenderReviewCitations.propTypes = {
  // eslint-disable-next-line react/forbid-prop-types
  citations: PropTypes.object.isRequired, // we don't know the keys of this object
  className: PropTypes.string,
  activityRecipients: PropTypes.arrayOf(
    PropTypes.shape({
      activityRecipientId: PropTypes.string,
      name: PropTypes.string,
    }),
  ).isRequired,
};

RenderReviewCitations.defaultProps = {
  className: 'desktop:flex-align-end display-flex flex-column flex-justify-center',
};
