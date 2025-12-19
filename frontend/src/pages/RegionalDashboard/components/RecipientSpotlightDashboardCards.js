import React from 'react';
import PropTypes from 'prop-types';
import { Pagination } from '@trussworks/react-uswds';
import Container from '../../../components/Container';
import NoResultsFound from '../../../components/NoResultsFound';
import RecipientSpotlightCard from './RecipientSpotlightCard';
import RecipientSpotlightCardsHeader from './RecipientSpotlightCardsHeader';
import { getPageInfo } from '../../../utils';
import './RecipientSpotlightDashboardCards.scss';

export default function RecipientSpotlightDashboardCards({
  recipients,
  count,
  sortConfig,
  requestSort,
  handlePageChange,
  perPage,
  perPageChange,
}) {
  return (
    <Container
      paddingX={0}
      paddingY={0}
      className="maxw-widescreen ttahub-recipient-spotlight-container height-full margin-y-0"
    >
      <div className="ttahub-recipient-spotlight-table inline-size-auto maxw-full height-full">
        <RecipientSpotlightCardsHeader
          sortConfig={sortConfig}
          requestSort={requestSort}
          perPage={perPage}
          perPageChange={perPageChange}
          count={count}
        />
        {recipients && recipients.length > 0 ? (
          <>
            <div className="usa-table-container--scrollable padding-x-3 padding-y-2">
              {recipients.map((recipient) => (
                <RecipientSpotlightCard
                  key={`recipient-spotlight-${recipient.recipientId}`}
                  recipient={recipient}
                />
              ))}
            </div>
            {/* Bottom pagination */}
            <div
              className="border-top smart-hub-border-base-lighter padding-3 display-flex flex-justify flex-align-center"
            >
              {/* Left: Page info */}
              <div>
                {getPageInfo(sortConfig.offset, count, sortConfig.activePage, perPage)}
              </div>

              {/* Right: Pagination controls */}
              <Pagination
                className="margin-y-0"
                pathname=""
                currentPage={sortConfig.activePage}
                totalPages={Math.ceil(count / perPage)}
                onClickNext={() => handlePageChange(sortConfig.activePage + 1)}
                onClickPrevious={() => handlePageChange(sortConfig.activePage - 1)}
                onClickPageNumber={(_event, page) => handlePageChange(page)}
              />
            </div>
          </>
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
    indicatorCount: PropTypes.number,
  })),
  count: PropTypes.number.isRequired,
  sortConfig: PropTypes.shape({
    sortBy: PropTypes.string.isRequired,
    direction: PropTypes.string.isRequired,
    activePage: PropTypes.number.isRequired,
    offset: PropTypes.number.isRequired,
  }).isRequired,
  requestSort: PropTypes.func.isRequired,
  handlePageChange: PropTypes.func.isRequired,
  perPage: PropTypes.number.isRequired,
  perPageChange: PropTypes.func.isRequired,
};

RecipientSpotlightDashboardCards.defaultProps = {
  recipients: [],
};
