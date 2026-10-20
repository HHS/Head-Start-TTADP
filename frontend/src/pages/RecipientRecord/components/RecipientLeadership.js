import { uniqBy } from 'lodash';
import moment from 'moment';
import PropTypes from 'prop-types';
import React, { useEffect, useState } from 'react';
import Container from '../../../components/Container';
import SimpleSortableTable from '../../../components/SimpleSortableTable';
import { getRecipientLeadership } from '../../../fetchers/recipient';

export default function RecipientLeadership({ regionId, recipientId }) {
  const [leadership, setLeadership] = useState([]);

  useEffect(() => {
    async function fetchRecipientLeadership() {
      try {
        const response = await getRecipientLeadership(String(recipientId), String(regionId));

        const leadershipData = response.map((person) => ({
          ...person,
          effectiveDate: person.effectiveDate
            ? moment(person.effectiveDate).format('MM/DD/YYYY')
            : null,
        }));

        setLeadership(uniqBy(leadershipData, 'nameAndRole'));
      } catch (err) {
        setLeadership([]);
      }
    }

    fetchRecipientLeadership();
  }, [recipientId, regionId]);

  const columns = [
    { key: 'fullRole', name: 'Title' },
    { key: 'fullName', name: 'Name' },
    { key: 'email', name: 'Email' },
    { key: 'effectiveDate', name: 'Email change date' },
  ];

  const leadershipDataWithUnavailableDates = leadership.map((person) => ({
    ...person,
    effectiveDate: person.effectiveDate || 'unavailable',
  }));

  return (
    <Container className="ttahub-recipient-record--profile-table" paddingX={0} paddingY={0}>
      <div className="ttahub-recipient-record--card-header padding-x-3 padding-y-3 margin-bottom-0 margin-top-0">
        <h2 className="margin-0 padding-0">Recipient leadership</h2>
      </div>
      <SimpleSortableTable
        data={leadershipDataWithUnavailableDates}
        columns={columns}
        className="ttahub-recipient-record--table"
      />
    </Container>
  );
}

RecipientLeadership.propTypes = {
  regionId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  recipientId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
};
