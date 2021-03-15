import {} from 'dotenv/config';
import { option } from 'yargs';
import updateGrantsGrantees, { processFiles } from '../lib/updateGrantsGrantees';
import { auditLogger } from '../logger';

/**
 * importGrantGranteesCLI is a CLI option for kicking off an HSES import.
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
  updateGrantsGrantees().catch((e) => {
    auditLogger.error(e);
    return process.exit(1);
  });
}
