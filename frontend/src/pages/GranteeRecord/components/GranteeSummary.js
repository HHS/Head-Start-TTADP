import React from 'react';
import PropTypes from 'prop-types';
import Container from '../../../components/Container';

export default function GranteeSummary({ summary }) {
  const renderGranteeList = () => {
    if (summary && summary.grants) {
      return summary.grants.map((grant) => (
        <tr key={grant.id}>
          <td>
            Region
            {' '}
            {grant.regionId}
          </td>
          <td />
          <td>
            {' '}
            {grant.number}
          </td>
          <td>{grant.programSpecialistName}</td>
        </tr>
      ));
    }
    return null;
  };

  return (
    <Container padding={0}>
      <h2 className="ttahub-grantee-record--card-header padding-x-3 padding-y-3">Grantee Summary</h2>
      <div className="ttahub-grantee-record-table-container usa-table-container--scrollable margin-0">
        <table className="usa-table ttahub-grantee-record--table ttahub--grantee-summary-table usa-table--borderless margin-x-1 margin-y-2">
          <caption className="padding-x-3 padding-y-1 sr-only">
            Grantee summary table data
          </caption>
          <thead>
            <tr>
              <th scope="col">Region</th>
              <th scope="col">Grantee Type</th>
              <th scope="col">Grantee ID</th>
              <th scope="col">Program Specialist</th>
            </tr>
          </thead>
          <tbody>
            {
              renderGranteeList()
            }
          </tbody>
        </table>
      </div>

    </Container>
  );
}

GranteeSummary.propTypes = {
  summary:
    PropTypes.shape({
      grants: PropTypes.arrayOf(
        PropTypes.shape({
          number: PropTypes.string,
          status: PropTypes.string,
          endDate: PropTypes.string,
        }),
      ),
    }).isRequired,
};
