/* eslint-disable no-restricted-syntax */
/* eslint-disable no-loop-func */
import parse from 'csv-parse/lib/sync';
import { downloadFile } from '../lib/s3';
import { ActivityReport } from '../models';
import { auditLogger } from '../logger';

async function parseCsv(fileKey) {
  let durationReports = {};
  const { Body: csv } = await downloadFile(fileKey);
  [...durationReports] = parse(csv, {
    skipEmptyLines: true,
    columns: true,
  });
  return durationReports;
}

export default async function importDuration(fileKey) {
  auditLogger.info('Starting duration update...');
  const durationReports = await parseCsv(fileKey);
  const promises = [];
  try {
    for await (const el of durationReports) {
      const id = el.ID;
      const duration = parseFloat(el.DUR) || 0;

      if (duration === 0) {
        auditLogger.info(`No duration set for report: ${id}, skipping`);
      } else {
        const report = await ActivityReport.findOne({ where: { id } });
        if (report && report.legacyId && !report.duration) {
          auditLogger.info(`Changing duration of report: ${id} from ${report.duration} to ${duration}`);
          promises.push(
            report.update({
              duration: Number(duration.toFixed(1)),
            }),
          );
        } else {
          auditLogger.info(`Couldn't find a legacy report with the id: ${id}`);
        }
      }
    }
    auditLogger.info('...Completed duration update');
  } catch (err) {
    // eslint-disable-next-line no-console
    console.log(err);
  }
  return Promise.all(promises);
}
