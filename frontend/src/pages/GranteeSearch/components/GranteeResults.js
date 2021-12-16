import React from 'react';
import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';
import Container from '../../../components/Container';
import './GranteeResults.css';
import TableHeader from '../../../components/TableHeader';

export default function GranteeResults(
  {
    grantees,
    loading,
    activePage,
    offset,
    perPage,
    count,
    handlePageChange,
    requestSort,
    sortConfig,
  },
) {
  const getClassNamesFor = (name) => (sortConfig.sortBy === name ? sortConfig.direction : '');

  const renderGrantee = (grantee) => {
    const { regionId, programSpecialists } = grantee;

    return (
      <tr key={`${grantee.id} ${regionId}`}>
        <td>{regionId}</td>
        <td><Link to={`/grantee/${grantee.id}/region/${regionId}/profile`}>{grantee.name}</Link></td>
        <td className="maxw-3">{programSpecialists}</td>
      </tr>
    );
  };

  const renderColumnHeader = (displayName, name) => {
    const sortClassName = getClassNamesFor(name);
    let fullAriaSort;
    switch (sortClassName) {
      case 'asc':
        fullAriaSort = 'ascending';
        break;
      case 'desc':
        fullAriaSort = 'descending';
        break;
      default:
        fullAriaSort = 'none';
        break;
    }

    return (
      <th scope="col" aria-sort={fullAriaSort}>
        <button
          type="button"
          tabIndex={0}
          onClick={() => requestSort(name)}
          className={`usa-button usa-button--unstyled sortable ${sortClassName}`}
          aria-label={`${displayName}. Activate to sort ${
            sortClassName === 'asc' ? 'descending' : 'ascending'
          }`}
          disabled={loading}
        >
          {displayName}
        </button>
      </th>
    );
  };

  return (
    <Container className="landing ttahub-grantee-results maxw-desktop" padding={0} loading={loading} loadingLabel="Grantee search results loading">
      <TableHeader
        title="Grantees"
        hideMenu
        showFilter={false}
        count={count}
        activePage={activePage}
        offset={offset}
        perPage={perPage}
        handlePageChange={handlePageChange}
      />
      <table aria-live="polite" className="usa-table usa-table--borderless usa-table--striped width-full maxw-full margin-top-0">
        <caption className="usa-sr-only">
          Grantee search results with sorting and pagination
        </caption>
        <thead>
          <tr>
            {renderColumnHeader('Region', 'regionId')}
            {renderColumnHeader('Grantee Name', 'name')}
            {renderColumnHeader('Program Specialist', 'programSpecialist')}
          </tr>
        </thead>
        <tbody>
          {grantees.map((grantee) => renderGrantee(grantee))}
        </tbody>
      </table>
    </Container>
  );
}

GranteeResults.propTypes = {
  grantees: PropTypes.arrayOf(PropTypes.shape({
    name: PropTypes.string,
    id: PropTypes.number,
    grants: PropTypes.arrayOf(PropTypes.shape({
      regionId: PropTypes.number,
      programSpecialistName: PropTypes.string,
    })),
  })),
  loading: PropTypes.bool.isRequired,
  activePage: PropTypes.number.isRequired,
  offset: PropTypes.number.isRequired,
  perPage: PropTypes.number.isRequired,
  count: PropTypes.number.isRequired,
  handlePageChange: PropTypes.func.isRequired,
  requestSort: PropTypes.func.isRequired,
  sortConfig: PropTypes.shape({
    sortBy: PropTypes.string,
    direction: PropTypes.string,
  }).isRequired,
};

GranteeResults.defaultProps = {
  grantees: [],
};
