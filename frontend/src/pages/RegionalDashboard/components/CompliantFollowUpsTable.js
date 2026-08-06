import moment from 'moment';
import PropTypes from 'prop-types';
import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { DATE_DISPLAY_FORMAT } from '../../../Constants';
import BackLink from '../../../components/BackLink';
import ContentFromFeedByTag from '../../../components/ContentFromFeedByTag';
import Drawer from '../../../components/Drawer';
import DrawerTriggerButton from '../../../components/DrawerTriggerButton';
import FilterPills from '../../../components/filter/FilterPills';
import NoResultsFound from '../../../components/NoResultsFound';
import TabsNav from '../../../components/TabsNav';
import WidgetContainer from '../../../components/WidgetContainer';
import WidgetContainerSubtitle from '../../../components/WidgetContainer/WidgetContainerSubtitle';
import { getCompliantFollowUpReviewsDetails } from '../../../fetchers/monitoring';
import useDashboardFilterKey from '../../../hooks/useDashboardFilterKey';
import useFetch from '../../../hooks/useFetch';
import useFilters from '../../../hooks/useFilters';
import useWidgetExport from '../../../hooks/useWidgetExport';
import useWidgetSorting, { parseValue } from '../../../hooks/useWidgetSorting';
import UserContext from '../../../UserContext';
import { filtersToQueryString } from '../../../utils';
import HorizontalTableWidget from '../../../widgets/HorizontalTableWidget';
import CitationDrawer from '../../RecipientRecord/pages/Monitoring/components/CitationDrawer';
import { links } from '..';
import { MONITORING_FILTER_CONFIG } from '../constants';
import { formatMonitoringFiltersForQuery } from '../monitoringFilters';
import './CompliantFollowUpsTable.css';

const EMPTY_DATA = [];
const PER_PAGE = 10;
const API_DATE_FORMAT = 'YYYY-MM-DD';
const DEFAULT_SORT_CONFIG = {
  sortBy: 'Had_TTA',
  direction: 'desc',
  activePage: 1,
  offset: 0,
};

function formatDate(date) {
  if (!date) {
    return '--';
  }

  const parsed = moment(date, API_DATE_FORMAT, true);
  return parsed.isValid() ? parsed.format(DATE_DISPLAY_FORMAT) : '--';
}

function dedupeVisibleFilters(filters) {
  const byTopicConditionQuery = new Map();

  filters.forEach((filter) => {
    const queryKey = Array.isArray(filter.query)
      ? filter.query.join('|')
      : String(filter.query ?? '');
    const key = `${filter.topic}:${filter.condition}:${queryKey}`;
    const existing = byTopicConditionQuery.get(key);

    if (!existing) {
      byTopicConditionQuery.set(key, filter);
    }
  });

  return [...byTopicConditionQuery.values()];
}

function formatArray(values) {
  if (!values?.length) {
    return '--';
  }

  return values.join('\n');
}

function formatGrantsOnReview(grantsOnReview) {
  if (!grantsOnReview?.length) {
    return '--';
  }

  return grantsOnReview.map((grant, index) => {
    const grantSegments = String(grant).split(', ');

    return (
      <div className="text-wrap" key={`${grant}-${index}`}>
        {grantSegments.map((segment, segmentIndex) => (
          <React.Fragment key={`${segment}-${segmentIndex}`}>
            <span className="text-no-wrap">
              {segment}
              {segmentIndex < grantSegments.length - 1 ? ',' : ''}
            </span>
            {segmentIndex < grantSegments.length - 1 ? ' ' : null}
          </React.Fragment>
        ))}
      </div>
    );
  });
}

function extractActivityReportId(report) {
  const rawId = typeof report === 'object' ? report?.id : report;

  if (rawId == null || String(rawId).trim() === '') {
    return null;
  }

  const activityReportId = String(rawId)
    .replace(/^R\d{2}-AR-/i, '')
    .replace(/^AR-/i, '');

  return activityReportId.trim() ? activityReportId : null;
}

function formatActivityReportDisplayText(report, fallbackRegionId) {
  const rawId = typeof report === 'object' ? report?.id : report;

  if (rawId == null) {
    return '--';
  }

  if (
    typeof report === 'object' &&
    report?.displayId !== undefined &&
    report.displayId !== null &&
    String(report.displayId).trim() !== ''
  ) {
    return String(report.displayId);
  }

  if (
    typeof report === 'object' &&
    report?.legacyId !== undefined &&
    report.legacyId !== null &&
    String(report.legacyId).trim() !== ''
  ) {
    return String(report.legacyId);
  }

  const rawText = String(rawId);

  if (/^R\d{2}-AR-.+/i.test(rawText)) {
    return rawText;
  }

  const activityReportId = extractActivityReportId(report);
  const reportRegionId = typeof report === 'object' ? report?.regionId : fallbackRegionId;
  const hasRegionId =
    reportRegionId !== undefined && reportRegionId !== null && reportRegionId !== '';
  const formattedRegionId = hasRegionId ? String(reportRegionId).padStart(2, '0') : '';

  if (!hasRegionId) {
    return `AR-${activityReportId}`;
  }

  return `R${formattedRegionId}-AR-${activityReportId}`;
}

function formatActivityReports(activityReports, regionId) {
  if (!activityReports?.length) {
    return '--';
  }

  const validReports = activityReports.filter((ar) => extractActivityReportId(ar) !== null);

  if (!validReports.length) {
    return '--';
  }

  return validReports.map((ar, index) => {
    const activityReportId = extractActivityReportId(ar);
    const displayText = formatActivityReportDisplayText(ar, regionId);

    return (
      <div className="text-no-wrap" key={`${activityReportId}-${index}`}>
        <Link to={`/activity-reports/view/${activityReportId}`}>{displayText}</Link>
      </div>
    );
  });
}

function formatCitationNumbers(citationNumbers) {
  if (!citationNumbers?.length) {
    return '--';
  }

  return citationNumbers.map((citationNumber, index) => (
    <div key={`${citationNumber}-${index}`}>
      <CitationDrawer citationNumber={citationNumber} />
    </div>
  ));
}

function formatCitationNumbersForExport(citationNumbers) {
  if (!citationNumbers?.length) {
    return '--';
  }

  return citationNumbers.join('\n');
}

export function formatActivityReportsForExport(activityReports, regionId) {
  if (!activityReports?.length) {
    return '--';
  }

  const validReports = activityReports.filter((ar) => extractActivityReportId(ar) !== null);

  if (!validReports.length) {
    return '--';
  }

  return validReports.map((ar) => formatActivityReportDisplayText(ar, regionId)).join('\n');
}

function formatReviewDisplayName(reviewName, reviewId, fallback = '--') {
  if (reviewName !== undefined && reviewName !== null && String(reviewName).trim() !== '') {
    return String(reviewName);
  }

  if (reviewId !== undefined && reviewId !== null && String(reviewId).trim() !== '') {
    return String(reviewId);
  }

  return fallback;
}

function reviewIdForRow(row) {
  return row.reviewId ?? row.id;
}

function rowIdForRow(row) {
  return row.rowId ?? (row.familyKey ? `cfu-family-${row.familyKey}` : reviewIdForRow(row));
}

function initialReviewsForRow(row) {
  if (Array.isArray(row.initialReviews) && row.initialReviews.length) {
    return row.initialReviews;
  }

  const hasLegacyInitialReview = [
    row.initialReviewName,
    row.initialReviewId,
    row.initialReviewReceivedDate,
  ].some((value) => value !== undefined && value !== null && String(value).trim() !== '');

  if (hasLegacyInitialReview) {
    return [
      {
        reviewId: row.initialReviewId,
        reviewName: row.initialReviewName,
        reviewReceivedDate: row.initialReviewReceivedDate,
      },
    ];
  }

  return [];
}

function formatInitialReviewNames(row, separator = ', ') {
  const values = initialReviewsForRow(row)
    .map((review) =>
      review.reviewName !== undefined &&
      review.reviewName !== null &&
      String(review.reviewName).trim() !== ''
        ? String(review.reviewName)
        : ''
    )
    .filter(Boolean);

  return values.length ? values.join(separator) : '--';
}

function formatInitialReviewDates(row, separator = ', ') {
  const values = initialReviewsForRow(row)
    .map((review) => formatDate(review.reviewReceivedDate))
    .filter((date) => date !== '--');

  return values.length ? values.join(separator) : '--';
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
    id: rowIdForRow(row),
    heading: formatReviewDisplayName(row.reviewName, reviewIdForRow(row)),
    data: [
      formatRecipientCell(row),
      { value: formatGrantsOnReview(row.grantsOnReview) },
      { value: formatCitationNumbers(row.citationNumbers) },
      { value: row.hasTta ? 'Yes' : 'No' },
      { value: formatDate(row.lastTtaDate) },
      { value: formatActivityReports(row.associatedActivityReports || [], row.regionId) },
      { value: formatDate(row.compliantFollowUpReviewReceivedDate) },
      { value: formatInitialReviewDates(row) },
      { value: formatInitialReviewNames(row) },
    ],
  }));
}

function toExportTableData(rows) {
  return rows.map((row) => ({
    id: rowIdForRow(row),
    heading: formatReviewDisplayName(row.reviewName, reviewIdForRow(row)),
    data: [
      { value: row.recipientName || '--' },
      { value: formatArray(row.grantsOnReview) },
      { value: formatCitationNumbersForExport(row.citationNumbers) },
      { value: row.hasTta ? 'Yes' : 'No' },
      { value: formatDate(row.lastTtaDate) },
      {
        value: formatActivityReportsForExport(row.associatedActivityReports || [], row.regionId),
      },
      { value: formatDate(row.compliantFollowUpReviewReceivedDate) },
      { value: formatInitialReviewDates(row, '\n') },
      { value: formatInitialReviewNames(row, '\n') },
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

const STRING_SORT_COLUMNS = ['Compliant_follow-up_review', 'Recipient', 'Had_TTA'];
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

  const compareStringsAscending = (valueA = '', valueB = '') => {
    const stringA = String(valueA).toLowerCase();
    const stringB = String(valueB).toLowerCase();

    if (stringA < stringB) return -1;
    if (stringA > stringB) return 1;
    return 0;
  };

  const dateValueForSort = (value) => {
    const date = moment(value, API_DATE_FORMAT, true);
    return date.isValid() ? date.valueOf() : null;
  };

  const compareDatesDescending = (valueA, valueB) => {
    const timeA = dateValueForSort(valueA) ?? Number.NEGATIVE_INFINITY;
    const timeB = dateValueForSort(valueB) ?? Number.NEGATIVE_INFINITY;

    if (timeA > timeB) return -1;
    if (timeB > timeA) return 1;
    return 0;
  };

  const isDefaultSort =
    sortBy === DEFAULT_SORT_CONFIG.sortBy && direction === DEFAULT_SORT_CONFIG.direction;

  return [...rows].sort((a, b) => {
    let valueA;
    let valueB;

    switch (sortingBy) {
      case 'string':
        valueA = (a[sortBy] || '').toString().toLowerCase();
        valueB = (b[sortBy] || '').toString().toLowerCase();
        break;
      case 'date': {
        valueA = dateValueForSort(a[sortBy]);
        valueB = dateValueForSort(b[sortBy]);

        if (valueA === null && valueB !== null) return 1;
        if (valueB === null && valueA !== null) return -1;
        break;
      }
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

    const recipientComparison = compareStringsAscending(a.Recipient, b.Recipient);
    if (recipientComparison) return recipientComparison;

    if (isDefaultSort) {
      return compareDatesDescending(
        a['Compliant_follow-up_review_received_date'],
        b['Compliant_follow-up_review_received_date']
      );
    }

    return 0;
  });
}

export default function CompliantFollowUpsTable({ title }) {
  const [sortableData, setSortableData] = useState([]);
  const [checkboxes, setCheckboxes] = useState({});
  const [pageSize, setPageSize] = useState(PER_PAGE);
  const drawerTriggerRef = useRef(null);
  const { user } = useContext(UserContext) || { user: {} };
  const filterKey = useDashboardFilterKey('regional-dashboard', 'monitoring');

  const {
    filters: selectedFilters,
    setFilters,
    filterConfig,
  } = useFilters(user || {}, filterKey, false, [], MONITORING_FILTER_CONFIG);

  const selectedFiltersForQuery = useMemo(
    () => formatMonitoringFiltersForQuery(selectedFilters, { includeCompleteDate: true }),
    [selectedFilters]
  );

  useEffect(() => {
    if (JSON.stringify(selectedFilters) !== JSON.stringify(selectedFiltersForQuery)) {
      setFilters(selectedFiltersForQuery);
    }
  }, [selectedFilters, selectedFiltersForQuery, setFilters]);

  const { requestSort, sortConfig, setSortConfig } = useWidgetSorting(
    'compliant-follow-up-reviews-details-table',
    DEFAULT_SORT_CONFIG,
    sortableData,
    setSortableData,
    STRING_SORT_COLUMNS,
    DATE_SORT_COLUMNS,
    []
  );

  const query = useMemo(
    () => filtersToQueryString(selectedFiltersForQuery),
    [selectedFiltersForQuery]
  );

  const headers = [
    'Recipient',
    'Grants on review',
    'Citation number',
    'Had TTA',
    'Last TTA',
    'Activity reports',
    'Compliant follow-up review received date',
    'Initial review received date',
    'Initial review',
  ];

  const visibleFilterPills = useMemo(
    () =>
      dedupeVisibleFilters(
        selectedFiltersForQuery.filter(
          (filter) =>
            filter.topic !== 'region' &&
            filter.topic !== 'reportDeliveryDate' &&
            filter.topic !== 'completeDate'
        )
      ),
    [selectedFiltersForQuery]
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
        'Compliant_follow-up_review': formatReviewDisplayName(
          row.reviewName,
          reviewIdForRow(row),
          ''
        ),
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
  const exportTableData = useMemo(() => toExportTableData(sortableData), [sortableData]);

  const { exportRows } = useWidgetExport(
    exportTableData,
    headers,
    checkboxes,
    'Compliant Follow-up Reviews',
    'compliant-follow-up-reviews.csv'
  );

  const selectedReviews = useMemo(
    () => Object.keys(checkboxes).filter((key) => checkboxes[key]),
    [checkboxes]
  );

  const menuItems = useMemo(() => {
    const items = [];

    if (tableData.length > 0) {
      items.push({
        label: 'Export table',
        onClick: () => exportRows('all'),
      });
    }

    if (selectedReviews.length > 0) {
      items.unshift({
        label: 'Export selected rows',
        onClick: () => exportRows('selected'),
      });
    }

    return items;
  }, [tableData.length, selectedReviews.length, exportRows]);

  const currentPage = sortConfig.activePage || 1;
  const currentOffset = sortConfig.offset || 0;
  const effectivePerPage = pageSize === 'all' ? Math.max(tableData.length, 1) : pageSize;
  const paginatedTableData = useMemo(
    () => tableData.slice(currentOffset, currentOffset + effectivePerPage),
    [tableData, currentOffset, effectivePerPage]
  );

  const handlePerPageChange = (event) => {
    const nextPageSize =
      event.target.value === 'all' ? 'all' : Number.parseInt(event.target.value, 10);

    if (nextPageSize !== 'all' && (!Number.isInteger(nextPageSize) || nextPageSize < 1)) {
      return;
    }

    setPageSize(nextPageSize);
    setSortConfig((prev) => ({
      ...prev,
      activePage: 1,
      offset: 0,
    }));
  };

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
          <FilterPills filters={visibleFilterPills} filterConfig={filterConfig} readOnly />
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
        showPagingBottom={tableData.length > 0}
        showPagingTop={tableData.length > 0}
        currentPage={currentPage}
        totalCount={tableData.length}
        offset={currentOffset}
        perPage={effectivePerPage}
        handlePageChange={(newPage) => {
          setSortConfig((prev) => ({
            ...prev,
            activePage: newPage,
            offset: (newPage - 1) * effectivePerPage,
          }));
        }}
        paginationCardTopProps={{
          perPageChange: handlePerPageChange,
          noXofX: true,
          perPageSelectValue: pageSize,
          allOptionValue: 'all',
          hidePagination: true,
          className: 'margin-bottom-2',
        }}
        menuItems={menuItems}
        checkboxes={checkboxes}
        setCheckboxes={setCheckboxes}
      >
        {error && (
          <div className="usa-alert usa-alert--error margin-bottom-3" role="alert">
            <div className="usa-alert__body">
              <p className="usa-alert__text">{error}</p>
            </div>
          </div>
        )}
        {!loading && !tableData.length && !error && (
          <NoResultsFound
            drawerConfig={{
              tagName: 'ttahub-regional-dash-monitoring-filters',
              title: 'Monitoring dashboard filters',
            }}
          />
        )}
        {!!paginatedTableData.length && (
          <HorizontalTableWidget
            headers={headers}
            data={paginatedTableData}
            firstHeading="Compliant follow-up review"
            showTotalColumn={false}
            enableCheckboxes={true}
            checkboxes={checkboxes}
            setCheckboxes={setCheckboxes}
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
