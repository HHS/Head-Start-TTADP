import React from 'react';
import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';
import Pagination from 'react-js-pagination';
import Container from '../../../components/Container';
import { renderTotal } from '../../Landing';
import './GranteeResults.css';

export default function GranteeResults(
  {
    region,
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
          onClick={() => {
            requestSort(name);
          }}
          className={`usa-button usa-button--unstyled sortable ${sortClassName}`}
          aria-label={`${displayName}. Activate to sort ${
            sortClassName === 'asc' ? 'descending' : 'ascending'
          }`}
        >
          {displayName}
        </button>
      </th>
    );
  };

  return (
    <Container className="landing ttahub-grantee-results maxw-desktop" padding={0} loading={loading} loadingLabel="Grantee search results loading">
      <span className="smart-hub--table-nav">
        <span aria-label="Pagination for activity reports">
          <span
            className="smart-hub--total-count"
            aria-label={`Page ${activePage}, displaying rows ${renderTotal(
              offset,
              perPage,
              activePage,
              count,
            )}`}
          >
            {renderTotal(offset, perPage, activePage, count)}
            <Pagination
              hideFirstLastPages
              prevPageText="<Prev"
              nextPageText="Next>"
              activePage={activePage}
              itemsCountPerPage={perPage}
              totalItemsCount={count}
              pageRangeDisplayed={4}
              onChange={handlePageChange}
              linkClassPrev="smart-hub--link-prev"
              linkClassNext="smart-hub--link-next"
              tabIndex={0}
            />
          </span>
        </span>
      </span>
      <table aria-live="polite" className="usa-table usa-table--borderless usa-table--striped width-full maxw-full">
        <caption>
          Grantees
          <p className="usa-sr-only">with sorting and pagination</p>
        </caption>
        <thead>
          <tr>
            {renderColumnHeader('Region', 'regionId')}
            {renderColumnHeader('Grantee Name', 'name')}
            {renderColumnHeader('Program Specialist', 'programSpecialist')}
          </tr>
        </thead>
        <tbody>
          {grantees.map((grantee) => (
            <tr key={grantee.id}>
              <td>{region}</td>
              <td><Link to={`/region/${region}/grantee/${grantee.id}`}>{grantee.name}</Link></td>
              <td>{Array.from(new Set(grantee.grants.map((grant) => grant.programSpecialistName))).join('\n')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Container>
  );
}

GranteeResults.propTypes = {
  region: PropTypes.number.isRequired,
  grantees: PropTypes.arrayOf(PropTypes.shape({
    name: PropTypes.string,
    id: PropTypes.number,
    programSpecialist: PropTypes.string,
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
