import { useContext, useMemo } from 'react';
import { REPORT_STATUSES, TRAINING_REPORT_STATUSES } from '@ttahub/common/src/constants';
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
    collabComplete,
    facilitation,
  } = session.data;

  const { user } = useContext(UserContext);
  const isAdminUser = useMemo(() => isAdmin(user), [user]);
  const isSessionApprover = user.id === Number(approverId);

  const showSessionEdit = useMemo(() => {
    const submitted = !!(pocComplete && collabComplete && approverId);
    const statusIsComplete = status === TRAINING_REPORT_STATUSES.COMPLETE;
    const statusIsNeedsAction = status === REPORT_STATUSES.NEEDS_ACTION;
    // eslint-disable-next-line max-len
    const isRegionalNoNationalCenters = eventOrganizer === TRAINING_EVENT_ORGANIZER.REGIONAL_TTA_NO_NATIONAL_CENTERS;
    // eslint-disable-next-line max-len
    const isRegionalWithNationalCenters = eventOrganizer === TRAINING_EVENT_ORGANIZER.REGIONAL_PD_WITH_NATIONAL_CENTERS;
    const facilitationIncludesRegion = facilitation === 'regional_tta_staff' || facilitation === 'both';

    if (statusIsComplete && !isAdminUser) {
      return false;
    }

    // If status is NEEDS_ACTION, approver has returned it for editing - allow regular editors
    if (submitted && !statusIsNeedsAction && !isSessionApprover && !isAdminUser) {
      return false;
    }

    // owners do not edit sessions
    if (isOwner && !isSessionApprover && !isAdminUser) {
      return false;
    }

    // If they are a POC and POC work is complete, they should not be able to edit the session
    // unless the approver has returned it for editing (NEEDS_ACTION)
    if (isPoc && pocComplete && !statusIsNeedsAction && !isAdminUser) {
      return false;
    }

    // if the user is a POC and the event organizer is Regional TTA No National Centers,
    // they cannot edit sessions
    if (isPoc && isRegionalNoNationalCenters && !isAdminUser) {
      return false;
    }

    // eslint-disable-next-line max-len
    // If they are the collaborator, they should not be able to edit the session.
    if (isCollaborator && !isAdminUser && collabComplete && !statusIsNeedsAction) {
      return false;
    }

    if (isCollaborator
      && isRegionalWithNationalCenters
      && facilitationIncludesRegion
      && !isAdminUser) {
      return false;
    }

    // Approver cannot edit if they've returned it (NEEDS_ACTION)
    if (submitted && statusIsNeedsAction && isSessionApprover && !isAdminUser) {
      return false;
    }

    // Approver can edit if submitted and not complete
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
    collabComplete,
    isWriteable,
    eventStatus,
    isOwner,
    approverId,
  ]);

  return {
    showSessionEdit,
  };
}
