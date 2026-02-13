import { isEqual } from 'lodash'
import moment from 'moment'
import { COLLAB_REPORT_DATA, STATES } from '../../Constants'

/**
 * @param string
 * @returns isValid bool
 */
export const isDateValid = (date) => !(!date || !moment(date, 'MM/DD/YYYY').isValid())

/**
 * compares two objects using lodash "isEqual" and returns the difference
 * @param {*} object
 * @param {*} base
 * @returns {} containing any new keys/values
 */
export const findWhatsChanged = (object, base) => {
  // Handle null/undefined inputs
  if (!object || typeof object !== 'object') {
    return {}
  }

  // Ensure base is an object or default to empty object
  const baseObj = base && typeof base === 'object' ? base : {}

  function reduction(accumulator, current) {
    if (current === 'startDate' || current === 'endDate') {
      if (!isDateValid(object[current])) {
        delete accumulator[current]
        return accumulator
      }
    }

    if (current === 'creatorRole' && !object[current]) {
      accumulator[current] = null
      return accumulator
    }

    if (!isEqual(baseObj[current], object[current])) {
      accumulator[current] = object[current]
    }

    if (Number.isNaN(accumulator[current])) {
      delete accumulator[current]
    }

    return accumulator
  }

  // we sort these so they traverse in a particular order
  const keys = Object.keys(object)
  if (keys.length === 0) {
    return {}
  }

  return keys.sort().reduce(reduction, {})
}

export const unflattenResourcesUsed = (array) => {
  if (!array) {
    return []
  }

  return array.map((value) => ({ value }))
}

export const convertReportToFormData = (fetchedReport) => {
  const { participants, hasDataUsed, dataUsed, hasGoals, reportGoals, statesInvolved, ...rest } = fetchedReport

  // Convert reasons into a checkbox-friendly format
  let reportReasons = []
  if (fetchedReport.reportReasons) {
    reportReasons = fetchedReport.reportReasons || []
  }

  // Convert isStateActivity to string for radio buttons
  let isStateActivity = null
  if (fetchedReport.isStateActivity !== null && fetchedReport.isStateActivity !== undefined) {
    isStateActivity = String(Boolean(fetchedReport.isStateActivity))
  }

  // Convert hasDataUsed to string for radio buttons
  let hasDataUsedValue = null
  if (hasDataUsed !== null && hasDataUsed !== undefined) {
    hasDataUsedValue = String(Boolean(hasDataUsed))
  }

  // Convert hasGoals to string for radio buttons
  let hasGoalsValue = null
  if (hasGoals !== null && hasGoals !== undefined) {
    hasGoalsValue = String(Boolean(hasGoals))
  }

  // Convert participants, dataUsed, goals, and statesInvolved for use with multiselect components
  const participantValues = Array.isArray(participants) ? participants.map((p) => ({ label: p, value: p })) : []
  const dataUsedValues = Array.isArray(dataUsed)
    ? dataUsed.map((d) => ({ label: COLLAB_REPORT_DATA[d.collabReportDatum], value: d.collabReportDatum }))
    : []
  const goalsValues = Array.isArray(reportGoals) ? reportGoals.map((g) => ({ label: g.goalTemplate.standard, value: g.goalTemplateId })) : []
  const statesInvolvedValues = Array.isArray(statesInvolved) ? statesInvolved.map((s) => ({ label: STATES[s], value: s })) : []

  const retVal = {
    ...rest,
    reportReasons,
    isStateActivity,
    participants: participantValues,
    hasDataUsed: hasDataUsedValue,
    dataUsed: dataUsedValues,
    hasGoals: hasGoalsValue,
    goals: goalsValues,
    statesInvolved: statesInvolvedValues,
  }
  return retVal
}
