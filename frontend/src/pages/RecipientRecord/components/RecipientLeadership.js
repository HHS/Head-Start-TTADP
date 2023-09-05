import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { uniqBy } from 'lodash';
import { Table } from '@trussworks/react-uswds';
import { Link } from 'react-router-dom';
import Container from '../../../components/Container';
import { getRecipientLeadership } from '../../../fetchers/recipient';

const roleFormatted = (role) => {
  switch (role.toLowerCase()) {
    case 'director':
      return 'Director';
    default:
      return '';
  }
};

export default function RecipientLeadership({ regionId, recipientId }) {
  const [leadership, setLeadership] = useState([]);

  useEffect(() => {
    async function fetchRecipientLeadership() {
      const l = await getRecipientLeadership(
        String(recipientId),
        String(regionId),
      );
      setLeadership(uniqBy(l, 'fullName'));
    }

    fetchRecipientLeadership();
  }, [recipientId, regionId]);

  const granteeStaffHistoryLink = `/recipient-tta-records/${recipientId}/region/${regionId}/profile/grantee-staff-history`;

  return (
    <Container className="ttahub-recipient-record--profile-table" paddingX={0} paddingY={0}>
      <div className="ttahub-recipient-record--card-header padding-x-3 padding-y-3 margin-bottom-0 margin-top-0 display-flex flex-justify">
        <h2 className="margin-0 padding-0">Recipient leadership</h2>
        <Link to={granteeStaffHistoryLink}>Grantee staff history</Link>
      </div>
      <Table fullWidth striped stackedStyle="default">
        <thead>
          <th scope="col">Title</th>
          <th scope="col">Name</th>
          <th scope="col">Email</th>
          <th scope="col">Email change date</th>
        </thead>
        <tbody>
          {leadership.map((t) => (
            <tr>
              <td data-label="Title">{roleFormatted(t.role)}</td>
              <td data-label="Name">{t.fullName}</td>
              <td data-label="Email">{t.email}</td>
              <td data-label="Email change date">{t.effectiveDate || 'unavailable'}</td>
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
