import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { uniqueId } from 'lodash';
import DataCard from '../../../../../components/DataCard';
import DescriptionItem from './DescriptionItem';
import DescriptionList from './DescriptionList';
import ExpanderButton from '../../../../../components/ExpanderButton';
import ReviewWithinCitation from './ReviewWithinCitation';
import './CitationCard.css';
import CitationDrawer from './CitationDrawer';

export default function CitationCard({ citation, regionId, first = false }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <DataCard
      testId="citation-card"
      key={uniqueId('citation-card-')}
      className="ttahub-monitoring-citation-card"
    >
      <div className="display-flex flex-align-center flex-row">
        <h3 className="text-normal font-sans-xs margin-0">
          <CitationDrawer bolded citationNumber={citation.citationNumber} first={first} />
        </h3>
      </div>
      <DescriptionList>
        <DescriptionItem title="Current status">
          {citation.status}
        </DescriptionItem>
        <DescriptionItem title="Finding type">
          {citation.findingType}
        </DescriptionItem>
        <DescriptionItem title="Category" className="ttahub-monitoring-citation-card-category">
          {citation.category}
        </DescriptionItem>
        <DescriptionItem title="Grants cited">
          <ul className="add-list-reset">
            {citation.grantNumbers.map((grant) => (
              <li key={uniqueId('grant-')}>{grant}</li>
            ))}
          </ul>
        </DescriptionItem>
        <DescriptionItem title="Last TTA">
          {citation.lastTTADate}
        </DescriptionItem>
      </DescriptionList>
      <ExpanderButton
        closeOrOpen={() => setExpanded(!expanded)}
        count={citation.reviews.length}
        expanded={expanded}
        type="TTA activity"
        ariaLabel="TTA activity"
        showCount={false}
        pluralize={false}
      />
      {expanded && (
        citation.reviews.map((review) => (
          <ReviewWithinCitation
            review={review}
            regionId={regionId}
            key={uniqueId('review-within-citation-')}
          />
        ))
      )}
    </DataCard>
  );
}
CitationCard.propTypes = {
  citation: PropTypes.shape({
    citationNumber: PropTypes.string.isRequired,
    status: PropTypes.string.isRequired,
    findingType: PropTypes.string.isRequired,
    category: PropTypes.string.isRequired,
    grantNumbers: PropTypes.arrayOf(PropTypes.string).isRequired,
    lastTTADate: PropTypes.string.isRequired,
    reviews: PropTypes.arrayOf(PropTypes.shape({
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
    })).isRequired,
  }).isRequired,
  regionId: PropTypes.number.isRequired,
  first: PropTypes.bool,
};

CitationCard.defaultProps = {
  first: false,
};
