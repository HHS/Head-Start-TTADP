import { useMemo } from 'react';

/**
 * A simple function to return basic info about a user's relation to a given event.
 * @param {shape} event
 * @param {number} userId
 */
export default function useTrainingReportRole(event, userId) {
  return useMemo(() => {
    if (!event || !userId) {
      return {
        isPoc: false,
        isCollaborator: false,
        isOwner: false,
      };
    }

    return {
      isPoc: (event.pocIds || []).includes(userId),
      isCollaborator: (event.collaboratorIds || []).includes(userId),
      isOwner: event.ownerId === userId,
    };
  }, [event, userId]);
}
