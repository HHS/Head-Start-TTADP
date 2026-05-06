/* eslint-disable react/jsx-props-no-spreading */

import isEqual from 'lodash/isEqual';
import PropTypes from 'prop-types';
import { parse } from 'query-string';
import React, { useEffect, useMemo } from 'react';
import {
  BooleanField,
  Button,
  Datagrid,
  DateField,
  ExportButton,
  FilterButton,
  FunctionField,
  List,
  ListButton,
  SelectInput,
  Show,
  SimpleShowLayout,
  sanitizeListRestProps,
  TextField,
  TextInput,
  TopToolbar,
  useListContext,
  useResourceContext,
} from 'react-admin';
import { useHistory, useLocation } from 'react-router-dom';

const ReadOnlyShowActions = ({ basePath }) => (
  <TopToolbar>
    <ListButton basePath={basePath} />
  </TopToolbar>
);

ReadOnlyShowActions.propTypes = {
  basePath: PropTypes.string,
};

ReadOnlyShowActions.defaultProps = {
  basePath: '',
};

const stopLinkPropagation = (event) => {
  event.stopPropagation();
};

const buildFilterHref = (resource, filter) => {
  const displayedFilters = Object.keys(filter).reduce(
    (accumulator, key) => ({
      ...accumulator,
      [key]: true,
    }),
    {}
  );

  return `#/${resource}?filter=${encodeURIComponent(JSON.stringify(filter))}&displayedFilters=${encodeURIComponent(JSON.stringify(displayedFilters))}`;
};
const buildShowHref = (resource, id) => `#/${resource}/${id}/show`;

const DiagnosticsLink = ({ href, label }) =>
  href ? (
    <a href={href} onClick={stopLinkPropagation}>
      {label}
    </a>
  ) : null;

DiagnosticsLink.propTypes = {
  href: PropTypes.string,
  label: PropTypes.string.isRequired,
};

DiagnosticsLink.defaultProps = {
  href: '',
};

const ScrollDatagrid = (props) => (
  <div className="smart-hub-admin-diag__table-scroll">
    <Datagrid {...props} />
  </div>
);

const DiagnosticsListActions = ({ className, clearFilterValues, ...props }) => {
  const { currentSort, displayedFilters, filterValues, setFilters, total } = useListContext(props);
  const resource = useResourceContext(props);
  const hasClearableFilters =
    Object.keys(displayedFilters || {}).length > 0 ||
    !isEqual(filterValues || {}, clearFilterValues || {});

  return (
    <TopToolbar className={className} {...sanitizeListRestProps(props)}>
      <FilterButton />
      <Button
        label="Clear filters"
        onClick={() => setFilters(clearFilterValues || {}, {})}
        disabled={!hasClearableFilters}
      />
      <ExportButton
        disabled={total === 0}
        resource={resource}
        sort={currentSort}
        filterValues={filterValues}
      />
    </TopToolbar>
  );
};

DiagnosticsListActions.propTypes = {
  className: PropTypes.string,
  clearFilterValues: PropTypes.shape({}),
};

DiagnosticsListActions.defaultProps = {
  className: '',
  clearFilterValues: undefined,
};

const getHashLocation = () => {
  if (typeof window === 'undefined' || !window.location?.hash) {
    return {
      pathname: '/',
      search: '',
    };
  }

  const { hash } = window.location;
  const hashContent = hash.startsWith('#') ? hash.slice(1) : hash;
  const queryStart = hashContent.indexOf('?');

  if (queryStart === -1) {
    return {
      pathname: hashContent || '/',
      search: '',
    };
  }

  return {
    pathname: hashContent.slice(0, queryStart) || '/',
    search: hashContent.slice(queryStart),
  };
};

const parseLinkedListState = (search) => {
  const parsedSearch = parse(search);
  const { filter, displayedFilters } = parsedSearch;

  const parsedState = {
    displayedFilters: {},
    filter: {},
  };

  if (typeof filter === 'string' && filter) {
    try {
      const parsedFilter = JSON.parse(filter);
      parsedState.filter =
        parsedFilter && typeof parsedFilter === 'object' && !Array.isArray(parsedFilter)
          ? parsedFilter
          : {};
    } catch (error) {
      parsedState.filter = {};
    }
  }

  if (typeof displayedFilters === 'string' && displayedFilters) {
    try {
      const parsedDisplayedFilters = JSON.parse(displayedFilters);
      parsedState.displayedFilters =
        parsedDisplayedFilters &&
        typeof parsedDisplayedFilters === 'object' &&
        !Array.isArray(parsedDisplayedFilters)
          ? parsedDisplayedFilters
          : {};
    } catch (error) {
      parsedState.displayedFilters = {};
    }
  }

  return parsedState;
};

const DiagnosticsList = ({ children, filterDefaultValues, filters, ...props }) => {
  const history = useHistory();
  const location = useLocation();
  const { pathname: hashPathname, search: hashSearch } = getHashLocation();
  const effectiveSearch = location?.search || hashSearch;
  const waitingForRouterSearchSync = !location?.search && !!hashSearch;
  const linkedListState = useMemo(() => parseLinkedListState(effectiveSearch), [effectiveSearch]);
  const mergedFilterDefaultValues = useMemo(
    () => ({ ...(filterDefaultValues || {}), ...linkedListState.filter }),
    [filterDefaultValues, linkedListState]
  );

  useEffect(() => {
    if (!location?.search && hashSearch) {
      history.replace({
        pathname: hashPathname,
        search: hashSearch,
      });
    }
  }, [hashPathname, hashSearch, history, location?.search]);

  if (waitingForRouterSearchSync) {
    return null;
  }

  return (
    <List
      {...props}
      actions={
        filters ? <DiagnosticsListActions clearFilterValues={filterDefaultValues} /> : undefined
      }
      filters={filters}
      filterDefaultValues={mergedFilterDefaultValues}
      syncWithLocation
    >
      {children}
    </List>
  );
};

DiagnosticsList.propTypes = {
  children: PropTypes.node.isRequired,
  filter: PropTypes.shape({}),
  filterDefaultValues: PropTypes.shape({}),
  filters: PropTypes.oneOfType([PropTypes.element, PropTypes.arrayOf(PropTypes.element)]),
};

DiagnosticsList.defaultProps = {
  filter: undefined,
  filterDefaultValues: undefined,
  filters: undefined,
};

const paranoidFilterDefaultValues = {
  deletedStatus: 'active',
};

const deletedStatusChoices = [
  { id: 'active', name: 'Active only' },
  { id: 'deleted', name: 'Deleted only' },
  { id: 'all', name: 'All' },
];

const createDeletedStatusFilter = () => (
  <SelectInput
    key="deletedStatus"
    label="Deleted status"
    source="deletedStatus"
    alwaysOn
    choices={deletedStatusChoices}
  />
);

const sourceDeletedStatusChoices = [
  { id: 'active', name: 'Source active' },
  { id: 'deleted', name: 'Source deleted' },
  { id: 'all', name: 'All' },
];

const createSourceDeletedStatusFilter = () => (
  <SelectInput
    key="sourceDeletedStatus"
    label="Source deleted status"
    source="sourceDeletedStatus"
    alwaysOn
    choices={sourceDeletedStatusChoices}
  />
);

export const insertFiltersAfterSources = (filters, extraFilters, sources = []) => {
  const insertAfterIndex = filters.reduce((lastMatchIndex, filterElement, index) => {
    if (sources.includes(filterElement.props.source)) {
      return index;
    }

    return lastMatchIndex;
  }, -1);

  if (insertAfterIndex === -1) {
    return [...extraFilters, ...filters];
  }

  return [
    ...filters.slice(0, insertAfterIndex + 1),
    ...extraFilters,
    ...filters.slice(insertAfterIndex + 1),
  ];
};

const withDeletedStatusFilter = (filters, afterSources = []) =>
  insertFiltersAfterSources(filters, [createDeletedStatusFilter()], afterSources);

const withDeletedAndSourceDeletedStatusFilters = (filters, afterSources = []) =>
  insertFiltersAfterSources(
    filters,
    [createSourceDeletedStatusFilter(), createDeletedStatusFilter()],
    afterSources
  );

const citationFilters = [
  <TextInput key="id" label="Citation ID" source="id" />,
  <TextInput key="finding_uuid" label="Finding UUID" source="finding_uuid" alwaysOn />,
  <TextInput key="citation" label="Citation" source="citation" alwaysOn />,
  <TextInput key="reviewName" label="Review name" source="reviewName" />,
  <TextInput key="calculated_status" label="Calculated status" source="calculated_status" />,
  <TextInput key="latest_review_uuid" label="Latest review UUID" source="latest_review_uuid" />,
];

export const CitationList = (props) => (
  <DiagnosticsList
    {...props}
    className="smart-hub--overflow-auto"
    component="div"
    filters={withDeletedStatusFilter(citationFilters, ['finding_uuid', 'latest_review_uuid'])}
    filterDefaultValues={paranoidFilterDefaultValues}
    sort={{ field: 'latest_report_delivery_date', order: 'DESC' }}
  >
    <ScrollDatagrid rowClick="show">
      <TextField source="id" />
      <FunctionField
        source="finding_uuid"
        label="Finding UUID"
        render={(record) => (
          <DiagnosticsLink
            href={
              record.finding_uuid
                ? buildFilterHref('monitoringFindingHistories', { findingId: record.finding_uuid })
                : ''
            }
            label={record.finding_uuid || ''}
          />
        )}
      />
      <TextField source="citation" />
      <TextField source="calculated_status" />
      <TextField source="calculated_finding_type" />
      <TextField source="raw_status" />
      <BooleanField source="active" />
      <BooleanField source="last_review_delivered" />
      <FunctionField
        source="latest_review_uuid"
        label="Latest review UUID"
        render={(record) => (
          <DiagnosticsLink
            href={
              record.latest_review_uuid
                ? buildFilterHref('monitoringReviews', { reviewId: record.latest_review_uuid })
                : ''
            }
            label={record.latest_review_uuid || ''}
          />
        )}
      />
      <DateField source="latest_report_delivery_date" />
      <DateField source="latest_goal_closure" showTime />
      <DateField source="updatedAt" showTime />
      <DateField source="deletedAt" showTime />
    </ScrollDatagrid>
  </DiagnosticsList>
);

export const CitationShow = (props) => (
  <Show actions={<ReadOnlyShowActions />} {...props}>
    <SimpleShowLayout>
      <TextField source="id" />
      <TextField source="mfid" />
      <TextField source="finding_uuid" />
      <FunctionField
        label="Matching histories"
        render={(record) => (
          <DiagnosticsLink
            href={
              record.finding_uuid
                ? buildFilterHref('monitoringFindingHistories', { findingId: record.finding_uuid })
                : ''
            }
            label="Open matching histories"
          />
        )}
      />
      <TextField source="citation" />
      <TextField source="calculated_status" />
      <TextField source="raw_status" />
      <BooleanField source="active" />
      <BooleanField source="last_review_delivered" />
      <TextField source="calculated_finding_type" />
      <TextField source="raw_finding_type" />
      <TextField source="source_category" />
      <DateField source="finding_deadline" />
      <DateField source="reported_date" />
      <DateField source="closed_date" />
      <TextField source="initial_review_uuid" />
      <DateField source="initial_report_delivery_date" />
      <TextField source="initial_determination" />
      <TextField source="initial_narrative" />
      <TextField source="latest_review_uuid" />
      <FunctionField
        label="Matching review"
        render={(record) => (
          <DiagnosticsLink
            href={
              record.latest_review_uuid
                ? buildFilterHref('monitoringReviews', { reviewId: record.latest_review_uuid })
                : ''
            }
            label="Open matching review"
          />
        )}
      />
      <DateField source="latest_report_delivery_date" />
      <TextField source="latest_determination" />
      <TextField source="latest_narrative" />
      <DateField source="latest_goal_closure" showTime />
      <DateField source="active_through" />
      <TextField source="standard_text" />
      <TextField source="guidance_category" />
      <DateField source="createdAt" showTime />
      <DateField source="updatedAt" showTime />
      <DateField source="deletedAt" showTime />
    </SimpleShowLayout>
  </Show>
);

const grantCitationFilters = [
  <TextInput key="grantId" label="Grant ID" source="grantId" alwaysOn />,
  <TextInput key="citationId" label="Citation ID" source="citationId" />,
  <TextInput key="recipient_id" label="Recipient ID" source="recipient_id" />,
  <TextInput key="recipient_name" label="Recipient name" source="recipient_name" />,
  <TextInput key="region_id" label="Region ID" source="region_id" />,
];

export const GrantCitationList = (props) => (
  <DiagnosticsList
    {...props}
    className="smart-hub--overflow-auto"
    component="div"
    filters={grantCitationFilters}
  >
    <ScrollDatagrid rowClick="show">
      <TextField source="id" />
      <TextField source="grantId" />
      <FunctionField
        label="Citation"
        render={(record) => (
          <DiagnosticsLink
            href={record.citationId ? buildFilterHref('citations', { id: record.citationId }) : ''}
            label={record.citationId ? String(record.citationId) : ''}
          />
        )}
      />
      <TextField source="recipient_id" />
      <TextField source="recipient_name" />
      <TextField source="region_id" />
      <DateField source="updatedAt" showTime />
    </ScrollDatagrid>
  </DiagnosticsList>
);

export const GrantCitationShow = (props) => (
  <Show actions={<ReadOnlyShowActions />} {...props}>
    <SimpleShowLayout>
      <TextField source="id" />
      <TextField source="grantId" />
      <TextField source="citationId" />
      <FunctionField
        label="Matching citation"
        render={(record) => (
          <DiagnosticsLink
            href={record.citationId ? buildFilterHref('citations', { id: record.citationId }) : ''}
            label="Open matching citation"
          />
        )}
      />
      <TextField source="recipient_id" />
      <TextField source="recipient_name" />
      <TextField source="region_id" />
      <DateField source="createdAt" showTime />
      <DateField source="updatedAt" showTime />
    </SimpleShowLayout>
  </Show>
);

const deliveredReviewFilters = [
  <TextInput key="id" label="Delivered review ID" source="id" />,
  <TextInput key="review_uuid" label="Review UUID" source="review_uuid" alwaysOn />,
  <TextInput key="reviewName" label="Review name" source="reviewName" />,
  <TextInput key="review_type" label="Review type" source="review_type" alwaysOn />,
  <TextInput key="review_status" label="Review status" source="review_status" alwaysOn />,
];

export const DeliveredReviewList = (props) => (
  <DiagnosticsList
    {...props}
    className="smart-hub--overflow-auto"
    component="div"
    filters={withDeletedStatusFilter(deliveredReviewFilters, ['review_uuid'])}
    filterDefaultValues={paranoidFilterDefaultValues}
    sort={{ field: 'report_delivery_date', order: 'DESC' }}
  >
    <ScrollDatagrid rowClick="show">
      <TextField source="id" />
      <TextField source="mrid" />
      <FunctionField
        source="review_name"
        label="Review name"
        render={(record) => (
          <DiagnosticsLink
            href={
              record.review_uuid
                ? buildFilterHref('monitoringReviews', { reviewId: record.review_uuid })
                : ''
            }
            label={record.review_name || ''}
          />
        )}
      />
      <FunctionField
        source="review_uuid"
        label="Review UUID"
        render={(record) => (
          <DiagnosticsLink
            href={
              record.review_uuid
                ? buildFilterHref('monitoringReviews', { reviewId: record.review_uuid })
                : ''
            }
            label={record.review_uuid || ''}
          />
        )}
      />
      <TextField source="review_type" />
      <TextField source="review_status" />
      <DateField source="report_delivery_date" />
      <DateField source="report_end_date" />
      <TextField source="outcome" />
      <BooleanField source="complete" />
      <BooleanField source="corrected" />
      <DateField source="complete_date" />
      <DateField source="updatedAt" showTime />
      <DateField source="deletedAt" showTime />
    </ScrollDatagrid>
  </DiagnosticsList>
);

export const DeliveredReviewShow = (props) => (
  <Show actions={<ReadOnlyShowActions />} {...props}>
    <SimpleShowLayout>
      <TextField source="id" />
      <TextField source="mrid" />
      <TextField source="review_name" />
      <TextField source="review_uuid" />
      <FunctionField
        label="Matching monitoring review"
        render={(record) => (
          <DiagnosticsLink
            href={
              record.review_uuid
                ? buildFilterHref('monitoringReviews', { reviewId: record.review_uuid })
                : ''
            }
            label="Open matching review"
          />
        )}
      />
      <TextField source="review_type" />
      <TextField source="review_status" />
      <DateField source="report_delivery_date" />
      <DateField source="report_start_date" />
      <DateField source="report_end_date" />
      <TextField source="outcome" />
      <DateField source="complete_date" />
      <BooleanField source="complete" />
      <BooleanField source="corrected" />
      <DateField source="createdAt" showTime />
      <DateField source="updatedAt" showTime />
      <DateField source="deletedAt" showTime />
    </SimpleShowLayout>
  </Show>
);

const deliveredReviewCitationFilters = [
  <TextInput
    key="deliveredReviewId"
    label="Delivered review ID"
    source="deliveredReviewId"
    alwaysOn
  />,
  <TextInput key="citationId" label="Citation ID" source="citationId" alwaysOn />,
];

export const DeliveredReviewCitationList = (props) => (
  <DiagnosticsList
    {...props}
    className="smart-hub--overflow-auto"
    component="div"
    filters={deliveredReviewCitationFilters}
  >
    <ScrollDatagrid rowClick="show">
      <TextField source="id" />
      <TextField source="deliveredReviewId" />
      <FunctionField
        label="Citation"
        render={(record) => (
          <DiagnosticsLink
            href={record.citationId ? buildFilterHref('citations', { id: record.citationId }) : ''}
            label={record.citationId ? String(record.citationId) : ''}
          />
        )}
      />
      <DateField source="createdAt" showTime />
      <DateField source="updatedAt" showTime />
    </ScrollDatagrid>
  </DiagnosticsList>
);

export const DeliveredReviewCitationShow = (props) => (
  <Show actions={<ReadOnlyShowActions />} {...props}>
    <SimpleShowLayout>
      <TextField source="id" />
      <TextField source="deliveredReviewId" />
      <TextField source="citationId" />
      <FunctionField
        label="Matching citation"
        render={(record) => (
          <DiagnosticsLink
            href={record.citationId ? buildFilterHref('citations', { id: record.citationId }) : ''}
            label="Open matching citation"
          />
        )}
      />
      <DateField source="createdAt" showTime />
      <DateField source="updatedAt" showTime />
    </SimpleShowLayout>
  </Show>
);

const grantDeliveredReviewFilters = [
  <TextInput key="grantId" label="Grant ID" source="grantId" alwaysOn />,
  <TextInput key="deliveredReviewId" label="Delivered review ID" source="deliveredReviewId" />,
  <TextInput key="recipient_id" label="Recipient ID" source="recipient_id" />,
  <TextInput key="recipient_name" label="Recipient name" source="recipient_name" />,
  <TextInput key="region_id" label="Region ID" source="region_id" />,
];

export const GrantDeliveredReviewList = (props) => (
  <DiagnosticsList
    {...props}
    className="smart-hub--overflow-auto"
    component="div"
    filters={grantDeliveredReviewFilters}
  >
    <ScrollDatagrid rowClick="show">
      <TextField source="id" />
      <TextField source="grantId" />
      <FunctionField
        label="Delivered review"
        render={(record) => (
          <DiagnosticsLink
            href={
              record.deliveredReviewId
                ? buildFilterHref('deliveredReviews', { id: record.deliveredReviewId })
                : ''
            }
            label={record.deliveredReviewId ? String(record.deliveredReviewId) : ''}
          />
        )}
      />
      <TextField source="recipient_id" />
      <TextField source="recipient_name" />
      <TextField source="region_id" />
      <DateField source="updatedAt" showTime />
    </ScrollDatagrid>
  </DiagnosticsList>
);

export const GrantDeliveredReviewShow = (props) => (
  <Show actions={<ReadOnlyShowActions />} {...props}>
    <SimpleShowLayout>
      <TextField source="id" />
      <TextField source="grantId" />
      <TextField source="deliveredReviewId" />
      <FunctionField
        label="Matching delivered review"
        render={(record) => (
          <DiagnosticsLink
            href={
              record.deliveredReviewId
                ? buildShowHref('deliveredReviews', record.deliveredReviewId)
                : ''
            }
            label="Open delivered review"
          />
        )}
      />
      <TextField source="recipient_id" />
      <TextField source="recipient_name" />
      <TextField source="region_id" />
      <DateField source="createdAt" showTime />
      <DateField source="updatedAt" showTime />
    </SimpleShowLayout>
  </Show>
);

const monitoringReviewFilters = [
  <TextInput key="reviewId" label="Review UUID" source="reviewId" alwaysOn />,
  <TextInput key="name" label="Review name" source="name" />,
  <TextInput key="reviewType" label="Review type" source="reviewType" alwaysOn />,
  <TextInput key="statusId" label="Status ID" source="statusId" />,
];

export const MonitoringReviewList = (props) => (
  <DiagnosticsList
    {...props}
    className="smart-hub--overflow-auto"
    component="div"
    filters={withDeletedAndSourceDeletedStatusFilters(monitoringReviewFilters, ['reviewId'])}
    filterDefaultValues={paranoidFilterDefaultValues}
    sort={{ field: 'reportDeliveryDate', order: 'DESC' }}
  >
    <ScrollDatagrid rowClick="show">
      <TextField source="id" />
      <TextField source="reviewId" />
      <TextField source="name" />
      <FunctionField
        label="Grantees"
        render={(record) => (
          <DiagnosticsLink
            href={
              record.reviewId
                ? buildFilterHref('monitoringReviewGrantees', { reviewId: record.reviewId })
                : ''
            }
            label="Open"
          />
        )}
      />
      <FunctionField
        label="Histories"
        render={(record) => (
          <DiagnosticsLink
            href={
              record.reviewId
                ? buildFilterHref('monitoringFindingHistories', { reviewId: record.reviewId })
                : ''
            }
            label="Open"
          />
        )}
      />
      <TextField source="reviewType" />
      <TextField source="statusId" label="Status ID" />
      <TextField source="statusName" label="Status name" />
      <DateField source="startDate" />
      <DateField source="reportDeliveryDate" />
      <TextField source="outcome" />
      <DateField source="sourceUpdatedAt" showTime />
      <DateField source="sourceDeletedAt" showTime />
      <DateField source="deletedAt" showTime />
    </ScrollDatagrid>
  </DiagnosticsList>
);

export const MonitoringReviewShow = (props) => (
  <Show actions={<ReadOnlyShowActions />} {...props}>
    <SimpleShowLayout>
      <TextField source="id" />
      <TextField source="reviewId" />
      <TextField source="contentId" />
      <TextField source="statusId" label="Status ID" />
      <TextField source="statusName" label="Status name" />
      <TextField source="name" />
      <FunctionField
        label="Matching grantees"
        render={(record) => (
          <DiagnosticsLink
            href={
              record.reviewId
                ? buildFilterHref('monitoringReviewGrantees', { reviewId: record.reviewId })
                : ''
            }
            label="Open matching grantees"
          />
        )}
      />
      <FunctionField
        label="Matching histories"
        render={(record) => (
          <DiagnosticsLink
            href={
              record.reviewId
                ? buildFilterHref('monitoringFindingHistories', { reviewId: record.reviewId })
                : ''
            }
            label="Open matching histories"
          />
        )}
      />
      <DateField source="startDate" />
      <DateField source="endDate" />
      <TextField source="reviewType" />
      <DateField source="reportDeliveryDate" showTime />
      <TextField source="reportAttachmentId" />
      <TextField source="outcome" />
      <TextField source="hash" />
      <DateField source="sourceCreatedAt" showTime />
      <DateField source="sourceUpdatedAt" showTime />
      <DateField source="sourceDeletedAt" showTime />
      <DateField source="createdAt" showTime />
      <DateField source="updatedAt" showTime />
      <DateField source="deletedAt" showTime />
    </SimpleShowLayout>
  </Show>
);

const monitoringReviewGranteeFilters = [
  <TextInput key="reviewId" label="Review UUID" source="reviewId" alwaysOn />,
  <TextInput key="reviewName" label="Review name" source="reviewName" />,
  <TextInput key="grantNumber" label="Grant number" source="grantNumber" alwaysOn />,
  <TextInput key="granteeId" label="Grantee ID" source="granteeId" />,
];

export const MonitoringReviewGranteeList = (props) => (
  <DiagnosticsList
    {...props}
    className="smart-hub--overflow-auto"
    component="div"
    filters={withDeletedAndSourceDeletedStatusFilters(monitoringReviewGranteeFilters, ['reviewId'])}
    filterDefaultValues={paranoidFilterDefaultValues}
  >
    <ScrollDatagrid rowClick="show">
      <TextField source="id" />
      <TextField source="reviewId" />
      <TextField source="grantNumber" />
      <TextField source="granteeId" />
      <TextField source="updateBy" />
      <DateField source="sourceUpdatedAt" showTime />
      <DateField source="sourceDeletedAt" showTime />
      <DateField source="deletedAt" showTime />
    </ScrollDatagrid>
  </DiagnosticsList>
);

export const MonitoringReviewGranteeShow = (props) => (
  <Show actions={<ReadOnlyShowActions />} {...props}>
    <SimpleShowLayout>
      <TextField source="id" />
      <TextField source="reviewId" />
      <TextField source="granteeId" />
      <DateField source="createTime" showTime />
      <DateField source="updateTime" showTime />
      <TextField source="updateBy" />
      <TextField source="grantNumber" />
      <DateField source="sourceCreatedAt" showTime />
      <DateField source="sourceUpdatedAt" showTime />
      <DateField source="sourceDeletedAt" showTime />
      <DateField source="createdAt" showTime />
      <DateField source="updatedAt" showTime />
      <DateField source="deletedAt" showTime />
    </SimpleShowLayout>
  </Show>
);

const monitoringFindingFilters = [
  <TextInput key="findingId" label="Finding UUID" source="findingId" alwaysOn />,
  <TextInput key="findingType" label="Finding type" source="findingType" alwaysOn />,
  <TextInput key="statusId" label="Status ID" source="statusId" />,
  <TextInput key="source" label="Source" source="source" />,
];

export const MonitoringFindingList = (props) => (
  <DiagnosticsList
    {...props}
    className="smart-hub--overflow-auto"
    component="div"
    filters={withDeletedAndSourceDeletedStatusFilters(monitoringFindingFilters, ['findingId'])}
    filterDefaultValues={paranoidFilterDefaultValues}
    sort={{ field: 'sourceUpdatedAt', order: 'DESC' }}
  >
    <ScrollDatagrid rowClick="show">
      <TextField source="id" />
      <TextField source="findingId" />
      <TextField source="findingType" />
      <TextField source="statusId" label="Status ID" />
      <TextField source="statusName" label="Status name" />
      <TextField source="source" />
      <DateField source="correctionDeadLine" />
      <DateField source="closedDate" />
      <DateField source="sourceUpdatedAt" showTime />
      <DateField source="sourceDeletedAt" showTime />
      <DateField source="deletedAt" showTime />
    </ScrollDatagrid>
  </DiagnosticsList>
);

export const MonitoringFindingShow = (props) => (
  <Show actions={<ReadOnlyShowActions />} {...props}>
    <SimpleShowLayout>
      <TextField source="id" />
      <TextField source="findingId" />
      <TextField source="statusId" label="Status ID" />
      <TextField source="statusName" label="Status name" />
      <TextField source="findingType" />
      <TextField source="source" />
      <DateField source="correctionDeadLine" showTime />
      <DateField source="reportedDate" showTime />
      <DateField source="closedDate" showTime />
      <TextField source="hash" />
      <DateField source="sourceCreatedAt" showTime />
      <DateField source="sourceUpdatedAt" showTime />
      <DateField source="sourceDeletedAt" showTime />
      <DateField source="createdAt" showTime />
      <DateField source="updatedAt" showTime />
      <DateField source="deletedAt" showTime />
    </SimpleShowLayout>
  </Show>
);

const monitoringFindingHistoryFilters = [
  <TextInput key="findingId" label="Finding UUID" source="findingId" alwaysOn />,
  <TextInput key="reviewId" label="Review UUID" source="reviewId" alwaysOn />,
  <TextInput key="reviewName" label="Review name" source="reviewName" />,
  <TextInput key="findingHistoryId" label="History UUID" source="findingHistoryId" />,
  <TextInput key="statusId" label="Status ID" source="statusId" />,
];

export const MonitoringFindingHistoryList = (props) => (
  <DiagnosticsList
    {...props}
    className="smart-hub--overflow-auto"
    component="div"
    filters={withDeletedAndSourceDeletedStatusFilters(monitoringFindingHistoryFilters, [
      'findingId',
      'reviewId',
    ])}
    filterDefaultValues={paranoidFilterDefaultValues}
    sort={{ field: 'sourceUpdatedAt', order: 'DESC' }}
  >
    <ScrollDatagrid rowClick="show">
      <TextField source="id" />
      <TextField source="findingHistoryId" />
      <FunctionField
        source="findingId"
        label="Finding ID"
        render={(record) => (
          <DiagnosticsLink
            href={
              record.findingId
                ? buildFilterHref('monitoringFindings', { findingId: record.findingId })
                : ''
            }
            label={record.findingId || ''}
          />
        )}
      />
      <FunctionField
        source="reviewId"
        label="Review ID"
        render={(record) => (
          <DiagnosticsLink
            href={
              record.reviewId
                ? buildFilterHref('monitoringReviews', { reviewId: record.reviewId })
                : ''
            }
            label={record.reviewId || ''}
          />
        )}
      />
      <TextField source="statusId" label="Status ID" />
      <TextField source="statusName" label="Status name" />
      <TextField source="determination" />
      <TextField source="ordinal" />
      <DateField source="sourceUpdatedAt" showTime />
      <DateField source="sourceDeletedAt" showTime />
      <DateField source="deletedAt" showTime />
    </ScrollDatagrid>
  </DiagnosticsList>
);

export const MonitoringFindingHistoryShow = (props) => (
  <Show actions={<ReadOnlyShowActions />} {...props}>
    <SimpleShowLayout>
      <TextField source="id" />
      <TextField source="reviewId" />
      <FunctionField
        label="Matching review"
        render={(record) => (
          <DiagnosticsLink
            href={
              record.reviewId
                ? buildFilterHref('monitoringReviews', { reviewId: record.reviewId })
                : ''
            }
            label="Open matching review"
          />
        )}
      />
      <TextField source="findingHistoryId" />
      <TextField source="findingId" />
      <FunctionField
        label="Matching finding"
        render={(record) => (
          <DiagnosticsLink
            href={
              record.findingId
                ? buildFilterHref('monitoringFindings', { findingId: record.findingId })
                : ''
            }
            label="Open matching finding"
          />
        )}
      />
      <TextField source="statusId" label="Status ID" />
      <TextField source="statusName" label="Status name" />
      <TextField source="narrative" />
      <TextField source="ordinal" />
      <TextField source="determination" />
      <TextField source="hash" />
      <DateField source="sourceCreatedAt" showTime />
      <DateField source="sourceUpdatedAt" showTime />
      <DateField source="sourceDeletedAt" showTime />
      <DateField source="createdAt" showTime />
      <DateField source="updatedAt" showTime />
      <DateField source="deletedAt" showTime />
    </SimpleShowLayout>
  </Show>
);

const monitoringFindingGrantFilters = [
  <TextInput key="findingId" label="Finding UUID" source="findingId" alwaysOn />,
  <TextInput key="granteeId" label="Grantee ID" source="granteeId" alwaysOn />,
  <TextInput key="statusId" label="Status ID" source="statusId" />,
  <TextInput key="source" label="Source" source="source" />,
];

export const MonitoringFindingGrantList = (props) => (
  <DiagnosticsList
    {...props}
    className="smart-hub--overflow-auto"
    component="div"
    filters={withDeletedAndSourceDeletedStatusFilters(monitoringFindingGrantFilters, ['findingId'])}
    filterDefaultValues={paranoidFilterDefaultValues}
    sort={{ field: 'sourceUpdatedAt', order: 'DESC' }}
  >
    <ScrollDatagrid rowClick="show">
      <TextField source="id" />
      <TextField source="findingId" />
      <TextField source="granteeId" />
      <TextField source="statusId" label="Status ID" />
      <TextField source="statusName" label="Status name" />
      <TextField source="findingType" />
      <TextField source="source" />
      <DateField source="closedDate" />
      <DateField source="sourceUpdatedAt" showTime />
      <DateField source="sourceDeletedAt" showTime />
      <DateField source="deletedAt" showTime />
    </ScrollDatagrid>
  </DiagnosticsList>
);

export const MonitoringFindingGrantShow = (props) => (
  <Show actions={<ReadOnlyShowActions />} {...props}>
    <SimpleShowLayout>
      <TextField source="id" />
      <TextField source="findingId" />
      <TextField source="granteeId" />
      <TextField source="statusId" label="Status ID" />
      <TextField source="statusName" label="Status name" />
      <TextField source="findingType" />
      <TextField source="source" />
      <DateField source="correctionDeadLine" showTime />
      <DateField source="reportedDate" showTime />
      <DateField source="closedDate" showTime />
      <TextField source="hash" />
      <DateField source="sourceCreatedAt" showTime />
      <DateField source="sourceUpdatedAt" showTime />
      <DateField source="sourceDeletedAt" showTime />
      <DateField source="createdAt" showTime />
      <DateField source="updatedAt" showTime />
      <DateField source="deletedAt" showTime />
    </SimpleShowLayout>
  </Show>
);

const monitoringFindingStandardFilters = [
  <TextInput key="findingId" label="Finding UUID" source="findingId" alwaysOn />,
  <TextInput key="standardId" label="Standard ID" source="standardId" alwaysOn />,
];

export const MonitoringFindingStandardList = (props) => (
  <DiagnosticsList
    {...props}
    className="smart-hub--overflow-auto"
    component="div"
    filters={withDeletedAndSourceDeletedStatusFilters(monitoringFindingStandardFilters, [
      'findingId',
    ])}
    filterDefaultValues={paranoidFilterDefaultValues}
    sort={{ field: 'sourceUpdatedAt', order: 'DESC' }}
  >
    <ScrollDatagrid rowClick="show">
      <TextField source="id" />
      <TextField source="findingId" />
      <TextField source="standardId" />
      <DateField source="sourceUpdatedAt" showTime />
      <DateField source="sourceDeletedAt" showTime />
      <DateField source="deletedAt" showTime />
    </ScrollDatagrid>
  </DiagnosticsList>
);

export const MonitoringFindingStandardShow = (props) => (
  <Show actions={<ReadOnlyShowActions />} {...props}>
    <SimpleShowLayout>
      <TextField source="id" />
      <TextField source="findingId" />
      <TextField source="standardId" />
      <DateField source="sourceCreatedAt" showTime />
      <DateField source="sourceUpdatedAt" showTime />
      <DateField source="sourceDeletedAt" showTime />
      <DateField source="createdAt" showTime />
      <DateField source="updatedAt" showTime />
      <DateField source="deletedAt" showTime />
    </SimpleShowLayout>
  </Show>
);

const monitoringStandardFilters = [
  <TextInput key="standardId" label="Standard ID" source="standardId" alwaysOn />,
  <TextInput key="citation" label="Citation" source="citation" alwaysOn />,
  <TextInput key="citable" label="Citable" source="citable" />,
];

export const MonitoringStandardList = (props) => (
  <DiagnosticsList
    {...props}
    className="smart-hub--overflow-auto"
    component="div"
    filters={withDeletedAndSourceDeletedStatusFilters(monitoringStandardFilters, ['standardId'])}
    filterDefaultValues={paranoidFilterDefaultValues}
    sort={{ field: 'sourceUpdatedAt', order: 'DESC' }}
  >
    <ScrollDatagrid rowClick="show">
      <TextField source="id" />
      <TextField source="standardId" />
      <TextField source="citation" />
      <TextField source="citable" />
      <DateField source="sourceUpdatedAt" showTime />
      <DateField source="sourceDeletedAt" showTime />
      <DateField source="deletedAt" showTime />
    </ScrollDatagrid>
  </DiagnosticsList>
);

export const MonitoringStandardShow = (props) => (
  <Show actions={<ReadOnlyShowActions />} {...props}>
    <SimpleShowLayout>
      <TextField source="id" />
      <TextField source="standardId" />
      <TextField source="contentId" />
      <TextField source="citation" />
      <TextField source="text" />
      <TextField source="guidance" />
      <TextField source="citable" />
      <TextField source="hash" />
      <DateField source="sourceCreatedAt" showTime />
      <DateField source="sourceUpdatedAt" showTime />
      <DateField source="sourceDeletedAt" showTime />
      <DateField source="createdAt" showTime />
      <DateField source="updatedAt" showTime />
      <DateField source="deletedAt" showTime />
    </SimpleShowLayout>
  </Show>
);

const monitoringGoalFilters = [
  <TextInput key="id" label="Goal ID" source="id" />,
  <TextInput key="grantId" label="Grant ID" source="grantId" alwaysOn />,
  <TextInput key="status" label="Status" source="status" alwaysOn />,
  <TextInput key="createdVia" label="Created via" source="createdVia" />,
  <TextInput key="name" label="Name" source="name" />,
];

export const MonitoringGoalList = (props) => (
  <DiagnosticsList
    {...props}
    className="smart-hub--overflow-auto"
    component="div"
    filters={withDeletedStatusFilter(monitoringGoalFilters, ['grantId'])}
    filterDefaultValues={paranoidFilterDefaultValues}
    sort={{ field: 'updatedAt', order: 'DESC' }}
  >
    <ScrollDatagrid rowClick="show">
      <TextField source="id" />
      <TextField source="grantId" />
      <TextField source="goalTemplate.templateName" label="Template" />
      <FunctionField
        label="Status Changes"
        render={(record) => (
          <DiagnosticsLink
            href={record.id ? buildFilterHref('goalStatusChanges', { goalId: record.id }) : ''}
            label="Open"
          />
        )}
      />
      <TextField source="status" />
      <TextField source="createdVia" />
      <TextField source="source" />
      <BooleanField source="onAR" />
      <BooleanField source="onApprovedAR" />
      <DateField source="updatedAt" showTime />
      <DateField source="deletedAt" showTime />
    </ScrollDatagrid>
  </DiagnosticsList>
);

export const MonitoringGoalShow = (props) => (
  <Show actions={<ReadOnlyShowActions />} {...props}>
    <SimpleShowLayout>
      <TextField source="id" />
      <FunctionField
        label="Status changes"
        render={(record) => (
          <DiagnosticsLink
            href={record.id ? buildFilterHref('goalStatusChanges', { goalId: record.id }) : ''}
            label="Open matching status changes"
          />
        )}
      />
      <TextField source="name" />
      <TextField source="status" />
      <TextField source="timeframe" />
      <BooleanField source="isFromSmartsheetTtaPlan" />
      <TextField source="grantId" />
      <TextField source="goalTemplateId" />
      <TextField source="goalTemplate.templateName" label="Template" />
      <TextField source="goalTemplate.standard" label="Template standard" />
      <TextField source="mapsToParentGoalId" />
      <BooleanField source="onAR" />
      <BooleanField source="onApprovedAR" />
      <TextField source="isRttapa" />
      <TextField source="createdVia" />
      <TextField source="source" />
      <BooleanField source="prestandard" />
      <DateField source="createdAt" showTime />
      <DateField source="updatedAt" showTime />
      <DateField source="deletedAt" showTime />
    </SimpleShowLayout>
  </Show>
);

const goalStatusChangeFilters = [
  <TextInput key="goalId" label="Goal ID" source="goalId" alwaysOn />,
  <TextInput key="newStatus" label="New status" source="newStatus" alwaysOn />,
  <TextInput key="oldStatus" label="Old status" source="oldStatus" />,
  <TextInput key="userName" label="User" source="userName" />,
];

export const GoalStatusChangeList = (props) => (
  <DiagnosticsList
    {...props}
    className="smart-hub--overflow-auto"
    component="div"
    filters={goalStatusChangeFilters}
    sort={{ field: 'performedAt', order: 'DESC' }}
  >
    <ScrollDatagrid rowClick="show">
      <TextField source="id" />
      <FunctionField
        source="goalId"
        label="Goal ID"
        render={(record) => (
          <DiagnosticsLink
            href={record.goalId ? buildFilterHref('monitoringGoals', { id: record.goalId }) : ''}
            label={record.goalId ? String(record.goalId) : ''}
          />
        )}
      />
      <TextField source="oldStatus" />
      <TextField source="newStatus" />
      <TextField source="userName" />
      <DateField source="performedAt" showTime />
      <TextField source="reason" />
    </ScrollDatagrid>
  </DiagnosticsList>
);

export const GoalStatusChangeShow = (props) => (
  <Show actions={<ReadOnlyShowActions />} {...props}>
    <SimpleShowLayout>
      <TextField source="id" />
      <TextField source="goalId" />
      <FunctionField
        label="Monitoring goal"
        render={(record) => (
          <DiagnosticsLink
            href={record.goalId ? buildFilterHref('monitoringGoals', { id: record.goalId }) : ''}
            label="Open monitoring goal"
          />
        )}
      />
      <TextField source="userId" />
      <TextField source="userName" />
      <TextField source="userRoles" />
      <TextField source="oldStatus" />
      <TextField source="newStatus" />
      <TextField source="reason" />
      <TextField source="context" />
      <DateField source="performedAt" showTime />
      <DateField source="createdAt" showTime />
      <DateField source="updatedAt" showTime />
    </SimpleShowLayout>
  </Show>
);

const grantRelationshipFilters = [
  <TextInput key="grantId" label="Grant ID" source="grantId" alwaysOn />,
  <TextInput key="activeGrantId" label="Active grant ID" source="activeGrantId" alwaysOn />,
];

export const GrantRelationshipToActiveList = (props) => (
  <DiagnosticsList
    {...props}
    className="smart-hub--overflow-auto"
    component="div"
    filters={grantRelationshipFilters}
  >
    <ScrollDatagrid rowClick="show">
      <TextField source="id" />
      <TextField source="grantId" />
      <TextField source="activeGrantId" />
    </ScrollDatagrid>
  </DiagnosticsList>
);

export const GrantRelationshipToActiveShow = (props) => (
  <Show actions={<ReadOnlyShowActions />} {...props}>
    <SimpleShowLayout>
      <TextField source="id" />
      <TextField source="grantId" />
      <TextField source="activeGrantId" />
    </SimpleShowLayout>
  </Show>
);

export const monitoringDiagnosticResources = [
  {
    name: 'citations',
    label: 'Monitoring Citations',
    list: CitationList,
    show: CitationShow,
  },
  {
    name: 'grantCitations',
    label: 'Grant Citations',
    list: GrantCitationList,
    show: GrantCitationShow,
  },
  {
    name: 'deliveredReviews',
    label: 'Delivered Reviews',
    list: DeliveredReviewList,
    show: DeliveredReviewShow,
  },
  {
    name: 'deliveredReviewCitations',
    label: 'Delivered Review Citations',
    list: DeliveredReviewCitationList,
    show: DeliveredReviewCitationShow,
  },
  {
    name: 'grantDeliveredReviews',
    label: 'Grant Delivered Reviews',
    list: GrantDeliveredReviewList,
    show: GrantDeliveredReviewShow,
  },
  {
    name: 'monitoringReviews',
    label: 'Monitoring Reviews',
    list: MonitoringReviewList,
    show: MonitoringReviewShow,
  },
  {
    name: 'monitoringReviewGrantees',
    label: 'Monitoring Review Grantees',
    list: MonitoringReviewGranteeList,
    show: MonitoringReviewGranteeShow,
  },
  {
    name: 'monitoringFindings',
    label: 'Monitoring Findings',
    list: MonitoringFindingList,
    show: MonitoringFindingShow,
  },
  {
    name: 'monitoringFindingHistories',
    label: 'Monitoring Finding Histories',
    list: MonitoringFindingHistoryList,
    show: MonitoringFindingHistoryShow,
  },
  {
    name: 'monitoringFindingGrants',
    label: 'Monitoring Finding Grants',
    list: MonitoringFindingGrantList,
    show: MonitoringFindingGrantShow,
  },
  {
    name: 'monitoringFindingStandards',
    label: 'Monitoring Finding Standards',
    list: MonitoringFindingStandardList,
    show: MonitoringFindingStandardShow,
  },
  {
    name: 'monitoringStandards',
    label: 'Monitoring Standards',
    list: MonitoringStandardList,
    show: MonitoringStandardShow,
  },
  {
    name: 'monitoringGoals',
    label: 'Monitoring Goals',
    list: MonitoringGoalList,
    show: MonitoringGoalShow,
  },
  {
    name: 'goalStatusChanges',
    label: 'Goal Status Changes',
    list: GoalStatusChangeList,
    show: GoalStatusChangeShow,
  },
  {
    name: 'grantRelationshipToActive',
    label: 'Grant Relationship To Active',
    list: GrantRelationshipToActiveList,
    show: GrantRelationshipToActiveShow,
  },
];
