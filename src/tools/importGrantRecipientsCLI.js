import {} from 'dotenv/config';
import { option } from 'yargs';
import updateGrantsRecipients, { processFiles } from '../lib/updateGrantsRecipients';
import { auditLogger } from '../logger';

/**
 * importGrantRecipientsCLI is a CLI option for kicking off an HSES import.
 * Normally, this is automatically run by cron
 */

const { argv: { skipdownload } } = option('skipdownload', {
  type: 'boolean',
  description: 'Process files in temp without refreshing the zip file',
})
  .help()
  .alias('help', 'h');

(async () => {
  try {
    if (skipdownload) {
      await processFiles();
    } else {
      await updateGrantsRecipients();
    }
    auditLogger.info('Script completed successfully');
    process.exit(0);
  } catch (e) {
    auditLogger.error(`Error during script execution: ${e.message}`, e);
    process.exit(1);
  }
})();
