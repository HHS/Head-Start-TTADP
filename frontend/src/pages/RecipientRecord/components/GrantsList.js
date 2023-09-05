import React from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import Container from '../../../components/Container';
import { getDistinctSortedArray } from '../../../utils';

export default function GrantsList({ summary }) {
  const renderGrantsList = () => {
    if (summary && summary.grants) {
      return summary.grants.map((grant) => (
        <tr key={grant.id}>
          <td>
            <a style={{ display: 'table-cell' }} title="Links to HSES" aria-label={`Links to Grant ${grant.number} on HSES`} href={`https://hses.ohs.acf.hhs.gov/grant-summary/?grant=${grant.number}`} target="_blank" rel="noreferrer">
              {grant.number}
            </a>
          </td>
          <td>
            {grant.status}
          </td>
          <td>
            {grant.programs ? getDistinctSortedArray(grant.programs.map((program) => program.programType)).join(', ') : ''}
          </td>
          <td>{grant.programSpecialistName}</td>
          <td>{grant.grantSpecialistName}</td>
          <td>
            {grant.startDate ? moment(grant.startDate).format('MM/DD/yyyy') : null}
          </td>
          <td>
            {grant.endDate ? moment(grant.endDate).format('MM/DD/yyyy') : null}
          </td>
          <td>
            {grant.annualFundingMonth}
          </td>
        </tr>
      ));
    }
    return null;
  };

  return (
    <Container className="ttahub-recipient-record--grants-list ttahub-recipient-record--profile-table" paddingX={0} paddingY={0}>
      <div className="ttahub-recipient-record--card-header padding-x-3 padding-y-3 margin-bottom-0 margin-top-0">
        <h2 className="margin-0 padding-0">Grants</h2>
      </div>
      <div className="usa-table-container--scrollable margin-0 ttahub-recipient-record-table-container">
        <table className="usa-table usa-table--striped ttahub-recipient-record--table ttahub--recipient-summary-table usa-table--borderless width-full margin-y-1">
          <caption className="sr-only">
            Grants summary table data
          </caption>
          <thead>
            <tr>
              <th scope="col">Grant number</th>
              <th scope="col">Status</th>
              <th scope="col">Programs</th>
              <th scope="col">Program specialist</th>
              <th scope="col">Grant specialist</th>
              <th scope="col">Project start date</th>
              <th scope="col">Project end date</th>
              <th scope="col">Annual funding month</th>
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
          programSpecialistName: PropTypes.string,
          grantSpecialistName: PropTypes.string,
        }),
      ),
    }).isRequired,
};
