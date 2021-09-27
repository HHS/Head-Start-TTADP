import React from 'react';
import PropTypes from 'prop-types';
import Container from '../../../components/Container';
import './GranteeSummary.css';

export default function GrantsList({ summary }) {
  return (
    <Container padding={0} className="padding-bottom-2">
      <h2 className="ttahub-grantee-record--card-header padding-x-3 padding-y-3">Grants</h2>
      <table className="usa-table ttahub-grantee-record--table ttahub--grantee-summary-table usa-table--borderless margin-x-1 margin-y-2">
        <caption className="padding-x-3 padding-y-1 sr-only">
          Grants summary table data
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
          <tr>
            <td>
              Region
              {' '}
              {summary['grants.regionId']}
            </td>
            <td />
            <td>
              {' '}
              {summary['grants.number']}
            </td>
            <td>{summary['grants.programSpecialistName']}</td>
          </tr>
        </tbody>
      </table>

    </Container>
  );
}

GrantsList.propTypes = {
  summary: PropTypes.shape({
    'grants.regionId': PropTypes.number,
    'grants.programSpecialistName': PropTypes.string,
    'grants.number': PropTypes.string,
  }).isRequired,
};
