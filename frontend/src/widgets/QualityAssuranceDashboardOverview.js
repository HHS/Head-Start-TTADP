import React from 'react';
import PropTypes from 'prop-types';
import { Grid, Tooltip as TrussWorksToolTip } from '@trussworks/react-uswds';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPersonChalkboard,
  faBus,
  faUser,
  faQuestionCircle,
} from '@fortawesome/free-solid-svg-icons';
import './QualityAssuranceDashboardOverview.scss';

import Loader from '../components/Loader';
import Tooltip from '../components/Tooltip';
import colors from '../colors';

export function Field({
  label1,
  label2,
  route,
  data,
  icon,
  iconColor,
  backgroundColor,
  showTooltip,
  tooltipText,
  filterApplicable,
}) {
  return (
    <Grid gap={4} desktop={{ col: 'fill' }} tablet={{ col: 5 }} mobileLg={{ col: 12 }} className="smart-hub--qa-dashboard-overview-field margin-bottom-1 display-flex bg-white shadow-2 padding-y-2 padding-x-1">
      <span className="smart-hub--qa-dashboard-overview-field-icon flex-1 display-flex flex-justify-center flex-align-center">
        <span className="smart-hub--qa-dashboard-overview-field-icon-background display-flex flex-justify-center flex-align-center" style={{ backgroundColor }}>
          <FontAwesomeIcon color={iconColor} icon={icon} size="xl" />
        </span>
      </span>
      <span className="smart-hub--qa-dashboard-overview-field-label display-flex flex-2 flex-column flex-justify-center">
        <div>
          <span className="text-bold smart-hub--overview-font-size">{data}</span>
          { !filterApplicable && (
            <>
              <span className="smart-hub--overview-font-size margin-right-1"> - Filters not applied</span>
              <TrussWorksToolTip className="usa-button--unstyled smart-hub--overview-tool-tip" id="filter-not-applicable" label="One or more of the selected filters cannot be applied to this data.">
                <FontAwesomeIcon icon={faQuestionCircle} size="lg" className="margin-left-1" color={colors.ttahubMediumBlue} />
              </TrussWorksToolTip>
            </>
          )}
        </div>

        {showTooltip ? (
          <Tooltip
            displayText={label1}
            screenReadDisplayText={false}
            buttonLabel={`${tooltipText} click to visually reveal this information`}
            tooltipText={tooltipText}
          />
        ) : (
          <span className="margin-top-1">{label1}</span>
        )}
        {label2}
        {route && (
          <Link to={route.to} className="margin-top-1">
            {route.label}
          </Link>
        )}
      </span>
    </Grid>
  );
}

Field.propTypes = {
  label1: PropTypes.string.isRequired,
  label2: PropTypes.string,
  data: PropTypes.string.isRequired,
  icon: PropTypes.shape({
    prefix: PropTypes.string,
    iconName: PropTypes.string,
    // eslint-disable-next-line react/forbid-prop-types
    icon: PropTypes.array,
  }).isRequired,
  iconColor: PropTypes.string.isRequired,
  backgroundColor: PropTypes.string.isRequired,
  tooltipText: PropTypes.string,
  showTooltip: PropTypes.bool,
  route: PropTypes.shape({
    to: PropTypes.string,
    label: PropTypes.string,
  }),
  filterApplicable: PropTypes.bool.isRequired,
};

Field.defaultProps = {
  tooltipText: '',
  showTooltip: false,
  label2: '',
  route: null,
};
const DASHBOARD_FIELDS = {
  'Recipients with no TTA': {
    render: (data) => (
      <Field
        key="recipients-with-no-tta"
        icon={faUser}
        showTooltip={false}
        label1="Recipients with no TTA"
        iconColor={colors.ttahubBlue}
        backgroundColor={colors.ttahubBlueLight}
        data={data.recipientsWithNoTTA.pct}
        route={{
          to: '/dashboards',
          label: 'Display details',
        }}
        filterApplicable={data.recipientsWithNoTTA.filterApplicable}
      />
    ),
  },
  'Recipients with OHS standard FEI goal': {
    render: (data) => (
      <Field
        key="recipients-with-ohs-standard-fei-goals"
        icon={faBus}
        showTooltip={false}
        label1="Recipients with OHS standard FEI goal"
        iconColor={colors.ttahubOrange}
        backgroundColor={colors.ttahubOrangeLight}
        data={data.recipientsWithOhsStandardFeiGoals.pct}
        route={{
          to: '/dashboards',
          label: 'Display details',
        }}
        filterApplicable={data.recipientsWithOhsStandardFeiGoals.filterApplicable}
      />
    ),
  },
  'Recipients with OHS standard CLASS goal': {
    render: (data) => (
      <Field
        key="recipients-with-ohs-standard-class-goals"
        icon={faPersonChalkboard}
        showTooltip={false}
        label1="Recipients with OHS standard CLASS goal"
        iconColor={colors.success}
        backgroundColor={colors.ttahubDeepTealLight}
        data={data.recipientsWithOhsStandardClass.pct}
        route={{
          to: '/dashboards',
          label: 'Display details',
        }}
        filterApplicable={data.recipientsWithOhsStandardClass.filterApplicable}
      />
    ),
  },
};

export function QualityAssuranceDashboardOverview({
  data, loading, fields, showTooltips,
}) {
  return (
    <Grid row className="smart-hub--qa-dashboard-overview margin-bottom-3 position-relative">
      <Loader loading={loading} loadingLabel="Resources Overview loading" />
      { fields.map((field) => DASHBOARD_FIELDS[field].render(data, showTooltips, field)) }
    </Grid>
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
  fields: PropTypes.arrayOf(PropTypes.string),
  showTooltips: PropTypes.bool,
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
  showTooltips: false,
  fields: [
    'Recipients with no TTA',
    'Recipients with OHS standard FEI goal',
    'Recipients with OHS standard CLASS goal',
  ],
};

export default QualityAssuranceDashboardOverview;
