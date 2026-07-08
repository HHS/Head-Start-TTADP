import { Grid } from '@trussworks/react-uswds';
import moment from 'moment';
import PropTypes from 'prop-types';
import React, { useMemo } from 'react';
import FeatureFlag from '../../../components/FeatureFlag';
import ActiveDeficientCitationsWithTtaSupport from '../../../widgets/ActiveDeficientCitationsWithTtaSupport';
import ActiveNoncompliantCitationsWithTtaSupport from '../../../widgets/ActiveNoncompliantCitationsWithTtaSupport';
import CompliantFollowUpReviewsWithTtaSupport from '../../../widgets/CompliantFollowUpReviewsWithTtaSupport';
import FindingCategoryHotspot from '../../../widgets/FindingCategoryHotspot';
import MonitoringRelatedTta from '../../../widgets/MonitoringRelatedTta';
import MonitoringReportDashboardOverview from '../../../widgets/MonitoringReportDashboardOverview';

const DATE_INPUT_FORMATS = ['MM/DD/YYYY', 'YYYY/MM/DD'];

function normalizeDateRangeToUs(query) {
  const value = Array.isArray(query) ? query[0] : query;

  if (typeof value !== 'string' || !value.includes('-')) {
    return query;
  }

  const [startDate, endDate] = value.split('-');
  const start = moment(startDate, DATE_INPUT_FORMATS, true);
  const end = moment(endDate, DATE_INPUT_FORMATS, true);

  if (!start.isValid() || !end.isValid()) {
    return query;
  }

  return `${start.format('MM/DD/YYYY')}-${end.format('MM/DD/YYYY')}`;
}

export default function MonitoringReportDashboard({ filtersToApply }) {
  const detailsFilters = useMemo(
    () =>
      filtersToApply
        .filter((filter) => filter.topic !== 'reportDeliveryDate')
        .map((filter) => {
          if (filter.topic !== 'startDate') {
            return filter;
          }

          return {
            ...filter,
            query: normalizeDateRangeToUs(filter.query),
          };
        }),
    [filtersToApply]
  );

  return (
    <>
      <Grid row gap>
        <MonitoringReportDashboardOverview filters={filtersToApply} loading={false} />
      </Grid>
      <Grid row>
        <FeatureFlag flag="compliant_follow_up_reviews_tta_support">
          <CompliantFollowUpReviewsWithTtaSupport
            filters={filtersToApply}
            detailsFilters={detailsFilters}
          />
        </FeatureFlag>
      </Grid>
      <Grid row>
        <ActiveDeficientCitationsWithTtaSupport filters={filtersToApply} />
      </Grid>
      <Grid row>
        <ActiveNoncompliantCitationsWithTtaSupport filters={filtersToApply} />
      </Grid>
      <Grid row>
        <FindingCategoryHotspot filters={filtersToApply} />
      </Grid>
      <Grid row>
        <MonitoringRelatedTta filters={filtersToApply} />
      </Grid>
    </>
  );
}

MonitoringReportDashboard.propTypes = {
  filtersToApply: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
};
