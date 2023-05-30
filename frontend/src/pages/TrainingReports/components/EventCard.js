/* eslint-disable jsx-a11y/anchor-is-valid */
import React from 'react';
import moment from 'moment';
import { DATE_DISPLAY_FORMAT } from '../../../Constants';
import './EventCard.scss';
import { eventPropTypes } from '../constants';

function EventCard({
  event,
}) {
  const {
    startDate,
    endDate,
    data,
  } = event;

  return (
    <article
      className="ttahub-event-card usa-card padding-3 radius-lg border width-full maxw-full smart-hub-border-base-lighter"
      data-testid="eventCard"
    >
      <div className="display-flex flex-wrap margin-y-2">
        <div className="ttahub-event-card__event-column ttahub-event-card__event-column__title padding-right-3">
          <p className="usa-prose text-bold margin-y-0">Event Title</p>
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
          <p className="usa-prose margin-y-0">{data['Reason for Activity']}</p>
        </div>
        <div className="ttahub-event-card__event-column ttahub-event-card__event-column__date padding-right-3">
          <p className="usa-prose text-bold  margin-y-0">Event start date</p>
          <p className="usa-prose margin-y-0">{!startDate ? '...' : moment(startDate, 'YYYY-MM-DD').format(DATE_DISPLAY_FORMAT)}</p>
        </div>
        <div className="ttahub-event-card__event-column ttahub-event-card__event-column__date padding-right-3">
          <p className="usa-prose text-bold  margin-y-0">Event end date</p>
          <p className="usa-prose margin-y-0">{!endDate ? '...' : moment(endDate, 'YYYY-MM-DD').format(DATE_DISPLAY_FORMAT)}</p>
        </div>
      </div>
    </article>
  );
}

EventCard.propTypes = {
  event: eventPropTypes.isRequired,
};

export default EventCard;
