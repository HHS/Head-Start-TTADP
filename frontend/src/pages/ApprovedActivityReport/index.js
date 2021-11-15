import React, { useEffect, useState, useRef } from 'react';
import PropTypes from 'prop-types';
import ReactRouterPropTypes from 'react-router-prop-types';
import { Grid, ModalToggleButton } from '@trussworks/react-uswds';
import { Redirect } from 'react-router-dom';
import moment from 'moment-timezone';
import { Helmet } from 'react-helmet';
import Container from '../../components/Container';
import './index.css';
import ViewTable from './components/ViewTable';
import { getReport, unlockReport } from '../../fetchers/activityReports';
import { allRegionsUserHasPermissionTo, canUnlockReports } from '../../permissions';
import Modal from '../../components/Modal';
import { DATE_DISPLAY_FORMAT } from '../../Constants';

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
  } else if (method[0].toLowerCase() === 'training') {
    methodOfContact = 'Training';
  } else if (method[0].toLowerCase().replace(' ', '-') === 'technical-assistance') {
    methodOfContact = 'Technical Assistance';
  }

  if (delivery) {
    methodOfContact = `${methodOfContact}, Virtual (${delivery})`;
  }

  return methodOfContact;
}

function mapAttachments(attachments) {
  if (Array.isArray(attachments) && attachments.length > 0) {
    return attachments.map((attachment) => (
      <li>
        <a href={attachment.url.url}>{attachment.originalFileName}</a>
      </li>
    ));
  }

  return [];
}

function createResourceMarkup(resources) {
  return resources.map((resource) => {
    try {
      return <a href={new URL(resource)}>{resource}</a>;
    } catch (err) {
      return resource;
    }
  });
}

function formatSimpleArray(arr) {
  return arr.sort().join(', ');
}

export default function ApprovedActivityReport({ match, user }) {
  const [notAuthorized, setNotAuthorized] = useState(false);
  const [somethingWentWrong, setSomethingWentWrong] = useState(false);
  const [reportId, setReportId] = useState(0);
  const [displayId, setDisplayId] = useState('');
  const [recipientType, setRecipientType] = useState('Grantee');
  const [creator, setCreator] = useState('');
  const [collaborators, setCollaborators] = useState([]);
  const [approvingManagers, setApprovingManagers] = useState('');
  const [attendees, setAttendees] = useState('');
  const [participantCount, setParticipantCount] = useState('');
  const [reasons, setReasons] = useState('');
  const [programType, setProgramType] = useState('');
  const [targetPopulations, setTargetPopulations] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [duration, setDuration] = useState('');
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
  const [somethingWentWrongWithClipboard, setSomethingWentWrongWithClipboard] = useState(false);
  const [granteeNextSteps, setGranteeNextSteps] = useState([]);
  const [specialistNextSteps, setSpecialistNextSteps] = useState([]);

  const [justUnlocked, updatedJustUnlocked] = useState(false);

  const modalRef = useRef();

  useEffect(() => {
    const allowedRegions = allRegionsUserHasPermissionTo(user);

    if (!parseInt(match.params.activityReportId, 10)) {
      setSomethingWentWrong(true);
      return;
    }

    getReport(match.params.activityReportId).then((report) => {
      if (!allowedRegions.includes(report.regionId)) {
        setNotAuthorized(true);
        return;
      }

      // first table
      let recipientTypeLabel = report.activityRecipients[0].grantId ? 'Grantee' : 'Non-grantee';
      if (report.activityRecipients.length > 1) {
        recipientTypeLabel = `${recipientTypeLabel}s`;
      }
      setRecipientType(recipientTypeLabel);
      const arRecipients = report.activityRecipients.map((arRecipient) => arRecipient.name).sort().join(', ');
      setRecipients(arRecipients);
      setReportId(report.id);
      setDisplayId(report.displayId);
      setCreator(report.author.fullName);
      setCollaborators(report.collaborators);
      setTargetPopulations(report.targetPopulations.map((population) => population).join(', '));

      // Approvers.
      const approversNames = report.approvers.map((a) => a.User.fullName);
      setApprovingManagers(approversNames.join(', '));

      // Approver Notes.
      const approversNotes = report.approvers.map((a) => `
        <h2>${a.User.fullName}:</h2>
        ${a.note ? a.note : '<p>No manager notes</p>'}`).join('');
      setManagerNotes(approversNotes);

      setAttendees(formatSimpleArray(report.participants));
      const newCount = report.numberOfParticipants.toString();
      setParticipantCount(newCount);
      setReasons(formatSimpleArray(report.reason));
      setProgramType(formatSimpleArray(report.programTypes));
      setStartDate(moment(report.startDate, DATE_DISPLAY_FORMAT).format('MMMM D, YYYY'));
      setEndDate(moment(report.endDate, DATE_DISPLAY_FORMAT).format('MMMM D, YYYY'));
      setDuration(`${report.duration} hours`);
      setMethod(formatMethod(report.ttaType, report.virtualDeliveryType));
      setRequester(formatRequester(report.requester));

      // second table
      setTopics(formatSimpleArray(report.topics));
      setECLKCResources(createResourceMarkup(report.ECLKCResourcesUsed));
      setNonECLKCResourcesUsed(createResourceMarkup(report.nonECLKCResourcesUsed));
      setAttachments(mapAttachments(report.attachments));

      // third table
      setContext(report.context);
      const [goalHeadings, goals] = calculateGoalsAndObjectives(report);
      setGoalsAndObjectiveHeadings(goalHeadings);
      setGoalsAndObjectives(goals);

      // next steps table
      setSpecialistNextSteps(report.specialistNextSteps.map((step) => step.note));
      setGranteeNextSteps(report.granteeNextSteps.map((step) => step.note));

      // review and submit table
      setCreatorNotes(report.additionalNotes);
    }).catch((err) => {
      // eslint-disable-next-line no-console
      console.log(err);
      setSomethingWentWrong(true);
    });
  }, [match.params.activityReportId, user]);

  async function handleCopyUrl() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setSuccessfullyCopiedClipboard(true);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
      setSomethingWentWrongWithClipboard(true);
    }
  }

  if (notAuthorized) {
    return (
      <>
        <Helmet>
          <title>Not authorized to view activity report</title>
        </Helmet>
        <div className="usa-alert usa-alert--error no-print" role="alert">
          <div className="usa-alert__body">
            <h4 className="usa-alert__heading">Unauthorized</h4>
            <p className="usa-alert__text">
              Sorry, you are not allowed to view this report
            </p>
          </div>
        </div>
      </>
    );
  }

  if (somethingWentWrong) {
    return (
      <>
        <Helmet>
          <title>Error displaying activity report - TTAHUB</title>
        </Helmet>
        <div className="usa-alert usa-alert--warning no-print">
          <div className="usa-alert__body">
            <p className="usa-alert__text">
              Sorry, something went wrong.
            </p>
          </div>
        </div>
      </>
    );
  }

  const onUnlock = async () => {
    await unlockReport(reportId);
    modalRef.current.toggleModal(false);
    updatedJustUnlocked(true);
  };

  const timezone = moment.tz.guess();
  const time = moment().tz(timezone).format('MM/DD/YYYY [at] h:mm a z');
  const message = {
    time,
    reportId,
    displayId,
    status: 'unlocked',
  };

  return (
    <>
      {justUnlocked && <Redirect to={{ pathname: '/activity-reports', state: { message } }} />}
      <Helmet>
        <title>
          {displayId}
          {' '}
          {creator}
          {' '}
          {startDate}
        </title>
      </Helmet>
      {successfullyCopiedClipboard ? (
        <div className="usa-alert usa-alert--success margin-bottom-2 no-print">
          <div className="usa-alert__body">
            <p className="usa-alert__text">Successfully copied URL</p>
          </div>
        </div>
      ) : null}
      {somethingWentWrongWithClipboard
        ? (
          <div className="usa-alert usa-alert--warning no-print">
            <div className="usa-alert__body">
              <p className="usa-alert__text">
                Sorry, something went wrong copying that url.
                {window.location.href && (
                  <>
                    {' '}
                    Here it is
                    {window.location.href}
                  </>
                )}
              </p>
            </div>
          </div>
        )
        : null}
      <Grid row>
        {navigator && navigator.clipboard
          ? <button type="button" className="usa-button no-print" disabled={modalRef && modalRef.current ? modalRef.current.modalIsOpen : false} onClick={handleCopyUrl}>Copy URL Link</button>
          : null}
        <button type="button" className="usa-button no-print" disabled={modalRef && modalRef.current ? modalRef.current.modalIsOpen : false} onClick={() => window.print()}>Print to PDF</button>
        {user && user.permissions && canUnlockReports(user)
          ? <ModalToggleButton type="button" className="usa-button usa-button--outline no-print" modalRef={modalRef} opener>Unlock report</ModalToggleButton>
          : null}
      </Grid>
      <Modal
        modalRef={modalRef}
        onOk={() => onUnlock()}
        modalId="UnlockReportModal"
        title="Unlock Activity Report"
        okButtonText="Unlock"
        okButtonAriaLabel="Unlock approved report will redirect to activity report page."
      >
        <>
          Are you sure you want to unlock this activity report?
          <br />
          <br />
          The report status will be set to
          {' '}
          <b>NEEDS ACTION</b>
          {' '}
          and
          {' '}
          <br />
          must be re-submitted for approval.
        </>
      </Modal>
      <Container className="ttahub-activity-report-view margin-top-2">
        <h1 className="landing">
          TTA activity report
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
            {collaborators.map((collaborator) => collaborator.fullName).join(', ')}
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
              recipientType,
              'Reason',
              'Program type',
              'Target populations',
              'Start date',
              'End date',
              'Topics',
              'Duration',
              'Number of participants',
              'Attendees',
              'Method of contact',
              'Requested by',
            ]
          }
          className="activity-summary-table"
          data={
            [
              recipients,
              reasons,
              programType,
              targetPopulations,
              startDate,
              endDate,
              topics,
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
              'OHS / ECLKC resources',
              'Non-ECLKC resources',
              'Supporting attachments',
            ]
          }
          data={
            [
              ECLKCResources,
              nonECLKCResourcesUsed,
              attachments,
            ]
          }
          allowBreakWithin={false}
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
          caption="Next steps"
          headings={
            [
              'Specialist next steps',
              "Grantee's next steps",
            ]
          }
          data={
            [
              specialistNextSteps,
              granteeNextSteps,
            ]
          }
        />
        <ViewTable
          className="no-print"
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
    permissions: PropTypes.arrayOf(PropTypes.shape({
      regionId: PropTypes.number.isRequired,
      scopeId: PropTypes.number.isRequired,
    })),
  }).isRequired,
};
