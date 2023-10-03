import React, { useEffect, useState } from 'react';
import { uniqBy } from 'lodash';
import moment from 'moment';
import PropTypes from 'prop-types';
import { Table } from '@trussworks/react-uswds';
import Container from '../../../components/Container';
import { getRecipientLeadership } from '../../../fetchers/recipient';

export default function RecipientLeadership({ regionId, recipientId }) {
  const [leadership, setLeadership] = useState([]);
  const [sort, setSort] = useState({
    sortBy: null,
    direction: 'desc',
  });

  useEffect(() => {
    async function fetchRecipientLeadership() {
      try {
        const response = await getRecipientLeadership(
          String(recipientId),
          String(regionId),
        );

        const leadershipData = response.map((person) => ({
          ...person,
          effectiveDate: person.effectiveDate ? moment(person.effectiveDate).format('MM/DD/YYYY') : null,
        }));

        setLeadership(uniqBy(leadershipData, 'nameAndRole'));
      } catch (err) {
        setLeadership([]);
      }
    }

    fetchRecipientLeadership();
  }, [recipientId, regionId]);

  const doSort = (key) => {
    if (sort.sortBy === key) {
      setSort({
        sortBy: key,
        direction: sort.direction === 'asc' ? 'desc' : 'asc',
      });
    } else {
      setSort({
        sortBy: key,
        direction: 'asc',
      });
    }

    const sortedLeadership = [...leadership].sort((a, b) => {
      let val = 0;
      if (a[key] > b[key]) {
        val = 1;
      } else if (a[key] < b[key]) {
        val = -1;
      }
      return sort.direction === 'asc' ? val : -val;
    });

    setLeadership(sortedLeadership);
  };

  const renderColumnHeader = (displayName, name) => {
    const getClassNamesFor = (n) => (sort.sortBy === n ? sort.direction : '');
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
      <th scope="col" aria-sort={fullAriaSort} className="padding-x-1">
        <button
          type="button"
          onClick={() => {
            doSort(name);
          }}
          className={`sortable ${sortClassName} position-relative`}
          aria-label={`${displayName} Activate to sort ${sortClassName === 'asc' ? 'descending' : 'ascending'
          }`}
        >
          <span>{displayName}</span>
        </button>
      </th>
    );
  };

  return (
    <Container className="ttahub-recipient-record--profile-table" paddingX={0} paddingY={0}>
      <div className="ttahub-recipient-record--card-header padding-x-3 padding-y-3 margin-bottom-0 margin-top-0">
        <h2 className="margin-0 padding-0">Recipient leadership</h2>
      </div>
      <Table fullWidth striped stackedStyle="default">
        <thead>
          <tr>
            {renderColumnHeader('Title', 'fullRole')}
            {renderColumnHeader('Name', 'fullName')}
            {renderColumnHeader('Email', 'email')}
            {renderColumnHeader('Email change date', 'effectiveDate')}
          </tr>
        </thead>
        <tbody>
          {leadership.map((person) => (
            <tr key={person.id}>
              <td data-label="Title">{person.fullRole}</td>
              <td data-label="Name">{person.fullName}</td>
              <td data-label="Email">{person.email}</td>
              <td data-label="Email change date">{person.effectiveDate || 'unavailable'}</td>
            </tr>
          ))}
        </tbody>
      </Table>
    </Container>
  );
}

RecipientLeadership.propTypes = {
  regionId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  recipientId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
};
