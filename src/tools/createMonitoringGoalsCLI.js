import createMonitoringGoals from './createMonitoringGoals'
import { auditLogger } from '../logger'

createMonitoringGoals()
  .catch((e) => {
    auditLogger.error(e)
    process.exit(1)
  })
  .finally(() => {
    process.exit(0)
  })
