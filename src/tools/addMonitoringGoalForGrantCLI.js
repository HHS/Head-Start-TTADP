import {} from 'dotenv/config'
import { option } from 'yargs'
import addMonitoringGoalForGrant from './addMonitoringGoalForGrant'
import { auditLogger } from '../logger'

const { argv } = option('grantId', {
  alias: 'g',
  description: 'Grant id',
  type: 'number',
})
  .help()
  .alias('help', 'h')

const { grantId } = argv

if (!grantId) {
  auditLogger.error('grantId is required')
  process.exit(1)
}

addMonitoringGoalForGrant(grantId)
  .catch((e) => {
    auditLogger.error(e)
    process.exit(1)
  })
  .finally(() => {
    process.exit(0)
  })
