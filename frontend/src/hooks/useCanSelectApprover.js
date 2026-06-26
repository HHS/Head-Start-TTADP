import { useMemo } from 'react';

// POCs can select approver when facilitation includes regional staff
// Regional Owners cannot select approver when facilitation is national center only
// Admins always bypass the restriction.

/**
 *
 * @param {object} config
 * @param {boolean} config.isOwner
 * @param {boolean} config.isPoc
 * @param {function} config.watch
 * @param {object} config.user
 * @param {boolean} [config.isAdmin=false]
 * @returns
 */
export default function useCanSelectApprover({ isOwner, isPoc, watch, user, isAdmin = false }) {
  const facilitation = watch('facilitation');

  const isNC = useMemo(
    () => Array.isArray(user?.roles) && user.roles.some((role) => role?.name === 'NC'),
    [user]
  );

  return useMemo(() => {
    // Admin override: admins can always select an approver, even when the
    // event owner restriction would otherwise hide the dropdown.
    if (isAdmin) {
      return true;
    }

    const facilitationIncludesRegion =
      facilitation === 'regional_tta_staff' || facilitation === 'both';

    const facilitationIsNationalCentersOnly = facilitation === 'national_center';

    // surgically alter the logic to prevent a regional owner from selecting an approver when facilitation is national center only
    if (isOwner && !isNC && facilitationIsNationalCentersOnly) {
      return false;
    }

    return !isPoc || (isPoc && facilitationIncludesRegion);
  }, [facilitation, isPoc, isNC, isOwner, isAdmin]);
}
