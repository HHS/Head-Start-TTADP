import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { Button, Table } from '@trussworks/react-uswds';
import { getRequestErrors } from '../../fetchers/Admin';
import './diag.css';
import usePerPageAndOffset from '../../hooks/usePerPageSortAndOffset';
import Container from '../../components/Container';

const ErrorDetails = ({
  title,
  content,
}) => (
  <details className="ttahub-admin-error-details">
    <summary>{title}</summary>
    <pre>{JSON.stringify(content, null, 2)}</pre>
  </details>
);

ErrorDetails.propTypes = {
  title: PropTypes.string.isRequired,
  // eslint-disable-next-line react/forbid-prop-types
  content: PropTypes.object.isRequired,
};

function Diag() {
  const [errors, setErrors] = useState([]);
  const {
    perPage,
    requestSort,
    perPageChange,
    activePage,
    direction,
    sortBy,
  } = usePerPageAndOffset('diag', { sortBy: 'createdAt', direction: 'desc' });

  useEffect(() => {
    async function fetchErrors() {
      try {
        const es = await getRequestErrors({
          activePage,
          perPage,
          sortBy,
          direction,
        });
        setErrors(es);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error(e);
      }
    }
    fetchErrors();
  }, [activePage, direction, perPage, sortBy]);

  const lowerCasedDirection = direction.toLowerCase();

  return (
    <Container>
      <h1>Request errors</h1>
      <div className="display-flex">
        <label htmlFor="perPage">
          Per page:
          <select
            id="perPage"
            name="perPage"
            value={perPage}
            onChange={perPageChange}
            className="usa-select"
          >
            <option value="10">10</option>
            <option value="25">25</option>
            <option value="50">50</option>
            <option value="100">100</option>
          </select>
        </label>
      </div>
      <Table className="width-full">
        <caption className="usa-caption usa-sr-only">Request errors</caption>
        <thead>
          <tr>
            <th>ID</th>
            <th>Operation</th>
            <th>URI</th>
            <th>
              <Button
                unstyled
                type="button"
                className={`sortable ${lowerCasedDirection}`}
                onClick={() => requestSort('createdAt')}
              >
                Created at
              </Button>
            </th>
          </tr>
        </thead>
        <tbody>
          {errors.map((error) => (
            <tr key={error.id}>
              <td>{error.id}</td>
              <td>
                {error.responseCode}
                -
                {error.method}
                {' '}
                -
                {error.operation}
              </td>
              <td>
                <p>
                  {error.uri}
                </p>
                <ErrorDetails title="Name" content={error.responseBody.name} />
                <ErrorDetails title="Parent" content={error.responseBody.parent} />
                <ErrorDetails title="Original" content={error.responseBody.original} />
                <ErrorDetails title="SQL" content={error.responseBody.sql} />
                <ErrorDetails title="Parameters" content={error.responseBody.parameters} />
                <ErrorDetails title="Error stack" content={error.responseBody.errorStack} />
              </td>
              <td>{error.createdAt}</td>
            </tr>
          ))}
        </tbody>

      </Table>
    </Container>
  );
}
export default Diag;
