import { useState, useCallback, useRef } from 'react'
import { OBJECTIVE_STATUS } from '../Constants'

const objectiveCompare = (o) => o.status !== OBJECTIVE_STATUS.COMPLETE
const evaluateObjectiveMapRefForStatus = (om) => Array.from(om.current.values()).some(objectiveCompare)

export default function useObjectiveStatusMonitor(objectives) {
  const objectiveMap = useRef(
    new Map(
      // built to be invulnerable
      (objectives || []) // missing param? no problem
        .filter(({ ids }) => ids && Array.isArray(ids)) // missing prop? prop not an id? no problem
        .map((o) => [JSON.stringify(o.ids.sort()), o]) // ok
    )
  )

  const [atLeastOneObjectiveIsNotCompleted, setAtLeastOneObjectiveIsNotCompleted] = useState(evaluateObjectiveMapRefForStatus(objectiveMap))

  const dispatchStatusChange = useCallback((objectiveIds, localStatus) => {
    try {
      // same as before, we do not want white screens if something weird happens here
      const objective = objectiveMap.current.get(JSON.stringify((objectiveIds || []).sort()))
      if (!objective) {
        return
      }

      // update with the new status
      objective.status = localStatus

      setAtLeastOneObjectiveIsNotCompleted(evaluateObjectiveMapRefForStatus(objectiveMap))
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e)
    }
  }, [])

  return {
    atLeastOneObjectiveIsNotCompleted,
    dispatchStatusChange,
    objectiveMap,
  }
}
