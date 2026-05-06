/* eslint-disable no-alert */
/* eslint-disable no-console */

import { faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Alert, Grid } from '@trussworks/react-uswds';
import PropTypes from 'prop-types';
import React, { useContext, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import useDeepCompareEffect from 'use-deep-compare-effect';
import FilterPanel from '../../components/filter/FilterPanel';
import { expandFilters, filtersToQueryString } from '../../utils';
import { showFilterWithMyRegions } from '../regionHelpers';
import './index.scss';
import { REGIONAL_RESOURCE_DASHBOARD_FILTER_KEY } from '../../Constants';
import colors from '../../colors';
import RegionPermissionModal from '../../components/RegionPermissionModal';
import { fetchCourseDashboardData } from '../../fetchers/courses';
import useFilters from '../../hooks/useFilters';
import UserContext from '../../UserContext';
import CoursesAssociatedWithActivityReports from '../../widgets/CoursesAssociatedWithActivityReports';
import { COURSE_DASHBOARD_FILTER_CONFIG } from './constants';

export default function CourseDashboard() {
  const { user } = useContext(UserContext);
  const [isLoading, setIsLoading] = useState(false);
  const [courseData, setCourseData] = useState({});
  const [error, updateError] = useState();
  const [resetPagination, setResetPagination] = useState(false);

  const {
    // from useUserDefaultRegionFilters
    regions,
    allRegionsFilters,

    // filter functionality
    filters,
    setFilters,
    onApplyFilters,
    onRemoveFilter,
  } = useFilters(
    user,
    REGIONAL_RESOURCE_DASHBOARD_FILTER_KEY,
    true,
    [],
    COURSE_DASHBOARD_FILTER_CONFIG
  );

  const filtersToApply = useMemo(() => expandFilters(filters), [filters]);

  useDeepCompareEffect(() => {
    async function fetchCourseData() {
      setIsLoading(true);
      // Filters passed also contains region.
      const filterQuery = filtersToQueryString(filtersToApply);
      try {
        const data = await fetchCourseDashboardData(filterQuery);
        setCourseData(data);
        updateError('');
      } catch (e) {
        updateError('Unable to fetch course data');
      } finally {
        setIsLoading(false);
      }
    }
    // Call courses fetch.
    fetchCourseData();
  }, [filtersToApply]);

  return (
    <div className="ttahub-course-dashboard">
      <Helmet>
        <title>iPD courses</title>
      </Helmet>
      <RegionPermissionModal
        filters={filters}
        user={user}
        showFilterWithMyRegions={() =>
          showFilterWithMyRegions(allRegionsFilters, filters, setFilters)
        }
      />
      <FontAwesomeIcon
        className="margin-right-1"
        data-testid="back-link-icon"
        color={colors.ttahubMediumBlue}
        icon={faArrowLeft}
      />
      <Link
        className="ttahub-recipient-record--tabs_back-to-search margin-bottom-2 display-inline-block"
        to="resources-dashboard"
      >
        Back to Resource Dashboard
      </Link>
      <h1 className="landing margin-top-0">iPD courses</h1>
      <Grid row>
        {error && (
          <Alert className="margin-bottom-2" type="error" role="alert">
            {error}
          </Alert>
        )}
      </Grid>
      <Grid className="ttahub-course-dashboard--filters display-flex flex-wrap flex-align-center flex-gap-1 margin-bottom-2">
        <FilterPanel
          applyButtonAria="apply filters for course dashboard"
          filters={filters}
          onApplyFilters={onApplyFilters}
          onRemoveFilter={onRemoveFilter}
          filterConfig={COURSE_DASHBOARD_FILTER_CONFIG}
          allUserRegions={regions}
        />
      </Grid>
      <CoursesAssociatedWithActivityReports
        data={courseData.coursesAssociatedWithActivityReports}
        loading={isLoading}
        resetPagination={resetPagination}
        setResetPagination={setResetPagination}
      />
    </div>
  );
}

CourseDashboard.propTypes = {
  user: PropTypes.shape({
    id: PropTypes.number,
    name: PropTypes.string,
    role: PropTypes.arrayOf(PropTypes.string),
    homeRegionId: PropTypes.number,
    permissions: PropTypes.arrayOf(
      PropTypes.shape({
        userId: PropTypes.number,
        scopeId: PropTypes.number,
        regionId: PropTypes.number,
      })
    ),
  }),
};

CourseDashboard.defaultProps = {
  user: null,
};
