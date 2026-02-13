import { useMemo } from 'react'

export function calculateFormGrantData(activityRecipients) {
  const grants = activityRecipients.map((r) => {
    if (r.grant) {
      return r.grant.id
    }
    return r.activityRecipientId
  })

  return {
    grantIds: grants,
    hasGrant: grants.length > 0,
    hasMultipleGrants: grants.length > 1,
  }
}

export default function useFormGrantData(activityRecipients) {
  // eslint-disable-next-line max-len
  return useMemo(() => calculateFormGrantData(activityRecipients), [activityRecipients])
}
