import db from '../models'
import { baseTRScopes, countBySingleKey, generateReasonList } from './helpers'
import type { IScopes } from './types'

const { EventReportPilot: TrainingReport } = db

export default async function trReasonList(scopes: IScopes) {
  const res = (await TrainingReport.findAll({
    attributes: ['data', 'id'],
    ...baseTRScopes(scopes),
  })) as {
    data: {
      reasons: string[]
    }
  }[]

  const reasons = generateReasonList()

  const mapped = res.map((r) => ({ reasons: r.data.reasons }))

  return countBySingleKey(mapped, 'reasons', reasons)
}
