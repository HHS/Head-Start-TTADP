import React from 'react';
import PropTypes from 'prop-types';
import Container from '../../../components/Container';
import { getDistinctSortedArray } from '../../../utils';
import { useGrantData } from '../pages/GrantDataContext';
import SimpleSortableTable from '../../../components/SimpleSortableTable';
import { formatDateValue } from '../../../lib/dates';

export default function GrantsList({ summary }) {
  const { hasMonitoringData, hasClassData } = useGrantData();

  const columns = [
    { key: 'number', name: 'Grant number' },
    { key: 'status', name: 'Status' },
    { key: 'programs', name: 'Programs' },
    { key: 'programSpecialistName', name: 'Program specialist' },
    { key: 'grantSpecialistName', name: 'Grant specialist' },
    { key: 'startDate', name: 'Project start date' },
    { key: 'endDate', name: 'Project end date' },
    { key: 'annualFundingMonth', name: 'Annual funding month' },
  ];

  const grants = summary && summary.grants ? summary.grants : [];

  const grantsData = grants.map((grant) => ({
    ...grant,
    number: (
      <>
        <a aria-label={`Links to Grant ${grant.number} on HSES`} href={`https://hses.ohs.acf.hhs.gov/grant-summary/?grant=${grant.number}`} target="_blank" rel="noreferrer">
          {grant.number}
          {(hasMonitoringData(grant.number) && hasClassData(grant.number)) || (
            <span>*</span>
          )}
        </a>
      </>
    ),
    programs: grant.programs ? getDistinctSortedArray(grant.programs.map((program) => program.programType)).join(', ') : '',
    startDate: grant.startDate ? formatDateValue(grant.startDate, 'MM/DD/yyyy') : null,
    endDate: grant.endDate ? formatDateValue(grant.endDate, 'MM/DD/yyyy') : null,
  }));

  return (
    <Container className="ttahub-recipient-record--grants-list ttahub-recipient-record--profile-table" paddingX={0} paddingY={0}>
      <div className="ttahub-recipient-record--card-header padding-x-3 padding-y-3 margin-bottom-0 margin-top-0">
        <h2 className="margin-0 padding-0">Grants</h2>
      </div>
      <SimpleSortableTable
        data={grantsData}
        columns={columns}
        className="ttahub-recipient-record--table ttahub--recipient-summary-table"
      />
      {grants.some((grant) => !hasMonitoringData(grant.number)
      || !hasClassData(grant.number)) && (
        <p className="usa-hint padding-2 border-top smart-hub-border-base-lighter">
          * CLASS and/or monitoring scores are not available
        </p>
      )}
    </Container>
  );
}

GrantsList.propTypes = {
  summary: PropTypes.shape({
    grants: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
        number: PropTypes.string,
        status: PropTypes.string,
        programs: PropTypes.arrayOf(
          PropTypes.shape({
            programType: PropTypes.string,
          }),
        ),
        programSpecialistName: PropTypes.string,
        grantSpecialistName: PropTypes.string,
        startDate: PropTypes.string,
        endDate: PropTypes.string,
        annualFundingMonth: PropTypes.string,
      }),
    ),
  }).isRequired,
};
