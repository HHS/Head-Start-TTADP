import React from 'react';
import PropTypes from 'prop-types';
import {
  faPersonChalkboard,
  faBus,
  faUser,
} from '@fortawesome/free-solid-svg-icons';
import colors from '../colors';

import { DashboardOverviewContainer } from './DashboardOverviewContainer';

const createOverviewFieldArray = (data) => ([
  {
    key: 'recipients-with-no-tta',
    icon: faUser,
    showTooltip: false,
    label1: 'Recipients with no TTA',
    iconColor: colors.ttahubBlue,
    backgroundColor: colors.ttahubBlueLight,
    data: data.recipientsWithNoTTA.pct,
    route: 'qa-dashboard/recipients-with-no-tta',
    filterApplicable: data.recipientsWithNoTTA.filterApplicable,
  },
  {
    icon: faBus,
    showTooltip: false,
    label1: 'Recipients with OHS standard FEI goal',
    iconColor: colors.ttahubOrange,
    backgroundColor: colors.ttahubOrangeLight,
    data: data.recipientsWithOhsStandardFeiGoals.pct,
    route: 'qa-dashboard/recipients-with-ohs-standard-fei-goal',
    filterApplicable: data.recipientsWithOhsStandardFeiGoals.filterApplicable,
  },
  {
    key: 'recipients-with-ohs-standard-class-goals',
    icon: faPersonChalkboard,
    showTooltip: false,
    label1: 'Recipients with OHS standard CLASS goal',
    iconColor: colors.success,
    backgroundColor: colors.ttahubDeepTealLight,
    data: data.recipientsWithOhsStandardClass.pct,
    route: 'qa-dashboard/quality-assurance-details',
    filterApplicable: data.recipientsWithOhsStandardClass.filterApplicable,
  },
]);

export function QualityAssuranceDashboardOverview({
  data, loading,
}) {
  const DASHBOARD_FIELDS = createOverviewFieldArray(data);
  return (
    <DashboardOverviewContainer
      fieldData={DASHBOARD_FIELDS}
      loading={loading}
    />
  );
}

QualityAssuranceDashboardOverview.propTypes = {
  data: PropTypes.shape({
    recipientsWithNoTTA: PropTypes.shape({
      pct: PropTypes.string,
    }),
    recipientsWithOhsStandardFeiGoals: PropTypes.shape({
      pct: PropTypes.string,
    }),
    recipientsWithOhsStandardClass: PropTypes.shape({
      pct: PropTypes.string,
    }),
  }),
  loading: PropTypes.bool,
};

QualityAssuranceDashboardOverview.defaultProps = {
  data: {
    recipientsWithNoTTA: {
      pct: '0%',
      filterApplicable: false,
    },
    recipientsWithOhsStandardFeiGoals: {
      pct: '0%',
      filterApplicable: false,
    },
    recipientsWithOhsStandardClass: {
      pct: '0%',
      filterApplicable: false,
    },
  },
  loading: false,
};

export default QualityAssuranceDashboardOverview;
