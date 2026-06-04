import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import createPlotlyComponent from 'react-plotly.js/factory';
import {
  Alert,
  Grid,
  Label,
  Select,
  Table,
  TextInput,
} from '@trussworks/react-uswds';
import { Helmet } from 'react-helmet';
import Container from '../../components/Container';
import colors from '../../colors';
import PrintToPDF from '../../components/PrintToPDF';
import MediaCaptureButton from '../../components/MediaCaptureButton';
import PaginationCard from '../../components/PaginationCard';
import { getFeedbackSurveys } from '../../fetchers/Admin';
import './FeedbackSurveys.scss';

let Plot = null;

import('plotly.js-basic-dist')
  .then((Plotly) => {
    Plot = createPlotlyComponent(Plotly);
  });

const DEFAULT_FILTERS = {
  q: '',
  pageId: '',
  response: '',
  regionId: '',
  userRole: '',
  createdAtFrom: '',
  createdAtTo: '',
};

const DEFAULT_SORT = {
  sortBy: 'submittedAt',
  sortDir: 'desc',
};

const SORTABLE_COLUMNS = {
  submittedAt: 'Submitted',
  regionId: 'Region ID',
  pageId: 'Page ID',
  response: 'Was this page helpful?',
};

const SORT_ICONS = {
  upFilled: '\u25B2',
  upOutline: '\u25B3',
  downFilled: '\u25BC',
  downOutline: '\u25BD',
};

const MONTH_FORMATTER = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  year: 'numeric',
});

const DEFAULT_PAGE_SIZE = 100;
const CHART_DATA_LIMIT = 1000;

function getMonthKey(date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  return `${year}-${month}`;
}

function formatDateOnly(date) {
  if (!date) {
    return '--';
  }

  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) {
    return '--';
  }

  return parsed.toLocaleDateString();
}

function formatFilterValue(value) {
  return value || 'All';
}

function formatRegionValue(regionId) {
  if (regionId === null || regionId === undefined || regionId === '') {
    return '--';
  }

  return `Region ${regionId}`;
}

function formatUserRolesValue(userRoles) {
  if (!Array.isArray(userRoles) || userRoles.length === 0) {
    return '--';
  }

  return userRoles.join(', ');
}

function formatResponseValue(response) {
  if (response === 'yes') {
    return 'Yes';
  }

  if (response === 'no') {
    return 'No';
  }

  return '--';
}

function formatResponseFilterValue(value) {
  if (value === 'yes') {
    return 'Yes';
  }

  if (value === 'no') {
    return 'No';
  }

  return formatFilterValue(value);
}

function formatRegionFilterValue(value) {
  if (!value) {
    return 'All';
  }

  return `Region ${value}`;
}

function getAriaSort(sort, column) {
  if (sort.sortBy !== column) {
    return 'none';
  }

  return sort.sortDir === 'asc' ? 'ascending' : 'descending';
}

function getSortIcons(sort, column) {
  const isSorted = sort.sortBy === column;

  if (!isSorted) {
    return {
      up: SORT_ICONS.upOutline,
      down: SORT_ICONS.downOutline,
    };
  }

  if (sort.sortDir === 'asc') {
    return {
      up: SORT_ICONS.upFilled,
      down: SORT_ICONS.downOutline,
    };
  }

  return {
    up: SORT_ICONS.upOutline,
    down: SORT_ICONS.downFilled,
  };
}

function getCsvColumns() {
  return [
    { header: 'Submitted', value: (row) => formatDateOnly(row.submittedAt) },
    { header: 'Region', value: (row) => formatRegionValue(row.regionId) },
    { header: 'User roles', value: (row) => formatUserRolesValue(row.userRoles) },
    { header: 'Page ID', value: (row) => row.pageId || '' },
    { header: 'Was this page helpful?', value: (row) => formatResponseValue(row.response) },
    { header: 'Comment', value: (row) => row.comment || '--' },
  ];
}

function escapeCsvValue(value) {
  const normalized = value === null || value === undefined ? '' : `${value}`;
  const escaped = normalized.replace(/"/g, '""');
  return `"${escaped}"`;
}

function buildCsv(rows) {
  const csvColumns = getCsvColumns();
  const header = csvColumns.map((column) => escapeCsvValue(column.header)).join(',');
  const lines = rows.map((row) => csvColumns
    .map((column) => escapeCsvValue(column.value(row)))
    .join(','));
  return [header, ...lines].join('\n');
}

export default function FeedbackSurveys() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rows, setRows] = useState([]);
  const [allRows, setAllRows] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [sort, setSort] = useState(DEFAULT_SORT);
  const responseChartRef = useRef(null);
  const responseByMonthChartRef = useRef(null);
  const offset = useMemo(() => (currentPage - 1) * DEFAULT_PAGE_SIZE, [currentPage]);

  useEffect(() => {
    async function fetchRows() {
      setLoading(true);
      setError('');

      try {
        const [tableResponse, summaryResponse] = await Promise.all([
          getFeedbackSurveys({
            ...filters,
            ...sort,
            limit: DEFAULT_PAGE_SIZE,
            offset,
          }),
          getFeedbackSurveys({
            ...filters,
            ...DEFAULT_SORT,
            limit: CHART_DATA_LIMIT,
            offset: 0,
          }),
        ]);

        setRows(tableResponse.rows);
        setTotalCount(tableResponse.total);
        setAllRows(summaryResponse.rows);
      } catch (e) {
        setError('There was an error fetching feedback survey responses.');
      } finally {
        setLoading(false);
      }
    }

    fetchRows();
  }, [filters, offset, sort]);

  const onFilterChange = (event) => {
    const { name, value } = event.target;
    setCurrentPage(1);
    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const onSortColumn = (sortBy) => {
    setCurrentPage(1);
    setSort((prev) => {
      if (prev.sortBy === sortBy) {
        return {
          sortBy,
          sortDir: prev.sortDir === 'asc' ? 'desc' : 'asc',
        };
      }

      return {
        sortBy,
        sortDir: 'asc',
      };
    });
  };

  const exportTable = () => {
    const csv = buildCsv(allRows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const downloadLink = document.createElement('a');
    const datePart = new Date().toISOString().slice(0, 10);

    downloadLink.href = url;
    downloadLink.setAttribute('download', `feedback-surveys-${datePart}.csv`);
    document.body.appendChild(downloadLink);
    downloadLink.click();
    downloadLink.remove();
    window.URL.revokeObjectURL(url);
  };

  const clearFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setSort(DEFAULT_SORT);
    setCurrentPage(1);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const responseChartData = useMemo(() => {
    const totals = {
      yes: 0,
      no: 0,
    };

    allRows.forEach((row) => {
      if (row.response === 'yes') {
        totals.yes += 1;
      }

      if (row.response === 'no') {
        totals.no += 1;
      }
    });

    const labels = [];
    const values = [];

    if (totals.yes > 0) {
      labels.push('Yes');
      values.push(totals.yes);
    }

    if (totals.no > 0) {
      labels.push('No');
      values.push(totals.no);
    }

    return { labels, values };
  }, [allRows]);

  const responseByMonthData = useMemo(() => {
    const byMonth = new Map();

    allRows
      .forEach((row) => {
        if (row.response !== 'yes' && row.response !== 'no') {
          return;
        }

        const date = new Date(row.submittedAt || row.createdAt);
        if (Number.isNaN(date.getTime())) {
          return;
        }

        const monthKey = getMonthKey(date);
        if (!byMonth.has(monthKey)) {
          byMonth.set(monthKey, {
            label: MONTH_FORMATTER.format(date),
            yes: 0,
            no: 0,
          });
        }

        const current = byMonth.get(monthKey);

        if (row.response === 'yes') {
          current.yes += 1;
        }

        if (row.response === 'no') {
          current.no += 1;
        }
      });

    const sortedMonths = [...byMonth.keys()].sort();

    return {
      x: sortedMonths.map((month) => byMonth.get(month).label),
      yes: sortedMonths.map((month) => byMonth.get(month).yes),
      no: sortedMonths.map((month) => byMonth.get(month).no),
    };
  }, [allRows]);

  const responseByMonthYAxisTickStep = useMemo(() => {
    const maxCount = Math.max(0, ...responseByMonthData.yes, ...responseByMonthData.no);

    if (maxCount <= 10) {
      return 1;
    }

    // Keep roughly 6-8 Y-axis labels to avoid overlap on dense datasets.
    return Math.ceil(maxCount / 7);
  }, [responseByMonthData]);

  const appliedFilters = useMemo(() => ([
    { label: 'Search', value: formatFilterValue(filters.q) },
    { label: 'Page ID', value: formatFilterValue(filters.pageId) },
    { label: 'Was this page helpful?', value: formatResponseFilterValue(filters.response) },
    { label: 'Region ID', value: formatRegionFilterValue(filters.regionId) },
    { label: 'User role', value: formatFilterValue(filters.userRole) },
    { label: 'Created at (from)', value: formatFilterValue(filters.createdAtFrom) },
    { label: 'Created at (to)', value: formatFilterValue(filters.createdAtTo) },
    { label: 'Sort by', value: formatFilterValue(sort.sortBy) },
    { label: 'Sort direction', value: formatFilterValue(sort.sortDir) },
    { label: 'Result count', value: `${totalCount}` },
  ]), [filters, sort.sortBy, sort.sortDir, totalCount]);

  const pageIdOptions = useMemo(() => {
    const uniquePageIds = new Set(allRows
      .map((row) => row.pageId)
      .filter((pageId) => !!pageId));

    if (filters.pageId) {
      uniquePageIds.add(filters.pageId);
    }

    return [...uniquePageIds].sort((a, b) => a.localeCompare(b));
  }, [allRows, filters.pageId]);

  const regionIdOptions = useMemo(() => {
    const uniqueRegionIds = new Set(allRows
      .map((row) => row.regionId)
      .filter((regionId) => regionId !== null && regionId !== undefined)
      .map((regionId) => `${regionId}`));

    if (filters.regionId) {
      uniqueRegionIds.add(filters.regionId);
    }

    return [...uniqueRegionIds].sort((a, b) => Number(a) - Number(b));
  }, [allRows, filters.regionId]);

  const userRoleOptions = useMemo(() => {
    const uniqueUserRoles = new Set(allRows
      .flatMap((row) => (Array.isArray(row.userRoles) ? row.userRoles : []))
      .filter((role) => !!role));

    if (filters.userRole) {
      uniqueUserRoles.add(filters.userRole);
    }

    return [...uniqueUserRoles].sort((a, b) => a.localeCompare(b));
  }, [allRows, filters.userRole]);

  return (
    <>
      <Helmet>
        <title>Feedback Survey Responses</title>
      </Helmet>
      <Container className="feedback-surveys-page">
        <h1>Feedback Survey Responses</h1>
        <p className="usa-hint no-print">View and filter feedback submitted from in-app surveys.</p>

        <section className="print-only margin-bottom-4 feedback-print-summary" aria-label="Applied filters for exported feedback survey report">
          <h2 className="margin-top-0">Applied filters</h2>
          <p className="margin-top-0">
            Generated on
            {' '}
            {new Date().toLocaleString()}
          </p>
          <Table fullWidth bordered>
            <thead>
              <tr>
                <th scope="col">Filter</th>
                <th scope="col">Value</th>
              </tr>
            </thead>
            <tbody>
              {appliedFilters.map((filterRow) => (
                <tr key={filterRow.label}>
                  <td>{filterRow.label}</td>
                  <td>{filterRow.value}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </section>

        <Grid row gap className="margin-bottom-3 no-print">
          <Grid desktop={{ col: 3 }} tablet={{ col: 6 }} col={12}>
            <Label htmlFor="feedback-search">Search</Label>
            <TextInput
              id="feedback-search"
              name="q"
              value={filters.q}
              onChange={onFilterChange}
            />
            <p className="usa-hint margin-top-1 margin-bottom-0">Searches comment and page ID.</p>
          </Grid>
          <Grid desktop={{ col: 3 }} tablet={{ col: 6 }} col={12}>
            <Label htmlFor="feedback-page-id">Page ID</Label>
            <Select
              id="feedback-page-id"
              name="pageId"
              value={filters.pageId}
              onChange={onFilterChange}
            >
              <option value="">All</option>
              {pageIdOptions.map((pageId) => (
                <option key={pageId} value={pageId}>{pageId}</option>
              ))}
            </Select>
          </Grid>
        </Grid>

        <Grid row gap className="margin-bottom-3 no-print">
          <Grid desktop={{ col: 3 }} tablet={{ col: 6 }} col={12}>
            <Label htmlFor="feedback-response">Was this page helpful?</Label>
            <Select
              id="feedback-response"
              name="response"
              value={filters.response}
              onChange={onFilterChange}
            >
              <option value="">All</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </Select>
          </Grid>
          <Grid desktop={{ col: 3 }} tablet={{ col: 6 }} col={12}>
            <Label htmlFor="feedback-region-id">Region ID</Label>
            <Select
              id="feedback-region-id"
              name="regionId"
              value={filters.regionId}
              onChange={onFilterChange}
            >
              <option value="">All</option>
              {regionIdOptions.map((regionId) => (
                <option key={regionId} value={regionId}>{`Region ${regionId}`}</option>
              ))}
            </Select>
          </Grid>
          <Grid desktop={{ col: 3 }} tablet={{ col: 6 }} col={12}>
            <Label htmlFor="feedback-user-role">User role</Label>
            <Select
              id="feedback-user-role"
              name="userRole"
              value={filters.userRole}
              onChange={onFilterChange}
            >
              <option value="">All</option>
              {userRoleOptions.map((userRole) => (
                <option key={userRole} value={userRole}>{userRole}</option>
              ))}
            </Select>
          </Grid>
        </Grid>

        <Grid row gap className="margin-bottom-3 no-print">
          <Grid desktop={{ col: 3 }} tablet={{ col: 6 }} col={12}>
            <Label htmlFor="feedback-created-at-from">Created at (from)</Label>
            <TextInput
              id="feedback-created-at-from"
              name="createdAtFrom"
              type="date"
              value={filters.createdAtFrom}
              onChange={onFilterChange}
            />
          </Grid>
          <Grid desktop={{ col: 3 }} tablet={{ col: 6 }} col={12}>
            <Label htmlFor="feedback-created-at-to">Created at (to)</Label>
            <TextInput
              id="feedback-created-at-to"
              name="createdAtTo"
              type="date"
              value={filters.createdAtTo}
              onChange={onFilterChange}
            />
          </Grid>
        </Grid>

        <Grid row gap className="margin-bottom-3 no-print">
          <Grid desktop={{ col: 12 }} tablet={{ col: 12 }} col={12}>
            <Label>Actions</Label>
            <div className="display-flex flex-align-center margin-top-2">
              <button
                type="button"
                className="usa-button usa-button--outline margin-bottom-0 margin-right-2"
                onClick={clearFilters}
              >
                Reset filters
              </button>
              <button
                type="button"
                className="usa-button usa-button--outline margin-bottom-0 margin-right-2"
                onClick={exportTable}
              >
                Export table
              </button>
              <PrintToPDF
                id="feedback-surveys-export"
                className="usa-button--outline margin-bottom-0"
              />
            </div>
          </Grid>
        </Grid>

        {allRows.length > 0 && (
          <section
            className="margin-bottom-4"
            aria-label="Feedback survey charts"
            style={{ breakBefore: 'page', pageBreakBefore: 'always' }}
          >
            <h2 className="margin-top-0">Feedback trends</h2>
            <Grid row gap>
              <Grid desktop={{ col: 6 }} tablet={{ col: 12 }} col={12}>
                <h3 className="margin-top-0">Yes and No responses</h3>
                {responseChartData.values.length === 0 && (
                  <p>No yes/no feedback responses for the selected filters.</p>
                )}
                {responseChartData.values.length > 0 && !Plot && (
                  <p>Loading chart...</p>
                )}
                {responseChartData.values.length > 0 && Plot && (
                  <>
                    <MediaCaptureButton
                      reference={responseChartRef}
                      buttonText="Save screenshot"
                      id="feedback-surveys-save-screenshot-response-summary"
                      className="margin-bottom-1 no-print"
                      title="feedback-response-summary"
                    />
                    <div ref={responseChartRef}>
                      <Plot
                        className="feedback-chart feedback-scale-chart"
                        useResizeHandler
                        style={{ width: '100%', height: '320px' }}
                        data={[
                          {
                            type: 'pie',
                            labels: responseChartData.labels,
                            values: responseChartData.values,
                            textinfo: 'label+percent',
                            marker: {
                              colors: [
                                colors.info,
                                colors.error,
                              ],
                            },
                            hovertemplate: '%{label}: %{value}<extra></extra>',
                          },
                        ]}
                        layout={{
                          paper_bgcolor: '#ffffff',
                          plot_bgcolor: '#ffffff',
                          margin: {
                            l: 20,
                            r: 20,
                            t: 20,
                            b: 20,
                          },
                          showlegend: true,
                          legend: {
                            orientation: 'h',
                            y: -0.2,
                          },
                        }}
                        config={{
                          responsive: true,
                          displayModeBar: false,
                          displaylogo: false,
                        }}
                      />
                    </div>
                  </>
                )}
              </Grid>
              <Grid desktop={{ col: 6 }} tablet={{ col: 12 }} col={12}>
                <h3 className="margin-top-0">Yes and No responses by month</h3>
                {responseByMonthData.x.length === 0 && (
                  <p>No yes/no feedback responses for the selected filters.</p>
                )}
                {responseByMonthData.x.length > 0 && !Plot && (
                  <p>Loading chart...</p>
                )}
                {responseByMonthData.x.length > 0 && Plot && (
                  <>
                    <MediaCaptureButton
                      reference={responseByMonthChartRef}
                      buttonText="Save screenshot"
                      id="feedback-surveys-save-screenshot-response-by-month"
                      className="margin-bottom-1 no-print"
                      title="feedback-response-by-month"
                    />
                    <div ref={responseByMonthChartRef}>
                      <Plot
                        className="feedback-chart feedback-thumbs-chart"
                        useResizeHandler
                        style={{ width: '100%', height: '320px' }}
                        data={[
                          {
                            type: 'scatter',
                            mode: 'lines+markers',
                            name: 'Yes',
                            x: responseByMonthData.x,
                            y: responseByMonthData.yes,
                            line: {
                              color: colors.success,
                              width: 3,
                            },
                            marker: {
                              size: 10,
                            },
                          },
                          {
                            type: 'scatter',
                            mode: 'lines+markers',
                            name: 'No',
                            x: responseByMonthData.x,
                            y: responseByMonthData.no,
                            line: {
                              color: colors.error,
                              width: 3,
                            },
                            marker: {
                              size: 10,
                            },
                          },
                        ]}
                        layout={{
                          paper_bgcolor: '#ffffff',
                          plot_bgcolor: '#ffffff',
                          margin: {
                            l: 40,
                            r: 20,
                            t: 20,
                            b: 60,
                          },
                          xaxis: {
                            title: {
                              text: 'Month',
                            },
                          },
                          yaxis: {
                            title: {
                              text: 'Count',
                            },
                            rangemode: 'tozero',
                            dtick: responseByMonthYAxisTickStep,
                            automargin: true,
                          },
                          legend: {
                            orientation: 'h',
                            y: -0.2,
                          },
                        }}
                        config={{
                          responsive: true,
                          displayModeBar: false,
                          displaylogo: false,
                          modeBarButtonsToRemove: [
                            'zoom2d',
                            'pan2d',
                            'select2d',
                            'lasso2d',
                            'zoomIn2d',
                            'zoomOut2d',
                            'autoScale2d',
                            'resetScale2d',
                            'hoverClosestCartesian',
                            'hoverCompareCartesian',
                            'toggleSpikelines',
                          ],
                        }}
                      />
                    </div>
                  </>
                )}
              </Grid>
            </Grid>
          </section>
        )}

        {error && (
          <Alert type="error" role="alert">
            {error}
          </Alert>
        )}

        {loading && <p>Loading feedback survey responses...</p>}

        {!loading && totalCount === 0 && (
          <p>No feedback survey responses matched your filters.</p>
        )}

        {totalCount > 0 && (
          <section
            aria-label="Raw feedback survey rows"
            style={{ breakBefore: 'page', pageBreakBefore: 'always' }}
          >
            <h2 className="margin-top-0">Raw feedback rows</h2>
            <div className="margin-bottom-2 no-print">
              <PaginationCard
                currentPage={currentPage}
                totalCount={totalCount}
                offset={offset}
                perPage={DEFAULT_PAGE_SIZE}
                handlePageChange={handlePageChange}
                accessibleLandmarkName="Feedback survey table pagination"
              />
            </div>
            <Table fullWidth striped stackedStyle="default" className="usa-table--borderless">
              <thead>
                <tr>
                  <th
                    scope="col"
                    aria-sort={getAriaSort(sort, 'submittedAt')}
                  >
                    <button type="button" className="usa-button usa-button--unstyled margin-0 text-bold feedback-sort-label no-print" onClick={() => onSortColumn('submittedAt')}>
                      <span>{SORTABLE_COLUMNS.submittedAt}</span>
                      <span className="feedback-sort-icons" aria-hidden="true">
                        <span>{getSortIcons(sort, 'submittedAt').up}</span>
                        <span>{getSortIcons(sort, 'submittedAt').down}</span>
                      </span>
                    </button>
                    <span className="print-only text-bold">{SORTABLE_COLUMNS.submittedAt}</span>
                  </th>
                  <th
                    scope="col"
                    aria-sort={getAriaSort(sort, 'regionId')}
                  >
                    <button type="button" className="usa-button usa-button--unstyled margin-0 text-bold feedback-sort-label no-print" onClick={() => onSortColumn('regionId')}>
                      <span>{SORTABLE_COLUMNS.regionId}</span>
                      <span className="feedback-sort-icons" aria-hidden="true">
                        <span>{getSortIcons(sort, 'regionId').up}</span>
                        <span>{getSortIcons(sort, 'regionId').down}</span>
                      </span>
                    </button>
                    <span className="print-only text-bold">{SORTABLE_COLUMNS.regionId}</span>
                  </th>
                  <th scope="col">User roles</th>
                  <th
                    scope="col"
                    aria-sort={getAriaSort(sort, 'pageId')}
                  >
                    <button type="button" className="usa-button usa-button--unstyled margin-0 text-bold feedback-sort-label no-print" onClick={() => onSortColumn('pageId')}>
                      <span>{SORTABLE_COLUMNS.pageId}</span>
                      <span className="feedback-sort-icons" aria-hidden="true">
                        <span>{getSortIcons(sort, 'pageId').up}</span>
                        <span>{getSortIcons(sort, 'pageId').down}</span>
                      </span>
                    </button>
                    <span className="print-only text-bold">{SORTABLE_COLUMNS.pageId}</span>
                  </th>
                  <th
                    scope="col"
                    aria-sort={getAriaSort(sort, 'response')}
                  >
                    <button type="button" className="usa-button usa-button--unstyled margin-0 text-bold feedback-sort-label no-print" onClick={() => onSortColumn('response')}>
                      <span>{SORTABLE_COLUMNS.response}</span>
                      <span className="feedback-sort-icons" aria-hidden="true">
                        <span>{getSortIcons(sort, 'response').up}</span>
                        <span>{getSortIcons(sort, 'response').down}</span>
                      </span>
                    </button>
                    <span className="print-only text-bold">{SORTABLE_COLUMNS.response}</span>
                  </th>
                  <th scope="col">Comment</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td data-label="Submitted">{formatDateOnly(row.submittedAt)}</td>
                    <td data-label="Region">{formatRegionValue(row.regionId)}</td>
                    <td data-label="User roles">{formatUserRolesValue(row.userRoles)}</td>
                    <td data-label="Page ID">{row.pageId}</td>
                    <td data-label="Was this page helpful?">{formatResponseValue(row.response)}</td>
                    <td data-label="Comment">{row.comment || '--'}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </section>
        )}
      </Container>
    </>
  );
}
