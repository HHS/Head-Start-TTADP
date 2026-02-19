import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { faExternalLinkAlt } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Link } from '@trussworks/react-uswds';
import Container from '../../../../components/Container';
import { getMonitoringData } from '../../../../fetchers/monitoring';
import './ClassReview.scss';
import { useGrantData } from '../GrantDataContext';

const BadgeCompliant = () => (
  <span className="ttahub-badge--success font-sans-2xs text-white text-bold">
    Compliant
  </span>
);

const BadgeNoncompliant = (text = 'Noncompliant') => (
  <span className="ttahub-badge--error font-sans-2xs text-white text-bold">
    {text}
  </span>
);

const MonitoringReview = ({ grantNumber, regionId, recipientId }) => {
  const { updateGrantMonitoringData } = useGrantData();
  const [review, setReview] = useState({});

  useEffect(() => {
    const fetchReview = async () => {
      const data = await getMonitoringData({ grantNumber, recipientId, regionId });
      setReview(data);
      updateGrantMonitoringData(grantNumber, Boolean(data && Object.keys(data).length));
    };
    fetchReview();
  }, [grantNumber, regionId, recipientId, updateGrantMonitoringData]);

  const getComplianceBadge = (key) => {
    const lowerKey = key.toLowerCase();
    if (lowerKey === 'compliant') return BadgeCompliant();
    if (lowerKey === 'noncompliant' || lowerKey === 'non compliant') return BadgeNoncompliant();
    if (lowerKey === 'deficient') return BadgeNoncompliant('Deficient');
    return null;
  };

  if (!review || !Object.keys(review).length) return null;

  return (
    <Container paddingX={0} paddingY={0} className="smart-hub--overflow-auto">
      <div className="ttahub-recipient-record--card-header padding-x-3 padding-y-3 margin-bottom-0 margin-top-0">
        <div className="display-flex flex-row flex-justify">
          <h3 className="ttahub-card-header-title margin-0 padding-0">Monitoring review</h3>
          <Link
            className="display-flex flex-align-center"
            href={`https://hses.ohs.acf.hhs.gov/monitoring/grant?grant=${grantNumber}`}
            aria-label={`HSES monitoring for grant ${grantNumber}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            HSES monitoring
            {' '}
            <FontAwesomeIcon icon={faExternalLinkAlt} size="sm" className="margin-left-1" />
          </Link>
        </div>
      </div>
      <div className="padding-x-3 padding-bottom-2">

        {/* Compliance */}
        {review.reviewStatus && review.reviewDate && (
        <div className="margin-y-2">
          <div className="display-flex flex-row flex-justify flex-align-center">
            <p className="margin-y-1">
              <strong>Last review status</strong>
            </p>
            {getComplianceBadge(review.reviewStatus)}
          </div>
          <p className="margin-0">
            {review.reviewStatus}
            {' '}
            as of
            {' '}
            {review.reviewDate}
          </p>
        </div>
        )}

        {/* Type */}
        {review.reviewType && (
        <div className="margin-y-2">
          <p className="margin-y-1">
            <strong>Review type</strong>
          </p>
          <p className="margin-y-1">
            {review.reviewType}
          </p>
        </div>
        )}

      </div>
    </Container>
  );
};

MonitoringReview.propTypes = {
  grantNumber: PropTypes.string.isRequired,
  regionId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  recipientId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
};

export default MonitoringReview;
