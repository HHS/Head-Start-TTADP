import React, { useEffect, useRef, useState } from 'react';
import { faExternalLinkAlt } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Button } from '@trussworks/react-uswds';
import PropTypes from 'prop-types';
import moment from 'moment';
import Container from '../../../../components/Container';
import Drawer from '../../../../components/Drawer';
import { getClassScores } from '../../../../fetchers/monitoring';
import './ClassReview.scss';
import { useGrantData } from '../GrantDataContext';

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grantNumber, recipientId, regionId]);

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
        <h3>Quality thresholds</h3>
        <p>
          Beginning in Novembr 2020, the quality thresholds represent OHS&apos;s
          expectation for all grantees regarding the quality of classroom learning environments.
          These thresholds do not trigger competition; rather, a grantee with a score below a
          quality threshold receives support from OHS in improving the quality of teacher-child
          interactions in the classroom. The quality thresholds are as follows:
        </p>
        <ul style={{ listStyleType: 'none', paddingLeft: 0 }}>
          <li>6 for the Emotional Support domain.</li>
          <li>6 for the Classroom Organization domain.</li>
          <li>3 for the Instructional Support domain.</li>
        </ul>
        <h3>Competetive thresholds</h3>
        <p>
          Grantees with average CLASS® scores below the established competitive threshold
          on any of the three CLASS® domains is required to compete.
          The competitive thresholds are as follows:
        </p>
        <ul style={{ listStyleType: 'none', paddingLeft: 0 }}>
          <li>5 for the Emotional Support domain.</li>
          <li>5 for the Classroom Organization domain.</li>
          <li>
            2.3 for the Instructional Support domain for CLASS® reviews conducted through
            July 31, 2025, and 2.5 for those conducted on or after Aug. 1, 2025.
          </li>
        </ul>
      </Drawer>
      <div className="ttahub-recipient-record--card-header padding-x-3 padding-y-3 margin-bottom-0 margin-top-0">
        <div className="display-flex flex-row flex-justify">
          <h2 className="margin-0 padding-0">CLASS® review</h2>
          <Button unstyled className="display-flex flex-align-center">
            HSES CLASS
            {' '}
            <FontAwesomeIcon icon={faExternalLinkAlt} size="sm" className="margin-left-1" />
          </Button>
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