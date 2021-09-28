import React from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import Container from '../../../components/Container';
import './GranteeSummary.css';

export default function GrantsList({ summary }) {
  const getGrantPrograms = (programs) => {
    let shortProgramTypes = [];
    if (programs && Array.isArray(programs) && programs.length > 0) {
      shortProgramTypes = programs.map((p) => {
        if (p === 'Early Head Start (ages 0-3)') {
          return 'EHS';
        }
        if (p === 'Head Start (ages 3-5)') {
          return 'HS';
        }

        return 'EHS-CCP';
      });
    }
    return shortProgramTypes.join(', ');
  };

  const renderGrantsList = () => {
    if (summary && summary.grantsToReturn && Array.isArray(summary.grantsToReturn)) {
      return summary.grantsToReturn.map((grant) => (
        <tr key={`grant_list_row_${grant.name}`}>
          <td>
            <a style={{ display: 'table-cell' }} href={`https://hses.ohs.acf.hhs.gov/grant-summary/?grant=${grant.number}`} target="_blank" rel="noreferrer">
              {grant.number}
            </a>
          </td>
          <td>
            {grant.status}
          </td>
          <td>
            {getGrantPrograms(grant.programTypes)}
          </td>
          <td>
            {moment(grant.endDate).format('MM/DD/yyyy')}
          </td>
        </tr>
      ));
    }
    return null;
  };

  return (
    <Container padding={0} className="padding-bottom-2">
      <h2 className="ttahub-grantee-record--card-header padding-x-3 padding-y-3">Grants</h2>
      <div className="usa-table-container--scrollable margin-0">
        <table className="usa-table usa-table--striped ttahub-grantee-record--table ttahub--grantee-summary-table usa-table--borderless width-full margin-y-1">
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
      grantsToReturn: PropTypes.arrayOf(
        PropTypes.shape({
          number: PropTypes.string,
          status: PropTypes.string,
          endDate: PropTypes.string,
        }),
      ),
    }).isRequired,

};
