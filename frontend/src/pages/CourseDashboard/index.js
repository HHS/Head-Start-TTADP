/* eslint-disable no-alert */
/* eslint-disable no-console */
import React, {
  useContext,
  useMemo,
  useState,
  useCallback,
} from 'react';
import moment from 'moment';
import { v4 as uuidv4 } from 'uuid';
import PropTypes from 'prop-types';
import { Helmet } from 'react-helmet';
import { Grid, Alert } from '@trussworks/react-uswds';
import useDeepCompareEffect from 'use-deep-compare-effect';
import FilterPanel from '../../components/filter/FilterPanel';
import { allRegionsUserHasPermissionTo } from '../../permissions';
import { buildDefaultRegionFilters, showFilterWithMyRegions } from '../regionHelpers';
import useSessionFiltersAndReflectInUrl from '../../hooks/useSessionFiltersAndReflectInUrl';
import AriaLiveContext from '../../AriaLiveContext';
import { expandFilters, filtersToQueryString, formatDateRange } from '../../utils';
import './index.scss';
import { fetchCourseDashboardData } from '../../fetchers/courses';
import UserContext from '../../UserContext';
import { COURSE_DASHBOARD_FILTER_CONFIG } from './constants';
import RegionPermissionModal from '../../components/RegionPermissionModal';
import CoursesAssociatedWIthActivityReports from '../../widgets/CoursesAssociatedWIthActivityReports';

const defaultDate = formatDateRange({
  forDateTime: true,
  string: `2022/07/01-${moment().format('YYYY/MM/DD')}`,
  withSpaces: false,
});

const FILTER_KEY = 'course-dashboard-filters';

export default function CourseDashboard() {
  const { user } = useContext(UserContext);
  const ariaLiveContext = useContext(AriaLiveContext);
  const regions = allRegionsUserHasPermissionTo(user);
  const defaultRegion = user.homeRegionId || regions[0] || 0;
  const allRegionsFilters = useMemo(() => buildDefaultRegionFilters(regions), [regions]);
  const [isLoading, setIsLoading] = useState(false);
  const [courseData, setCourseData] = useState({});
  const [error, updateError] = useState();
  const [resetPagination, setResetPagination] = useState(false);

  const hasCentralOffice = useMemo(() => (
    user && user.homeRegionId && user.homeRegionId === 14
  ), [user]);

  const getFiltersWithAllRegions = () => {
    const filtersWithAllRegions = [...allRegionsFilters];
    return filtersWithAllRegions;
  };
  const centralOfficeWithAllRegionFilters = getFiltersWithAllRegions();

  const defaultFilters = useMemo(() => {
    if (hasCentralOffice) {
      return [...centralOfficeWithAllRegionFilters,
        {
          id: uuidv4(),
          topic: 'startDate',
          condition: 'is within',
          query: defaultDate,
        }];
    }

    return [
      {
        id: uuidv4(),
        topic: 'region',
        condition: 'is',
        query: defaultRegion,
      },
      {
        id: uuidv4(),
        topic: 'startDate',
        condition: 'is within',
        query: defaultDate,
      },
    ];
  }, [defaultRegion, hasCentralOffice, centralOfficeWithAllRegionFilters]);

  const [filters, setFiltersInHook] = useSessionFiltersAndReflectInUrl(
    FILTER_KEY,
    defaultFilters,
  );

  const setFilters = useCallback((newFilters) => {
    setFiltersInHook(newFilters);
    setResetPagination(true);
  }, [setFiltersInHook]);

  // Remove Filters.
  const onRemoveFilter = (id, addBackDefaultRegions) => {
    const newFilters = [...filters];
    const index = newFilters.findIndex((item) => item.id === id);
    if (index !== -1) {
      newFilters.splice(index, 1);
      if (addBackDefaultRegions) {
        // We always want the regions to appear in the URL.
        setFilters([...allRegionsFilters, ...newFilters]);
      } else {
        setFilters(newFilters);
      }
    }
  };

  // Apply filters.
  const onApplyFilters = (newFilters, addBackDefaultRegions) => {
    if (addBackDefaultRegions) {
      // We always want the regions to appear in the URL.
      setFilters([
        ...allRegionsFilters,
        ...newFilters,
      ]);
    } else {
      setFilters([
        ...newFilters,
      ]);
    }

    ariaLiveContext.announce(`${newFilters.length} filter${newFilters.length !== 1 ? 's' : ''} applied to courses with activity reports `);
  };

  const filtersToApply = useMemo(() => expandFilters(filters), [filters]);

  useDeepCompareEffect(() => {
    async function fetchCourseData() {
      setIsLoading(true);
      // Filters passed also contains region.
      const filterQuery = filtersToQueryString(filtersToApply);
      try {
        const data = await fetchCourseDashboardData(
          filterQuery,
        );
        console.log('data', data);
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
  }, [
    filtersToApply,
  ]);

  return (
    <div className="ttahub-course-dashboard">
      <Helmet>
        <title>iPD Courses</title>
      </Helmet>
      <RegionPermissionModal
        filters={filters}
        user={user}
        showFilterWithMyRegions={
            () => showFilterWithMyRegions(allRegionsFilters, filters, setFilters)
          }
      />
      <h1 className="landing">
        iPD Courses
      </h1>
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
      <CoursesAssociatedWIthActivityReports
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
    permissions: PropTypes.arrayOf(PropTypes.shape({
      userId: PropTypes.number,
      scopeId: PropTypes.number,
      regionId: PropTypes.number,
    })),
  }),
};

CourseDashboard.defaultProps = {
  user: null,
};
