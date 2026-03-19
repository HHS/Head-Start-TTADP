import React, { useEffect, useMemo, useState } from 'react';
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
import { getFeedbackSurveys } from '../../fetchers/Admin';

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

export default function FeedbackSurveys() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rows, setRows] = useState([]);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [sort, setSort] = useState(DEFAULT_SORT);

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

  const onSortChange = (event) => {
    const { name, value } = event.target;
    setSort((prev) => ({
      ...prev,
      [name]: value,
    }));
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

  return (
    <>
      <Helmet>
        <title>Feedback Survey Responses</title>
      </Helmet>
      <Container>
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
          </Grid>
          <Grid desktop={{ col: 3 }} tablet={{ col: 6 }} col={12}>
            <Label htmlFor="feedback-page-id">Page ID</Label>
            <TextInput
              id="feedback-page-id"
              name="pageId"
              value={filters.pageId}
              onChange={onFilterChange}
            />
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
          <Grid desktop={{ col: 3 }} tablet={{ col: 6 }} col={12}>
            <Label htmlFor="feedback-sort-by">Sort by</Label>
            <Select
              id="feedback-sort-by"
              name="sortBy"
              value={sort.sortBy}
              onChange={onSortChange}
            >
              <option value="submittedAt">Submitted</option>
              <option value="createdAt">Created at</option>
              <option value="rating">Rating</option>
              <option value="pageId">Page ID</option>
              <option value="surveyType">Survey type</option>
            </Select>
            <div className="display-flex flex-align-center margin-top-2">
              <button
                type="button"
                className="usa-button usa-button--outline margin-bottom-0 margin-right-2"
                onClick={clearFilters}
              >
                Reset filters
              </button>
              <PrintToPDF
                id="feedback-surveys-export"
                className="usa-button--outline margin-bottom-0"
              />
            </div>
          </Grid>
          <Grid desktop={{ col: 3 }} tablet={{ col: 6 }} col={12}>
            <Label htmlFor="feedback-sort-dir">Sort direction</Label>
            <Select
              id="feedback-sort-dir"
              name="sortDir"
              value={sort.sortDir}
              onChange={onSortChange}
            >
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </Select>
          </Grid>
        </Grid>

        {!loading && (
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
                  <Plot
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
                    }}
                  />
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
                  <Plot
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
                    }}
                  />
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

        {!loading && rows.length > 0 && (
          <section
            aria-label="Raw feedback survey rows"
            style={{ breakBefore: 'page', pageBreakBefore: 'always' }}
          >
            <h2 className="margin-top-0">Raw feedback rows</h2>
            <Table fullWidth striped stackedStyle="default">
              <thead>
                <tr>
                  <th scope="col">Submitted</th>
                  <th scope="col">Created at</th>
                  <th scope="col">User</th>
                  <th scope="col">Page ID</th>
                  <th scope="col">Survey type</th>
                  <th scope="col">Rating</th>
                  <th scope="col">Thumbs</th>
                  <th scope="col">Comment</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td data-label="Submitted">{formatDateOnly(row.submittedAt)}</td>
                    <td data-label="Created at">{formatDateOnly(row.createdAt)}</td>
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
