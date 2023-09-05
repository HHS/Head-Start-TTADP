import React, { useEffect, useState } from 'react';
import { uniqBy } from 'lodash';
import PropTypes from 'prop-types';
import { Table } from '@trussworks/react-uswds';
import Container from '../../../components/Container';
import { getRecipientLeadership } from '../../../fetchers/recipient';

export default function RecipientLeadership({ regionId, recipientId }) {
  const [leadership, setLeadership] = useState([]);

  useEffect(() => {
    async function fetchRecipientLeadership() {
      try {
        const response = await getRecipientLeadership(
          String(recipientId),
          String(regionId),
        );

        setLeadership(uniqBy(response, 'nameAndRole'));
      } catch (err) {
        setLeadership([]);
      }
    }

    fetchRecipientLeadership();
  }, [recipientId, regionId]);

  return (
    <Container className="ttahub-recipient-record--profile-table" paddingX={0} paddingY={0}>
      <div className="ttahub-recipient-record--card-header padding-x-3 padding-y-3 margin-bottom-0 margin-top-0">
        <h2 className="margin-0 padding-0">Recipient leadership</h2>
      </div>
      <Table fullWidth striped stackedStyle="default">
        <thead>
          <tr>
            <th scope="col">Title</th>
            <th scope="col">Name</th>
            <th scope="col">Email</th>
            <th scope="col">Email change date</th>
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
