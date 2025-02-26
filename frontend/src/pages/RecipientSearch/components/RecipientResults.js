import React from 'react';
import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';
import Container from '../../../components/Container';
import './RecipientResults.scss';
import TableHeader from '../../../components/TableHeader';

export default function RecipientResults({
  recipients,
  activePage,
  offset,
  perPage,
  count,
  handlePageChange,
  requestSort,
  sortConfig,
}) {
  const getClassNamesFor = (name) => (sortConfig.sortBy === name ? sortConfig.direction : '');

  const renderRecipient = (recipient) => {
    const { regionId, programSpecialists } = recipient;

    return (
      <tr key={`${recipient.id} ${regionId}`}>
        <td>{regionId}</td>
        <td><Link to={`/recipient-tta-records/${recipient.id}/region/${regionId}/profile`}>{recipient.name}</Link></td>
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
        >
          {displayName}
        </button>
      </th>
    );
  };

  return (
    <Container className="landing ttahub-recipient-results maxw-desktop" paddingX={0} paddingY={0}>
      <TableHeader
        title="Recipients"
        hideMenu
        showFilter={false}
        count={count}
        exportIdPrefix="recipient-search"
        totalCount={count}
        activePage={activePage}
        offset={offset}
        perPage={perPage}
        handlePageChange={handlePageChange}
      />
      <table aria-live="polite" className="usa-table usa-table--borderless usa-table--striped width-full maxw-full margin-y-0">
        <caption className="usa-sr-only">
          Recipient search results with sorting and pagination
        </caption>
        <thead>
          <tr>
            {renderColumnHeader('Region', 'regionId')}
            {renderColumnHeader('Recipient name', 'name')}
            {renderColumnHeader('Program specialist', 'programSpecialist')}
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
