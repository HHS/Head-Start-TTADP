import React from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';

function PrintableCitationObjective({ objective }) {
  return (
    <div className="margin-top-2 margin-bottom-2">
      <h4 className="margin-bottom-1">TTA objective</h4>
      <dl className="margin-0">
        <div className="display-flex margin-bottom-1">
          <dt className="text-bold margin-right-1" style={{ minWidth: '12rem' }}>Objective</dt>
          <dd className="margin-0">{objective.title}</dd>
        </div>
        <div className="display-flex margin-bottom-1">
          <dt className="text-bold margin-right-1" style={{ minWidth: '12rem' }}>Activity reports</dt>
          <dd className="margin-0">
            <ul className="usa-list usa-list--unstyled margin-0">
              {objective.activityReports.map(({ id, displayId }) => (
                <li key={displayId}>
                  <Link to={`/activity-reports/view/${id}`}>{displayId}</Link>
                </li>
              ))}
            </ul>
          </dd>
        </div>
        <div className="display-flex margin-bottom-1">
          <dt className="text-bold margin-right-1" style={{ minWidth: '12rem' }}>End date</dt>
          <dd className="margin-0">{objective.endDate}</dd>
        </div>
        {objective.participants && objective.participants.length > 0 && (
          <div className="display-flex margin-bottom-1">
            <dt className="text-bold margin-right-1" style={{ minWidth: '12rem' }}>Participants</dt>
            <dd className="margin-0">{objective.participants.join(', ')}</dd>
          </div>
        )}
        <div className="display-flex margin-bottom-1">
          <dt className="text-bold margin-right-1" style={{ minWidth: '12rem' }}>Topics</dt>
          <dd className="margin-0">{objective.topics.join(', ')}</dd>
        </div>
        <div className="display-flex margin-bottom-1">
          <dt className="text-bold margin-right-1" style={{ minWidth: '12rem' }}>Objective status</dt>
          <dd className="margin-0">{objective.status}</dd>
        </div>
      </dl>
    </div>
  );
}

PrintableCitationObjective.propTypes = {
  objective: PropTypes.shape({
    title: PropTypes.string.isRequired,
    activityReports: PropTypes.arrayOf(PropTypes.shape({
      id: PropTypes.number.isRequired,
      displayId: PropTypes.string.isRequired,
    })).isRequired,
    endDate: PropTypes.string.isRequired,
    participants: PropTypes.arrayOf(PropTypes.string),
    topics: PropTypes.arrayOf(PropTypes.string).isRequired,
    status: PropTypes.string.isRequired,
  }).isRequired,
};

function PrintableCitationReview({ review }) {
  const specialistText = review.specialists
    .map((s) => `${s.name}${s.roles && s.roles.length ? `, ${s.roles.join(', ')}` : ''}`)
    .join('; ');

  return (
    <div className="margin-top-3">
      <h3 className="font-sans-sm margin-bottom-1">
        {`Review ${review.name} (${review.reviewType})`}
      </h3>
      <dl className="margin-0">
        <div className="display-flex margin-bottom-1">
          <dt className="text-bold margin-right-1" style={{ minWidth: '12rem' }}>Review received</dt>
          <dd className="margin-0">{review.reviewReceived}</dd>
        </div>
        <div className="display-flex margin-bottom-1">
          <dt className="text-bold margin-right-1" style={{ minWidth: '12rem' }}>Review outcome</dt>
          <dd className="margin-0">{review.outcome}</dd>
        </div>
        <div className="display-flex margin-bottom-1">
          <dt className="text-bold margin-right-1" style={{ minWidth: '12rem' }}>TTA specialists</dt>
          <dd className="margin-0">{specialistText || 'No TTA work has been performed against this citation.'}</dd>
        </div>
      </dl>
      {review.objectives.length === 0
        ? (
          <p className="usa-prose margin-y-2">No TTA work has been performed against this citation.</p>
        )
        : review.objectives.map((objective) => (
          <PrintableCitationObjective
            key={`${review.name}-${objective.title}`}
            objective={objective}
          />
        ))}
    </div>
  );
}

PrintableCitationReview.propTypes = {
  review: PropTypes.shape({
    name: PropTypes.string.isRequired,
    reviewType: PropTypes.string.isRequired,
    reviewReceived: PropTypes.string.isRequired,
    outcome: PropTypes.string.isRequired,
    specialists: PropTypes.arrayOf(PropTypes.shape({
      name: PropTypes.string.isRequired,
      roles: PropTypes.arrayOf(PropTypes.string),
    })).isRequired,
    objectives: PropTypes.arrayOf(PropTypes.shape({
      title: PropTypes.string.isRequired,
      activityReports: PropTypes.arrayOf(PropTypes.shape({
        id: PropTypes.number.isRequired,
        displayId: PropTypes.string.isRequired,
      })).isRequired,
      endDate: PropTypes.string.isRequired,
      participants: PropTypes.arrayOf(PropTypes.string),
      topics: PropTypes.arrayOf(PropTypes.string).isRequired,
      status: PropTypes.string.isRequired,
    })).isRequired,
  }).isRequired,
};

export default function PrintableCitation({ citation }) {
  return (
    <div className="ttahub-printable-citation no-break-within padding-3 margin-bottom-5">
      <h2 className="margin-top-0 margin-bottom-1">{citation.recipientName}</h2>
      <h3 className="margin-top-0 margin-bottom-2">
        {`Citation ${citation.citationNumber}`}
      </h3>
      <dl className="margin-0 margin-bottom-2">
        <div className="display-flex margin-bottom-1">
          <dt className="text-bold margin-right-1" style={{ minWidth: '12rem' }}>Current status</dt>
          <dd className="margin-0">{citation.status}</dd>
        </div>
        <div className="display-flex margin-bottom-1">
          <dt className="text-bold margin-right-1" style={{ minWidth: '12rem' }}>Finding type</dt>
          <dd className="margin-0">{citation.findingType}</dd>
        </div>
        <div className="display-flex margin-bottom-1">
          <dt className="text-bold margin-right-1" style={{ minWidth: '12rem' }}>Finding category</dt>
          <dd className="margin-0">{citation.category}</dd>
        </div>
        <div className="display-flex margin-bottom-1">
          <dt className="text-bold margin-right-1" style={{ minWidth: '12rem' }}>Grants cited</dt>
          <dd className="margin-0">{citation.grantNumbers.join('; ')}</dd>
        </div>
        <div className="display-flex margin-bottom-1">
          <dt className="text-bold margin-right-1" style={{ minWidth: '12rem' }}>Last TTA</dt>
          <dd className="margin-0">{citation.lastTTADate || 'None'}</dd>
        </div>
      </dl>
      {citation.reviews.map((review) => (
        <PrintableCitationReview
          key={`${citation.citationNumber}-${review.name}`}
          review={review}
        />
      ))}
    </div>
  );
}

PrintableCitation.propTypes = {
  citation: PropTypes.shape({
    recipientName: PropTypes.string.isRequired,
    citationNumber: PropTypes.string.isRequired,
    status: PropTypes.string.isRequired,
    findingType: PropTypes.string.isRequired,
    category: PropTypes.string.isRequired,
    grantNumbers: PropTypes.arrayOf(PropTypes.string).isRequired,
    lastTTADate: PropTypes.string,
    reviews: PropTypes.arrayOf(PropTypes.shape({
      name: PropTypes.string.isRequired,
      reviewType: PropTypes.string.isRequired,
      reviewReceived: PropTypes.string.isRequired,
      outcome: PropTypes.string.isRequired,
      specialists: PropTypes.arrayOf(PropTypes.shape({
        name: PropTypes.string.isRequired,
        roles: PropTypes.arrayOf(PropTypes.string),
      })).isRequired,
      objectives: PropTypes.arrayOf(PropTypes.shape({
        title: PropTypes.string.isRequired,
        activityReports: PropTypes.arrayOf(PropTypes.shape({
          id: PropTypes.number.isRequired,
          displayId: PropTypes.string.isRequired,
        })).isRequired,
        endDate: PropTypes.string.isRequired,
        participants: PropTypes.arrayOf(PropTypes.string),
        topics: PropTypes.arrayOf(PropTypes.string).isRequired,
        status: PropTypes.string.isRequired,
      })).isRequired,
    })).isRequired,
  }).isRequired,
};
