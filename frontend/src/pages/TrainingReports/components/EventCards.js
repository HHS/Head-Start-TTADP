import React from 'react';
import PropTypes from 'prop-types';
import { eventPropTypes } from '../constants';
import EventCard from './EventCard';

function EventCards({
  events,
  onRemoveSession,
  onDeleteEvent,
}) {
  return (
    <div className="padding-x-3 padding-y-2 position-relative z-0">
      {
        events && events.length > 0
          ? events.map((event, index, arr) => (
            <EventCard
              key={`event-row-${event.id}`}
              event={event}
              onRemoveSession={onRemoveSession}
              onDeleteEvent={onDeleteEvent}
              zIndex={arr.length - index}
            />
          ))
          : <p className="usa-prose text-bold margin-y-0 padding-2">There are no events.</p>
        }
    </div>
  );
}

EventCards.propTypes = {
  events: PropTypes.arrayOf(PropTypes.shape(eventPropTypes)).isRequired,
  onRemoveSession: PropTypes.func.isRequired,
  onDeleteEvent: PropTypes.func.isRequired,
};
export default EventCards;
