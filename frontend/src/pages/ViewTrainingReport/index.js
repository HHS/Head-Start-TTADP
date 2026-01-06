import React, {
  useEffect,
  useContext,
  useState,
  useMemo,
} from 'react';
import { capitalize } from 'lodash';
import { TRAINING_REPORT_STATUSES } from '@ttahub/common';
import ReactRouterPropTypes from 'react-router-prop-types';
import { Helmet } from 'react-helmet';
import { Alert } from '@trussworks/react-uswds';
import { REPORT_STATUSES } from '@ttahub/common/src/constants';
import { eventById, completeEvent } from '../../fetchers/event';
import { getNamesByIds } from '../../fetchers/users';
import AppLoadingContext from '../../AppLoadingContext';
import BackLink from '../../components/BackLink';
import Container from '../../components/Container';
import ReadOnlyContent from '../../components/ReadOnlyContent';
import ApprovedReportSpecialButtons from '../../components/ApprovedReportSpecialButtons';
import './index.css';
import UserContext from '../../UserContext';
import { EVENT_PARTNERSHIP, TRAINING_EVENT_ORGANIZER } from '../../Constants';
import isAdmin from '../../permissions';

const FORBIDDEN = 403;

export const formatOwnerName = (event) => {
  try {
    if (event && event.owner && event.owner.fullName) {
      return event.owner.fullName;
    }

    if (event.data.owner.name) {
      return event.data.owner.name;
    }

    return '';
  } catch (err) {
    return '';
  }
};

export const translateEventPartnership = (eventPartnership) => {
  switch (eventPartnership) {
    case EVENT_PARTNERSHIP.REGIONAL_HSA:
      return 'Yes, Regional HSA';
    case EVENT_PARTNERSHIP.STATE_HSA:
      return 'Yes, State HSA';
    case EVENT_PARTNERSHIP.NO:
      return 'No';
    default:
      return '';
  }
};

export const formatObjectiveLinks = (objectiveResources) => {
  if (Array.isArray(objectiveResources)) {
    const resources = objectiveResources.filter((res) => res.value && res.value.trim() !== '');
    if (resources.length > 0) {
      return (
        <ul className="margin-top-0">
          {resources.map((resource) => (
            <li key={resource.value}>
              <a
                href={resource.value}
                rel="noreferrer"
              >
                {resource.value}
              </a>
            </li>
          ))}
        </ul>
      );
    }
  }

  return 'None provided';
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

const formatSupportingGoals = (sessionGoalTemplates) => {
  if (!sessionGoalTemplates || sessionGoalTemplates.length === 0) {
    return 'None';
  }
  return sessionGoalTemplates.map((goal) => goal.label || goal).join(', ');
};

export const handleIntendedAudience = (audience) => {
  const audienceMap = {
    recipients: 'Recipients',
    'regional-office-tta': 'Regional office/TTA',
  };
  return audienceMap[audience] || audience;
};

export const formatSupportingAttachments = (attachments) => {
  if (Array.isArray(attachments) && attachments.length > 0) {
    return (
      <ul className="margin-top-0">
        {attachments.map((attachment) => {
          const { originalFileName } = attachment;
          const { url } = attachment.url;
          return (
            <li key={originalFileName}>
              <a
                href={url}
                rel="noreferrer"
              >
                {originalFileName}
              </a>
            </li>
          );
        })}
      </ul>
    );
  }

  return 'None provided';
};

const handleArrayJoin = (arr, join = ', ', alt = 'None') => (arr && arr.length ? arr.join(join) : alt);

export default function ViewTrainingReport({ match }) {
  const [event, setEvent] = useState(null);
  const [alertMessage, setAlertMessage] = useState({
    type: 'error',
    message: '',
  });
  const [eventCollaborators, setEventCollaborators] = useState([]);
  const [eventPoc, setEventPoc] = useState([]);

  const { user } = useContext(UserContext);

  const isAdminUser = useMemo(() => isAdmin(user), [user]);

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
      if (
        event
        && event.pocIds
        && event.pocIds.length
      ) {
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

    if (!isOwner && !isAdminUser) {
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

  const organizerIsNoNationalCenters = (
    (event?.data?.eventOrganizer || '') === TRAINING_EVENT_ORGANIZER.REGIONAL_TTA_NO_NATIONAL_CENTERS
  );

  const eventSummary = event && event.data ? [{
    heading: 'Event Summary',
    data: {
      'Event name': event.data.eventName,
      'Event creator': ownerName,
      Region: `Region ${String(event.regionId)}`,
      'Event organizer': event.data.eventOrganizer,
      'Additional states involved': handleArrayJoin(event.data.additionalStates),
      'In partnership with HSA': translateEventPartnership(event.data.eventPartnership),
      'Event collaborators': handleArrayJoin(eventCollaborators),
      ...(
        !organizerIsNoNationalCenters ? { 'Regional point of contact': handleArrayJoin(eventPoc) } : {}
      ),
      'Intended audience': handleIntendedAudience(event.data.eventIntendedAudience),
      'Start date': event.data.startDate,
      'End date': event.data.endDate,
      'Training type': event.data.trainingType,
      'Target populations': handleArrayJoin(event.data.targetPopulations),
      Vision: event.data.vision,
    },
    striped: true,
  }] : [];

  const generateIstOfficeOrRecipientProperties = (session) => ({
    Recipients: session.data.recipients ? session.data.recipients.map((r) => r.label).join(', ') : '',
    'Recipient participants': session.data.participants ? session.data.participants.join(', ') : [],
  });

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

  const displayStatus = (status) => {
    if (status) {
      if (status === REPORT_STATUSES.NEEDS_ACTION) {
        return 'In progress';
      }

      return status;
    }
    return 'Not started';
  };

  const sessions = event && event.sessionReports ? event.sessionReports.map((session, index) => (
    <ReadOnlyContent
      key={session.id}
      title={`Session ${index + 1}`}
      displayStatus={displayStatus(session.data.status)}
      sections={[{
        heading: 'Session Summary',
        striped: true,
        data: {
          'Session name': session.data.sessionName,
          'Session start date': session.data.startDate,
          'Session end date': session.data.endDate,
          'Session duration': `${session.data.duration || 0} hours`,
          'Session context': session.data.context || 'None provided',
        },
      }, {
        heading: 'Objective summary',
        data: {
          'Session objective': session.data.objective,
          'Supporting goals': formatSupportingGoals(session.data.sessionGoalTemplates),
          Topics: handleArrayJoin(session.data.objectiveTopics, ', '),
          Trainers: handleArrayJoin(session.data.objectiveTrainers),
          'iPD Courses': session.data.courses && session.data.courses.length ? session.data.courses.map((o) => o.name).join(', ') : 'None',
          'Resource links': formatObjectiveLinks(session.data.objectiveResources),
          'Resource attachments': session.data.files && session.data.files.length ? session.data.files.map((f) => f.originalFileName) : 'None',
          'TTA provided': session.data.ttaProvided,
          'Support type': session.data.objectiveSupportType,
        },
      }, {
        heading: 'Participants',
        striped: true,
        data: {
          ...generateIstOfficeOrRecipientProperties(session),
          'TTA type': handleArrayJoin((session.data.ttaType || []).map((t) => capitalize(t).replace(/-/g, ' '))),
          'Delivery method': capitalize(session.data.deliveryMethod || ''),
          ...generateNumberOfParticipants(session),
          'Language used': session.data.language ? session.data.language.join(', ') : [],
        },
      },
      {
        heading: 'Supporting attachments',
        data: {
          Attachments: formatSupportingAttachments(session.supportingAttachments || []),
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
        onCompleteEvent={onCompleteEvent}
      />
      <Container className="margin-top-2 maxw-tablet-lg ttahub-completed-training-report-container">
        { alertMessage.message && (
        <Alert type={alertMessage.type}>
          {alertMessage.message}
        </Alert>
        )}
        <h1 className="landing margin-0 margin-bottom-4">{pageTitle}</h1>
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
