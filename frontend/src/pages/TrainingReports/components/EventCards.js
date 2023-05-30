/* eslint-disable jsx-a11y/anchor-is-valid */
import React from 'react';
import { eventPropTypes } from '../constants';
import Container from '../../../components/Container';
import EventCard from './EventCard';

function EventCards({
  events,
}) {
  return (
    <Container>
      <div className="padding-x-3 padding-y-2">
        {events.map((event) => (
          <EventCard
            key={`event-row-${event.id}`}
            event={event}
          />
        ))}

      </div>
    </Container>
  );
}

EventCards.propTypes = {
  events: eventPropTypes.isRequired,
};

export default EventCards;
