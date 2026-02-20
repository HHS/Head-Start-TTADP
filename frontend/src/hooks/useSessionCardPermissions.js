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
    const facilitationIsNationalCenters = facilitation === 'national_center';

    // Admin override - can edit until event is complete
    if (isAdminUser) {
      return eventStatus !== TRAINING_REPORT_STATUSES.COMPLETE;
    }

    // Universal blockers for non-admin users
    if (statusIsComplete) {
      return false;
    }

    // Submitted session rules (affects all except admin)
    if (submitted && !statusIsNeedsAction) {
      // Only approver can edit when submitted and not needs_action
      return isSessionApprover;
    }

    // Approver cannot edit when they've returned it (needs_action)
    if (submitted && statusIsNeedsAction && isSessionApprover) {
      return false;
    }

    // Role-based: must have a qualifying role, and that role must not be blocked
    let hasRole = false;
    let blocked = false;

    if (isPoc) {
      hasRole = true;
      if (isRegionalNoNationalCenters
        || (pocComplete && !statusIsNeedsAction)
        || (facilitationIsNationalCenters && statusIsNeedsAction)) {
        blocked = true;
      }
    }

    // For EDIT permissions, owners are treated identically to collaborators.
    // For DELETE permissions (see showSessionDelete below), owners are MORE permissive.
    if (isCollaborator || isOwner) {
      hasRole = true;
      if ((collabComplete && !statusIsNeedsAction)
        || (isRegionalWithNationalCenters && facilitationIncludesRegion)) {
        blocked = true;
      }
    }

    return hasRole && !blocked;
  }, [
    status,
    eventOrganizer,
    facilitation,
    isSessionApprover,
    isPoc,
    pocComplete,
    isAdminUser,
    isCollaborator,
    collabComplete,
    eventStatus,
    isOwner,
    approverId,
  ]);

  const showSessionDelete = useMemo(() => {
    const statusIsComplete = status === TRAINING_REPORT_STATUSES.COMPLETE;
    // eslint-disable-next-line max-len
    const isRegionalNoNationalCenters = eventOrganizer === TRAINING_EVENT_ORGANIZER.REGIONAL_TTA_NO_NATIONAL_CENTERS;
    // eslint-disable-next-line max-len
    const isRegionalWithNationalCenters = eventOrganizer === TRAINING_EVENT_ORGANIZER.REGIONAL_PD_WITH_NATIONAL_CENTERS;
    const facilitationIncludesRegion = facilitation === 'regional_tta_staff' || facilitation === 'both';

    // Admin override - can delete until event is complete
    if (isAdminUser) {
      return eventStatus !== TRAINING_REPORT_STATUSES.COMPLETE;
    }

    // Universal delete blockers for non-admin users
    if (statusIsComplete || eventStatus === TRAINING_REPORT_STATUSES.COMPLETE) {
      return false;
    }

    // Approver-only users cannot delete
    // (but if they're also owner/POC/collaborator, other rules apply)
    const isApproverOnly = isSessionApprover && !isOwner && !isCollaborator && !isPoc;
    if (isApproverOnly) {
      return false;
    }

    // Role-based: must have a qualifying role, and that role must not be blocked
    let hasRole = false;
    let blocked = false;

    if (isPoc) {
      hasRole = true;
      if (isRegionalNoNationalCenters
        || (isRegionalWithNationalCenters && facilitation === 'national_center')) {
        blocked = true;
      }
    }

    // Owners have NO facilitation-based delete restrictions.
    if (isOwner) {
      hasRole = true;
    }

    // Only collaborators are blocked by regional facilitation rules.
    if (isCollaborator) {
      hasRole = true;
      if (isRegionalWithNationalCenters && facilitationIncludesRegion) {
        blocked = true;
      }
    }

    return hasRole && !blocked;
  }, [
    status,
    eventStatus,
    eventOrganizer,
    facilitation,
    isSessionApprover,
    isOwner,
    isCollaborator,
    isPoc,
    isAdminUser,
  ]);

  return {
    showSessionEdit,
    showSessionDelete,
  };
}
