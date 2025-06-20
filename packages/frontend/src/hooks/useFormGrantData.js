import { useMemo } from 'react';

export function calculateFormGrantData(activityRecipientType, activityRecipients) {
  const isRecipient = activityRecipientType === 'recipient';
  const grants = isRecipient ? activityRecipients.map((r) => {
    if (r.grant) {
      return r.grant.id;
    }
    return r.activityRecipientId;
  }) : [];

  return {
    isRecipientReport: isRecipient,
    grantIds: grants,
    hasGrant: grants.length > 0,
    hasMultipleGrants: grants.length > 1,
  };
}

export default function useFormGrantData(activityRecipientType, activityRecipients) {
  // eslint-disable-next-line max-len
  return useMemo(() => calculateFormGrantData(activityRecipientType, activityRecipients), [activityRecipientType, activityRecipients]);
}
