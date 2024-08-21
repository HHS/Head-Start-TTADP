import React, {
  useEffect,
  useContext,
  useState,
} from 'react';
import { capitalize } from 'lodash';
import { TRAINING_REPORT_STATUSES } from '@ttahub/common';
import ReactRouterPropTypes from 'react-router-prop-types';
import { Helmet } from 'react-helmet';
import { Alert } from '@trussworks/react-uswds';
import { eventById, completeEvent } from '../../fetchers/event';
import { getNamesByIds } from '../../fetchers/users';
import AppLoadingContext from '../../AppLoadingContext';
import BackLink from '../../components/BackLink';
import Container from '../../components/Container';
import ReadOnlyContent from '../../components/ReadOnlyContent';
import ApprovedReportSpecialButtons from '../../components/ApprovedReportSpecialButtons';
import './index.css';
import UserContext from '../../UserContext';

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

const FORBIDDEN = 403;

export default function ViewTrainingReport({ match }) {
  const [event, setEvent] = useState(null);
  const [alertMessage, setAlertMessage] = useState({
    type: 'error',
    message: '',
  });
  const [eventCollaborators, setEventCollaborators] = useState([]);
  const [eventPoc, setEventPoc] = useState([]);

  const { user } = useContext(UserContext);

  const { setIsAppLoading } = useContext(AppLoadingContext);

  useEffect(() => {
    async function fetchEvent() {
      try {
        setIsAppLoading(true);
        const e = await eventById(match.params.trainingReportId, true);
        setEvent(e);
      } catch (err) {
        let message = 'Sorry, something went wrong';
        setEvent({});

        if (err && err.status === FORBIDDEN) {
          message = 'You do not have permission to view this page';
        }

        setAlertMessage({
          type: 'error',
          message,
        });
      } finally {
        setIsAppLoading(false);
      }
    }
    if (!event) {
      fetchEvent();
    }
  }, [event, match.params.trainingReportId, setIsAppLoading]);

  useEffect(() => {
    async function fetchCollaborators() {
      if (event && event.collaboratorIds && event.collaboratorIds.length) {
        try {
          if (event.eventReportPilotNationalCenterUsers) {
            const collaborators = event.eventReportPilotNationalCenterUsers.filter((erpnc) => (
              event.collaboratorIds.includes(erpnc.userId)
            ));
            if (collaborators.length > 0) {
              setEventCollaborators(collaborators.map((c) => `${c.userName}, ${c.nationalCenterName}`));
              return;
            }
          }
          const collaborators = await getNamesByIds(event.collaboratorIds);
          setEventCollaborators(collaborators);
        } catch (err) {
          setEventCollaborators([]);
        }
      }
    }
    fetchCollaborators();
  }, [event]);

  useEffect(() => {
    async function fetchPoc() {
      if (event && event.pocIds && event.pocIds.length) {
        try {
          const pocs = await getNamesByIds(event.pocIds);
          setEventPoc(pocs);
        } catch (err) {
          setEventPoc([]);
        }
      }
    }
    fetchPoc();
  }, [event]);

  const pageTitle = event && event.data && event.data.eventId ? `Training event report ${event.data.eventId}` : 'Training event report';
  const ownerName = formatOwnerName(event);

  const canCompleteEvent = (() => {
    if (!event || !event.data) {
      return false;
    }
    const isOwner = event && event.ownerId === user.id;
    const isCompleteOrSuspended = [
      TRAINING_REPORT_STATUSES.COMPLETE,
      TRAINING_REPORT_STATUSES.SUSPENDED,
    ].includes(event.data.status || '');

    const eventSubmitted = event && event.data && event.data.eventSubmitted;
    const sessionReports = event && event.sessionReports ? event.sessionReports : [];

    if (!isOwner) {
      return false;
    }

    if (isCompleteOrSuspended) {
      return false;
    }

    // eslint-disable-next-line max-len
    if (sessionReports.length === 0 || !sessionReports.every((session) => session.data.status === TRAINING_REPORT_STATUSES.COMPLETE)) {
      return false;
    }

    if (!eventSubmitted) {
      return false;
    }

    return true;
  })();

  const onCompleteEvent = async () => {
    try {
      setAlertMessage({
        type: '',
        message: '',
      });

      setIsAppLoading(true);
      const { sessionReports: sessions, ...eventReport } = event;
      await completeEvent(match.params.trainingReportId, eventReport);
      setEvent(null);
      setAlertMessage({
        type: 'success',
        message: 'Event completed successfully',
      });
    } catch (err) {
      setAlertMessage({
        type: 'error',
        message: 'Sorry, something went wrong',
      });
    } finally {
      setIsAppLoading(false);
    }
  };

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
    },
    striped: true,
  }, {
    heading: 'Vision',
    data: {
      Vision: event.data.vision,
    },
  }] : [];

  const sessions = event && event.sessionReports ? event.sessionReports.map((session, index) => (
    <ReadOnlyContent
      key={session.id}
      title={`Session ${index + 1}`}
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
          Recipients: session.data.recipients ? session.data.recipients.map((r) => r.label).join(', ') : '',
          'Recipient participants': session.data.participants ? session.data.participants.join(', ') : [],
          'Number of participants': String((
            session.data.numberOfParticipants || 0
          ) + (
            session.data.numberOfParticipantsVirtually || 0
          ) + (
            session.data.numberOfParticipantsInPerson || 0
          )),
          'Delivery method': capitalize(session.data.deliveryMethod || ''),
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
        showCompleteEvent={canCompleteEvent}
        completeEvent={onCompleteEvent}
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

ViewTrainingReport.propTypes = {
  match: ReactRouterPropTypes.match.isRequired,
};
