import { REPORT_STATUSES, TRAINING_REPORT_STATUSES } from '@ttahub/common/src/constants';
import { useContext, useMemo } from 'react';
import { TRAINING_EVENT_ORGANIZER } from '../Constants';
import isAdmin from '../permissions';
import UserContext from '../UserContext';

export default function useSessionCardPermissions({
  session,
  isPoc,
  isOwner,
  isCollaborator,
  eventStatus,
  eventOrganizer,
}) {
  const { approverId } = session;
  const { status, pocComplete, collabComplete, ownerComplete, facilitation } = session.data;

  const { user } = useContext(UserContext);
  const isAdminUser = useMemo(() => isAdmin(user), [user]);
  const isSessionApprover = user.id === Number(approverId);

  const showSessionEdit = useMemo(() => {
    // eslint-disable-next-line max-len
    const isRegionalNoNationalCenters =
      eventOrganizer === TRAINING_EVENT_ORGANIZER.REGIONAL_TTA_NO_NATIONAL_CENTERS;
    // eslint-disable-next-line max-len
    const isRegionalWithNationalCenters =
      eventOrganizer === TRAINING_EVENT_ORGANIZER.REGIONAL_PD_WITH_NATIONAL_CENTERS;
    const facilitationIncludesRegion =
      facilitation === 'regional_tta_staff' || facilitation === 'both';
    const facilitationIsNationalCenters = facilitation === 'national_center';
    // New flow: Regional PD w/ NC + facilitation = national_center. Regional
    // owner's "submitted" signal is tracked via ownerComplete (so the NC
    // collaborator can keep editing the session summary after the owner
    // submits); the NC collaborator still uses collabComplete.
    const isNewFlow = isRegionalWithNationalCenters && facilitationIsNationalCenters;

    const submitted = isNewFlow
      ? !!(ownerComplete && collabComplete && approverId)
      : !!(pocComplete && collabComplete && approverId);
    const statusIsComplete = status === TRAINING_REPORT_STATUSES.COMPLETE;
    const statusIsNeedsAction = status === REPORT_STATUSES.NEEDS_ACTION;

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

    const pocCanEdit =
      isPoc &&
      !isRegionalNoNationalCenters &&
      !(pocComplete && !statusIsNeedsAction) &&
      !(facilitationIsNationalCenters && statusIsNeedsAction);

    // For EDIT permissions, owners are treated identically to collaborators.
    // For DELETE permissions (see showSessionDelete below), owners are MORE permissive.
    //
    // In the new flow, owner and collaborator are gated independently:
    //   - Owner is locked by ownerComplete (not collabComplete) so the
    //     collaborator can still edit after the owner submits.
    //   - Collaborator is locked by collabComplete as usual.
    // Outside the new flow, both share the existing collabComplete gate.
    const ownerSideComplete = isNewFlow ? !!ownerComplete : !!collabComplete;
    const collabSideComplete = !!collabComplete;
    const ownerCanEdit =
      isOwner &&
      !(ownerSideComplete && !statusIsNeedsAction) &&
      !(isRegionalWithNationalCenters && facilitationIncludesRegion);
    const collabCanEdit =
      isCollaborator &&
      !(collabSideComplete && !statusIsNeedsAction) &&
      !(isRegionalWithNationalCenters && facilitationIncludesRegion);

    return pocCanEdit || ownerCanEdit || collabCanEdit;
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
    ownerComplete,
    eventStatus,
    isOwner,
    approverId,
  ]);

  const showSessionDelete = useMemo(() => {
    const statusIsComplete = status === TRAINING_REPORT_STATUSES.COMPLETE;
    // eslint-disable-next-line max-len
    const isRegionalNoNationalCenters =
      eventOrganizer === TRAINING_EVENT_ORGANIZER.REGIONAL_TTA_NO_NATIONAL_CENTERS;
    // eslint-disable-next-line max-len
    const isRegionalWithNationalCenters =
      eventOrganizer === TRAINING_EVENT_ORGANIZER.REGIONAL_PD_WITH_NATIONAL_CENTERS;
    const facilitationIncludesRegion =
      facilitation === 'regional_tta_staff' || facilitation === 'both';

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

    const pocCanDelete =
      isPoc &&
      !isRegionalNoNationalCenters &&
      !(isRegionalWithNationalCenters && facilitation === 'national_center');

    // Owners have NO facilitation-based delete restrictions.
    const ownerCanDelete = isOwner;

    // Only collaborators are blocked by regional facilitation rules.
    const collabCanDelete =
      isCollaborator && !(isRegionalWithNationalCenters && facilitationIncludesRegion);

    return pocCanDelete || ownerCanDelete || collabCanDelete;
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
