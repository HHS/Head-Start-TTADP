import React from 'react';
import moment from 'moment-timezone';
import Container from '../../../components/Container';
import ViewTable from './ViewTable';
import {
  DATE_DISPLAY_FORMAT,
  DATEPICKER_VALUE_FORMAT,
} from '../../../Constants';
import {
  reportDataPropTypes, formatSimpleArray, mapAttachments, formatRequester,
} from '../helpers';

/**
 *
 * @param {object} report an activity report object
 * @returns an array of two arrays, each of which contains strings
 */
export function calculateGoalsAndObjectives(report) {
  const headings = [];
  const data = [];

  if (report.goalsAndObjectives.length > 0) {
    // assume recipient
    const { goalsAndObjectives } = report;

    goalsAndObjectives.forEach((goal, index) => {
      const displayNumber = index + 1;
      headings.push(`Goal ${displayNumber}`);
      data.push(goal.name);
      headings.push(`Goal ${displayNumber} Status`);
      data.push(goal.status);
      goal.objectives.forEach((objective, idx) => {
        const objectiveDisplayNumber = idx + 1;
        headings.push(`Objective ${objectiveDisplayNumber}`);
        data.push(objective.title);
        headings.push(`TTA Provided ${objectiveDisplayNumber}`);
        data.push(objective.ttaProvided);
        headings.push(`Objective ${objectiveDisplayNumber} status`);
        data.push(objective.status);
      });
    });

    return [headings, data];
  }

  // else, we assume other entity
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

function createResourceMarkup(resources) {
  return !resources ? [] : resources.map((resource) => {
    try {
      return <a href={new URL(resource)}>{resource}</a>;
    } catch (err) {
      return resource;
    }
  });
}

export default function ApprovedReportV1({ data }) {
  // first table
  const isRecipient = data.activityRecipientType === 'recipient';
  let recipientType = isRecipient ? 'Recipient' : 'Other entity';
  if (data.activityRecipients.length > 1) {
    recipientType = isRecipient ? 'Recipients' : 'Other entities';
  }

  const arRecipients = data.activityRecipients.map((arRecipient) => arRecipient.name).sort().join(', ');
  const targetPopulations = data.targetPopulations.map((population) => population).join(', '); // Approvers.
  const approvingManagers = data.approvers.map((a) => a.User.fullName).join(', ');
  const collaborators = data.activityReportCollaborators.map(
    (a) => a.fullName,
  );

  // Approver Notes.
  const managerNotes = data.approvers.map((a) => `
        <h2>${a.User.fullName}:</h2>
        ${a.note ? a.note : '<p>No manager notes</p>'}`).join('');

  const attendees = formatSimpleArray(data.participants);
  const participantCount = data.numberOfParticipants.toString();
  const reasons = formatSimpleArray(data.reason);
  const startDate = moment(data.startDate, DATEPICKER_VALUE_FORMAT).format('MMMM D, YYYY');
  const endDate = moment(data.endDate, DATEPICKER_VALUE_FORMAT).format('MMMM D, YYYY');
  const duration = `${data.duration} hours`;
  const method = formatMethod(data.ttaType, data.virtualDeliveryType);
  const requester = formatRequester(data.requester);

  // second table
  const topics = formatSimpleArray(data.topics || []);
  const ECLKCResources = createResourceMarkup(data.ECLKCResourcesUsed);
  const nonECLKCResourcesUsed = createResourceMarkup(data.nonECLKCResourcesUsed);
  const attachments = mapAttachments(data.files);

  // third table
  const {
    context, displayId, additionalNotes,
  } = data;
  const [goalsAndObjectiveHeadings, goalsAndObjectives] = calculateGoalsAndObjectives(data);

  // next steps table
  const specialistNextSteps = data.specialistNextSteps.map((step) => step.note);
  const recipientNextSteps = data.recipientNextSteps.map((step) => step.note);
  const approvedAt = data.approvedAt ? moment(data.approvedAt).format(DATE_DISPLAY_FORMAT) : '';
  const createdAt = moment(data.createdAt).format(DATE_DISPLAY_FORMAT);
  const submittedAt = data.submittedDate ? moment(data.submittedDate).format(DATE_DISPLAY_FORMAT) : '';

  const creator = data.author && data.author.fullName ? data.author.fullName : '';

  return (
    <>
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
          <p>
            <strong>Collaborators:</strong>
            {' '}
            {collaborators.map((collaborator) => collaborator).join(', ')}
          </p>
          <p>
            <strong>Managers:</strong>
            {' '}
            {approvingManagers}
          </p>
          <p className="no-print">
            <strong>Date created:</strong>
            {' '}
            {createdAt}
          </p>
          { submittedAt !== ''
            ? (
              <p>
                <strong>Date submitted:</strong>
                {' '}
                {submittedAt}
              </p>
            )
            : null }
          { approvedAt !== ''
            ? (
              <p>
                <strong>Date approved:</strong>
                {' '}
                {approvedAt}
              </p>
            )
            : null }
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
              'Context',
            ]
          }
          className="activity-summary-table"
          data={
            [
              arRecipients,
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
              context,
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
            ...goalsAndObjectiveHeadings,
          ]}
          data={
            [
              ...goalsAndObjectives,
            ]
          }
        />
        <ViewTable
          caption="Next steps"
          headings={
            [
              'Specialist next steps',
              "Recipient's next steps",
            ]
          }
          data={
            [
              specialistNextSteps,
              recipientNextSteps,
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
              additionalNotes,
              managerNotes,
            ]
          }
        />
      </Container>
    </>
  );
}

ApprovedReportV1.propTypes = reportDataPropTypes;
