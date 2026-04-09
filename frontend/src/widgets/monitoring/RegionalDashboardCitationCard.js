import React from 'react';
import PropTypes from 'prop-types';
import { Checkbox } from '@trussworks/react-uswds';
import { Link } from 'react-router-dom';
import DataCard from '../../components/DataCard';
import DescriptionItem from '../../components/DescriptionItem';
import DescriptionList from '../../components/DescriptionList';
import ExpanderButton from '../../components/ExpanderButton';
import CitationDrawer from '../../pages/RecipientRecord/pages/Monitoring/components/CitationDrawer';
import useExpanderFocusClick from '../../hooks/useExpanderFocusClick';
import './RegionalDashboardCitationCard.css';
import RegionalDashboardReviewWithinCitation from './RegionalDashboardReviewWithinCitation';

export default function RegionalDashboardCitationCard({ citation, isChecked, onCheckboxSelect }) {
  const { expanded, btnRef, handleExpanderClick } = useExpanderFocusClick();

  return (
    <DataCard
      testId="citation-card"
      data-id={citation.id}
      className="ttahub-monitoring-citation-card ttahub-regional-dashboard-citation-card"
    >
      <div className="regional-dashboard-citation-card-internals">
        <Checkbox
          id={`${citation.citationNumber}-${citation.recipientId}-checkbox-${citation.id}`}
          name={`${citation.citationNumber}-${citation.recipientId}-checkbox-${citation.id}`}
          label=""
          aria-label={`Select citation ${citation.citationNumber} for ${citation.recipientName}`}
          value={String(citation.id)}
          checked={isChecked}
          onChange={onCheckboxSelect}
        />
        <div>
          <div className="display-flex flex-align-center flex-row">
            <h3 className="text-normal font-sans-xs margin-0 text-bold">
              <Link to={`/recipient-tta-records/${citation.recipientId}/region/${citation.regionId}/profile`}>{citation.recipientName}</Link>
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
            <DescriptionItem title="Category" className="ttahub-monitoring-citation-card-span-2">
              {citation.category}
            </DescriptionItem>
            <DescriptionItem title="Grants cited">
              <ul className="add-list-reset">
                {citation.grantNumbers.map((grant) => (
                  <li key={`citation-${citation.citationNumber}-grant-${grant}`}>{grant}</li>
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
              <RegionalDashboardReviewWithinCitation
                review={review}
                regionId={citation.regionId}
                key={`citation-${citation.citationNumber}-review-${review.name}`}
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
    id: PropTypes.number.isRequired,
    recipientName: PropTypes.string.isRequired,
    regionId: PropTypes.number.isRequired,
    recipientId: PropTypes.number.isRequired,
    citationNumber: PropTypes.string.isRequired,
    citationId: PropTypes.number.isRequired,
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
      findingStatus: PropTypes.string.isRequired,
      specialists: PropTypes.arrayOf(PropTypes.shape({
        name: PropTypes.string.isRequired,
        roles: PropTypes.arrayOf(PropTypes.string).isRequired,
      })).isRequired,
      objectives: PropTypes.arrayOf(PropTypes.shape({
        title: PropTypes.string.isRequired,
        activityReports: PropTypes.arrayOf(PropTypes.shape({
          id: PropTypes.number.isRequired,
          displayId: PropTypes.string.isRequired,
        })).isRequired,
        endDate: PropTypes.string.isRequired,
        topics: PropTypes.arrayOf(PropTypes.string).isRequired,
        status: PropTypes.string.isRequired,
      })).isRequired,
    })).isRequired,
  }).isRequired,
  isChecked: PropTypes.bool,
  onCheckboxSelect: PropTypes.func,
};

RegionalDashboardCitationCard.defaultProps = {
  isChecked: false,
  onCheckboxSelect: () => {},
};
