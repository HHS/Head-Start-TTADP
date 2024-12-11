import React from 'react';
import PropTypes from 'prop-types';
import { uniqueId } from 'lodash';
import DescriptionItem from './DescriptionItem';
import DescriptionList from './DescriptionList';
import ReviewObjective from './ReviewObjective';
import NoTtaProvidedAgainst from './NoTtaProvidedAgainst';
import './FindingWithinReview.css';

export default function FindingWithinReview({ finding, regionId }) {
  return (
    <div className="ttahub-review-card--finding-within-review margin-top-4" key={uniqueId('review-card-finding-')}>
      <DescriptionList>
        <DescriptionItem title="Citation">
          {finding.citation}
        </DescriptionItem>
        <DescriptionItem title="Finding status">
          {finding.status}
        </DescriptionItem>
        <DescriptionItem title="Finding type">
          {finding.findingType}
        </DescriptionItem>
        <DescriptionItem title="Due date (as of review)">
          {finding.correctionDeadline}
        </DescriptionItem>
        <DescriptionItem title="Category" className="ttahub-review-card--finding-within-review-category">
          {finding.category}
        </DescriptionItem>
      </DescriptionList>
      {finding.objectives.length > 0 ? finding.objectives.map((objective) => (
        <ReviewObjective key={uniqueId('review-objective')} objective={objective} regionId={regionId} />
      )) : <NoTtaProvidedAgainst />}
    </div>

  );
}

FindingWithinReview.propTypes = {
  finding: PropTypes.shape({
    citation: PropTypes.string.isRequired,
    status: PropTypes.string.isRequired,
    findingType: PropTypes.string.isRequired,
    category: PropTypes.string.isRequired,
    correctionDeadline: PropTypes.string.isRequired,
    objectives: PropTypes.arrayOf(PropTypes.shape({
      activityReportIds: PropTypes.arrayOf(PropTypes.string).isRequired,
      endDate: PropTypes.string.isRequired,
      status: PropTypes.string.isRequired,
      title: PropTypes.string.isRequired,
      topics: PropTypes.arrayOf(PropTypes.string),
    })),
  }).isRequired,
  regionId: PropTypes.number.isRequired,
};
