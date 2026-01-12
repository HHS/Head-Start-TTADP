import React from 'react';
import PropTypes from 'prop-types';
import { Helmet } from 'react-helmet';
import { Grid, GridContainer } from '@trussworks/react-uswds';
import Overview from '../../../widgets/TrainingReportDashboardOverview';
import TRReasonList from '../../../widgets/TRReasonList';
import TRHoursOfTrainingByNationalCenter from '../../../widgets/TRHoursOfTrainingByNationalCenter';
import VTopicFrequency from '../../../widgets/VTopicFrequency';
import TrainingReportsTable from '../../../components/TrainingReportsTable';
import FilterContext from '../../../FilterContext';

export default function TrainingReportDashboard({
  filtersToApply,
  resetPagination,
  setResetPagination,
  filterKey,
}) {
  return (
    <>
      <Helmet>
        <title>Regional Dashboard - Training Reports</title>
      </Helmet>
      <FilterContext.Provider value={{ filterKey }}>
        <GridContainer className="margin-0 padding-0">
          <Overview
            filters={filtersToApply}
            showTooltips
            loading={false}
          />
          <Grid row gap={2} className="flex-align-stretch margin-bottom-3">
            <Grid desktop={{ col: 5 }} tabletLg={{ col: 12 }}>
              <TRReasonList
                filters={filtersToApply}
                loading={false}
                title="Reasons in Training Reports"
              />
            </Grid>
            <Grid desktop={{ col: 7 }} tabletLg={{ col: 12 }}>
              <TRHoursOfTrainingByNationalCenter
                filters={filtersToApply}
                loading={false}
                title="Hours of training by National Center"
                subtitle="Hours reported on Training Report sessions"
                xAxisLabel="National Center"
                yAxisLabel="Number of hours"
              />
            </Grid>
          </Grid>
          <Grid row>
            <VTopicFrequency
              filters={filtersToApply}
              loading={false}
              title="Number of TR sessions by topic"
            />
          </Grid>
          <Grid row>
            <TrainingReportsTable
              filters={filtersToApply}
              tableCaption="Training reports"
              exportIdPrefix="tr-rd-"
              resetPagination={resetPagination}
              setResetPagination={setResetPagination}
            />
          </Grid>
        </GridContainer>
      </FilterContext.Provider>
    </>
  );
}

TrainingReportDashboard.propTypes = {
  filtersToApply: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
  resetPagination: PropTypes.bool.isRequired,
  setResetPagination: PropTypes.func.isRequired,
  filterKey: PropTypes.string.isRequired,
};
