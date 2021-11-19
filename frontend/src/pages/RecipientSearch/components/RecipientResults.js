import React from 'react';
import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';
import Pagination from 'react-js-pagination';
import Container from '../../../components/Container';
import { renderTotal } from '../../Landing';
import './RecipientResults.css';
import { getDistinctSortedArray } from '../../../utils';

export default function RecipientResults(
  {
    recipients,
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

  const renderRecipient = (recipient) => {
    // Get a unique sorted list of Program Specialists.
    const valueArray = recipient.grants.map((p) => p.programSpecialistName);
    const psList = getDistinctSortedArray(valueArray).join(', ');
    const grant = recipient.grants[0];

    const { number, regionId } = grant;

    return (
      <tr key={recipient.id + number}>
        <td>{regionId}</td>
        <td><Link to={`/recipient/${recipient.id}/profile?region=${regionId}`}>{recipient.name}</Link></td>
        <td className="maxw-3">{psList}</td>
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
    <Container className="landing ttahub-recipient-results maxw-desktop" padding={0} loading={loading} loadingLabel="Recipient search results loading">
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
          Recipients
          <p className="usa-sr-only">with sorting and pagination</p>
        </caption>
        <thead>
          <tr>
            {renderColumnHeader('Region', 'regionId')}
            {renderColumnHeader('Recipient Name', 'name')}
            {renderColumnHeader('Program Specialist', 'programSpecialist')}
          </tr>
        </thead>
        <tbody>
          {recipients.map((recipient) => renderRecipient(recipient))}
        </tbody>
      </table>
    </Container>
  );
}

RecipientResults.propTypes = {
  recipients: PropTypes.arrayOf(PropTypes.shape({
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

RecipientResults.defaultProps = {
  recipients: [],
};
