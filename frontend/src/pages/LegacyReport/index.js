import React, { useEffect, useState } from 'react';
import ReactRouterPropTypes from 'react-router-prop-types';
import { Helmet } from 'react-helmet';
import { Table } from '@trussworks/react-uswds';
import { map } from 'lodash';

import Container from '../../components/Container';
import { legacyReportById } from '../../fetchers/activityReports';

const reportFields = {
  granteeName: 'Grantee Name',
  startDate: 'Start Date',
  endDate: 'End Date',
  createdBy: 'Created By',
  created: 'Time Created',
  duration: 'Duration',
  topics: 'Topics',
  otherTopics: 'Other Topics',
  tTa: 'TTA',
  programType: 'Program Type',
  reasons: 'Reasons',
  format: 'Format',
  resourcesUsed: 'Resources Used',
  sourceOfRequest: 'Source of Request',
  manager: 'Manager',
  managerApproval: 'Status',
  targetPopulations: 'Target Populations',
  cdiGranteeName: 'CDI Grantee Name',
  contextForThisActivity: 'Context',
  granteeParticipants: 'Grantee Participants',
  granteesLearningLevelGoal1: 'Learning Level Goal',
  granteesLearningLevelGoal2: 'Learning Level Goal',
  multiGranteeActivities: 'Multi Grantee Activities',
  nonGranteeActivity: 'Non-grantee Activity',
  nonGranteeParticipants: 'Non-grantee Participants',
  nonOhsResources: 'Non-OHS Resources',
  numberOfParticipants: 'Number of Participants',
  goal1: '1rst Goal',
  objective11: '1rst objective for Goal 1',
  objective11Status: '1rst Objective for Goal 1 status',
  objective12: '2nd objective for Goal 1',
  objective12Status: '2nd objective for Goal 1 status',
  goal2: '2nd Goal',
  objective21: '1rst objective for Goal 2',
  objective21Status: '1rst objective for Goal 2 status',
  objective22: '2nd objective for Goal 2',
  objective22Status: '2nd objective for Goal 2 status',
  otherSpecialists: 'Other Specialists',
  granteeFollowUpTasksObjectives: 'Follow Ups (Grantee)',
  specialistFollowUpTasksObjectives: 'Follow Ups (Specialist)',
  ttaProvidedAndGranteeProgressMade: 'TTA Provided and Progress made',
  additionalNotesForThisActivity: 'Additional Notes',
  modified: 'Time Modified',
  modifiedBy: 'Modified By',
  participants: 'Participants',
};

function LegacyReport({ match }) {
  const { params: { legacyId } } = match;
  const [legacyReport, updateLegacyReport] = useState();
  const [loading, updateLoading] = useState(true);

  useEffect(() => {
    const fetchReport = async () => {
      const report = await legacyReportById(legacyId);
      updateLegacyReport(report);
      updateLoading(false);
    };
    fetchReport();
  }, [legacyId]);

  if (loading) {
    return (
      <div>
        loading...
      </div>
    );
  }

  const { imported } = legacyReport;
  const entries = map(reportFields, (display, field) => {
    const value = imported[field];
    return {
      display,
      field,
      value,
    };
  });

  const tableEntries = entries.filter((item) => item.value).map(({ field, display, value }) => (
    <tr key={field}>
      <td>
        {display}
      </td>
      <td>
        {value}
      </td>
    </tr>
  ));

  return (
    <>
      <Helmet>
        <title>Legacy Report</title>
      </Helmet>
      <Container>
        <h2>
          Legacy report
          {' '}
          {legacyId}
        </h2>
        <Table className="usa-table">
          <thead>
            <tr key="heading">
              <th scope="col">
                Field
              </th>
              <th scope="col">
                Value
              </th>
            </tr>
          </thead>
          <tbody>
            {tableEntries}
          </tbody>
        </Table>
      </Container>
    </>
  );
}

LegacyReport.propTypes = {
  match: ReactRouterPropTypes.match.isRequired,
};

export default LegacyReport;
