import React from 'react';
import PropTypes from 'prop-types';
import { capitalize } from 'lodash';
import { Helmet } from 'react-helmet';
import { Alert } from '@trussworks/react-uswds';
import BackLink from '../../components/BackLink';
import Container from '../../components/Container';
import ReadOnlyContent from '../../components/ReadOnlyContent';
import ApprovedReportSpecialButtons from '../../components/ApprovedReportSpecialButtons';

export const formatOwnerName = (event) => {
  try {
    if (event && event.owner && event.owner.nameWithNationalCenters) {
      return event.owner.nameWithNationalCenters;
    }

    if (event && event.data && event.data.owner) {
      if (event.eventReportPilotNationalCenterUsers) {
        const user = event.eventReportPilotNationalCenterUsers
          .find((erpnc) => erpnc.userId === event.data.owner.id);

        if (user) {
          return `${user.userName}, ${user.nationalCenterName}`;
        }
      }

      if (event.data.owner.name) {
        return event.data.owner.name;
      }
    }

    return '';
  } catch (err) {
    return '';
  }
};

const formatNextSteps = (nextSteps, heading, striped) => {
  const data = nextSteps.reduce((acc, step, index) => ({
    ...acc,
    [`Step ${index + 1}`]: step.note,
    [`Step ${index + 1} anticipated completion`]: step.completeDate,
  }), {});

  return {
    heading,
    striped,
    data,
  };
};

export default function TrainingReportV1({
  event,
  eventCollaborators,
  eventPoc,
  alertMessage,
}) {
  const pageTitle = event && event.data && event.data.eventId ? `Training event report ${event.data.eventId}` : 'Training event report';
  const ownerName = formatOwnerName(event);

  const eventSummary = event && event.data ? [{
    heading: 'Event Summary',
    data: {
      'Event name': event.data.eventName,
      'Event creator': ownerName,
      Region: String(event.regionId),
      'Event organizer': event.data.eventOrganizer,
      'Event collaborators': eventCollaborators,
      'Regional point of contact': eventPoc,
      'Intended audience': event.data.audience,
      'Start date': event.data.startDate,
      'End date': event.data.endDate,
      'Training type': event.data['Event Duration/# NC Days of Support'],
      Reasons: event.data.reasons,
      'Target populations': event.data.targetPopulations,
      Vision: event.data.vision,
    },
    striped: true,
  }] : [];

  const isIstVisit = (session) => {
    if (session.data.isIstVisit === 'yes' || (session.data.regionalOfficeTta && session.data.regionalOfficeTta.length > 0)) {
      return true;
    }
    return false;
  };

  const generateIstOfficeOrRecipientProperties = (session) => {
    if (isIstVisit(session)) {
      return {
        'Regional Office/TTA': session.data.regionalOfficeTta.join(', '),
      };
    }

    return {
      Recipients: session.data.recipients ? session.data.recipients.map((r) => r.label).join(', ') : '',
      'Recipient participants': session.data.participants ? session.data.participants.join(', ') : [],
    };
  };

  const generateNumberOfParticipants = (session) => {
    // In person or virtual.
    if (session.data.deliveryMethod === 'in-person' || session.data.deliveryMethod === 'virtual') {
      const numberOfParticipants = session.data.numberOfParticipants ? session.data.numberOfParticipants.toString() : '';
      return {
        'Number of participants': numberOfParticipants,
      };
    }
    // Hybrid.
    const numberOfParticipantsInPerson = session.data.numberOfParticipantsInPerson ? session.data.numberOfParticipantsInPerson.toString() : '';
    const numberOfParticipantsVirtually = session.data.numberOfParticipantsVirtually ? session.data.numberOfParticipantsVirtually.toString() : '';
    return {
      'Number of participants attending in person': numberOfParticipantsInPerson,
      'Number of participants attending virtually': numberOfParticipantsVirtually,
    };
  };

  const sessions = event && event.sessionReports ? event.sessionReports.map((session, index) => (
    <ReadOnlyContent
      key={session.id}
      title={`Session ${index + 1}`}
      displayStatus={session.data.status || 'Not started'}
      sections={[{
        heading: 'Session Summary',
        striped: true,
        data: {
          'Session name': session.data.sessionName,
          'Session start date': session.data.startDate,
          'Session end date': session.data.endDate,
          'Session duration': `${session.data.duration || 0} hours`,
          'Session context': session.data.context,
        },
      }, {
        heading: 'Objective summary',
        data: {
          'Session objective': session.data.objective,
          Topics: session.data.objectiveTopics,
          Trainers: session.data.objectiveTrainers,
          'Resource links': session.data.objectiveResources ? session.data.objectiveResources.map((o) => o.value) : [],
          'iPD Courses': session.data.courses ? session.data.courses.map((o) => o.name) : [],
          'Resource attachments': session.data.files ? session.data.files.map((f) => f.originalFileName) : [],
          'Support type': session.data.objectiveSupportType,
        },
      }, {
        heading: 'Participants',
        striped: true,
        data: {
          'IST visit': isIstVisit(session) ? 'Yes' : 'No',
          ...generateIstOfficeOrRecipientProperties(session),
          'Delivery method': capitalize(session.data.deliveryMethod || ''),
          ...generateNumberOfParticipants(session),
          'Language used': session.data.language ? session.data.language.join(', ') : [],
          'TTA provided': session.data.ttaProvided,
        },
      },
      formatNextSteps(session.data.specialistNextSteps || [], 'Specialist\'s next steps', false),
      formatNextSteps(session.data.recipientNextSteps || [], 'Recipient\'s next steps', true),
      ]}
    />
  )) : null;

  const backLinkUrl = (() => {
    if (!event || !event.data || !event.data.status) {
      return '/training-reports/not-started';
    }

    return `/training-reports/${event.data.status.replace(' ', '-').toLowerCase()}`;
  })();

  return (
    <>
      <Helmet>
        <title>
          Training Event Report
          {' '}
          {(event && event.data) ? String(event.data.eventId) : ''}
        </title>
      </Helmet>
      <BackLink to={backLinkUrl}>
        Back to Training Reports
      </BackLink>
      <ApprovedReportSpecialButtons
        showCompleteEvent={false}
        onCompleteEvent={() => {}}
      />
      <Container className="margin-top-2 maxw-tablet-lg ttahub-completed-training-report-container">
        { alertMessage.message && (
        <Alert type={alertMessage.type}>
          {alertMessage.message}
        </Alert>
        )}
        <h1 className="landing">{pageTitle}</h1>
        <ReadOnlyContent
          title="Event"
          sections={eventSummary}
        />
        { sessions }
      </Container>
    </>
  );
}

TrainingReportV1.propTypes = {
  event: PropTypes.shape({
    id: PropTypes.number,
    ownerId: PropTypes.number,
    regionId: PropTypes.number,
    version: PropTypes.number,
    data: PropTypes.shape({
      eventId: PropTypes.string,
      eventName: PropTypes.string,
      eventOrganizer: PropTypes.string,
      audience: PropTypes.string,
      startDate: PropTypes.string,
      endDate: PropTypes.string,
      'Event Duration/# NC Days of Support': PropTypes.string,
      reasons: PropTypes.arrayOf(PropTypes.string),
      targetPopulations: PropTypes.arrayOf(PropTypes.string),
      vision: PropTypes.string,
      status: PropTypes.string,
      owner: PropTypes.shape({
        id: PropTypes.number,
        name: PropTypes.string,
      }),
    }),
    owner: PropTypes.shape({
      nameWithNationalCenters: PropTypes.string,
    }),
    sessionReports: PropTypes.arrayOf(PropTypes.shape({
      id: PropTypes.number,
      data: PropTypes.shape({
        sessionName: PropTypes.string,
        startDate: PropTypes.string,
        endDate: PropTypes.string,
        duration: PropTypes.number,
        context: PropTypes.string,
        objective: PropTypes.string,
        objectiveTopics: PropTypes.arrayOf(PropTypes.string),
        objectiveTrainers: PropTypes.arrayOf(PropTypes.string),
        objectiveResources: PropTypes.arrayOf(PropTypes.shape({
          value: PropTypes.string,
        })),
        courses: PropTypes.arrayOf(PropTypes.shape({
          name: PropTypes.string,
        })),
        files: PropTypes.arrayOf(PropTypes.shape({
          originalFileName: PropTypes.string,
        })),
        objectiveSupportType: PropTypes.string,
        isIstVisit: PropTypes.string,
        regionalOfficeTta: PropTypes.arrayOf(PropTypes.string),
        recipients: PropTypes.arrayOf(PropTypes.shape({
          label: PropTypes.string,
        })),
        participants: PropTypes.arrayOf(PropTypes.string),
        deliveryMethod: PropTypes.string,
        numberOfParticipants: PropTypes.number,
        numberOfParticipantsInPerson: PropTypes.number,
        numberOfParticipantsVirtually: PropTypes.number,
        language: PropTypes.arrayOf(PropTypes.string),
        ttaProvided: PropTypes.string,
        specialistNextSteps: PropTypes.arrayOf(PropTypes.shape({
          note: PropTypes.string,
          completeDate: PropTypes.string,
        })),
        recipientNextSteps: PropTypes.arrayOf(PropTypes.shape({
          note: PropTypes.string,
          completeDate: PropTypes.string,
        })),
        status: PropTypes.string,
      }),
    })),
    eventReportPilotNationalCenterUsers: PropTypes.arrayOf(PropTypes.shape({
      userId: PropTypes.number,
      userName: PropTypes.string,
      nationalCenterName: PropTypes.string,
    })),
    collaboratorIds: PropTypes.arrayOf(PropTypes.number),
    pocIds: PropTypes.arrayOf(PropTypes.number),
  }),
  eventCollaborators: PropTypes.arrayOf(PropTypes.string),
  eventPoc: PropTypes.arrayOf(PropTypes.string),
  alertMessage: PropTypes.shape({
    type: PropTypes.string,
    message: PropTypes.string,
  }),
};

TrainingReportV1.defaultProps = {
  event: null,
  eventCollaborators: [],
  eventPoc: [],
  alertMessage: {
    type: '',
    message: '',
  },
};
