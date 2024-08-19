import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Alert } from '@trussworks/react-uswds';
import { eventPropTypes } from '../constants';
import EventCard from './EventCard';

function EventCards({
  events,
  onRemoveSession,
  onDeleteEvent,
  removeEventFromDisplay,
}) {
  const [message, setMessage] = useState();

  return (
    <div className="padding-x-3 padding-y-2 position-relative z-0">
      {message && (<Alert className="margin-y-1" type={message.type}>{message.text}</Alert>)}
      {
        events && events.length > 0
          ? events.map((event, index, arr) => (
            <EventCard
              key={`event-row-${event.id}`}
              event={event}
              onRemoveSession={onRemoveSession}
              onDeleteEvent={onDeleteEvent}
              removeEventFromDisplay={removeEventFromDisplay}
              zIndex={arr.length - index}
              setParentMessage={setMessage}
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
  removeEventFromDisplay: PropTypes.func.isRequired,
};
export default EventCards;
