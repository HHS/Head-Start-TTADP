import { filterAssociation } from './utils'

const collaborators = `
SELECT
  log.id
FROM "CommunicationLogs" log
INNER JOIN "Users" users
ON users.id = log."userId"
WHERE users.name`

export function withCreator(names: string[]) {
  return filterAssociation(collaborators, names, false)
}

export function withoutCreator(names: string[]) {
  return filterAssociation(collaborators, names, true)
}
