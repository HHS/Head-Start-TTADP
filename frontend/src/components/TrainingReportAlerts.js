import React, {
  useContext,
  useState,
  useEffect,
  useMemo,
} from 'react';
import { Link } from 'react-router-dom';
import UserContext from '../UserContext';
import { hasTrainingReportWritePermissions } from '../permissions';
import { getEventAlerts } from '../fetchers/event';
import WidgetContainer from './WidgetContainer';
import SimpleSortableTable from './SimpleSortableTable';

const idForLink = (eventId) => eventId.split('-').pop();

const ACTIONS_NEEDED = {
  noSessionsCreated: (alert) => <><Link to={`/training-report/${idForLink(alert.eventId)}/session/new/`} data-sort="no-sessions-created">Create a session</Link></>,
  missingEventInfo: (alert) => <><Link to={`/training-report/${idForLink(alert.eventId)}/event-summary`} data-sort="missing-event-info">Missing event info</Link></>,
  missingSessionInfo: (alert) => <><Link to={`/training-report/${idForLink(alert.eventId)}/session/${alert.id}/session-summary`} data-sort="missing-session-info">Missing session info</Link></>,
  eventNotCompleted: (alert) => <><Link to={`/training-report/view/${idForLink(alert.eventId)}`} data-sort="event-not-completed">Event not completed</Link></>,
};

export default function TrainingReportAlerts() {
  const [alerts, setAlerts] = useState(null);
  const { user } = useContext(UserContext);

  // sadly have to memoize this to prevent double fetching
  const shouldSeeAlerts = useMemo(() => hasTrainingReportWritePermissions(user), [user]);

  useEffect(() => {
    async function fetchAlerts() {
      try {
        const { eventAlerts } = await getEventAlerts();
        setAlerts(eventAlerts);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(err);
        setAlerts([]);
      }
    }

    if (!alerts && shouldSeeAlerts) {
      fetchAlerts();
    }
  }, [alerts, shouldSeeAlerts]);

  if (!alerts) {
    return null;
  }

  // map alerts here to include action links, etc
  const alertsForTable = alerts.map((alert) => ({
    sessionName: alert.sessionName,
    eventId: alert.eventId,
    eventName: alert.eventName,
    actionNeeded: ACTIONS_NEEDED[alert.alertType] ? ACTIONS_NEEDED[alert.alertType](alert) : '',
    id: alert.id,
  }));

  return (
    <WidgetContainer
      title="My training report alerts"
      subtitle="Events or sessions that require timely action"
      showPagingBottom={false}
      showPagingTop={false}
      loading={false}
    >
      {alertsForTable.length ? (
        <SimpleSortableTable
          columns={[
            { key: 'eventId', name: 'Event ID' },
            { key: 'eventName', name: 'Event Name' },
            { key: 'sessionName', name: 'Session Name' },
            { key: 'actionNeeded', name: 'Action needed' },
          ]}
          data={alertsForTable}
          elementSortProp="data-sort"
        />
      ) : <p className="usa-prose margin-x-3 margin-y-0 padding-y-3">You do not have any overdue tasks.</p>}
    </WidgetContainer>
  );
}
