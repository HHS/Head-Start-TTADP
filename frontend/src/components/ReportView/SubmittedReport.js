import React from 'react';
import Container from '../Container';
import {
  DATE_DISPLAY_FORMAT,
  DATEPICKER_VALUE_FORMAT,
} from '../../Constants';
import { formatDateValue } from '../../lib/dates';
import {
  formatTtaType,
  formatDelivery,
  formatSimpleArray,
  calculateGoalsAndObjectives,
  formatNextSteps,
  reportDataPropTypes,
  mapAttachments,
} from './helpers';
import ReadOnlyContent from '../ReadOnlyContent';

export default function SubmittedReport({ data }) {
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
  const startDate = formatDateValue(data.startDate, 'MMMM D, YYYY', DATEPICKER_VALUE_FORMAT);
  const endDate = formatDateValue(data.endDate, 'MMMM D, YYYY', DATEPICKER_VALUE_FORMAT);
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
  const approvedAt = data.approvedAt ? formatDateValue(data.approvedAt, DATE_DISPLAY_FORMAT) : '';
  const createdAt = formatDateValue(data.createdAt, DATE_DISPLAY_FORMAT);
  const submittedAt = data.submittedDate ? formatDateValue(data.submittedDate, DATE_DISPLAY_FORMAT) : '';

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

SubmittedReport.propTypes = reportDataPropTypes;
