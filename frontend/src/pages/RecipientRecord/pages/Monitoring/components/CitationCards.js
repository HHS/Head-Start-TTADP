import React from 'react';
import PropTypes from 'prop-types';
import { uniqueId } from 'lodash';
import CitationCard from './CitationCard';

export default function CitationCards({ data, regionId }) {
  return (
    data.map((citation) => (
      <CitationCard key={uniqueId('citation-card-')} citation={citation} regionId={regionId} />
    )));
}

CitationCards.propTypes = {
  data: PropTypes.arrayOf(PropTypes.shape({
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
