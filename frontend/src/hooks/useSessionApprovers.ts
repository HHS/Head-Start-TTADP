import { useContext, useMemo } from 'react';
import { TRAINING_EVENT_ORGANIZER } from '../Constants';
import UserContext from '../UserContext';
import useEventAndSessionStaff from './useEventAndSessionStaff';

const MANAGER_ROLES = ['ECM', 'GSM', 'TTAC'];

type UserOptionType = {
  id: number;
  roles: {
    name: string;
  }[];
};

export default function useSessionApprovers({
  watch,
  isAdmin,
}: {
  watch: (field: string) => any;
  isAdmin: boolean;
}) {
  const event = watch('event');
  const facilitation = watch('facilitation');

  const eventOrganizer = useMemo(() => {
    if (event?.data) {
      return event.data.eventOrganizer;
    }
    return '';
  }, [event]);

  const { trainerOptions: approvers } = useEventAndSessionStaff(event);

  const { user } = useContext(UserContext);

  return useMemo(() => {
    let approverOptions = approvers;

    if (eventOrganizer === TRAINING_EVENT_ORGANIZER.REGIONAL_TTA_NO_NATIONAL_CENTERS) {
      approverOptions = approvers.filter((o: UserOptionType) =>
        o.roles.some((or: { name: string }) => MANAGER_ROLES.includes(or.name))
      );
    }

    if (
      eventOrganizer === TRAINING_EVENT_ORGANIZER.REGIONAL_PD_WITH_NATIONAL_CENTERS &&
      facilitation === 'both'
    ) {
      // format approvers and flatten national and regional trainers into a single list
      approverOptions = approvers
        .filter(
          (approverGroup: { label: string; options: UserOptionType[] }) =>
            approverGroup.label === 'Regional trainers'
        )
        .flatMap((group: { label: string; options: UserOptionType[] }) => group.options)
        .filter((o: UserOptionType) =>
          o.roles.some((or: { name: string }) => MANAGER_ROLES.includes(or.name))
        );
    }

    if (
      eventOrganizer === TRAINING_EVENT_ORGANIZER.REGIONAL_PD_WITH_NATIONAL_CENTERS &&
      facilitation === 'regional_tta_staff'
    ) {
      // format approvers and flatten national and regional trainers into a single list
      approverOptions = approvers
        .filter(
          (approverGroup: { label: string; options: UserOptionType[] }) =>
            approverGroup.label === 'Regional trainers'
        )
        .flatMap((group: { label: string; options: UserOptionType[] }) => group.options)
        .filter((o: UserOptionType) =>
          o.roles.some((or: { name: string }) => MANAGER_ROLES.includes(or.name))
        );
    }

    // filter current user out of approver list
    if (!isAdmin) {
      approverOptions = approverOptions.filter((a: { id: number }) => a.id !== user.id);
    }

    // filter out event owner from approver list (owner cannot approve their own event's sessions)
    const eventOwnerId = event?.ownerId;
    if (eventOwnerId) {
      approverOptions = approverOptions.filter((a: { id: number }) => a.id !== eventOwnerId);
    }
    return approverOptions;
  }, [approvers, event, facilitation, isAdmin, user.id, eventOrganizer]);
}
