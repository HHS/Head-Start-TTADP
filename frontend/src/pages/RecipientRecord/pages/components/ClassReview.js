import React, { useEffect, useRef, useState } from 'react';
import { faExternalLinkAlt } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Link } from '@trussworks/react-uswds';
import PropTypes from 'prop-types';
import moment from 'moment';
import Container from '../../../../components/Container';
import Drawer from '../../../../components/Drawer';
import { getClassScores } from '../../../../fetchers/monitoring';
import './ClassReview.scss';
import { useGrantData } from '../GrantDataContext';
import ContentFromFeedByTag from '../../../../components/ContentFromFeedByTag';

const BadgeAbove = () => (
  <span className="ttahub-badge--success font-sans-2xs text-white text-bold">
    Above all thresholds
  </span>
);

const BadgeBelowQuality = () => (
  <span className="ttahub-badge--warning font-sans-2xs text-bold">
    Below quality
  </span>
);

const BadgeBelowCompetetive = () => (
  <span className="ttahub-badge--error font-sans-2xs text-white text-bold">
    Below competetive
  </span>
);

const ClassReview = ({ grantNumber, recipientId, regionId }) => {
  const { updateGrantClassData } = useGrantData();
  const [scores, setScores] = useState({});
  const howMetRef = useRef(null);

  useEffect(() => {
    const fetchScores = async () => {
      const data = await getClassScores({ grantNumber, recipientId, regionId });
      setScores(data);
      updateGrantClassData(grantNumber, Boolean(data && Object.keys(data).length));
    };
    fetchScores();
  }, [grantNumber, recipientId, regionId, updateGrantClassData]);

  const getScoreBadge = (key, score, received) => {
    if (key === 'ES' || key === 'CO') {
      if (score >= 6) return BadgeAbove();
      if (score < 5) return BadgeBelowCompetetive();
      return BadgeBelowQuality();
    }

    if (key === 'IS') {
      if (score >= 3) return BadgeAbove();

      // IS is slightly more complicated.
      // See TTAHUB-2097 for details.
      const dt = moment(received, 'MM/DD/YYYY');

      if (dt.isAfter('2025-08-01')) {
        if (score < 2.5) return BadgeBelowCompetetive();
        return BadgeBelowQuality();
      }

      if (dt.isAfter('2020-11-09') && dt.isBefore('2025-07-31')) {
        if (score < 2.3) return BadgeBelowCompetetive();
        return BadgeBelowQuality();
      }
    }

    return null;
  };

  if (!scores || Object.keys(scores).length === 0) return null;

  return (
    <Container paddingX={0} paddingY={0} className="smart-hub--overflow-auto">
      <Drawer
        triggerRef={howMetRef}
        stickyHeader
        stickyFooter
        title="CLASS® review thresholds"
      >
        <ContentFromFeedByTag
          tagName="ttahub-class-thresholds"
          contentSelector="div:nth-child(3)"
          className="ttahub-class-feed-article"
        />
        <ContentFromFeedByTag
          tagName="ttahub-class-thresholds"
          contentSelector="div:nth-child(4)"
          className="ttahub-class-feed-article"
        />
      </Drawer>
      <div className="ttahub-recipient-record--card-header padding-x-3 padding-y-3 margin-bottom-0 margin-top-0">
        <div className="display-flex flex-row flex-justify">
          <h2 className="margin-0 padding-0">CLASS® review</h2>
          <Link
            className="display-flex flex-align-center"
            href={`https://hses.ohs.acf.hhs.gov/grant-summary/?grant=${grantNumber}`}
            arial-label={`HSES CLASS scores for grant ${grantNumber}`}
          >
            HSES CLASS
            {' '}
            <FontAwesomeIcon icon={faExternalLinkAlt} size="sm" className="margin-left-1" />
          </Link>
        </div>
        <div className="margin-top-1">
          <button
            type="button"
            className="usa-button usa-button--unstyled font-sans-xs"
            ref={howMetRef}
          >
            How are thresholds met?
          </button>
        </div>
      </div>
      <div className="padding-x-3 padding-bottom-2">

        {/* Received date */}
        {scores.received && (
        <div className="margin-y-2">
          <p className="margin-y-1">
            <strong>Report received date</strong>
          </p>
          <p className="margin-y-1">
            {scores.received}
          </p>
        </div>
        )}

        {/* Emotional support score */}
        {scores.ES && (
        <div className="margin-y-2" data-testid="class-es">
          <div className="display-flex flex-row flex-justify flex-align-center">
            <p className="margin-y-1">
              <strong>Emotional support</strong>
            </p>
            {getScoreBadge('ES', scores.ES, scores.received)}
          </div>
          <p className="margin-0">
            {scores.ES}
          </p>
        </div>
        )}

        {/* Classroom organization score */}
        {scores.CO && (
        <div className="margin-y-2" data-testid="class-co">
          <div className="display-flex flex-row flex-justify flex-align-center">
            <p className="margin-y-1">
              <strong>Classroom organization</strong>
            </p>
            {getScoreBadge('CO', scores.CO, scores.received)}
          </div>
          <p className="margin-0">
            {scores.CO}
          </p>
        </div>
        )}

        {/* Instructional support score */}
        {scores.IS && (
        <div className="margin-y-2" data-testid="class-is">
          <div className="display-flex flex-row flex-justify flex-align-center">
            <p className="margin-y-1">
              <strong>Instructional support</strong>
            </p>
            {getScoreBadge('IS', scores.IS, scores.received)}
          </div>
          <p className="margin-0">
            {scores.IS}
          </p>
        </div>
        )}

      </div>
    </Container>
  );
};

ClassReview.propTypes = {
  grantNumber: PropTypes.string.isRequired,
  regionId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  recipientId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
};

export default ClassReview;
