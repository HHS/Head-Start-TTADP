import readline from 'readline'
import moment from 'moment'
import processLegacyResources from './populateLegacyResourceTitles'
import { DATE_FORMAT } from '../constants'
import { auditLogger } from '../logger'

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
})

rl.question('Please enter a START date in the format MM/DD/YYYY (Press [ENTER] for -30 days):', async (startDate) => {
  const start = !startDate ? moment().subtract(30, 'd') : moment(startDate, DATE_FORMAT)
  if (!start.isValid()) {
    auditLogger.error(`Invalid START date, please use formate MM/DD/YYYY: ${startDate}`)
  }
  rl.question('Please enter a END date in the format MM/DD/YYYY (Press [ENTER] for today):', async (endDate) => {
    const end = !endDate ? moment().subtract() : moment(endDate, DATE_FORMAT)
    if (!end.isValid()) {
      auditLogger.error(`Invalid END date, please use formate MM/DD/YYYY: ${endDate}`)
    }
    try {
      await processLegacyResources(start.format(DATE_FORMAT), end.format(DATE_FORMAT))
      process.exit(0)
    } catch (e) {
      auditLogger.error(e)
      process.exit(1)
    }
  })
})
