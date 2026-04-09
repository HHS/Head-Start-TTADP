import React from 'react';
import PropTypes from 'prop-types';

const Item = ({ title, children }) => (
  <>
    <dt className="margin-bottom-1 text-bold">{title}</dt>
    <dd className="margin-0 margin-bottom-1">{children}</dd>
  </>
);

Item.propTypes = {
  title: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
};

function PrintableCitationObjective({ objective }) {
  return (
    <div className="margin-bottom-3">
      <h4 className="text-bold margin-bottom-1 font-serif-md">TTA objective</h4>
      <dl className="margin-0">
        <Item title="Objective">
          {objective.title}
        </Item>

        <Item title="Activity reports">
          <ul className="usa-list usa-list--unstyled margin-0">
            {objective.activityReports.map(({ displayId }) => (
              <li key={displayId}>
                {displayId}
              </li>
            ))}
          </ul>
        </Item>

        <Item title="End date">
          {objective.endDate}
        </Item>

        {objective.participants && objective.participants.length > 0 && (
          <Item title="Participants">
            {objective.participants.join(', ')}
          </Item>
        )}
        <Item title="Topics">
          {objective.topics.join(', ')}
        </Item>
        <Item title="Objective status">
          {objective.status}
        </Item>
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
    <div className="margin-top-2">
      <h3 className="margin-bottom-1 font-sans-lg">
        {`Review ${review.name} (${review.reviewType})`}
      </h3>
      <dl className="margin-0 margin-bottom-3">
        <Item title="Review received">
          {review.reviewReceived}
        </Item>
        <Item title="Review outcome">
          {review.outcome}
        </Item>
        <Item title="TTA specialists">
          {specialistText || 'No TTA work has been performed against this citation.'}
        </Item>
      </dl>
      {review.objectives.map((objective, index) => (
        <PrintableCitationObjective
          // eslint-disable-next-line react/no-array-index-key
          key={`${review.name}-${objective.title}-${index}`}
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
    <div className="ttahub-printable-citation margin-bottom-5">
      <h2 className="font-serif-xl margin-top-0 margin-bottom-1">{citation.recipientName}</h2>
      <dl className="margin-bottom-4">
        <Item title="Current status">
          {citation.status}
        </Item>
        <Item title="Finding type">
          {citation.findingType}
        </Item>
        <Item title="Finding category">
          {citation.category}
        </Item>
        <Item title="Grants cited">
          {citation.grantNumbers.join('; ')}
        </Item>
        <Item title="Last TTA">
          {citation.lastTTADate || 'None'}
        </Item>
      </dl>
      {citation.reviews.map((review) => (
        <PrintableCitationReview
          key={`${citation.citationNumber}-${review.name}-${citation.id}`}
          review={review}
        />
      ))}
    </div>
  );
}

PrintableCitation.propTypes = {
  citation: PropTypes.shape({
    id: PropTypes.number.isRequired,
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
