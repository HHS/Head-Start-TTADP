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

if (skipdownload) {
  processFiles().catch((e) => {
    auditLogger.error(e);
    return process.exit(1);
  });
} else {
  updateGrantsRecipients().catch((e) => {
    auditLogger.error(e);
    return process.exit(1);
  });
}
