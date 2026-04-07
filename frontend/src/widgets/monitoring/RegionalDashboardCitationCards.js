import React from 'react';
import PropTypes from 'prop-types';
import RegionalDashboardCitationCard from './RegionalDashboardCitationCard';

export default function RegionalDashboardCitationCards({ data, regionId }) {
  return (
    data.map((citation) => (
      <RegionalDashboardCitationCard key={`citation-card-${citation.citationNumber}-${citation.recipientName}`} citation={citation} regionId={regionId} />
    )));
}

RegionalDashboardCitationCards.propTypes = {
  data: PropTypes.arrayOf(PropTypes.shape({
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
  })).isRequired,
  regionId: PropTypes.number.isRequired,
};
