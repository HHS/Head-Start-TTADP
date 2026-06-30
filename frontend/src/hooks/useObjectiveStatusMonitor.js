import { useCallback, useRef, useState } from 'react';
import { OBJECTIVE_STATUS } from '../Constants';

const isNotCompleted = (status) => status !== OBJECTIVE_STATUS.COMPLETE;
const evaluateStatusMapForIncomplete = (sm) => Array.from(sm.current.values()).some(isNotCompleted);

export default function useObjectiveStatusMonitor(objectives) {
  // Map of key -> original objective. Kept for backwards-compatible external access via
  // `objectiveMap`. We intentionally do NOT mutate these objects; status updates live in a
  // parallel `statusMap` so the caller's props remain unchanged. Mutating the caller's prop
  // here caused an infinite render loop in ObjectiveCard when a parent's sync-from-prop
  // effect saw the mutated value and fought with the local state.
  const objectiveMap = useRef(
    new Map(
      (objectives || [])
        .filter(({ ids }) => ids && Array.isArray(ids))
        .map((o) => [JSON.stringify([...o.ids].sort()), o])
    )
  );

  const statusMap = useRef(
    new Map(
      (objectives || [])
        .filter(({ ids }) => ids && Array.isArray(ids))
        .map((o) => [JSON.stringify([...o.ids].sort()), o.status])
    )
  );

  const [atLeastOneObjectiveIsNotCompleted, setAtLeastOneObjectiveIsNotCompleted] = useState(
    evaluateStatusMapForIncomplete(statusMap)
  );

  const dispatchStatusChange = useCallback((objectiveIds, localStatus) => {
    try {
      // we do not want white screens if something weird happens here
      const key = JSON.stringify([...(objectiveIds || [])].sort());
      if (!statusMap.current.has(key)) {
        return;
      }

      statusMap.current.set(key, localStatus);

      setAtLeastOneObjectiveIsNotCompleted(evaluateStatusMapForIncomplete(statusMap));
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);
    }
  }, []);

  return {
    atLeastOneObjectiveIsNotCompleted,
    dispatchStatusChange,
    objectiveMap,
  };
}
