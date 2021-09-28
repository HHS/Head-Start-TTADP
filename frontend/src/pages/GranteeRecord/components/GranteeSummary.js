import React from 'react';
import PropTypes from 'prop-types';
import Container from '../../../components/Container';
import './GranteeSummary.css';

export default function GranteeSummary({ summary }) {
  const renderGranteeList = () => {
    if (summary && summary.grantsToReturn && Array.isArray(summary.grantsToReturn)) {
      return summary.grantsToReturn.map((grant) => (
        <tr key={`grantee_list_row_${grant.name}`}>
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
    <Container padding={0} className="padding-bottom-2">
      <h2 className="ttahub-grantee-record--card-header padding-x-3 padding-y-3">Grantee Summary</h2>
      <div className="usa-table-container--scrollable">
        <table className="usa-table--striped ttahub-grantee-record--table ttahub--grantee-summary-table usa-table--borderless margin-x-1 margin-y-2">
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
      grantsToReturn: PropTypes.arrayOf(
        PropTypes.shape({
          number: PropTypes.string,
          status: PropTypes.string,
          endDate: PropTypes.string,
        }),
      ),
    }).isRequired,
};
