import React, { useEffect, useState } from 'react';
// import PropTypes from 'prop-types';
import ReactRouterPropTypes from 'react-router-prop-types';
import { Grid } from '@trussworks/react-uswds';
import Container from '../../components/Container';
import './index.css';
import ViewTable from './components/ViewTable';
import { getReport } from '../../fetchers/activityReports';

export default function ActivityReportPrint({ match }) {
  const [displayId, setDisplayId] = useState('');
  const [creator, setCreator] = useState('');
  const [collaborators, setCollaborators] = useState([]);
  const [approvingManagers, setApprovingManagers] = useState('');
  const [attendees, setAttendees] = useState('');
  const [participantCount, setParticipantCount] = useState(0);
  const [reasons, setReasons] = useState('');
  const [programType, setProgramType] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [duration, setDuration] = useState(0);
  const [recipients, setRecipients] = useState('');
  const [method, setMethod] = useState('');
  const [requester, setRequester] = useState('');

  useEffect(() => {
    getReport(match.params.activityReportId).then((report) => {
      console.log(report);

      const arRecipients = report.activityRecipients.map((arRecipient) => arRecipient.name).join(', ');
      setRecipients(arRecipients);
      setDisplayId(report.displayId);
      setCreator(report.author.fullName);
      setCollaborators(report.collaborators);
      setApprovingManagers(report.approvingManager.fullName);
      setAttendees(report.participants.join(', '));
      setParticipantCount(report.numberOfParticipants);
      setReasons(report.reason.join(', '));
      setProgramType(report.programTypes.join(', '));
      setStartDate(report.startDate);
      setEndDate(report.endDate);
      setDuration(report.duration);
      setMethod(`${report.ttaType}`); // todo - this needs to be a little more robust
      setRequester(report.requester); // todo - this too
    });
  }, [match.params.activityReportId]);

  return (
    <>
      <Grid row>
        <button type="button" className="usa-button">Copy URL Link</button>
        <button type="button" className="usa-button">Print to PDF</button>
      </Grid>
      <Container className="ttahub-activity-report-view margin-top-2">
        <h1 className="landing">
          TTA Activity report
          {' '}
          {displayId}
        </h1>
        <hr />
        <p>
          <strong>Creator:</strong>
          {' '}
          {creator}
        </p>
        <p>
          <strong>Collaborators:</strong>
          {' '}
          {collaborators.map((collaborator) => collaborator.fullName)}
        </p>
        <p>
          <strong>Managers:</strong>
          {' '}
          {approvingManagers}
        </p>
        <ViewTable
          caption="Activity summary"
          headings={
              [
                'Grantee',
                'Reason',
                'Program Type',
                'Start date',
                'End date',
                'Duration',
                'Number of participants',
                'Attendees',
                'Method of contact',
                'Requested by',
              ]
          }
          data={
              [
                recipients,
                reasons,
                programType,
                startDate,
                endDate,
                duration,
                participantCount,
                attendees,
                method,
                requester,
              ]
          }
        />
      </Container>
    </>
  );
}
ActivityReportPrint.propTypes = {
  match: ReactRouterPropTypes.match.isRequired,
};
