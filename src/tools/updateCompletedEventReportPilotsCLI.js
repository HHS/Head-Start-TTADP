import updateCompletedEventReportPilots from './updateCompletedEventReportPilots'
import { auditLogger } from '../logger'

updateCompletedEventReportPilots()
  .catch((e) => {
    auditLogger.error(e)
    return process.exit(1)
  })
  .then(() => process.exit(0))
