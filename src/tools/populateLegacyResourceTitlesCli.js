import readline from 'readline';
import { DateTime } from 'luxon';
import processLegacyResources from './populateLegacyResourceTitles';
import { auditLogger } from '../logger';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question('Please enter a START date in the format MM/DD/YYYY (Press [ENTER] for -30 days):', async (startDate) => {
  const start = !startDate
    ? DateTime.local().minus({ days: 30 })
    : DateTime.fromFormat(startDate, 'MM/dd/yyyy');
  if (!start.isValid) {
    auditLogger.error(`Invalid START date, please use formate MM/DD/YYYY: ${startDate}`);
  }
  rl.question('Please enter a END date in the format MM/DD/YYYY (Press [ENTER] for today):', async (endDate) => {
    const end = !endDate
      ? DateTime.local()
      : DateTime.fromFormat(endDate, 'MM/dd/yyyy');
    if (!end.isValid) {
      auditLogger.error(`Invalid END date, please use formate MM/DD/YYYY: ${endDate}`);
    }
    try {
      await processLegacyResources(
        start.toFormat('MM/dd/yyyy'),
        end.toFormat('MM/dd/yyyy'),
      );
      process.exit(0);
    } catch (e) {
      auditLogger.error(e);
      process.exit(1);
    }
  });
});
