import React, { useState, useContext, useRef } from 'react';
import PropTypes from 'prop-types';
import { Alert } from '@trussworks/react-uswds';
import { TRAINING_REPORT_STATUSES } from '@ttahub/common';
import { v4 as uuidv4 } from 'uuid';
import { Link, useHistory } from 'react-router-dom';
import { completeEvent, resumeEvent, suspendEvent } from '../../../fetchers/event';
import UserContext from '../../../UserContext';
import { eventPropTypes } from '../constants';
import ContextMenu from '../../../components/ContextMenu';
import { checkForDate } from '../../../utils';
import ExpanderButton from '../../../components/ExpanderButton';
import SessionCard from './SessionCard';
import Modal from '../../../components/Modal';
import isAdmin from '../../../permissions';
import { TRAINING_EVENT_ORGANIZER } from '../../../Constants';
import './EventCard.scss';

function EventCard({
  event,
  onRemoveSession,
  onDeleteEvent,
  zIndex,
  alerts,
  removeEventFromDisplay,
}) {
  const modalRef = useRef(null);
  const { user } = useContext(UserContext);
  const history = useHistory();
  const hasAdminRights = isAdmin(user);
  const {
    id,
    data,
    sessionReports,
  } = event;

  const { eventOrganizer } = data;

  const [message, setMessage] = useState({
    text: '',
    type: 'error',
  });
  const [eventStatus, setEventStatus] = useState(data.status);

  const { eventId, eventSubmitted } = data;
  const idForLink = eventId.split('-').pop();
  const isOwner = event.ownerId === user.id;
  const isPoc = event.pocIds && event.pocIds.includes(user.id);
  const isCollaborator = event.collaboratorIds && event.collaboratorIds.includes(user.id);
  const isOwnerOrCollaborator = isOwner || isCollaborator;
  const isSuspended = data.status === TRAINING_REPORT_STATUSES.SUSPENDED;
  const isComplete = data.status === TRAINING_REPORT_STATUSES.COMPLETE;
  const isNotCompleteOrSuspended = !isComplete && !isSuspended;

  const canEditEvent = ((isOwner && !eventSubmitted && isNotCompleteOrSuspended)
    || (hasAdminRights && isNotCompleteOrSuspended));
  const canCreateSession = (isNotCompleteOrSuspended && isOwnerOrCollaborator) || hasAdminRights;
  const canDeleteEvent = hasAdminRights && (data.status === TRAINING_REPORT_STATUSES.NOT_STARTED
  || data.status === TRAINING_REPORT_STATUSES.SUSPENDED);
  const menuItems = [];

  const setParentMessage = (msg) => {
    alerts.setParentMessage(null);
    alerts.setMessage(msg);
  };

  const canCompleteEvent = (() => {
    if (!isOwner) {
      return false;
    }

    if (!isNotCompleteOrSuspended) {
      return false;
    }

    if (!eventSubmitted) {
      return false;
    }

    // eslint-disable-next-line max-len
    if (sessionReports.length === 0 || !sessionReports.every((session) => session.data.status === TRAINING_REPORT_STATUSES.COMPLETE)) {
      return false;
    }

    return true;
  })();

  if (canCreateSession) {
    // Create session.
    menuItems.push({
      label: 'Create session',
      onClick: () => {
        let url = `/training-report/${idForLink}/session/new/`;
        if (eventOrganizer === TRAINING_EVENT_ORGANIZER.REGIONAL_PD_WITH_NATIONAL_CENTERS) {
          url += 'choose-facilitation';
        }
        history.push(url);
      },
    });
  }

  if (canCompleteEvent) {
  // Complete event.
    menuItems.push({
      label: 'Complete event',
      onClick: async () => {
        try {
          const { sessionReports: sessions, ...eventReport } = event;
          await completeEvent(idForLink, eventReport);
          setEventStatus(TRAINING_REPORT_STATUSES.COMPLETE);
          setParentMessage({
            text: 'Event completed successfully',
            type: 'success',
          });
          removeEventFromDisplay(id);
          window.scrollTo(0, 0);
        } catch (err) {
          setMessage({
            text: 'Error completing event',
            type: 'error',
          });
        }
      },
    });
  }

  if (canDeleteEvent) {
    menuItems.push({
      label: 'Delete event',
      onClick: () => {
        modalRef.current.toggleModal();
      },
    });
  }

  if (canEditEvent) {
    // Edit event.
    menuItems.push({
      label: 'Edit event',
      onClick: () => {
        history.push(`/training-report/${idForLink}/event-summary`);
      },
    });
  }

  if (isSuspended && (isOwner || hasAdminRights)) {
    menuItems.push({
      label: 'Resume event',
      onClick: async () => {
        try {
          const { sessionReports: sessions, ...eventReport } = event;
          await resumeEvent(
            idForLink,
            eventReport,
            // eslint-disable-next-line max-len
            sessions.length ? TRAINING_REPORT_STATUSES.IN_PROGRESS : TRAINING_REPORT_STATUSES.NOT_STARTED,
          );
          setEventStatus(TRAINING_REPORT_STATUSES.IN_PROGRESS);
          setParentMessage({
            text: 'Event resumed successfully',
            type: 'success',
          });
          removeEventFromDisplay(id);
          window.scrollTo(0, 0);
        } catch (err) {
          setMessage({
            text: 'Error resuming event',
            type: 'error',
          });
        }
      },
    });
  }

  if (isNotCompleteOrSuspended && (isOwner || hasAdminRights)) {
    menuItems.push({
      label: 'Suspend event',
      onClick: async () => {
        try {
          const { sessionReports: sessions, ...eventReport } = event;
          await suspendEvent(idForLink, eventReport);
          setEventStatus(TRAINING_REPORT_STATUSES.SUSPENDED);
          setParentMessage({
            text: 'Event suspended successfully',
            type: 'success',
          });
          removeEventFromDisplay(id);
          window.scrollTo(0, 0);
        } catch (err) {
          setMessage({
            text: 'Error suspending event',
            type: 'error',
          });
        }
      },
    });
  }

  // View/Print event.
  menuItems.push({
    label: 'View/Print event',
    onClick: () => {
      history.push(`/training-report/view/${idForLink}`);
    },
  });

  const [reportsExpanded, setReportsExpanded] = useState(false);

  const closeOrOpenReports = () => {
    setReportsExpanded(!reportsExpanded);
  };

  // get the last four digits of the event id
  const link = canEditEvent && !eventSubmitted ? `/training-report/${idForLink}/event-summary` : `/training-report/view/${idForLink}`;
  const contextMenuLabel = `Actions for event ${eventId}`;

  return (
    <>
      <article
        className="ttahub-event-card usa-card padding-3 radius-lg border width-full maxw-full smart-hub-border-base-lighter margin-bottom-2 position-relative"
        data-testid="eventCard"
        style={{ zIndex }}
      >
        {message.text && (
        <Alert type={message.type} className="margin-bottom-2">
          {message.text}
        </Alert>
        )}

        <div className="ttahub-event-card__row position-relative">
          <div className="ttahub-event-card__event-column ttahub-event-card__event-column__title padding-right-3">
            <p className="usa-prose text-bold margin-y-0">Event title</p>
            <p className="usa-prose margin-y-0">{data.eventName}</p>
          </div>
          <div className="ttahub-event-card__event-column ttahub-event-card__event-column__id padding-right-3">
            <p className="usa-prose text-bold margin-y-0">Event ID</p>
            <p className="usa-prose margin-y-0">
              <Link to={link}>
                {data.eventId}
              </Link>
            </p>
          </div>
          <div className="ttahub-event-card__event-column ttahub-event-card__event-column__organizer padding-right-3">
            <p className="usa-prose text-bold margin-y-0">Event organizer</p>
            <p className="usa-prose margin-y-0">{data.eventOrganizer}</p>
          </div>
          <div className="ttahub-event-card__event-column ttahub-event-card__event-column__date padding-right-3">
            <p className="usa-prose text-bold  margin-y-0">Event start date</p>
            <p className="usa-prose margin-y-0">{checkForDate(data.startDate)}</p>
          </div>
          <div className="ttahub-event-card__event-column ttahub-event-card__event-column__date padding-right-3">
            <p className="usa-prose text-bold  margin-y-0">Event end date</p>
            <p className="usa-prose margin-y-0">{checkForDate(data.endDate)}</p>
          </div>
          <div className="ttahub-event-card__event-column ttahub-event-card__event-column__menu position-absolute right-0">
            {menuItems.length > 0 && (
            <ContextMenu
              label={contextMenuLabel}
              menuItems={menuItems}
            />
            )}
            <Modal
              modalRef={modalRef}
              title="Are you sure you want to delete this event?"
              modalId={`remove-event-modal-${idForLink}`}
              onOk={async () => onDeleteEvent(idForLink, id)}
              okButtonText="Delete"
              okButtonAriaLabel="delete event"
            >
              <p>The event and all session reports will be lost.</p>
            </Modal>
          </div>
        </div>

        <div className="margin-top-3">
          <ExpanderButton
            type="session"
            ariaLabel={`sessions for event ${data.eventId}`}
            closeOrOpen={closeOrOpenReports}
            count={event.sessionReports.length}
            expanded={reportsExpanded}
          />
        </div>

        {sessionReports.map((s) => (
          <SessionCard
            key={`session_${uuidv4()}`}
            eventId={idForLink}
            eventOrganizer={data.eventOrganizer}
            session={s}
            expanded={reportsExpanded}
            onRemoveSession={onRemoveSession}
            eventStatus={eventStatus}
            pocComplete={data.pocComplete}
            collabComplete={data.collabComplete}
            isPoc={isPoc}
            isOwner={isOwner}
            isCollaborator={isCollaborator}
          />
        ))}
      </article>

    </>
  );
}

EventCard.propTypes = {
  event: eventPropTypes.isRequired,
  onRemoveSession: PropTypes.func.isRequired,
  onDeleteEvent: PropTypes.func.isRequired,
  zIndex: PropTypes.number.isRequired,
  removeEventFromDisplay: PropTypes.func.isRequired,
  alerts: PropTypes.shape({
    message: PropTypes.shape({
      text: PropTypes.string,
      type: PropTypes.string,
    }),
    setMessage: PropTypes.func.isRequired,
    setParentMessage: PropTypes.func.isRequired,
  }).isRequired,
};

export default EventCard;
