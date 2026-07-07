import PropTypes from 'prop-types';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useHistory, useLocation } from 'react-router-dom';
import BackLink from '../../../components/BackLink';
import ContentFromFeedByTag from '../../../components/ContentFromFeedByTag';
import Drawer from '../../../components/Drawer';
import DrawerTriggerButton from '../../../components/DrawerTriggerButton';
import FilterPills from '../../../components/filter/FilterPills';
import TabsNav from '../../../components/TabsNav';
import WidgetContainer from '../../../components/WidgetContainer';
import WidgetContainerSubtitle from '../../../components/WidgetContainer/WidgetContainerSubtitle';
import { getCompliantFollowUpReviewsDetails } from '../../../fetchers/monitoring';
import useFetch from '../../../hooks/useFetch';
import { filtersToQueryString, queryStringToFilters } from '../../../utils';
import HorizontalTableWidget from '../../../widgets/HorizontalTableWidget';
import CitationDrawer from '../../RecipientRecord/pages/Monitoring/components/CitationDrawer';
import { links } from '..';
import { MONITORING_FILTER_CONFIG } from '../constants';
import './CompliantFollowUpsTable.css';

const EMPTY_DATA = [];
const PER_PAGE = 10;

function formatDate(date) {
  return date || '--';
}

function formatArray(values) {
  if (!values?.length) {
    return '--';
  }

  return values.join(', ');
}

function formatActivityReports(activityReportIds) {
  if (!activityReportIds?.length) {
    return '--';
  }

  return activityReportIds.map((id, index) => (
    <React.Fragment key={id}>
      <Link to={`/activity-reports/view/${id}`}>{id}</Link>
      {index < activityReportIds.length - 1 ? ', ' : ''}
    </React.Fragment>
  ));
}

function formatCitationNumbers(citationNumbers) {
  if (!citationNumbers?.length) {
    return '--';
  }

  return citationNumbers.map((citationNumber, index) => (
    <React.Fragment key={citationNumber}>
      <CitationDrawer citationNumber={citationNumber} />
      {index < citationNumbers.length - 1 ? ', ' : ''}
    </React.Fragment>
  ));
}

function formatRecipientCell(row) {
  if (row.recipientName && row.recipientId && row.regionId) {
    return {
      value: row.recipientName,
      isUrl: true,
      isInternalLink: true,
      link: `/recipient-tta-records/${row.recipientId}/region/${row.regionId}/profile`,
    };
  }

  return { value: row.recipientName || '--' };
}

function toTableData(rows) {
  return rows.map((row) => ({
    id: row.id,
    heading: row.id,
    data: [
      formatRecipientCell(row),
      { value: formatArray(row.grantsOnReview) },
      { value: formatCitationNumbers(row.citationNumbers) },
      { value: row.hasTta ? 'Yes' : 'No' },
      { value: formatDate(row.lastTtaDate) },
      { value: formatActivityReports(row.associatedActivityReports || []) },
      { value: formatDate(row.compliantFollowUpReviewReceivedDate) },
      { value: formatDate(row.initialReviewReceivedDate) },
      { value: row.initialReviewId || '--' },
    ],
  }));
}

const NON_SORTABLE_HEADERS = [
  'Grants on review',
  'Citation number',
  'Activity reports',
  'Initial review received date',
  'Initial review',
];

function getSortValue(row, sortBy) {
  switch (sortBy) {
    case 'Compliant_follow-up_review':
      return row.id;
    case 'Recipient':
      return (row.recipientName || '').toLowerCase();
    case 'Had_TTA':
      return row.hasTta ? 1 : 0;
    case 'Last_TTA':
      return row.lastTtaDate || '';
    case 'Compliant_follow-up_review_received_date':
      return row.compliantFollowUpReviewReceivedDate || '';
    default:
      return '';
  }
}

export default function CompliantFollowUpsTable({ title }) {
  const [activePage, setActivePage] = useState(1);
  const [offset, setOffset] = useState(0);
  const [sortConfig, setSortConfig] = useState({
    sortBy: 'Recipient',
    direction: 'asc',
    activePage: 1,
    offset: 0,
    hiddenSortIndicators: NON_SORTABLE_HEADERS,
  });
  const drawerTriggerRef = useRef(null);

  const history = useHistory();
  const location = useLocation();
  const query = useMemo(() => new URLSearchParams(location.search).toString(), [location.search]);
  const selectedFilters = useMemo(
    () => queryStringToFilters(location.search.substring(1)),
    [location.search]
  );

  const { data, loading, error } = useFetch(
    EMPTY_DATA,
    () => getCompliantFollowUpReviewsDetails(query),
    [query],
    'Unable to fetch compliant follow-up review details',
    true
  );

  const sortedData = useMemo(() => {
    if (!data?.length) return [];
    return [...data].sort((a, b) => {
      const aVal = getSortValue(a, sortConfig.sortBy);
      const bVal = getSortValue(b, sortConfig.sortBy);
      let cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      if (sortConfig.direction === 'desc') cmp = -cmp;
      if (cmp === 0) {
        const aDate = a.compliantFollowUpReviewReceivedDate || '';
        const bDate = b.compliantFollowUpReviewReceivedDate || '';
        return aDate < bDate ? -1 : aDate > bDate ? 1 : 0;
      }
      return cmp;
    });
  }, [data, sortConfig]);

  const tableData = useMemo(() => toTableData(sortedData), [sortedData]);
  const paginatedTableData = useMemo(
    () => tableData.slice(offset, offset + PER_PAGE),
    [tableData, offset]
  );

  useEffect(() => {
    if (offset >= tableData.length && tableData.length > 0) {
      setActivePage(1);
      setOffset(0);
    }
  }, [offset, tableData.length]);

  const requestSort = (key) => {
    setSortConfig((prev) => ({
      ...prev,
      sortBy: key,
      direction: prev.sortBy === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const onRemoveFilter = (id) => {
    const updatedFilters = selectedFilters.filter((filter) => filter.id !== id);
    history.push({
      ...location,
      search: `?${filtersToQueryString(updatedFilters)}`,
    });
  };

  const subtitle = (
    <div className="margin-bottom-3">
      <WidgetContainerSubtitle>
        Compliant follow-up reviews, broken out by those with and without citations addressed by
        approved activity reports during the correction period.
      </WidgetContainerSubtitle>
      <DrawerTriggerButton drawerTriggerRef={drawerTriggerRef}>About this data</DrawerTriggerButton>
    </div>
  );

  return (
    <div className="ttahub-compliant-follow-ups-table">
      <TabsNav ariaLabel="Dashboard navigation" links={links} />
      <BackLink to="/dashboards/regional-dashboard/monitoring" bottomMargin={3}>
        Back to Regional dashboard - Monitoring
      </BackLink>

      <h1 className="landing margin-top-0 margin-bottom-3">
        Compliant follow-up reviews with TTA support
      </h1>

      {!!selectedFilters.length && (
        <div className="margin-bottom-2">
          <FilterPills
            filters={selectedFilters}
            onRemoveFilter={onRemoveFilter}
            filterConfig={MONITORING_FILTER_CONFIG}
          />
        </div>
      )}
      <Drawer triggerRef={drawerTriggerRef} title="Compliant follow-up reviews with TTA support">
        <ContentFromFeedByTag tagName="ttahub-compliant-follow-up-reviews" />
      </Drawer>
      <WidgetContainer
        title={title}
        subtitle={subtitle}
        loading={loading}
        loadingLabel="Compliant follow-up review details loading"
        showPagingBottom
        currentPage={activePage}
        totalCount={tableData.length}
        offset={offset}
        perPage={PER_PAGE}
        handlePageChange={(newPage) => {
          setActivePage(newPage);
          setOffset((newPage - 1) * PER_PAGE);
        }}
      >
        {error && (
          <div className="usa-alert usa-alert--error margin-bottom-3" role="alert">
            <div className="usa-alert__body">
              <p className="usa-alert__text">{error}</p>
            </div>
          </div>
        )}
        {!loading && !tableData.length && !error && (
          <p className="font-serif-md margin-0 padding-10 text-bold text-center">
            No compliant follow-up review details found.
          </p>
        )}
        {!!paginatedTableData.length && (
          <HorizontalTableWidget
            headers={[
              'Recipient',
              'Grants on review',
              'Citation number',
              'Had TTA',
              'Last TTA',
              'Activity reports',
              'Compliant follow-up review received date',
              'Initial review received date',
              'Initial review',
            ]}
            data={paginatedTableData}
            firstHeading="Compliant follow-up review"
            showTotalColumn={false}
            enableCheckboxes={true}
            enableSorting
            sortConfig={sortConfig}
            requestSort={requestSort}
            hideFirstColumnBorder
            stickyFirstColumn
            stickyLastColumn={false}
            showDashForNullValue
          />
        )}
      </WidgetContainer>
    </div>
  );
}

CompliantFollowUpsTable.propTypes = {
  title: PropTypes.string,
};

CompliantFollowUpsTable.defaultProps = {
  title: 'Compliant follow-up reviews with TTA support',
};
