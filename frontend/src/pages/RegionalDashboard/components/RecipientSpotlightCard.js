import React, { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import moment from 'moment';
import DataCard from '../../../components/DataCard';
import ExpanderButton from '../../../components/ExpanderButton';
import IndicatorCounter from '../../RecipientRecord/components/IndicatorCounter';
import './RecipientSpotlightCard.scss';

const INDICATOR_DETAILS = {
  childIncidents: {
    label: 'Child incidents',
    description: 'Recipient has experienced more than one child incident cited in a RAN in the last 12 months',
  },
  deficiency: {
    label: 'Deficiency',
    description: 'Recipient has at least one active monitoring deficiency',
  },
  // Temporarily hidden - will be added back later
  // DRS: {
  //   label: 'DRS',
  //   description: 'Recipient meets the conditions for the Designation Renewal System (DRS)',
  // },
  // FEI: {
  //   label: 'FEI',
  //   description: 'Recipient is currently in the Full Enrollment Initiative (FEI)',
  // },
  newRecipients: {
    label: 'New recipient',
    description: 'Recipient is in the first 4 years as a Head Start program with no previous OHS grant',
  },
  newStaff: {
    label: 'New staff',
    description: 'Recipient has changed the name of the director or fiscal officer within the last two years in HSES, signifying a key hire',
  },
  noTTA: {
    label: 'No TTA',
    description: 'Recipient does not have any TTA reports in last 12 months',
  },
};

export default function RecipientSpotlightCard({ recipient }) {
  const [expanded, setExpanded] = useState(false);
  const firstIndicatorRef = useRef(null);

  const closeOrOpenIndicators = () => {
    setExpanded(!expanded);
  };

  useEffect(() => {
    if (expanded && firstIndicatorRef.current) {
      firstIndicatorRef.current.focus();
    }
  }, [expanded]);

  const calculateActiveIndicators = (recip) => {
    const indicators = [
      recip.childIncidents,
      recip.deficiency,
      recip.newRecipients,
      recip.newStaff,
      recip.noTTA,
      // Temporarily hidden - will be added back later
      // recip.DRS,
      // recip.FEI,
    ];
    return indicators.filter(Boolean).length;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = moment(dateString, 'YYYY-MM-DD', true);
    return date.isValid() ? date.format('MM/DD/YYYY') : 'Invalid Date';
  };

  const renderIndicatorDetails = () => Object.entries(
    INDICATOR_DETAILS,
  ).map(
    ([key, { label, description }], index) => {
      const isApplicable = recipient[key];
      const boxClassName = isApplicable
        ? 'ttahub-recipient-spotlight-card__indicator-box padding-y-1 padding-x-2 bg-white radius-md'
        : 'ttahub-recipient-spotlight-card__indicator-box ttahub-recipient-spotlight-card__indicator-box--not-applicable padding-y-1 padding-x-2 bg-white radius-md';

      return (
        <div
          key={key}
          ref={index === 0 ? firstIndicatorRef : null}
          className={boxClassName}
          role="article"
          aria-label={`${label} - ${isApplicable ? 'Active indicator' : 'Not applicable to this recipient'}`}
        >
          <div className="ttahub-recipient-spotlight-card__indicator-box-label text-bold margin-bottom-05">
            {label}
            <span className="usa-sr-only">
              {isApplicable ? ' - Active indicator' : ' - Not applicable to this recipient'}
            </span>
          </div>
          <p className="ttahub-recipient-spotlight-card__indicator-box-description margin-0">
            {description}
          </p>
        </div>
      );
    },
  );

  const activeCount = calculateActiveIndicators(recipient);
  const indicatorDetails = renderIndicatorDetails();

  return (
    <DataCard
      testId={`recipient-spotlight-card-${recipient.recipientId}`}
      className="ttahub-recipient-spotlight-card"
    >
      <div className="grid-container padding-0">
        <div className="ttahub-recipient-spotlight-card__grid">
          <div className="ttahub-recipient-spotlight-card__field">
            <p className="usa-prose text-bold margin-y-0">Recipient</p>
            <Link
              to={`/recipient-tta-records/${recipient.recipientId}/region/${recipient.regionId}/profile`}
              className="ttahub-recipient-spotlight-card__recipient-name"
            >
              {recipient.recipientName}
            </Link>
          </div>

          <div className="ttahub-recipient-spotlight-card__field">
            <p className="usa-prose text-bold margin-y-0">Region</p>
            <p className="usa-prose margin-y-0">
              {recipient.regionId}
            </p>
          </div>

          <div className="ttahub-recipient-spotlight-card__field">
            <p className="usa-prose text-bold margin-y-0">Last TTA</p>
            <p className="usa-prose margin-y-0">
              {formatDate(recipient.lastTTA)}
            </p>
          </div>

          <div className="ttahub-recipient-spotlight-card__field">
            <p className="usa-prose text-bold margin-y-0 margin-bottom-1">Indicators</p>
            <div className="margin-top-0">
              <IndicatorCounter
                count={activeCount}
                totalCount={5}
                showCountInline
                noTopMargin
              />
            </div>
          </div>

          <div className="ttahub-recipient-spotlight-card__field display-flex flex-align-center">
            <ExpanderButton
              type="indicator"
              ariaLabel={`indicators for recipient ${recipient.recipientName}`}
              closeOrOpen={closeOrOpenIndicators}
              count={activeCount}
              expanded={expanded}
              pluralize
              showCount={false}
              allowZeroCount
            />
          </div>
        </div>

        {expanded && (
          <div className="ttahub-recipient-spotlight-card__details margin-top-2">
            <div className="ttahub-recipient-spotlight-card__details-grid">
              {indicatorDetails}
            </div>
          </div>
        )}
      </div>
    </DataCard>
  );
}

RecipientSpotlightCard.propTypes = {
  recipient: PropTypes.shape({
    recipientId: PropTypes.number.isRequired,
    regionId: PropTypes.number.isRequired,
    recipientName: PropTypes.string.isRequired,
    grantIds: PropTypes.arrayOf(PropTypes.string),
    lastTTA: PropTypes.string,
    childIncidents: PropTypes.bool,
    deficiency: PropTypes.bool,
    newRecipients: PropTypes.bool,
    newStaff: PropTypes.bool,
    noTTA: PropTypes.bool,
    DRS: PropTypes.bool,
    FEI: PropTypes.bool,
  }).isRequired,
};
