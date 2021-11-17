import React from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import Container from '../../../components/Container';
import './GrantsList.css';

export default function GrantsList({ summary }) {
  const renderGrantsList = () => {
    if (summary && summary.grants) {
      return summary.grants.map((grant) => (
        <tr key={grant.id}>
          <td>
            <a style={{ display: 'table-cell' }} className="padding-y-3" href={`https://hses.ohs.acf.hhs.gov/grant-summary/?grant=${grant.number}`} target="_blank" rel="noreferrer">
              {grant.number}
            </a>
          </td>
          <td>
            {grant.status}
          </td>
          <td>
            {grant.programs ? grant.programs.map((program) => program.name).join(', ') : ''}
          </td>
          <td>
            {grant.endDate ? moment(grant.endDate).format('MM/DD/yyyy') : null}
          </td>
        </tr>
      ));
    }
    return null;
  };

  return (
    <Container className="ttahub-recipient-record--grants-list" padding={0}>
      <h2 className="ttahub-recipient-record--card-header padding-x-3 padding-y-3 margin-bottom-0">Grants</h2>
      <div className="usa-table-container--scrollable margin-0 ttahub-recipient-record-table-container">
        <table className="usa-table usa-table--striped ttahub-recipient-record--table ttahub--recipient-summary-table usa-table--borderless width-full margin-y-1">
          <caption className="padding-x-3 padding-y-1 sr-only">
            Grants summary table data
          </caption>
          <thead>
            <tr>
              <th scope="col">Grant Number</th>
              <th scope="col">Status</th>
              <th scope="col">Programs</th>
              <th scope="col">Project End Date</th>
            </tr>
          </thead>
          <tbody>
            {
              renderGrantsList()
            }
          </tbody>
        </table>
      </div>
    </Container>
  );
}

GrantsList.propTypes = {
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
