/* eslint-disable jsx-a11y/anchor-is-valid */
import React, { useState, useContext } from 'react';
import PropTypes from 'prop-types';
import { TRAINING_REPORT_STATUSES, DECIMAL_BASE } from '@ttahub/common';
import { v4 as uuidv4 } from 'uuid';
import { useHistory } from 'react-router-dom';
import UserContext from '../../../UserContext';
import { eventPropTypes } from '../constants';
import TooltipList from '../../../components/TooltipList';
import ContextMenu from '../../../components/ContextMenu';
import { checkForDate } from '../../../utils';
import ExpanderButton from '../../../components/ExpanderButton';
import SessionCard from './SessionCard';
import { canEditOrCreateSessionReports } from '../../../permissions';
import './EventCard.scss';

function EventCard({
  event,
  onRemoveSession,
}) {
  const { user } = useContext(UserContext);
  const hasEditPermissions = canEditOrCreateSessionReports(
    user,
    parseInt(event.regionId, DECIMAL_BASE),
  );
  const isCollaborator = event.pocIds && event.pocIds.includes(user.id);
  const canEditExisting = hasEditPermissions || (isCollaborator);

  const history = useHistory();

  const {
    id,
    data,
    sessionReports,
  } = event;

  const contextMenuLabel = `Actions for event ${event.id}`;
  const menuItems = [];

  if (![
    TRAINING_REPORT_STATUSES.COMPLETE,
    TRAINING_REPORT_STATUSES.SUSPENDED,
  ].includes(data.status) && canEditExisting) {
    // Create session.
    menuItems.push({
      label: 'Create session',
      onClick: () => {
        history.push(`/training-report/${event.id}/session/new/`);
      },
    });

    // Edit event.
    menuItems.push({
      label: 'Edit event',
      onClick: () => {
        history.push(`/training-report/${event.id}/event-summary`);
      },
    });
  }

  // View event.
  menuItems.push({
    label: 'View event',
    onClick: () => {
      history.push(`/training-report/view/${event.id}`);
    },
  });

  const [reportsExpanded, setReportsExpanded] = useState(false);

  const closeOrOpenReports = () => {
    setReportsExpanded(!reportsExpanded);
  };

  return (
    <article
      className="ttahub-event-card usa-card padding-3 radius-lg border width-full maxw-full smart-hub-border-base-lighter margin-bottom-2"
      data-testid="eventCard"
    >
      <div className="ttahub-event-card__row position-relative">
        <div className="ttahub-event-card__event-column ttahub-event-card__event-column__title padding-right-3">
          <p className="usa-prose text-bold margin-y-0">Event title</p>
          <p className="usa-prose margin-y-0">{data.eventName}</p>
        </div>
        <div className="ttahub-event-card__event-column ttahub-event-card__event-column__id padding-right-3">
          <p className="usa-prose text-bold margin-y-0">Event ID</p>
          <p className="usa-prose margin-y-0">{data.eventId}</p>
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
          { true && (
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
          eventId={id}
          session={s}
          expanded={reportsExpanded}
          hasWritePermissions={canEditExisting}
          eventStatus={data.status}
          onRemoveSession={onRemoveSession}
        />
      ))}

    </article>
  );
}

EventCard.propTypes = {
  event: eventPropTypes.isRequired,
  onRemoveSession: PropTypes.func.isRequired,
};

export default EventCard;
