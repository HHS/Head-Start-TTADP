import React from 'react';
import NotificationsGroupController from './NotificationsGroupController';
import NotificationsRow from './NotificationsRow';
/**
 * Note that none of these are implemented yet here and mocked out only for UI verification
 * @returns
 */
export default function CommunicationLogNotifications() {
  return (
    <div>
      <div className="display-flex flex-align-center">
        <div className="flex-1 text-bold">Event</div>
        <div className="text-bold width-10">In-app</div>
        <div className="text-bold width-card">Email</div>
      </div>
      <NotificationsGroupController
        groupName="CommunicationLogs"
        ids={['WhenAddedAsTTAStaffCommLog', 'WhenAddedAsRecipientCommLog']}
        label="Set preferences for all Communication Log notifications"
      />
      <hr />
      <NotificationsRow
        id="WhenAddedAsTTAStaffCommLog"
        label="I'm added as TTA staff on a Communication Log."
      />
      <NotificationsRow
        id="WhenAddedAsRecipientCommLog"
        label="A Communication Log was entered for a recipient in one of “My groups”."
      />
    </div>
  );
}
