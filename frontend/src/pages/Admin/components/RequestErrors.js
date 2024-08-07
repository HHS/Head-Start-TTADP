import React, { useEffect, useState } from 'react';
import { Button, Table } from '@trussworks/react-uswds';
import { Link } from 'react-router-dom';
import { getRequestErrors } from '../../../fetchers/Admin';
import usePerPageSortAndOffset from '../../../hooks/usePerPageSortAndOffset';
import ErrorDetails from './ErrorDetails';

export default function RequestErrors() {
  const [errors, setErrors] = useState([]);
  const {
    perPage,
    requestSort,
    perPageChange,
    activePage,
    direction,
    sortBy,
  } = usePerPageSortAndOffset('diag', { sortBy: 'createdAt', direction: 'desc' });

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
    <>
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
      <Table className="width-full maxw-full">
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
              <td>
                <Link to={`/admin/diag/${error.id}`}>
                  {error.id}
                </Link>
              </td>
              <td>
                {error.responseCode}
                -
                {error.method}
                {' '}
                -
                {error.operation}
              </td>
              <td>
                <p style={{ whiteSpace: 'pre-wrap', maxWidth: 240 }}>
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
    </>
  );
}
