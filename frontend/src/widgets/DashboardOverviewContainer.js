import React from 'react';
import PropTypes from 'prop-types';
import { Grid } from '@trussworks/react-uswds';
import Loader from '../components/Loader';
import { OverviewWidgetField } from './OverviewWidgetField';

const renderDashboardField = (fieldData) => (
  <OverviewWidgetField
    key={fieldData.key}
    icon={fieldData.icon}
    showTooltip={fieldData.showTooltip}
    label1={fieldData.label1}
    label2={fieldData.label2}
    iconColor={fieldData.iconColor}
    backgroundColor={fieldData.backgroundColor}
    data={fieldData.data}
    route={fieldData.route ? {
      to: `/dashboards/${fieldData.route}`,
      label: 'Display details',
      ariaLabel: fieldData.ariaLabel,
    } : null}
    filterApplicable={fieldData.filterApplicable}
    iconSize={fieldData.iconSize}
    tooltipText={fieldData.tooltipText}
    showNoResults={fieldData.showNoResults}
  />
);

export function DashboardOverviewContainer({
  fieldData, loading,
}) {
  return (
    <Grid row className="smart-hub--dashboard-overview-container margin-bottom-3 position-relative flex-gap-2">
      <Loader loading={loading} loadingLabel="Resources Overview loading" />
      {
        fieldData.map(
          (field) => renderDashboardField(field),
        )
      }
    </Grid>
  );
}

DashboardOverviewContainer.propTypes = {
  loading: PropTypes.bool,
  fieldData: PropTypes.arrayOf(PropTypes.shape({
    key: PropTypes.string.isRequired,
    icon: PropTypes.shape.isRequired,
    showTooltip: PropTypes.bool,
    label1: PropTypes.string.isRequired,
    iconColor: PropTypes.string.isRequired,
    backgroundColor: PropTypes.string.isRequired,
    data: PropTypes.string.isRequired,
    route: PropTypes.string.isRequired,
    filterApplicable: PropTypes.bool,
    iconSize: PropTypes.string,
  })),
};

DashboardOverviewContainer.defaultProps = {
  fieldData: [],
  loading: false,
};

export default DashboardOverviewContainer;
