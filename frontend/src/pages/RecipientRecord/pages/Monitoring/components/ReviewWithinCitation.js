import React from 'react';
import PropTypes from 'prop-types';
import { uniqueId } from 'lodash';
import DescriptionList from './DescriptionList';
import DescriptionItem from './DescriptionItem';
import ReviewObjective from './ReviewObjective';
import NoTtaProvidedAgainst from './NoTtaProvidedAgainst';
import SpecialistTags from './SpecialistTags';

export default function ReviewWithinCitation({
  review,
  regionId,
}) {
  return (
    <div>
      <DescriptionList>
        <DescriptionItem title="Review name">
          {review.name}
        </DescriptionItem>
        <DescriptionItem title="Review type">
          {review.reviewType}
        </DescriptionItem>
        <DescriptionItem title="Review received">
          {review.reviewReceived}
        </DescriptionItem>
        <DescriptionItem title="Review outcome">
          {review.outcome}
        </DescriptionItem>
        <DescriptionItem title="TTA specialists">
          <SpecialistTags specialists={review.specialists} />
        </DescriptionItem>
      </DescriptionList>
      {review.objectives.length === 0 && (
        <NoTtaProvidedAgainst />
      )}
      {review.objectives.map((objective) => (<ReviewObjective key={uniqueId('review-objective')} objective={objective} regionId={regionId} />))}
    </div>
  );
}

ReviewWithinCitation.propTypes = {
  review: PropTypes.shape({
    name: PropTypes.string.isRequired,
    reviewType: PropTypes.string.isRequired,
    reviewReceived: PropTypes.string.isRequired,
    outcome: PropTypes.string.isRequired,
    findingStatus: PropTypes.string.isRequired,
    specialists: PropTypes.arrayOf(PropTypes.shape({
      name: PropTypes.string.isRequired,
      roles: PropTypes.arrayOf(PropTypes.string).isRequired,
    })).isRequired,
    objectives: PropTypes.arrayOf(PropTypes.shape({
      title: PropTypes.string.isRequired,
      activityReports: PropTypes.arrayOf(PropTypes.string).isRequired,
      endDate: PropTypes.string.isRequired,
      topics: PropTypes.arrayOf(PropTypes.string).isRequired,
      status: PropTypes.string.isRequired,
    })).isRequired,
  }).isRequired,
  regionId: PropTypes.number.isRequired,
};
