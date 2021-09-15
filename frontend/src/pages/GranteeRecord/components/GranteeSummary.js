import React from 'react';
import PropTypes from 'prop-types';
import Container from '../../../components/Container';
import './GranteeSummary.css';

export default function GranteeSummary({ summary }) {
  return (
    <Container padding={2}>
      <table className="usa-table ttahub--grantee-summary-table usa-table--borderless margin-0">
        <caption className="padding-x-2 padding-y-1">
          Grantee Summary
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

GranteeSummary.propTypes = {
  summary: PropTypes.shape({
    'grants.regionId': PropTypes.string,
    'grants.programSpecialistName': PropTypes.string,
    'grants.number': PropTypes.string,
  }).isRequired,
};
