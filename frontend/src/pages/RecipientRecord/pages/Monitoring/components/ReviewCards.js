import React from 'react';
import PropTypes from 'prop-types';
import { uniqueId } from 'lodash';
import ReviewCard from './ReviewCard';

export default function ReviewCards({ data, regionId }) {
  return (
    data.map((review) => (
      <ReviewCard key={uniqueId('review-card-')} review={review} regionId={regionId} />
    )));
}

ReviewCards.propTypes = {
  data: PropTypes.arrayOf(PropTypes.shape({
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
        activityReportIds: PropTypes.arrayOf(PropTypes.string).isRequired,
        endDate: PropTypes.string.isRequired,
        status: PropTypes.string.isRequired,
        title: PropTypes.string.isRequired,
        topics: PropTypes.arrayOf(PropTypes.string),
      })).isRequired,
    })).isRequired,
  })).isRequired,
  regionId: PropTypes.number.isRequired,
};
