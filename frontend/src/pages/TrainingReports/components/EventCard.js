/* eslint-disable jsx-a11y/anchor-is-valid */
import React from 'react';
import './EventCard.scss';
import { eventPropTypes } from '../constants';
import TooltipList from '../../../components/TooltipList';
import ContextMenu from '../../../components/ContextMenu';
import { checkForDate } from '../../../utils';

function EventCard({
  event,
}) {
  const {
    data,
  } = event;

  const contextMenuLabel = `Actions for event ${event.id}`;
  const menuItems = [];

  return (
    <article
      className="ttahub-event-card usa-card padding-3 radius-lg border width-full maxw-full smart-hub-border-base-lighter"
      data-testid="eventCard"
    >
      <div className="display-flex flex-wrap margin-y-2 position-relative">
        <div className="ttahub-event-card__event-column ttahub-event-card__event-column__title padding-right-3">
          <p className="usa-prose text-bold margin-y-0">Event title</p>
          <p className="usa-prose margin-y-0">{data['Edit Title']}</p>
        </div>
        <div className="ttahub-event-card__event-column ttahub-event-card__event-column__id padding-right-3">
          <p className="usa-prose text-bold margin-y-0">Event ID</p>
          <p className="usa-prose margin-y-0">{data['Event ID']}</p>
        </div>
        <div className="ttahub-event-card__event-column ttahub-event-card__event-column__organizer padding-right-3">
          <p className="usa-prose text-bold margin-y-0">Event organizer</p>
          <p className="usa-prose margin-y-0">{data['Event Organizer - Type of Event']}</p>
        </div>
        <div className="ttahub-event-card__event-column ttahub-event-card__event-column__reason padding-right-3">
          <p className="usa-prose text-bold margin-y-0">Reason</p>
          <TooltipList list={data['Reason for Activity'] ? data['Reason for Activity'].split('\n') : []} cardType="event" listType="reasons" />
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
    </article>
  );
}

EventCard.propTypes = {
  event: eventPropTypes.isRequired,
};

export default EventCard;
