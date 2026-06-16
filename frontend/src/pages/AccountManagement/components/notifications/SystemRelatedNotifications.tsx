import React from 'react';
import NotificationsRow from './NotificationsRow';
/**
 * Note that none of these are implemented yet here and mocked out only for UI verification
 * @returns
 */
export default function SystemRelatedNotifications() {
  return (
    <div>
      <div className="display-flex flex-align-center">
        <div className="flex-1 text-bold">Event</div>
        <div className="text-bold width-10">In-app</div>
        <div className="text-bold width-card">Email</div>
      </div>
      <NotificationsRow
        // todo: needs implementation, new notification type
        id="WhenPlannedOutage"
        label="Planned system outage alerts."
      />

      <NotificationsRow
        // todo: needs implementation, new notification type
        id="WhenUnplannedOutage"
        label="Unplanned system outage alerts."
        hideInApp
      />
    </div>
  );
}
