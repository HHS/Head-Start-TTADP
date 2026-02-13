import { useMemo } from 'react'

// POCs can select approver when facilitation includes regional staff

/**
 *
 * @param {object} config
 * @param {boolean} config.isPoc
 * @param {function} config.watch
 * @returns
 */
export default function useCanSelectApprover({ isPoc, watch }) {
  const facilitation = watch('facilitation')

  return useMemo(() => {
    const facilitationIncludesRegion = facilitation === 'regional_tta_staff' || facilitation === 'both'
    return !isPoc || (isPoc && facilitationIncludesRegion)
  }, [facilitation, isPoc])
}
