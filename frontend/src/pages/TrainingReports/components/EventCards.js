import React from 'react';
import PropTypes from 'prop-types';
import { eventPropTypes } from '../constants';
import EventCard from './EventCard';

function EventCards({
  events,
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
          : <p className="usa-prose text-bold margin-y-0 padding-2">There are no events.</p>
        }
    </div>
  );
}

EventCards.propTypes = {
  events: PropTypes.arrayOf(PropTypes.shape(eventPropTypes)).isRequired,
  onRemoveSession: PropTypes.func.isRequired,
};
export default EventCards;
