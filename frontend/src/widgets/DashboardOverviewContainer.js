import React from 'react';
import PropTypes from 'prop-types';
import { Grid } from '@trussworks/react-uswds';
import Loader from '../components/Loader';
import { OverviewWidgetField } from './OverviewWidgetField';

export function DashboardOverviewContainer({ fieldData, loading }) {
  return (
    <Grid
      row
      className={`smart-hub--dashboard-overview-container margin-bottom-3 position-relative flex-gap-3 smart-hub--overview-grid-cols-${Math.min(fieldData.length, 4)}`}
    >
      <Loader loading={loading} loadingLabel="Overview loading" />
      {fieldData.map((field) => (
        <OverviewWidgetField
          key={field.key}
          icon={field.icon}
          showTooltip={field.showTooltip}
          label1={field.label1}
          label2={field.label2}
          iconColor={field.iconColor}
          backgroundColor={field.backgroundColor}
          data={field.data}
          route={
            field.route
              ? {
                to: `/dashboards/${field.route}`,
                label: 'Display details',
                ariaLabel: field.ariaLabel,
              }
              : null
          }
          filterApplicable={field.filterApplicable}
          iconSize={field.iconSize}
          tooltipText={field.tooltipText}
          showNoResults={field.showNoResults}
        />
      ))}
    </Grid>
  );
}

DashboardOverviewContainer.propTypes = {
  loading: PropTypes.bool,
  fieldData: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.string,
      icon: PropTypes.shape().isRequired,
      showTooltip: PropTypes.bool,
      label1: PropTypes.string.isRequired,
      iconColor: PropTypes.string.isRequired,
      backgroundColor: PropTypes.string.isRequired,
      data: PropTypes.string.isRequired,
      route: PropTypes.string,
      filterApplicable: PropTypes.bool,
      iconSize: PropTypes.string,
    }),
  ),
};

DashboardOverviewContainer.defaultProps = {
  fieldData: [],
  loading: false,
};

export default DashboardOverviewContainer;
