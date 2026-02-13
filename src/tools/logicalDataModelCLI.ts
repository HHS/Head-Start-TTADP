import logicalDataModel from './logicalDataModel'
import { auditLogger } from '../logger'

logicalDataModel()
  .then(() => process.exit())
  .catch((e) => {
    auditLogger.error(e)
    process.exit(1)
  })
