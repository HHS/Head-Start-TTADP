import { Op } from 'sequelize'
import {
  filterAssociation,
  nextStepsIncludeExclude,
  argsIncludeExclude,
  objectiveTitleAndTtaProvidedIncludeExclude,
  activityReportContextandAdditionalNotesIncludeExclude,
} from './utils'

export function withReportText(searchText) {
  const search = [`%${searchText.map((st) => st.toLowerCase())}%`]

  return {
    [Op.or]: [
      filterAssociation(nextStepsIncludeExclude(true), search, false, 'LIKE'),
      filterAssociation(argsIncludeExclude(true), search, false, 'LIKE'),
      filterAssociation(objectiveTitleAndTtaProvidedIncludeExclude(true), search, false, 'LIKE'),
      filterAssociation(activityReportContextandAdditionalNotesIncludeExclude(true), search, false, 'LIKE'),
    ],
  }
}

export function withoutReportText(searchText) {
  const search = [`%${searchText.map((st) => st.toLowerCase())}%`]

  return {
    [Op.and]: [
      filterAssociation(nextStepsIncludeExclude(false), search, false, 'NOT LIKE'),
      filterAssociation(argsIncludeExclude(false), search, false, 'NOT LIKE'),
      filterAssociation(objectiveTitleAndTtaProvidedIncludeExclude(false), search, false, 'NOT LIKE'),
      filterAssociation(activityReportContextandAdditionalNotesIncludeExclude(false), search, false, 'NOT LIKE'),
    ],
  }
}
