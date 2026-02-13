import { REASONS } from '@ttahub/common'
import { filterExactArray } from './utils'

function onlyValidReasons(query) {
  if (!Array.isArray(query)) {
    return [query].filter((reason) => REASONS.includes(reason))
  }

  return query.filter((reason) => REASONS.includes(reason))
}

export function withReason(query) {
  const reason = onlyValidReasons(query)
  if (!reason.length) {
    return {}
  }

  return filterExactArray('"ActivityReport"."reason"', reason, false)
}

export function withoutReason(query) {
  const reason = onlyValidReasons(query)
  if (!reason.length) {
    return {}
  }
  return filterExactArray('"ActivityReport"."reason"', reason, true)
}
