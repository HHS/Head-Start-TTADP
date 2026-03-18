import React, { useEffect, useState } from 'react';
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
import { getFeedbackSurveys } from '../../fetchers/Admin';

const DEFAULT_FILTERS = {
  q: '',
  pageId: '',
  surveyType: '',
  thumbs: '',
};

const DEFAULT_SORT = {
  sortBy: 'submittedAt',
  sortDir: 'desc',
};

function formatDate(date) {
  if (!date) {
    return '--';
  }

  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) {
    return '--';
  }

  return parsed.toLocaleString();
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

  return (
    <>
      <Helmet>
        <title>Feedback Survey Responses</title>
      </Helmet>
      <Container>
        <h1>Feedback Survey Responses</h1>
        <p className="usa-hint">View and filter feedback submitted from in-app surveys.</p>

        <Grid row gap className="margin-bottom-3">
          <Grid desktop={{ col: 4 }} tablet={{ col: 6 }} col={12}>
            <Label htmlFor="feedback-search">Search</Label>
            <TextInput
              id="feedback-search"
              name="q"
              value={filters.q}
              onChange={onFilterChange}
            />
          </Grid>
          <Grid desktop={{ col: 4 }} tablet={{ col: 6 }} col={12}>
            <Label htmlFor="feedback-page-id">Page ID</Label>
            <TextInput
              id="feedback-page-id"
              name="pageId"
              value={filters.pageId}
              onChange={onFilterChange}
            />
          </Grid>
          <Grid desktop={{ col: 2 }} tablet={{ col: 6 }} col={12}>
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
          <Grid desktop={{ col: 2 }} tablet={{ col: 6 }} col={12}>
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

        <Grid row gap className="margin-bottom-3">
          <Grid desktop={{ col: 3 }} tablet={{ col: 6 }} col={12}>
            <Label htmlFor="feedback-sort-by">Sort by</Label>
            <Select
              id="feedback-sort-by"
              name="sortBy"
              value={sort.sortBy}
              onChange={onSortChange}
            >
              <option value="submittedAt">Submitted</option>
              <option value="rating">Rating</option>
              <option value="pageId">Page ID</option>
              <option value="surveyType">Survey type</option>
            </Select>
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
          <Grid desktop={{ col: 3 }} tablet={{ col: 6 }} col={12} className="display-flex flex-align-end">
            <button type="button" className="usa-button usa-button--outline" onClick={clearFilters}>
              Reset filters
            </button>
          </Grid>
        </Grid>

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
          <Table fullWidth striped stackedStyle="default">
            <thead>
              <tr>
                <th scope="col">Submitted</th>
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
                  <td data-label="Submitted">{formatDate(row.submittedAt)}</td>
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
        )}
      </Container>
    </>
  );
}
