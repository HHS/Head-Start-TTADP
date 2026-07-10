import PropTypes from 'prop-types';
import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import BackLink from '../../../components/BackLink';
import ContentFromFeedByTag from '../../../components/ContentFromFeedByTag';
import Drawer from '../../../components/Drawer';
import DrawerTriggerButton from '../../../components/DrawerTriggerButton';
import FilterPills from '../../../components/filter/FilterPills';
import TabsNav from '../../../components/TabsNav';
import WidgetContainer from '../../../components/WidgetContainer';
import WidgetContainerSubtitle from '../../../components/WidgetContainer/WidgetContainerSubtitle';
import { getCompliantFollowUpReviewsDetails } from '../../../fetchers/monitoring';
import useDashboardFilterKey from '../../../hooks/useDashboardFilterKey';
import useFetch from '../../../hooks/useFetch';
import useFilters from '../../../hooks/useFilters';
import useWidgetSorting, { parseValue } from '../../../hooks/useWidgetSorting';
import UserContext from '../../../UserContext';
import { filtersToQueryString } from '../../../utils';
import HorizontalTableWidget from '../../../widgets/HorizontalTableWidget';
import CitationDrawer from '../../RecipientRecord/pages/Monitoring/components/CitationDrawer';
import { links } from '..';
import { MONITORING_FILTER_CONFIG } from '../constants';
import './CompliantFollowUpsTable.css';

const EMPTY_DATA = [];
const PER_PAGE = 10;
const DEFAULT_SORT_CONFIG = {
  sortBy: 'Recipient',
  direction: 'asc',
  activePage: 1,
  offset: 0,
};

function formatDate(date) {
  return date || '--';
}

function isUsDateQuery(query) {
  const value = Array.isArray(query) ? query.join(',') : String(query || '');
  return /^\d{1,2}\/\d{1,2}\/\d{4}(?:-\d{1,2}\/\d{1,2}\/\d{4})?$/.test(value);
}

function dedupeVisibleFilters(filters) {
  const byTopicCondition = new Map();

  filters.forEach((filter) => {
    const key = `${filter.topic}:${filter.condition}`;
    const existing = byTopicCondition.get(key);

    if (!existing) {
      byTopicCondition.set(key, filter);
      return;
    }

    if (
      filter.topic === 'startDate' &&
      isUsDateQuery(filter.query) &&
      !isUsDateQuery(existing.query)
    ) {
      byTopicCondition.set(key, filter);
    }
  });

  return [...byTopicCondition.values()];
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

const STRING_SORT_COLUMNS = ['Recipient', 'Had_TTA'];
const DATE_SORT_COLUMNS = ['Last_TTA', 'Compliant_follow-up_review_received_date'];

function sortRows(rows, sortConfig = DEFAULT_SORT_CONFIG) {
  const { sortBy, direction } = sortConfig;

  if (!sortBy || !rows?.length) {
    return rows;
  }

  const sortingBy = STRING_SORT_COLUMNS.includes(sortBy)
    ? 'string'
    : DATE_SORT_COLUMNS.includes(sortBy)
      ? 'date'
      : 'value';

  return [...rows].sort((a, b) => {
    let valueA;
    let valueB;

    switch (sortingBy) {
      case 'string':
        valueA = (a[sortBy] || '').toString().toLowerCase();
        valueB = (b[sortBy] || '').toString().toLowerCase();
        break;
      case 'date':
        valueA = new Date(a[sortBy] || '');
        valueB = new Date(b[sortBy] || '');
        break;
      default:
        valueA = parseValue(a[sortBy]);
        valueB = parseValue(b[sortBy]);
        break;
    }

    if (valueA > valueB) {
      return direction === 'asc' ? 1 : -1;
    }

    if (valueB > valueA) {
      return direction === 'asc' ? -1 : 1;
    }

    return 0;
  });
}

export default function CompliantFollowUpsTable({ title }) {
  const [sortableData, setSortableData] = useState([]);
  const drawerTriggerRef = useRef(null);
  const { user } = useContext(UserContext) || { user: {} };
  const filterKey = useDashboardFilterKey('regional-dashboard', 'monitoring');

  const {
    filters: selectedFilters,
    onRemoveFilter,
    filterConfig,
  } = useFilters(user || {}, filterKey, false, [], MONITORING_FILTER_CONFIG);

  const { requestSort, sortConfig, setSortConfig } = useWidgetSorting(
    'compliant-follow-up-reviews-details-table',
    DEFAULT_SORT_CONFIG,
    sortableData,
    setSortableData,
    STRING_SORT_COLUMNS,
    DATE_SORT_COLUMNS,
    []
  );

  const query = useMemo(() => filtersToQueryString(selectedFilters), [selectedFilters]);
  const visibleFilterPills = useMemo(
    () =>
      dedupeVisibleFilters(
        selectedFilters.filter(
          (filter) => filter.topic !== 'region' && filter.topic !== 'reportDeliveryDate'
        )
      ),
    [selectedFilters]
  );

  const { data, loading, error } = useFetch(
    EMPTY_DATA,
    () => getCompliantFollowUpReviewsDetails(query),
    [query],
    'Unable to fetch compliant follow-up review details',
    true
  );

  const dataToSort = useMemo(
    () =>
      (data || []).map((row) => ({
        ...row,
        'Compliant_follow-up_review': row.id || '',
        Recipient: row.recipientName || '',
        Had_TTA: row.hasTta ? 'Yes' : 'No',
        Last_TTA: row.lastTtaDate || '',
        'Compliant_follow-up_review_received_date': row.compliantFollowUpReviewReceivedDate || '',
      })),
    [data]
  );

  useEffect(() => {
    setSortableData(sortRows(dataToSort, sortConfig));
  }, [dataToSort, sortConfig]);

  const tableData = useMemo(() => toTableData(sortableData), [sortableData]);

  const currentPage = sortConfig.activePage || 1;
  const currentOffset = sortConfig.offset || 0;
  const paginatedTableData = useMemo(
    () => tableData.slice(currentOffset, currentOffset + PER_PAGE),
    [tableData, currentOffset]
  );

  useEffect(() => {
    if (currentOffset >= tableData.length && tableData.length > 0) {
      setSortConfig((prev) => ({
        ...prev,
        activePage: 1,
        offset: 0,
      }));
    }
  }, [currentOffset, setSortConfig, tableData.length]);

  const subtitle = (
    <div className="margin-bottom-3">
      <WidgetContainerSubtitle>
        Compliant follow-up reviews, broken out by those with and without citations addressed by
        approved activity reports during the correction period.
      </WidgetContainerSubtitle>
      <div className="margin-top-1">
        <DrawerTriggerButton drawerTriggerRef={drawerTriggerRef}>
          About this data
        </DrawerTriggerButton>
      </div>
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

      {!!visibleFilterPills.length && (
        <div className="margin-bottom-2">
          <FilterPills
            filters={visibleFilterPills}
            onRemoveFilter={(id) => onRemoveFilter(id, false)}
            filterConfig={filterConfig}
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
        currentPage={currentPage}
        totalCount={tableData.length}
        offset={currentOffset}
        perPage={PER_PAGE}
        handlePageChange={(newPage) => {
          setSortConfig((prev) => ({
            ...prev,
            activePage: newPage,
            offset: (newPage - 1) * PER_PAGE,
          }));
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
            sortConfig={{
              ...sortConfig,
              hiddenSortIndicators: NON_SORTABLE_HEADERS,
            }}
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
