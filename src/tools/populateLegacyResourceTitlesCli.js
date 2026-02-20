import readline from 'readline';
import {
  format, subDays, parse, isValid,
} from 'date-fns';
import processLegacyResources from './populateLegacyResourceTitles';
import { DATE_FORMAT } from '../constants';
import { auditLogger } from '../logger';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question('Please enter a START date in the format MM/DD/YYYY (Press [ENTER] for -30 days):', async (startDate) => {
  const start = !startDate ? subDays(new Date(), 30) : parse(startDate, DATE_FORMAT, new Date());
  if (!isValid(start)) {
    auditLogger.error(`Invalid START date, please use formate MM/DD/YYYY: ${startDate}`);
  }
  rl.question('Please enter a END date in the format MM/DD/YYYY (Press [ENTER] for today):', async (endDate) => {
    const end = !endDate ? new Date() : parse(endDate, DATE_FORMAT, new Date());
    if (!isValid(end)) {
      auditLogger.error(`Invalid END date, please use formate MM/DD/YYYY: ${endDate}`);
    }
    try {
      await processLegacyResources(format(start, DATE_FORMAT), format(end, DATE_FORMAT));
      process.exit(0);
    } catch (e) {
      auditLogger.error(e);
      process.exit(1);
    }
  });
});
