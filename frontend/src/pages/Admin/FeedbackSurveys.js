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
  surveyType: '',
  thumbs: '',
  createdAtFrom: '',
  createdAtTo: '',
};

const DEFAULT_SORT = {
  sortBy: 'submittedAt',
  sortDir: 'desc',
};

const SORTABLE_COLUMNS = {
  submittedAt: 'Submitted',
  pageId: 'Page ID',
  surveyType: 'Survey type',
  rating: 'Rating',
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
    { header: 'User', value: (row) => row.user?.name || row.user?.email || `User #${row.userId}` },
    { header: 'Page ID', value: (row) => row.pageId || '' },
    { header: 'Survey type', value: (row) => row.surveyType || '' },
    { header: 'Rating', value: (row) => (row.surveyType === 'scale' ? row.rating : '--') },
    { header: 'Thumbs', value: (row) => (row.surveyType === 'thumbs' ? (row.thumbs || '--') : '--') },
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
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [sort, setSort] = useState(DEFAULT_SORT);
  const scaleChartRef = useRef(null);
  const thumbsChartRef = useRef(null);

  useEffect(() => {
    async function fetchRows() {
      setLoading(true);
      setError('');

      try {
        const response = await getFeedbackSurveys({
          ...filters,
          ...sort,
          limit: 500,
        });
        setRows(response);
      } catch (e) {
        setError('There was an error fetching feedback survey responses.');
      } finally {
        setLoading(false);
      }
    }

    fetchRows();
  }, [filters, sort]);

  const onFilterChange = (event) => {
    const { name, value } = event.target;
    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const onSortColumn = (sortBy) => {
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
    const csv = buildCsv(rows);
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
  };

  const scaleChartData = useMemo(() => {
    const counts = new Map();

    rows
      .filter((row) => row.surveyType === 'scale')
      .forEach((row) => {
        const rating = Number(row.rating);

        if (!Number.isFinite(rating)) {
          return;
        }

        counts.set(rating, (counts.get(rating) || 0) + 1);
      });

    const sortedRatings = [...counts.keys()].sort((a, b) => a - b);

    return {
      labels: sortedRatings.map((rating) => `Rating ${rating}`),
      values: sortedRatings.map((rating) => counts.get(rating)),
    };
  }, [rows]);

  const thumbsChartData = useMemo(() => {
    const byMonth = new Map();

    rows
      .filter((row) => row.surveyType === 'thumbs')
      .forEach((row) => {
        if (row.thumbs !== 'up' && row.thumbs !== 'down') {
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
            up: 0,
            down: 0,
          });
        }

        const current = byMonth.get(monthKey);
        current[row.thumbs] += 1;
      });

    const sortedMonths = [...byMonth.keys()].sort();

    return {
      x: sortedMonths.map((month) => byMonth.get(month).label),
      up: sortedMonths.map((month) => byMonth.get(month).up),
      down: sortedMonths.map((month) => byMonth.get(month).down),
    };
  }, [rows]);

  const thumbsYAxisTickStep = useMemo(() => {
    const maxCount = Math.max(0, ...thumbsChartData.up, ...thumbsChartData.down);

    if (maxCount <= 10) {
      return 1;
    }

    // Keep roughly 6-8 Y-axis labels to avoid overlap on dense datasets.
    return Math.ceil(maxCount / 7);
  }, [thumbsChartData]);

  const appliedFilters = useMemo(() => ([
    { label: 'Search', value: formatFilterValue(filters.q) },
    { label: 'Page ID', value: formatFilterValue(filters.pageId) },
    { label: 'Survey type', value: formatFilterValue(filters.surveyType) },
    { label: 'Thumbs', value: formatFilterValue(filters.thumbs) },
    { label: 'Created at (from)', value: formatFilterValue(filters.createdAtFrom) },
    { label: 'Created at (to)', value: formatFilterValue(filters.createdAtTo) },
    { label: 'Sort by', value: formatFilterValue(sort.sortBy) },
    { label: 'Sort direction', value: formatFilterValue(sort.sortDir) },
    { label: 'Result count', value: `${rows.length}` },
  ]), [filters, rows.length, sort.sortBy, sort.sortDir]);

  const pageIdOptions = useMemo(() => {
    const uniquePageIds = new Set(rows
      .map((row) => row.pageId)
      .filter((pageId) => !!pageId));

    if (filters.pageId) {
      uniquePageIds.add(filters.pageId);
    }

    return [...uniquePageIds].sort((a, b) => a.localeCompare(b));
  }, [filters.pageId, rows]);

  return (
    <>
      <Helmet>
        <title>Feedback Survey Responses</title>
      </Helmet>
      <Container className="feedback-surveys-page">
        <h1>Feedback Survey Responses</h1>
        <p className="usa-hint no-print">View and filter feedback submitted from in-app surveys.</p>

        <section className="print-only margin-bottom-4" aria-label="Applied filters for exported feedback survey report">
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
            <p className="usa-hint margin-top-1 margin-bottom-0">Searches comment, page ID, and user name/email.</p>
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
            <Label htmlFor="feedback-survey-type">Survey type</Label>
            <Select
              id="feedback-survey-type"
              name="surveyType"
              value={filters.surveyType}
              onChange={onFilterChange}
            >
              <option value="">All</option>
              <option value="scale">Scale</option>
              <option value="thumbs">Thumbs</option>
            </Select>
          </Grid>
          <Grid desktop={{ col: 3 }} tablet={{ col: 6 }} col={12}>
            <Label htmlFor="feedback-thumbs">Thumbs</Label>
            <Select
              id="feedback-thumbs"
              name="thumbs"
              value={filters.thumbs}
              onChange={onFilterChange}
            >
              <option value="">All</option>
              <option value="up">Up</option>
              <option value="down">Down</option>
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

        {rows.length > 0 && (
          <section
            className="margin-bottom-4"
            aria-label="Feedback survey charts"
            style={{ breakBefore: 'page', pageBreakBefore: 'always' }}
          >
            <h2 className="margin-top-0">Feedback trends</h2>
            <Grid row gap>
              <Grid desktop={{ col: 6 }} tablet={{ col: 12 }} col={12}>
                <h3 className="margin-top-0">Feedback by scale</h3>
                {scaleChartData.values.length === 0 && (
                  <p>No scale feedback responses for the selected filters.</p>
                )}
                {scaleChartData.values.length > 0 && !Plot && (
                  <p>Loading chart...</p>
                )}
                {scaleChartData.values.length > 0 && Plot && (
                  <>
                    <MediaCaptureButton
                      reference={scaleChartRef}
                      buttonText="Save screenshot"
                      id="feedback-surveys-save-screenshot-scale"
                      className="margin-bottom-1"
                      title="feedback-by-scale"
                    />
                    <div ref={scaleChartRef}>
                      <Plot
                        className="feedback-chart feedback-scale-chart"
                        useResizeHandler
                        style={{ width: '100%', height: '320px' }}
                        data={[
                          {
                            type: 'pie',
                            labels: scaleChartData.labels,
                            values: scaleChartData.values,
                            textinfo: 'label+percent',
                            marker: {
                              colors: [
                                colors.ttahubBlue,
                                colors.ttahubMediumBlue,
                                colors.ttahubMediumDeepTeal,
                                colors.ttahubOrange,
                                colors.ttahubMagenta,
                                colors.info,
                                colors.success,
                                colors.warning,
                                colors.baseMedium,
                                colors.baseLight,
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
                <h3 className="margin-top-0">Thumbs up and down by month</h3>
                {thumbsChartData.x.length === 0 && (
                  <p>No thumbs feedback responses for the selected filters.</p>
                )}
                {thumbsChartData.x.length > 0 && !Plot && (
                  <p>Loading chart...</p>
                )}
                {thumbsChartData.x.length > 0 && Plot && (
                  <>
                    <MediaCaptureButton
                      reference={thumbsChartRef}
                      buttonText="Save screenshot"
                      id="feedback-surveys-save-screenshot-thumbs"
                      className="margin-bottom-1"
                      title="feedback-thumbs-by-month"
                    />
                    <div ref={thumbsChartRef}>
                      <Plot
                        className="feedback-chart feedback-thumbs-chart"
                        useResizeHandler
                        style={{ width: '100%', height: '320px' }}
                        data={[
                          {
                            type: 'scatter',
                            mode: 'lines+markers',
                            name: 'Thumbs up',
                            x: thumbsChartData.x,
                            y: thumbsChartData.up,
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
                            name: 'Thumbs down',
                            x: thumbsChartData.x,
                            y: thumbsChartData.down,
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
                            dtick: thumbsYAxisTickStep,
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

        {!loading && rows.length === 0 && (
          <p>No feedback survey responses matched your filters.</p>
        )}

        {rows.length > 0 && (
          <section
            aria-label="Raw feedback survey rows"
            style={{ breakBefore: 'page', pageBreakBefore: 'always' }}
          >
            <h2 className="margin-top-0">Raw feedback rows</h2>
            <Table fullWidth striped stackedStyle="default" className="usa-table--borderless">
              <thead>
                <tr>
                  <th
                    scope="col"
                    aria-sort={getAriaSort(sort, 'submittedAt')}
                  >
                    <button type="button" className="ttahub-button--unstyled text-bold feedback-sort-label" onClick={() => onSortColumn('submittedAt')}>
                      <span>{SORTABLE_COLUMNS.submittedAt}</span>
                      <span className="feedback-sort-icons" aria-hidden="true">
                        <span>{getSortIcons(sort, 'submittedAt').up}</span>
                        <span>{getSortIcons(sort, 'submittedAt').down}</span>
                      </span>
                    </button>
                  </th>
                  <th scope="col">User</th>
                  <th
                    scope="col"
                    aria-sort={getAriaSort(sort, 'pageId')}
                  >
                    <button type="button" className="ttahub-button--unstyled text-bold feedback-sort-label" onClick={() => onSortColumn('pageId')}>
                      <span>{SORTABLE_COLUMNS.pageId}</span>
                      <span className="feedback-sort-icons" aria-hidden="true">
                        <span>{getSortIcons(sort, 'pageId').up}</span>
                        <span>{getSortIcons(sort, 'pageId').down}</span>
                      </span>
                    </button>
                  </th>
                  <th
                    scope="col"
                    aria-sort={getAriaSort(sort, 'surveyType')}
                  >
                    <button type="button" className="ttahub-button--unstyled text-bold feedback-sort-label" onClick={() => onSortColumn('surveyType')}>
                      <span>{SORTABLE_COLUMNS.surveyType}</span>
                      <span className="feedback-sort-icons" aria-hidden="true">
                        <span>{getSortIcons(sort, 'surveyType').up}</span>
                        <span>{getSortIcons(sort, 'surveyType').down}</span>
                      </span>
                    </button>
                  </th>
                  <th
                    scope="col"
                    aria-sort={getAriaSort(sort, 'rating')}
                  >
                    <button type="button" className="ttahub-button--unstyled text-bold feedback-sort-label" onClick={() => onSortColumn('rating')}>
                      <span>{SORTABLE_COLUMNS.rating}</span>
                      <span className="feedback-sort-icons" aria-hidden="true">
                        <span>{getSortIcons(sort, 'rating').up}</span>
                        <span>{getSortIcons(sort, 'rating').down}</span>
                      </span>
                    </button>
                  </th>
                  <th scope="col">Thumbs</th>
                  <th scope="col">Comment</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td data-label="Submitted">{formatDateOnly(row.submittedAt)}</td>
                    <td data-label="User">{row.user?.name || row.user?.email || `User #${row.userId}`}</td>
                    <td data-label="Page ID">{row.pageId}</td>
                    <td data-label="Survey type">{row.surveyType}</td>
                    <td data-label="Rating">{row.surveyType === 'scale' ? row.rating : '--'}</td>
                    <td data-label="Thumbs">{row.surveyType === 'thumbs' ? (row.thumbs || '--') : '--'}</td>
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
