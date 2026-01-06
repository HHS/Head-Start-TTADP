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
import './TrainingReportAlerts.css';

const idForLink = (eventId) => eventId.split('-').pop();

const ACTIONS_NEEDED = {
  noSessionsCreated: (alert) => <><Link to={`/training-report/${idForLink(alert.eventId)}/session/new/`} data-sort="no-sessions-created">Create a session</Link></>,
  missingEventInfo: (alert) => <><Link to={`/training-report/${idForLink(alert.eventId)}/event-summary`} data-sort="missing-event-info">Missing event info</Link></>,
  missingSessionInfo: (alert) => <><Link to={`/training-report/${idForLink(alert.eventId)}/session/${alert.id}/session-summary`} data-sort="missing-session-info">Missing session info</Link></>,
  eventNotCompleted: (alert) => <><Link to={`/training-report/view/${idForLink(alert.eventId)}`} data-sort="event-not-completed">Event not completed</Link></>,
  waitingForApproval: (alert) => <><Link to={`/training-report/${idForLink(alert.eventId)}/session/${alert.id}/review`} data-sort="waiting-for-approval">Waiting for approval</Link></>,
  changesNeeded: (alert) => <><Link to={`/training-report/${idForLink(alert.eventId)}/session/${alert.id}/session-summary`} data-sort="changes-needed">Changes needed</Link></>,
};

export default function TrainingReportAlerts() {
  const [alerts, setAlerts] = useState(null);
  const { user } = useContext(UserContext);

  // sadly have to memoize this to prevent double fetching
  const shouldSeeAlerts = useMemo(() => hasTrainingReportWritePermissions(user), [user]);

  useEffect(() => {
    async function fetchAlerts() {
      try {
        const eventAlerts = await getEventAlerts();
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

  const columns = [
    { key: 'eventId', name: 'Event ID' },
    { key: 'eventName', name: 'Event Name' },
    { key: 'sessionName', name: 'Session Name' },
    { key: 'collaborators', name: 'Collaborators' },
    { key: 'approver', name: 'Approver' },
    { key: 'actionNeeded', name: 'Action needed' },
  ];

  // map alerts here to include action links, etc
  const alertsForTable = alerts.map((alert) => ({
    sessionName: alert.sessionName,
    eventId: alert.eventId,
    eventName: alert.eventName,
    collaborators: alert.collaboratorNames ? alert.collaboratorNames.join(', ') : '--',
    approver: alert.approverName || '--',
    actionNeeded: ACTIONS_NEEDED[alert.alertType] ? ACTIONS_NEEDED[alert.alertType](alert) : '',
    id: alert.id,
  }));

  return (
    <WidgetContainer
      className="ttahub-training-report-alerts-container"
      title="My training report alerts"
      subtitle="Events or sessions that require timely action"
      showPagingBottom={false}
      showPagingTop={false}
      loading={false}
    >
      {alertsForTable.length ? (
        <div className="ttahub-training-report-alerts-scrollable">
          <SimpleSortableTable
            className="ttahub-training-report-alerts"
            columns={columns}
            data={alertsForTable}
            elementSortProp="data-sort"
          />
        </div>
      ) : <p className="font-serif-md margin-0 padding-10 text-bold text-center">You have no events or sessions that require action</p>}
    </WidgetContainer>
  );
}
