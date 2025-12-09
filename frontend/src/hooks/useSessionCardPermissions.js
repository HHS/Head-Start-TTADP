import { useContext, useMemo } from 'react';
import { TRAINING_REPORT_STATUSES } from '@ttahub/common/src/constants';
import UserContext from '../UserContext';
import isAdmin from '../permissions';
import { TRAINING_EVENT_ORGANIZER } from '../Constants';

export default function useSessionCardPermissions({
  session,
  isPoc,
  isOwner,
  isCollaborator,
  isWriteable,
  eventStatus,
  eventOrganizer,
}) {
  const { approverId } = session;
  const {
    status,
    pocComplete,
    ownerComplete,
    facilitation,
  } = session.data;

  const { user } = useContext(UserContext);
  const isAdminUser = useMemo(() => isAdmin(user), [user]);
  const isSessionApprover = user.id === Number(approverId);

  const showSessionEdit = useMemo(() => {
    const submitted = !!(pocComplete && ownerComplete && approverId);
    const statusIsComplete = status === TRAINING_REPORT_STATUSES.COMPLETE;
    // eslint-disable-next-line max-len
    const isRegionalNoNationalCenters = eventOrganizer === TRAINING_EVENT_ORGANIZER.REGIONAL_TTA_NO_NATIONAL_CENTERS;
    // eslint-disable-next-line max-len
    const isRegionalWithNationalCenters = eventOrganizer === TRAINING_EVENT_ORGANIZER.REGIONAL_PD_WITH_NATIONAL_CENTERS;
    const facilitationIncludesRegion = facilitation === 'regional_tta_staff' || facilitation === 'both';

    if (submitted && !isSessionApprover && !isAdminUser) {
      return false;
    }

    // owners do not edit sessions
    if (isOwner && !isSessionApprover && !isAdminUser) {
      return false;
    }

    // If they are a POC and POC work is complete, they should not be able to edit the session.
    if (isPoc && pocComplete && !isAdminUser) {
      return false;
    }

    // if the user is a POC and the event organizer is Regional TTA No National Centers,
    // they cannot edit sessions
    if (isPoc && isRegionalNoNationalCenters && !isAdminUser) {
      return false;
    }

    // eslint-disable-next-line max-len
    // If they are the collaborator, they should not be able to edit the session.
    if (isCollaborator && !isAdminUser && ownerComplete) {
      return false;
    }

    if (isCollaborator
      && isRegionalWithNationalCenters
      && facilitationIncludesRegion
      && !isAdminUser) {
      return false;
    }

    if (submitted && !statusIsComplete && isSessionApprover) {
      return true;
    }

    // First if both general poc and owner status is blocked make sure they are not and admin.
    if (!isAdminUser && (!isWriteable || statusIsComplete)) {
      return false;
    }

    // Admin can edit the session until the EVENT is complete.
    if (isAdminUser && eventStatus === TRAINING_REPORT_STATUSES.COMPLETE) {
      return false;
    }

    return true;
  }, [
    status,
    eventOrganizer,
    facilitation,
    isSessionApprover,
    isPoc,
    pocComplete,
    isAdminUser, isCollaborator,
    ownerComplete,
    isWriteable,
    eventStatus,
    isOwner,
    approverId,
  ]);

  return {
    showSessionEdit,
  };
}
