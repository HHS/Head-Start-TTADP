import React from 'react';
import moment from 'moment-timezone';
import { v4 as uuidv4 } from 'uuid';
import Container from '../../../components/Container';
import {
  DATE_DISPLAY_FORMAT,
  DATEPICKER_VALUE_FORMAT,
} from '../../../Constants';
import {
  reportDataPropTypes, formatSimpleArray, mapAttachments,
} from '../helpers';
import ReadOnlyContent from '../../../components/ReadOnlyContent';
import RenderReviewCitations from '../../ActivityReport/Pages/components/RenderReviewCitations';

function formatNextSteps(nextSteps, heading) {
  return nextSteps.map((step, index) => ({
    heading: index === 0 ? heading : '',
    data: {
      [`Step ${index + 1}`]: step.note,
      'Anticipated completion': step.completeDate,
    },
    striped: false,
  }));
}

function formatObjectiveLinks(resources, isOtherEntity = false) {
  if (Array.isArray(resources) && resources.length > 0) {
    return (
      <ul>
        {resources.map((resource) => {
          const resourceValue = isOtherEntity ? resource.url : resource.value;
          return (
            <li key={uuidv4()}>
              <a
                href={resourceValue}
                rel="noreferrer"
              >
                { resourceValue }
              </a>
            </li>
          );
        })}
      </ul>
    );
  }
  return 'None provided';
}

function formatDelivery(method, virtualDeliveryType) {
  if (method === 'in-person') {
    return 'In Person';
  }

  if (method === 'virtual') {
    return virtualDeliveryType ? `Virtual: ${virtualDeliveryType}` : 'Virtual';
  }

  if (method === 'hybrid') {
    return 'Hybrid';
  }

  return '';
}

/**
 *
 * @param {String[]} ttaType
 * @returns String[]
 */

function formatTtaType(ttaType) {
  const dict = {
    training: 'Training',
    'technical-assistance': 'Technical assistance',
  };

  return ttaType.map((type) => dict[type]).join(', ');
}

function addObjectiveSectionsToArray(
  objectives,
  sections,
  activityRecipients,
  isOtherEntity = false,
) {
  const isStriped = false;
  objectives.forEach((objective) => {
    const objectiveSection = {
      heading: 'Objective summary',
      data: {
        'TTA objective': objective.title,
        ...(objective.citations && objective.citations.length > 0
          ? { 'Citations addressed': <RenderReviewCitations citations={objective.citations} activityRecipients={activityRecipients} className="" /> } : {}),
        Topics: formatSimpleArray(objective.topics.map(({ name }) => name)),
        'iPD courses': objective.courses.length ? formatSimpleArray(objective.courses.map(({ name }) => name)) : 'None provided',
        'Resource links': objective.resources.length ? formatObjectiveLinks(objective.resources, isOtherEntity) : 'None provided',
        'Resource attachments': objective.files.length ? mapAttachments(objective.files) : 'None provided',
        'TTA provided': objective.ttaProvided,
        'Support type': objective.supportType,
        'Objective status': objective.status,
        ...(objective.status === 'Suspended' ? {
          'Reason suspended': (
            objective.closeSuspendReason || ''
          ) + (` - ${objective.closeSuspendContext}` || ''),
        } : {}),
      },
      isStriped,
    };

    sections.push(objectiveSection);
  });
}

/**
 * @param {object[]} responses an array of FEI Goal response objects
 */
function getResponses(responses) {
  return responses[0].response.map((r) => r).join(', ');
}

/**
   *
   * @param {object} report an activity report object
   * @returns an array of two arrays, each of which contains strings
   */
function calculateGoalsAndObjectives(report) {
  const sections = [];
  const striped = false;

  if (report.activityRecipientType === 'recipient') {
    report.goalsAndObjectives.forEach((goal) => {
      const goalSection = {
        heading: 'Goal summary',
        data: {
          'Recipient\'s goal': goal.name,
          'Goal numbers': goal.goalNumbers.join(','),
        },
        striped,
      };

      // Adds "root cause" to the goal section if there are FEI responses
      const { responses } = goal;
      if (responses && responses.length) {
        const rootCauseData = {
          'Root cause': getResponses(responses),
        };
        goalSection.data = { ...goalSection.data, ...rootCauseData };
      }

      const { prompts } = goal;
      if (prompts && prompts.length) {
        const promptData = {};
        prompts.forEach((prompt) => {
          if (prompt.reportResponse.length > 0) {
            promptData[prompt.title] = prompt.reportResponse.join(', ');
          }
        });
        goalSection.data = { ...goalSection.data, ...promptData };
      }

      sections.push(goalSection);

      addObjectiveSectionsToArray(goal.objectives, sections, report.activityRecipients);
    });
  } else if (report.activityRecipientType === 'other-entity') {
    addObjectiveSectionsToArray(
      report.objectivesWithoutGoals,
      sections,
      report.activityRecipients,
      true,
    );
  }

  return sections;
}
export default function ApprovedReportV3({ data }) {
  const {
    reportId, ttaType, deliveryMethod, virtualDeliveryType,
  } = data;

  // first table
  const isRecipient = data.activityRecipientType === 'recipient';
  const arRecipients = data.activityRecipients.map((arRecipient) => arRecipient.name).sort().join(', ');
  const targetPopulations = data.targetPopulations.map((population) => population).join(', '); // Approvers.
  const approvingManagers = data.approvers.map((a) => a.user.fullName).join(', ');
  const collaborators = data.activityReportCollaborators.map(
    (a) => a.fullName,
  );

  const attendees = formatSimpleArray(data.participants);
  const languages = formatSimpleArray(data.language);
  const participantCount = deliveryMethod === 'hybrid'
    ? data.numberOfParticipantsInPerson.toString()
    : data.numberOfParticipants.toString();

  const participantVirtualCount = data.numberOfParticipantsVirtually
    ? data.numberOfParticipantsVirtually.toString()
    : null;
  const startDate = moment(data.startDate, DATEPICKER_VALUE_FORMAT).format('MMMM D, YYYY');
  const endDate = moment(data.endDate, DATEPICKER_VALUE_FORMAT).format('MMMM D, YYYY');
  const duration = `${data.duration} hours`;
  // const requester = formatRequester(data.requester);

  const goalSections = calculateGoalsAndObjectives(data);

  // second table
  const attachments = mapAttachments(data.files);

  // third table
  let {
    // eslint-disable-next-line prefer-const
    context, displayId,
  } = data;
  if (context === '') context = 'None provided';

  // next steps table
  const specialistNextSteps = formatNextSteps(data.specialistNextSteps, 'Specialist\'s next steps', true);
  const nextStepsLabel = isRecipient ? 'Recipient\'s next steps' : 'Other entities next steps';
  const recipientNextSteps = formatNextSteps(data.recipientNextSteps, nextStepsLabel, false);
  const approvedAt = data.approvedAt ? moment(data.approvedAt).format(DATE_DISPLAY_FORMAT) : '';
  const createdAt = moment(data.createdAt).format(DATE_DISPLAY_FORMAT);
  const submittedAt = data.submittedDate ? moment(data.submittedDate).format(DATE_DISPLAY_FORMAT) : '';

  const creator = data.author.fullName;

  const getNumberOfParticipants = () => {
    const isHybrid = deliveryMethod === 'hybrid';
    let numberOfParticipants = { [isHybrid ? 'Number of participants attending in person' : 'Number of participants attending']: participantCount };
    if (deliveryMethod === 'hybrid') {
      numberOfParticipants = {
        ...numberOfParticipants,
        'Number of participants attending virtually': participantVirtualCount,
      };
    }
    return numberOfParticipants;
  };

  return (
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

      <ReadOnlyContent
        key={`activity-summary-${reportId}`}
        title="Activity summary"
        sections={[
          {
            heading: 'Who was the activity for?',
            data: {
              Recipient: arRecipients,
              'Recipient participants': attendees,
              'Why activity requested': data.activityReason,
              'Target populations': targetPopulations,
            },
            striped: false,
          },
          {
            heading: 'Activity date',
            data: {
              'Start date': startDate,
              'End date': endDate,
              Duration: duration,
            },
            striped: false,
          },
          {
            heading: 'Context',
            data: {
              Context: context,
            },
            striped: false,
          },
          {
            heading: 'Training or technical assistance',
            data: {
              'TTA type': formatTtaType(ttaType),
              'Languages used': languages,
              'Delivery method': formatDelivery(deliveryMethod, virtualDeliveryType),
              ...getNumberOfParticipants(deliveryMethod),
            },
            striped: false,
          },
        ]}
      />

      <ReadOnlyContent
        key={`goals-and-objectives-${reportId}`}
        title="Goals and objectives"
        sections={goalSections}
      />

      <ReadOnlyContent
        key={`supporting-attachments${reportId}`}
        title="Supporting attachments"
        sections={
            [{
              heading: '',
              data: {
                Attachments: attachments,
              },
              striped: false,
            }]
          }
      />

      <ReadOnlyContent
        key={`next-steps${reportId}`}
        title="Next steps"
        sections={[
          ...specialistNextSteps,
          ...recipientNextSteps,
        ]}
      />
    </Container>
  );
}

ApprovedReportV3.propTypes = reportDataPropTypes;
