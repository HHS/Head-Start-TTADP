import React from 'react';
import PropTypes from 'prop-types';
import DataCard from '../../../../../components/DataCard';
import DescriptionItem from '../../../../../components/DescriptionItem';
import DescriptionList from '../../../../../components/DescriptionList';
import FindingWithinReview from './FindingWithinReview';
import SpecialistTags from './SpecialistTags';
import Tag from '../../../../../components/Tag';
import ExpanderButton from '../../../../../components/ExpanderButton';
import useExpanderFocusClick from '../../../../../hooks/useExpanderFocusClick';

export default function ReviewCard({ review, regionId }) {
  const { expanded, btnRef, handleExpanderClick } = useExpanderFocusClick();

  return (
    <DataCard
      testId="review-card"
      className="ttahub-monitoring-review-card"
    >
      <div className="display-flex flex-align-center flex-row">
        <h3 className="font-sans-xs margin-0">
          Review
          {' '}
          {review.name}
        </h3>
        <Tag>{review.reviewType}</Tag>
      </div>
      <DescriptionList>
        <DescriptionItem title="Grants on review">
          <ul className="add-list-reset">
            {review.grants.map((grant) => (
              <li key={`review-${review.name}-${grant}`}>{grant}</li>
            ))}
          </ul>
        </DescriptionItem>
        <DescriptionItem
          title="Review received"
        >
          {review.reviewReceived}
        </DescriptionItem>
        <DescriptionItem
          title="Findings"
        >
          {review.findings.length}
        </DescriptionItem>
        <DescriptionItem
          title="Review outcome"
        >
          {review.outcome}
        </DescriptionItem>
        <DescriptionItem
          title="Last TTA"
        >
          {review.lastTTADate}
        </DescriptionItem>

        <DescriptionItem
          title="TTA specialists"
        >
          {review.specialists.length > 0 && (
          <SpecialistTags specialists={review.specialists} />
          )}
        </DescriptionItem>
      </DescriptionList>
      <ExpanderButton
        closeOrOpen={handleExpanderClick}
        count={review.findings.length}
        expanded={expanded}
        type="TTA activity"
        showCount={false}
        pluralize={false}
        ariaLabel="TTA activity"
        ref={btnRef}
      />
      {expanded && (review.findings.map((finding) => (
        <FindingWithinReview
          key={`finding-${finding.citation}`}
          finding={finding}
          regionId={Number(regionId)}
        />
      )))}
    </DataCard>
  );
}

ReviewCard.propTypes = {
  review: PropTypes.shape({
    name: PropTypes.string.isRequired,
    reviewType: PropTypes.string.isRequired,
    reviewReceived: PropTypes.string.isRequired,
    outcome: PropTypes.string.isRequired,
    lastTTADate: PropTypes.string,
    specialists: PropTypes.arrayOf(PropTypes.shape({
      name: PropTypes.string.isRequired,
      roles: PropTypes.arrayOf(PropTypes.string).isRequired,
    })).isRequired,
    grants: PropTypes.arrayOf(PropTypes.string).isRequired,
    findings: PropTypes.arrayOf(PropTypes.shape({
      citation: PropTypes.string.isRequired,
      status: PropTypes.string.isRequired,
      findingType: PropTypes.string.isRequired,
      category: PropTypes.string.isRequired,
      correctionDeadline: PropTypes.string.isRequired,
      objectives: PropTypes.arrayOf(PropTypes.shape({
        activityReports: PropTypes.arrayOf(PropTypes.shape({
          id: PropTypes.number.isRequired,
          displayId: PropTypes.string.isRequired,
        })).isRequired,
        endDate: PropTypes.string.isRequired,
        status: PropTypes.string.isRequired,
        title: PropTypes.string.isRequired,
        topics: PropTypes.arrayOf(PropTypes.string),
      })).isRequired,
    })).isRequired,
  }).isRequired,
  regionId: PropTypes.number.isRequired,
};
