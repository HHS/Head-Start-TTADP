import React from 'react';
import NotificationsRow from './NotificationsRow';
/**
 * Note that none of these are implemented yet here and mocked out only for UI verification
 * @returns
 */
export default function OtherNotifications() {
  return (
    <div>
      <div className="display-flex flex-align-center">
        <div className="flex-1 text-bold">Event</div>
        <div className="text-bold width-10">In-app</div>
        <div className="text-bold width-card">Email</div>
      </div>
      <NotificationsRow
        // todo: needs implementation, new notification type
        id="WhenMonitoringDetailsAdded"
        label="New monitoring details are added for recipients in my region where I'm the TTAC or Manager."
      />

      <NotificationsRow
        // todo: needs implementation, new notification type
        id="WhenAddedAsCoOwner"
        label="I'm added as a Co-owner of a “My group”."
      />

      <NotificationsRow
        // todo: needs implementation, new notification type
        id="WhenSharedMyGroup"
        label="Some shares their “My group” with me."
      />
    </div>
  );
}
