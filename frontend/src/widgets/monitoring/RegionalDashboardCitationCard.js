import React from 'react';
import PropTypes from 'prop-types';
import { uniqueId } from 'lodash';
import { Checkbox } from '@trussworks/react-uswds';
import { Link } from 'react-router-dom';
import DataCard from '../../components/DataCard';
import DescriptionItem from '../../pages/RecipientRecord/pages/Monitoring/components/DescriptionItem';
import DescriptionList from '../../pages/RecipientRecord/pages/Monitoring/components/DescriptionList';
import ExpanderButton from '../../components/ExpanderButton';
import ReviewWithinCitation from '../../pages/RecipientRecord/pages/Monitoring/components/ReviewWithinCitation';
import CitationDrawer from '../../pages/RecipientRecord/pages/Monitoring/components/CitationDrawer';
import './RegionalDashboardCitationCard.css';
import useExpanderFocusClick from '../../hooks/useExpanderFocusClick';

export default function RegionalDashboardCitationCard({ citation, regionId }) {
  const { expanded, btnRef, handleExpanderClick } = useExpanderFocusClick();

  return (
    <DataCard
      testId="citation-card"
      key={uniqueId('citation-card-')}
      className="ttahub-monitoring-citation-card ttahub-regional-dashboard-citation-card"
    >
      <div className="regional-dashboard-citation-card-internals">
        <Checkbox
          id={`${citation.citationNumber}-checkbox`}
          name={`${citation.citationNumber}-checkbox`}
        />
        <div>
          <div className="display-flex flex-align-center flex-row">
            <h3 className="text-normal font-sans-xs margin-0 text-bold">
              <Link to="#1">{citation.recipientName}</Link>
            </h3>
          </div>
          <DescriptionList>
            <DescriptionItem title="Citation number">
              <CitationDrawer citationNumber={citation.citationNumber} />
            </DescriptionItem>
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
            closeOrOpen={handleExpanderClick}
            count={citation.reviews.length}
            expanded={expanded}
            type="TTA activity"
            ariaLabel="TTA activity"
            showCount={false}
            pluralize={false}
            ref={btnRef}
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
        </div>
      </div>
    </DataCard>
  );
}
RegionalDashboardCitationCard.propTypes = {
  citation: PropTypes.shape({
    recipientName: PropTypes.string.isRequired,
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
};
