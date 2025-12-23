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
  DRS: {
    label: 'DRS',
    description: 'Recipient meets the conditions for the Designation Renewal System (DRS)',
  },
  FEI: {
    label: 'FEI',
    description: 'Recipient is currently in the Full Enrollment Initiative (FEI)',
  },
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
      recip.DRS,
      recip.FEI,
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
          // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
          tabIndex={0}
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
      className="ttahub-recipient-spotlight-card margin-bottom-1"
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
                totalCount={7}
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
            {activeCount === 0 && (
              <div className="ttahub-recipient-spotlight-card__success-message margin-bottom-2 display-flex flex-align-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="margin-right-1" width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <path d="M19.375 8.04688C19.7917 8.61979 20 9.27083 20 10C20 10.7292 19.7917 11.3932 19.375 11.9922C18.9583 12.5651 18.4245 12.9688 17.7734 13.2031C18.0599 13.8281 18.138 14.5052 18.0078 15.2344C17.9036 15.9375 17.5911 16.5495 17.0703 17.0703C16.5495 17.5911 15.9375 17.9036 15.2344 18.0078C14.5312 18.138 13.8542 18.0599 13.2031 17.7734C13.0469 18.2161 12.8125 18.5938 12.5 18.9062C12.1875 19.2448 11.8099 19.5052 11.3672 19.6875C10.9505 19.8958 10.4948 20 10 20C9.27083 20 8.60677 19.7917 8.00781 19.375C7.4349 18.9583 7.03125 18.4245 6.79688 17.7734C6.14583 18.0599 5.46875 18.138 4.76562 18.0078C4.0625 17.9036 3.45052 17.5911 2.92969 17.0703C2.40885 16.5495 2.08333 15.9375 1.95312 15.2344C1.84896 14.5052 1.9401 13.8281 2.22656 13.2031C1.57552 12.9688 1.04167 12.5651 0.625 11.9922C0.208333 11.3932 0 10.7292 0 10C0 9.27083 0.208333 8.61979 0.625 8.04688C1.04167 7.44792 1.57552 7.03125 2.22656 6.79688C1.9401 6.17188 1.84896 5.50781 1.95312 4.80469C2.08333 4.07552 2.40885 3.45052 2.92969 2.92969C3.45052 2.40885 4.0625 2.09635 4.76562 1.99219C5.49479 1.86198 6.17188 1.9401 6.79688 2.22656C7.03125 1.57552 7.4349 1.04167 8.00781 0.625C8.60677 0.208333 9.27083 0 10 0C10.7292 0 11.3802 0.208333 11.9531 0.625C12.5521 1.04167 12.9688 1.57552 13.2031 2.22656C13.8281 1.9401 14.4922 1.86198 15.1953 1.99219C15.9245 2.09635 16.5495 2.40885 17.0703 2.92969C17.5911 3.45052 17.9036 4.07552 18.0078 4.80469C18.138 5.50781 18.0599 6.17188 17.7734 6.79688C18.4245 7.03125 18.9583 7.44792 19.375 8.04688ZM14.3359 8.28125C14.5443 8.07292 14.5443 7.86458 14.3359 7.65625L13.3203 6.64062C13.138 6.43229 12.9427 6.43229 12.7344 6.64062L8.94531 10.4297L7.30469 8.75C7.09635 8.54167 6.88802 8.54167 6.67969 8.75L5.66406 9.76562C5.45573 9.97396 5.45573 10.1693 5.66406 10.3516L8.63281 13.3594C8.8151 13.5417 9.01042 13.5417 9.21875 13.3594L14.3359 8.28125Z" fill="#00A91C" />
                </svg>
                <h3 className="margin-0 font-serif-md">No priority indicators identified</h3>
              </div>
            )}
            <div className="ttahub-recipient-spotlight-card__details-count margin-bottom-1">
              <strong>
                {activeCount}
                {' '}
                of 7 priority indicators
              </strong>
            </div>
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
