import React, { useState, useContext, useRef } from 'react';
import PropTypes from 'prop-types';
import { TRAINING_REPORT_STATUSES } from '@ttahub/common';
import { v4 as uuidv4 } from 'uuid';
import { Link, useHistory } from 'react-router-dom';
import UserContext from '../../../UserContext';
import { eventPropTypes } from '../constants';
import TooltipList from '../../../components/TooltipList';
import ContextMenu from '../../../components/ContextMenu';
import { checkForDate } from '../../../utils';
import ExpanderButton from '../../../components/ExpanderButton';
import SessionCard from './SessionCard';
import './EventCard.scss';
import Modal from '../../../components/Modal';
import isAdmin from '../../../permissions';

function EventCard({
  event,
  onRemoveSession,
  onDeleteEvent,
  zIndex,
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

  const { eventId } = data;
  const idForLink = eventId.split('-').pop();
  const isOwner = event.ownerId === user.id;
  const isPoc = event.pocIds && event.pocIds.includes(user.id);
  const isCollaborator = event.collaboratorIds && event.collaboratorIds.includes(user.id);
  const isOwnerOrPoc = isOwner || isPoc;
  const isOwnerOrCollaborator = isOwner || isCollaborator;

  const isNotComplete = data.status !== TRAINING_REPORT_STATUSES.COMPLETE;

  const isNotCompleteOrSuspended = ![
    TRAINING_REPORT_STATUSES.COMPLETE,
    TRAINING_REPORT_STATUSES.SUSPENDED,
  ].includes(data.status);

  const canEditEvent = (
    isNotCompleteOrSuspended
    && isOwnerOrPoc)
    || (isNotComplete && (isOwner || hasAdminRights));
  const canCreateSession = isNotCompleteOrSuspended && isOwnerOrCollaborator;
  const canDeleteEvent = hasAdminRights && (data.status === TRAINING_REPORT_STATUSES.NOT_STARTED
  || data.status === TRAINING_REPORT_STATUSES.SUSPENDED);
  const menuItems = [];

  if (canCreateSession) {
    // Create session.
    menuItems.push({
      label: 'Create session',
      onClick: () => {
        history.push(`/training-report/${idForLink}/session/new/`);
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

  // View event.
  menuItems.push({
    label: 'View event',
    onClick: () => {
      history.push(`/training-report/view/${idForLink}`);
    },
  });

  if (canDeleteEvent) {
    menuItems.push({
      label: 'Delete event',
      onClick: () => {
        modalRef.current.toggleModal();
      },
    });
  }

  const [reportsExpanded, setReportsExpanded] = useState(false);

  const closeOrOpenReports = () => {
    setReportsExpanded(!reportsExpanded);
  };

  // get the last four digits of the event id
  const link = canEditEvent ? `/training-report/${idForLink}/event-summary` : `/training-report/view/${idForLink}`;
  const contextMenuLabel = `Actions for event ${eventId}`;

  return (
    <>
      <Modal
        modalRef={modalRef}
        title="Are you sure you want to delete this event?"
        modalId={`remove-event-modal-${id}`}
        onOk={async () => onDeleteEvent(id)}
        okButtonText="Delete"
        okButtonAriaLabel="delete event"
      >
        <p>The event and all session reports will be lost.</p>
      </Modal>
      <article
        className="ttahub-event-card usa-card padding-3 radius-lg border width-full maxw-full smart-hub-border-base-lighter margin-bottom-2 position-relative"
        data-testid="eventCard"
        style={{ zIndex }}
      >
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
          <div className="ttahub-event-card__event-column ttahub-event-card__event-column__reason padding-right-3">
            <p className="usa-prose text-bold margin-y-0">Reason</p>
            <TooltipList list={data.reasons ? data.reasons : []} cardType="event" listType="reasons" />
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
            {true && (
            <ContextMenu
              label={contextMenuLabel}
              menuItems={menuItems}
            />
            )}
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
            session={s}
            expanded={reportsExpanded}
            isWriteable={isNotCompleteOrSuspended && (isOwnerOrCollaborator || isPoc)}
            onRemoveSession={onRemoveSession}
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
};

export default EventCard;
