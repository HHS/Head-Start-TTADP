/* eslint-disable jsx-a11y/anchor-is-valid */
import React from 'react';
import PropTypes from 'prop-types';
import { eventPropTypes, EVENT_STATUS } from '../constants';
import EventCard from './EventCard';

const translateEventStatus = (status) => {
  switch (status) {
    case EVENT_STATUS.NOT_STARTED:
      return 'You have no events with a “not started” status.';
    case EVENT_STATUS.IN_PROGRESS:
      return 'You have no events in progress.';
    case EVENT_STATUS.COMPLETE:
      return 'You have no completed events.';
    default:
      return 'You have no events.';
  }
};
function EventCards({
  events,
  eventType,
  onRemoveSession,
}) {
  return (
    <div className="padding-x-3 padding-y-2">
      {
        events && events.length > 0
          ? events.map((event) => (
            <EventCard
              key={`event-row-${event.id}`}
              event={event}
              onRemoveSession={onRemoveSession}
            />
          ))
          : <p className="usa-prose text-bold margin-y-0 padding-2">{translateEventStatus(eventType)}</p>
        }
    </div>
  );
}

EventCards.propTypes = {
  events: PropTypes.arrayOf(PropTypes.shape(eventPropTypes)).isRequired,
  eventType: PropTypes.string.isRequired,
  onRemoveSession: PropTypes.func.isRequired,
};
export default EventCards;
