import React from 'react';
import PropTypes from 'prop-types';
import { Helmet } from 'react-helmet';
import { Grid, GridContainer } from '@trussworks/react-uswds';
import { DashboardOverviewWidget } from '../../../widgets/DashboardOverview';
import { getRecipientSpotlight } from '../../../fetchers/recipientSpotlight';
import { filtersToQueryString } from '../../../utils';
import useFetch from '../../../hooks/useFetch';
import './RecipientSpotlightDashboard.scss';

const DEFAULT_OVERVIEW_DATA = {
  numRecipients: '0',
  totalRecipients: '0',
  recipientPercentage: '0%',
};

export default function RecipientSpotlightDashboard({
  filtersToApply,
}) {
  const { data, error } = useFetch(
    { overview: DEFAULT_OVERVIEW_DATA },
    async () => {
      const filters = filtersToQueryString(filtersToApply);

      const result = getRecipientSpotlight(
        'recipientName',
        'asc',
        0,
        filters,
        undefined, // no limit - get all recipients
      );
      return result;
    },
    [filtersToApply],
    'Unable to load overview data',
    true, // useAppLoading
  );

  const overviewData = data?.overview || DEFAULT_OVERVIEW_DATA;

  return (
    <>
      <Helmet>
        <title>Regional Dashboard - Recipient spotlight</title>
      </Helmet>
      <GridContainer className="smart-hub--recipient-spotlight-dashboard margin-0 padding-0">
        {error && (
          <div className="usa-alert usa-alert--error margin-bottom-3">
            <div className="usa-alert__body">
              <p className="usa-alert__text">{error}</p>
            </div>
          </div>
        )}
        <Grid row gap>
          <Grid col={3}>
            <DashboardOverviewWidget
              data={overviewData}
              fields={['Recipients with priority indicators']}
              showTooltips
              maxToolTipWidth={220}
            />
          </Grid>
        </Grid>
        <Grid row>
          <Grid col={12}>
            <p>Place holder for spotlight cards table.</p>
          </Grid>
        </Grid>
      </GridContainer>
    </>
  );
}

RecipientSpotlightDashboard.propTypes = {
  filtersToApply: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
};
