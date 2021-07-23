import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import ReactRouterPropTypes from 'react-router-prop-types';
import { Grid } from '@trussworks/react-uswds';
import Container from '../../components/Container';
import './index.css';
import ViewTable from './components/ViewTable';
import { getReport } from '../../fetchers/activityReports';
import { allRegionsUserHasPermissionTo } from '../../permissions';

/**
 *
 * @param {object} report an activity report object
 * @returns an array of two arrays, each of which contains strings
 */
function calculateGoalsAndObjectives(report) {
  const headings = [];
  const data = [];

  if (report.goals.length > 0) {
    // assume grantee
    const { goals } = report;

    goals.forEach((goal, index) => {
      const displayNumber = index + 1;
      headings.push(`Goal ${displayNumber}`);
      data.push(goal.name);
      goal.objectives.forEach((objective, idx) => {
        const objectiveDisplayNumber = idx + 1;
        headings.push(`Objective ${objectiveDisplayNumber}`);
        data.push(objective.title);

        headings.push(`TTA Provided ${objectiveDisplayNumber}`);
        data.push(objective.ttaProvided);
      });
    });

    return [headings, data];
  }

  // else, we assume non grantee
  const { objectivesWithoutGoals } = report;
  objectivesWithoutGoals.forEach((objective, index) => {
    const displayNumber = index + 1;
    headings.push(`Objective ${displayNumber}`);
    data.push(objective.title);

    headings.push(`TTA Provided ${displayNumber}`);
    data.push(objective.ttaProvided);
  });

  return [headings, data];
}

function formatRequester(requester) {
  if (requester === 'grantee') {
    return 'Grantee';
  }

  if (requester === 'regionalOffice') {
    return 'Regional Office';
  }

  return '';
}

function formatMethod(method, delivery) {
  let methodOfContact = '';

  if (method.length > 1) {
    methodOfContact = 'Training and Technical Assistance';
  } else if (method[0] === 'training') {
    methodOfContact = 'Training';
  } else if (method[0] === 'technical-assistance') {
    methodOfContact = 'Technical Assistance';
  }

  if (delivery) {
    methodOfContact = `${methodOfContact}, Virtual (${delivery})`;
  }

  return methodOfContact;
}

function createResourceMarkup(resources) {
  if (!resources) {
    return '';
  }

  return (
    `<ul>
      ${resources.map((resource) => (
      `<li><a href="${resource}">Link</a></li>`
    )).join('')}
    </ul>`
  );
}

export default function ApprovedActivityReport({ match, user }) {
  const [notAuthorized, setNotAuthorized] = useState(false);
  const [somethingWentWrong, setSomethingWentWrong] = useState(false);
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
  const [topics, setTopics] = useState('');
  const [ECLKCResources, setECLKCResources] = useState('');
  const [nonECLKCResourcesUsed, setNonECLKCResourcesUsed] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [context, setContext] = useState('');
  const [goalsAndObjectiveHeadings, setGoalsAndObjectiveHeadings] = useState([]);
  const [goalsAndObjectives, setGoalsAndObjectives] = useState([]);
  const [managerNotes, setManagerNotes] = useState('');
  const [creatorNotes, setCreatorNotes] = useState('');
  const [successfullyCopiedClipboard, setSuccessfullyCopiedClipboard] = useState(false);

  useEffect(() => {
    const allowedRegions = allRegionsUserHasPermissionTo(user);

    getReport(match.params.activityReportId).then((report) => {
      if (!allowedRegions.includes(report.regionId)) {
        setNotAuthorized(true);
        return;
      }

      // first table
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
      setMethod(formatMethod(report.ttaType, report.virtualDeliveryType));
      setRequester(formatRequester(report.requester));

      // second table
      setTopics(report.topics.join(', '));
      setECLKCResources(createResourceMarkup(report.ECLKCResourcesUsed));
      setNonECLKCResourcesUsed(createResourceMarkup(report.nonECLKCResourcesUsed));
      setAttachments(report.attachments);

      // third table
      setContext(report.context);
      const [goalHeadings, goals] = calculateGoalsAndObjectives(report);
      setGoalsAndObjectiveHeadings(goalHeadings);
      setGoalsAndObjectives(goals);

      // fourth table
      setManagerNotes(report.managerNotes);
      setCreatorNotes(report.additionalNotes);
    }).catch((err) => {
      // eslint-disable-next-line no-console
      console.log(err);
      setSomethingWentWrong(true);
    });
  }, [match.params.activityReportId, user]);

  function handleCopyUrl() {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setSuccessfullyCopiedClipboard(true);
    });
  }

  if (notAuthorized) {
    return (
      <div className="usa-alert usa-alert--error" role="alert">
        <div className="usa-alert__body">
          <h4 className="usa-alert__heading">Unauthorized</h4>
          <p className="usa-alert__text">
            Sorry, you are not allowed to view this report
          </p>
        </div>
      </div>
    );
  }

  if (somethingWentWrong) {
    return (
      <div className="usa-alert usa-alert--warning">
        <div className="usa-alert__body">
          <p className="usa-alert__text">
            Sorry, something went wrong.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      {successfullyCopiedClipboard ? (
        <div className="usa-alert usa-alert--success margin-bottom-2">
          <div className="usa-alert__body">
            <p className="usa-alert__text">Successfully copied URL</p>
          </div>
        </div>
      ) : null }
      <Grid row>
        <button type="button" className="usa-button no-print" onClick={handleCopyUrl} style={{ display: navigator.clipboard ? 'inline' : 'none' }}>Copy URL Link</button>
        <button type="button" className="usa-button no-print" onClick={() => window.print()}>Print to PDF</button>
      </Grid>
      <Container className="ttahub-activity-report-view margin-top-2">
        <h1 className="landing">
          TTA Activity report
          {' '}
          {displayId}
        </h1>
        <hr />
        <div className="ttahub-activity-report-view-creator-data margin-bottom-4">
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
        </div>
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
        <ViewTable
          caption="Resources"
          headings={
              [
                'Topics',
                'OHS / ECLKC resources',
                'Non-ECLKC resources',
                'Supporting attachments',
              ]
            }
          data={
              [
                topics,
                ECLKCResources,
                nonECLKCResourcesUsed,
                attachments,
              ]
            }
        />
        <ViewTable
          caption="TTA Provided"
          headings={[
            'Context',
            ...goalsAndObjectiveHeadings,
          ]}
          data={
            [
              context,
              ...goalsAndObjectives,
            ]
          }
        />
        <ViewTable
          caption="Review and Submit"
          headings={
              [
                'Creator notes',
                'Manager notes',
              ]
            }
          data={
              [
                creatorNotes,
                managerNotes,
              ]
            }
        />
      </Container>
    </>
  );
}
ApprovedActivityReport.propTypes = {
  match: ReactRouterPropTypes.match.isRequired,
  user: PropTypes.shape({
    id: PropTypes.number,
    name: PropTypes.string,
    role: PropTypes.arrayOf(PropTypes.string),
  }).isRequired,
};
