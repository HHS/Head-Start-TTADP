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
    return (
      <ul>
        {
          attachments.map((attachment) => (
            <li key={attachment.url.url}>
              <a href={attachment.url.url}>{attachment.originalFileName}</a>
            </li>
          ))
        }
      </ul>
    );
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
  const [successfullyCopiedClipboard, setSuccessfullyCopiedClipboard] = useState(false);
  const [somethingWentWrongWithClipboard, setSomethingWentWrongWithClipboard] = useState(false);
  const [justUnlocked, updatedJustUnlocked] = useState(false);

  const [report, setReport] = useState({
    reportId: 0,
    displayId: '',
    recipientType: 'Grantee',
    creator: '',
    collaborators: [],
    approvingManagers: '',
    attendees: '',
    participantCount: '',
    reasons: '',
    targetPopulations: '',
    startDate: '',
    endDate: '',
    duration: '',
    recipients: '',
    method: '',
    requester: '',
    topics: '',
    ECLKCResources: '',
    nonECLKCResourcesUsed: '',
    attachments: [],
    context: '',
    goalsAndObjectiveHeadings: [],
    goalsAndObjectives: [],
    managerNotes: '',
    creatorNotes: '',
    granteeNextSteps: [],
    specialistNextSteps: [],
    createdAt: '',
    approvedAt: '',
  });

  const modalRef = useRef();

  useEffect(() => {
    const allowedRegions = allRegionsUserHasPermissionTo(user);

    if (!parseInt(match.params.activityReportId, 10)) {
      setSomethingWentWrong(true);
      return;
    }

    async function fetchReport() {
      try {
        const data = await getReport(match.params.activityReportId);

        if (!allowedRegions.includes(data.regionId)) {
          setNotAuthorized(true);
          return;
        }

        // first table
        let recipientType = data.activityRecipients[0].grantId ? 'Grantee' : 'Non-grantee';
        if (data.activityRecipients.length > 1) {
          recipientType = `${recipientType}s`;
        }

        const arRecipients = data.activityRecipients.map((arRecipient) => arRecipient.name).sort().join(', ');
        const targetPopulations = data.targetPopulations.map((population) => population).join(', '); // Approvers.
        const approvingManagers = data.approvers.map((a) => a.User.fullName).join(', ');

        // Approver Notes.
        const managerNotes = data.approvers.map((a) => `
        <h2>${a.User.fullName}:</h2>
        ${a.note ? a.note : '<p>No manager notes</p>'}`).join('');

        const attendees = formatSimpleArray(data.participants);
        const participantCount = data.numberOfParticipants.toString();
        const reasons = formatSimpleArray(data.reason);
        const startDate = moment(data.startDate, DATE_DISPLAY_FORMAT).format('MMMM D, YYYY');
        const endDate = moment(data.endDate, DATE_DISPLAY_FORMAT).format('MMMM D, YYYY');
        const duration = `${data.duration} hours`;
        const method = formatMethod(data.ttaType, data.virtualDeliveryType);
        const requester = formatRequester(data.requester);

        // second table
        const topics = formatSimpleArray(data.topics);
        const ECLKCResources = createResourceMarkup(data.ECLKCResourcesUsed);
        const nonECLKCResourcesUsed = createResourceMarkup(data.nonECLKCResourcesUsed);
        const attachments = mapAttachments(data.attachments);

        // third table
        const {
          context, id, displayId, additionalNotes, collaborators,
        } = data;
        const [goalsAndObjectiveHeadings, goalsAndObjectives] = calculateGoalsAndObjectives(data);

        // next steps table
        const specialistNextSteps = data.specialistNextSteps.map((step) => step.note);
        const granteeNextSteps = data.granteeNextSteps.map((step) => step.note);
        const approvedAt = data.approvedAt ? moment(data.approvedAt).format(DATE_DISPLAY_FORMAT) : '';
        const createdAt = moment(data.createdAt).format(DATE_DISPLAY_FORMAT);

        // review and submit table
        setReport({
          reportId: id,
          displayId,
          recipientType,
          creator: data.author.fullName,
          collaborators,
          approvingManagers,
          attendees,
          participantCount,
          reasons,
          targetPopulations,
          startDate,
          endDate,
          duration,
          recipients: arRecipients,
          method,
          requester,
          topics,
          ECLKCResources,
          nonECLKCResourcesUsed,
          attachments,
          context,
          goalsAndObjectiveHeadings,
          goalsAndObjectives,
          managerNotes,
          creatorNotes: additionalNotes,
          granteeNextSteps,
          specialistNextSteps,
          createdAt,
          approvedAt,
        });
      } catch (err) {
        // eslint-disable-next-line no-console
        console.log(err);
        setSomethingWentWrong(true);
      }
    }

    fetchReport();
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

  const {
    reportId,
    displayId,
    recipientType,
    creator,
    collaborators,
    approvingManagers,
    attendees,
    participantCount,
    reasons,
    targetPopulations,
    startDate,
    endDate,
    duration,
    recipients,
    method,
    requester,
    topics,
    ECLKCResources,
    nonECLKCResourcesUsed,
    attachments,
    context,
    goalsAndObjectiveHeadings,
    goalsAndObjectives,
    managerNotes,
    creatorNotes,
    granteeNextSteps,
    specialistNextSteps,
    createdAt,
    approvedAt,
  } = report;

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
        <div className="ttahub-activity-report-view-creator-data margin-bottom-4">
          <p>
            <strong>Creator:</strong>
            {' '}
            {creator}
          </p>
          <p className="no-print">
            <strong>Date created:</strong>
            {' '}
            {createdAt}
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
          <p>
            <strong>Date approved:</strong>
            {' '}
            {approvedAt}
          </p>
        </div>
        <ViewTable
          caption="Activity summary"
          headings={
            [
              recipientType,
              'Reason',
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
