import React from 'react';
import PropTypes from 'prop-types';
import WidgetH2 from '../../../components/WidgetH2';
import Container from '../../../components/Container';
import NoResultsFound from '../../../components/NoResultsFound';

export default function RecipientSpotlightDashboardCards({
  recipients,
  loading,
}) {
  return (
    <Container
      paddingX={0}
      paddingY={1}
      loading={loading}
      loadingLabel="Recipient spotlight loading"
      className="ttahub-recipient-spotlight-container height-full"
    >
      <div className="ttahub-recipient-spotlight-table inline-size-auto maxw-full height-full">
        <div className="padding-3 recipient-spotlight-header">
          <WidgetH2 classNames="padding-0 margin-bottom-1">
            Recipient spotlight
          </WidgetH2>
          <p className="usa-prose padding-0 margin-0">
            These are the recipients that currently have at least one priority indicator.
          </p>
        </div>
        {recipients && recipients.length === 0 ? (
          <div className="usa-table-container--scrollable">
            {/* Placeholder for future table/cards implementation */}
          </div>
        ) : (
          <NoResultsFound
            customMessage="At this time, there are no recipients that have a priority indicator."
            hideFilterHelp
          />
        )}
      </div>
    </Container>
  );
}

RecipientSpotlightDashboardCards.propTypes = {
  recipients: PropTypes.arrayOf(PropTypes.shape({
    recipientId: PropTypes.number,
    recipientName: PropTypes.string,
    childIncidents: PropTypes.bool,
    deficiency: PropTypes.bool,
    newRecipients: PropTypes.bool,
    newStaff: PropTypes.bool,
    noTTA: PropTypes.bool,
    DRS: PropTypes.bool,
    FEI: PropTypes.bool,
  })),
  loading: PropTypes.bool,
};

RecipientSpotlightDashboardCards.defaultProps = {
  recipients: [],
  loading: false,
};
