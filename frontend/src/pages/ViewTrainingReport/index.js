import React, {
  useEffect,
  useContext,
  useState,
  useMemo,
} from 'react';
import ReactRouterPropTypes from 'react-router-prop-types';
import { eventById, completeEvent } from '../../fetchers/event';
import { getNamesByIds } from '../../fetchers/users';
import AppLoadingContext from '../../AppLoadingContext';
import UserContext from '../../UserContext';
import TrainingReportV1 from './TrainingReportV1';
import TrainingReportV2 from './TrainingReportV2';
import isAdmin from '../../permissions';

const FORBIDDEN = 403;

const TEMPLATE_COMPONENT = {
  1: TrainingReportV1,
  2: TrainingReportV2,
};

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

  // Get version from event, default to 2
  const version = event?.version || 2;
  const TemplateComponent = TEMPLATE_COMPONENT[version] || TrainingReportV2;

  return (
    <TemplateComponent
      event={event}
      eventCollaborators={eventCollaborators}
      eventPoc={eventPoc}
      alertMessage={alertMessage}
      onCompleteEvent={version === 2 ? onCompleteEvent : undefined}
      user={version === 2 ? user : undefined}
      isAdminUser={version === 2 ? isAdminUser : undefined}
    />
  );
}

ViewTrainingReport.propTypes = {
  match: ReactRouterPropTypes.match.isRequired,
};
