import { useMemo } from 'react';

// POCs can select approver when facilitation includes regional staff
// Regional Owners cannot select approver when facilitation is national center only

/**
 *
 * @param {object} config
 * @param {boolean} config.isPoc
 * @param {function} config.watch
 * @param {object} config.user
 * @returns
 */
export default function useCanSelectApprover({ isOwner, isPoc, watch, user }) {
  const facilitation = watch('facilitation');

  const isNC = useMemo(() => {
    return user?.roles?.some((role) => role.name === 'NC');
  }, [user]);

  return useMemo(() => {
    const facilitationIncludesRegion =
      facilitation === 'regional_tta_staff' || facilitation === 'both';

    const facilitationIsNationalCentersOnly = facilitation === 'national_center';

    // surgically alter the logic to prevent a regional owner from selecting an approver when facilitation is national center only
    if (isOwner && !isNC && facilitationIsNationalCentersOnly) {
      return false;
    }

    return !isPoc || (isPoc && facilitationIncludesRegion);
  }, [facilitation, isPoc, isNC, isOwner]);
}
